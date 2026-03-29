import json
import os
import shutil
import sys
import tempfile
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
import uvicorn
import yt_dlp
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from pydantic import BaseModel, Field

load_dotenv()


PORT = int(os.getenv("PORT", "4315"))
REQUEST_TIMEOUT_SECONDS = 30
SCHEDULER_POLL_INTERVAL_SECONDS = 15
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID", "").strip()
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET", "").strip()
LINKEDIN_SCHEDULE_FILE = Path(
    os.getenv("LINKEDIN_SCHEDULE_FILE")
    or (Path(__file__).resolve().parent / "scheduled_linkedin_jobs.json")
)
YTDLP_VERSION = (
    getattr(getattr(yt_dlp, "version", None), "__version__", None)
    or getattr(yt_dlp, "__version__", "unknown")
)

linkedin_schedule_lock = threading.Lock()
linkedin_schedule_jobs: dict[str, dict[str, Any]] = {}
linkedin_scheduler_started = False

app = FastAPI(title="Occium Python Helper", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SourcePayload(BaseModel):
    url: str
    max_items: int = Field(default=80, ge=1, le=200)


class UploadPayload(BaseModel):
    url: str
    accessToken: str
    title: str
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    privacyStatus: str = "private"
    publishAt: str | None = None
    channelId: str | None = None


class GoogleTokenPayload(BaseModel):
    code: str
    redirectUri: str


class GoogleRefreshPayload(BaseModel):
    refreshToken: str


class LinkedInTokenPayload(BaseModel):
    code: str
    redirectUri: str


class LinkedInProfilePayload(BaseModel):
    accessToken: str


class LinkedInRefreshPayload(BaseModel):
    refreshToken: str


class LinkedInPostPayload(BaseModel):
    accessToken: str
    authorId: str
    text: str
    linkUrl: str | None = None
    linkTitle: str | None = None


class LinkedInSchedulePayload(LinkedInPostPayload):
    publishAt: str


def build_ydl(options: dict[str, Any] | None = None) -> yt_dlp.YoutubeDL:
    base_options: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "ignoreerrors": True,
        "extractor_retries": 1,
    }
    if options:
        base_options.update(options)
    return yt_dlp.YoutubeDL(base_options)


def pick_thumbnail(info: dict[str, Any] | None) -> str:
    if not info:
        return ""

    if info.get("thumbnail"):
        return str(info["thumbnail"])

    thumbnails = info.get("thumbnails") or []
    if thumbnails:
        return str(thumbnails[-1].get("url") or "")

    return ""


def to_watch_url(entry: dict[str, Any]) -> str:
    if entry.get("webpage_url"):
        return str(entry["webpage_url"])

    entry_id = entry.get("id") or entry.get("url")
    if entry_id:
        return f"https://www.youtube.com/watch?v={entry_id}"

    return ""


def normalize_video(info: dict[str, Any], source_url: str) -> dict[str, Any]:
    return {
        "title": info.get("title") or "Imported Video",
        "description": info.get("description") or "",
        "thumbnail": pick_thumbnail(info),
        "duration": info.get("duration") or 0,
        "view_count": info.get("view_count") or 0,
        "uploader": info.get("uploader") or info.get("channel") or "Unknown",
        "source_url": source_url,
    }


def normalize_collection_entry(entry: dict[str, Any], index: int) -> dict[str, Any]:
    title = entry.get("title") or f"Video {index}"
    source_url = to_watch_url(entry)
    return {
        "id": str(entry.get("id") or f"entry-{index}"),
        "position": index,
        "title": title,
        "thumbnail": pick_thumbnail(entry),
        "uploader": entry.get("uploader") or entry.get("channel") or "Unknown",
        "duration": entry.get("duration") or 0,
        "source_url": source_url,
        "selected": True,
    }


def extract_source(url: str, max_items: int) -> dict[str, Any]:
    with build_ydl(
        {
            "skip_download": True,
            "extract_flat": "in_playlist",
            "playlistend": max_items + 1,
        }
    ) as ydl:
        info = ydl.extract_info(url, download=False)

    if not info:
        raise HTTPException(status_code=404, detail="Could not read this YouTube source.")

    raw_entries = [entry for entry in (info.get("entries") or []) if entry]
    is_collection = len(raw_entries) > 0 and info.get("_type") != "url"

    if not is_collection:
        with build_ydl({"skip_download": True, "noplaylist": True}) as ydl:
            detailed_info = ydl.extract_info(url, download=False)

        if not detailed_info:
            raise HTTPException(status_code=404, detail="Could not load video metadata.")

        return {
            "kind": "video",
            "metadata_source": "python-helper",
            "video": normalize_video(detailed_info, url),
        }

    visible_entries = raw_entries[:max_items]
    normalized_entries = [
        normalize_collection_entry(entry, index + 1)
        for index, entry in enumerate(visible_entries)
        if to_watch_url(entry)
    ]

    return {
        "kind": "collection",
        "metadata_source": "python-helper",
        "collection": {
            "title": info.get("title") or "YouTube Collection",
            "source_type": info.get("_type") or "playlist",
            "uploader": info.get("uploader")
            or info.get("channel")
            or info.get("playlist_uploader")
            or "Unknown",
            "source_url": url,
            "entry_count": len(normalized_entries),
            "has_more": len(raw_entries) > len(normalized_entries),
            "entries": normalized_entries,
        },
    }


def download_video(url: str) -> tuple[Path, Path]:
    temp_dir = Path(tempfile.mkdtemp(prefix="occium-yt-"))
    out_template = str(temp_dir / "%(id)s.%(ext)s")

    with build_ydl(
        {
            "format": "mp4/best",
            "merge_output_format": "mp4",
            "noplaylist": True,
            "outtmpl": out_template,
        }
    ) as ydl:
        info = ydl.extract_info(url, download=True)

    requested_downloads = info.get("requested_downloads") or []
    file_path = None

    if requested_downloads:
        candidate = requested_downloads[0].get("filepath")
        if candidate:
            file_path = Path(candidate)

    if not file_path:
        prepared = (
            info.get("_filename")
            or out_template.replace("%(id)s", str(info.get("id", "video"))).replace(
                "%(ext)s", str(info.get("ext", "mp4"))
            )
        )
        file_path = Path(prepared)

    if not file_path.exists():
        matches = sorted(temp_dir.glob("*"))
        if not matches:
            raise HTTPException(status_code=500, detail="Downloaded file could not be located.")
        file_path = matches[-1]

    return temp_dir, file_path


def cleanup_download(temp_dir: Path | None) -> None:
    if temp_dir and temp_dir.exists():
        shutil.rmtree(temp_dir, ignore_errors=True)


def upload_to_youtube(payload: UploadPayload, file_path: Path) -> dict[str, Any]:
    credentials = Credentials(token=payload.accessToken)
    youtube = build("youtube", "v3", credentials=credentials, cache_discovery=False)

    effective_privacy = "private" if payload.publishAt else payload.privacyStatus or "private"

    request = youtube.videos().insert(
        part="snippet,status",
        body={
            "snippet": {
                "title": payload.title,
                "description": payload.description,
                "tags": payload.tags,
            },
            "status": {
                "privacyStatus": effective_privacy,
                "publishAt": payload.publishAt or None,
            },
        },
        media_body=MediaFileUpload(str(file_path), resumable=True),
    )
    response = request.execute()

    return {
        "videoId": response.get("id"),
        "videoUrl": f"https://www.youtube.com/watch?v={response.get('id')}" if response.get("id") else None,
        "privacyStatus": effective_privacy,
        "publishAt": payload.publishAt,
    }


def ensure_linkedin_oauth_configured() -> None:
    if not LINKEDIN_CLIENT_ID or not LINKEDIN_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail=(
                "LinkedIn OAuth is not configured on the Render helper. "
                "Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET."
            ),
        )


def ensure_google_oauth_configured() -> None:
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail=(
                "Google OAuth is not configured on the Render helper. "
                "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
            ),
        )


def parse_iso_datetime(value: str) -> datetime:
    try:
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
    except ValueError as error:
        raise HTTPException(status_code=400, detail="publishAt must be a valid ISO 8601 timestamp.") from error

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc)


def serialize_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def load_linkedin_schedule_jobs() -> None:
    global linkedin_schedule_jobs

    if not LINKEDIN_SCHEDULE_FILE.exists():
        linkedin_schedule_jobs = {}
        return

    try:
        raw = json.loads(LINKEDIN_SCHEDULE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        linkedin_schedule_jobs = {}
        return

    if not isinstance(raw, list):
        linkedin_schedule_jobs = {}
        return

    linkedin_schedule_jobs = {
        str(job.get("id")): job
        for job in raw
        if isinstance(job, dict) and job.get("id")
    }


def persist_linkedin_schedule_jobs() -> None:
    LINKEDIN_SCHEDULE_FILE.write_text(
        json.dumps(list(linkedin_schedule_jobs.values()), indent=2),
        encoding="utf-8",
    )


def sanitize_linkedin_job(job: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in job.items()
        if key not in {"accessToken"}
    }


def upsert_linkedin_job(job: dict[str, Any]) -> dict[str, Any]:
    with linkedin_schedule_lock:
        linkedin_schedule_jobs[job["id"]] = job
        persist_linkedin_schedule_jobs()
        return sanitize_linkedin_job(job)


def update_linkedin_job(job_id: str, **patch: Any) -> dict[str, Any] | None:
    with linkedin_schedule_lock:
        existing = linkedin_schedule_jobs.get(job_id)
        if not existing:
            return None

        existing.update(patch)
        linkedin_schedule_jobs[job_id] = existing
        persist_linkedin_schedule_jobs()
        return sanitize_linkedin_job(existing)


def build_linkedin_share_body(
    author_id: str,
    text: str,
    link_url: str | None = None,
    link_title: str | None = None,
) -> dict[str, Any]:
    body = {
        "author": f"urn:li:person:{author_id}",
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "ARTICLE" if link_url else "NONE",
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        },
    }

    if link_url:
        media = {
            "status": "READY",
            "originalUrl": link_url,
        }
        if link_title:
            media["title"] = {"text": link_title}
            media["description"] = {"text": link_title}

        body["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [media]

    return body


def publish_linkedin_share(
    access_token: str,
    author_id: str,
    text: str,
    link_url: str | None = None,
    link_title: str | None = None,
) -> dict[str, Any]:
    url = "https://api.linkedin.com/v2/ugcPosts"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
    }
    body = build_linkedin_share_body(author_id, text, link_url, link_title)

    response = requests.post(
        url,
        headers=headers,
        json=body,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    response_payload: dict[str, Any] | None = None
    if response.text:
        try:
            response_payload = response.json()
        except ValueError:
            response_payload = None

    return {
        "postId": response.headers.get("X-RestLi-Id"),
        "postedAt": serialize_datetime(datetime.now(timezone.utc)),
        "response": response_payload,
    }


def linkedin_scheduler_loop() -> None:
    while True:
        due_jobs: list[dict[str, Any]] = []
        now = datetime.now(timezone.utc)

        with linkedin_schedule_lock:
            for job in linkedin_schedule_jobs.values():
                if job.get("status") != "scheduled":
                    continue

                publish_at = parse_iso_datetime(str(job["publishAt"]))
                if publish_at > now:
                    continue

                job["status"] = "running"
                job["startedAt"] = serialize_datetime(now)
                due_jobs.append(dict(job))

            if due_jobs:
                persist_linkedin_schedule_jobs()

        for job in due_jobs:
            try:
                result = publish_linkedin_share(
                    access_token=str(job["accessToken"]),
                    author_id=str(job["authorId"]),
                    text=str(job["text"]),
                    link_url=job.get("linkUrl"),
                    link_title=job.get("linkTitle"),
                )
                update_linkedin_job(
                    str(job["id"]),
                    status="completed",
                    completedAt=serialize_datetime(datetime.now(timezone.utc)),
                    postId=result.get("postId"),
                    error=None,
                )
            except HTTPException as error:
                update_linkedin_job(
                    str(job["id"]),
                    status="failed",
                    completedAt=serialize_datetime(datetime.now(timezone.utc)),
                    error=str(error.detail),
                )
            except Exception as error:  # noqa: BLE001
                update_linkedin_job(
                    str(job["id"]),
                    status="failed",
                    completedAt=serialize_datetime(datetime.now(timezone.utc)),
                    error=str(error) or "LinkedIn schedule execution failed.",
                )

        time.sleep(SCHEDULER_POLL_INTERVAL_SECONDS)


@app.on_event("startup")
def startup_event() -> None:
    global linkedin_scheduler_started

    load_linkedin_schedule_jobs()

    if linkedin_scheduler_started:
        return

    thread = threading.Thread(target=linkedin_scheduler_loop, daemon=True)
    thread.start()
    linkedin_scheduler_started = True


@app.get("/health")
def health() -> dict[str, Any]:
    with linkedin_schedule_lock:
        pending_jobs = sum(
            1 for job in linkedin_schedule_jobs.values() if job.get("status") == "scheduled"
        )

    return {
        "status": "ok",
        "service": "occium-python-helper",
        "port": PORT,
        "pythonVersion": sys.version.split()[0],
        "ytDlp": {
            "available": True,
            "version": YTDLP_VERSION,
        },
        "linkedin": {
            "oauthConfigured": bool(LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET),
            "pendingScheduledJobs": pending_jobs,
        },
        "google": {
            "oauthConfigured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
        },
    }


@app.post("/api/youtube/source")
def youtube_source(payload: SourcePayload) -> dict[str, Any]:
    return extract_source(payload.url, payload.max_items)


@app.post("/api/youtube/metadata")
def youtube_metadata(payload: SourcePayload) -> dict[str, Any]:
    result = extract_source(payload.url, 1)
    if result["kind"] != "video":
        raise HTTPException(status_code=400, detail="This URL is a collection. Use the source endpoint instead.")
    return result["video"]


@app.post("/api/youtube/upload")
def youtube_upload(payload: UploadPayload) -> dict[str, Any]:
    temp_dir = None
    try:
        temp_dir, file_path = download_video(payload.url)
        return upload_to_youtube(payload, file_path)
    except HTTPException:
        raise
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(error) or "YouTube upload failed") from error
    finally:
        cleanup_download(temp_dir)


@app.post("/api/google/token")
def google_token(payload: GoogleTokenPayload) -> dict[str, Any]:
    ensure_google_oauth_configured()

    url = "https://oauth2.googleapis.com/token"
    data = {
        "code": payload.code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": payload.redirectUri,
        "grant_type": "authorization_code",
    }
    response = requests.post(
        url,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


@app.post("/api/google/refresh")
def google_refresh(payload: GoogleRefreshPayload) -> dict[str, Any]:
    ensure_google_oauth_configured()

    url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "refresh_token": payload.refreshToken,
        "grant_type": "refresh_token",
    }
    response = requests.post(
        url,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


@app.post("/api/linkedin/token")
def linkedin_token(payload: LinkedInTokenPayload) -> dict[str, Any]:
    ensure_linkedin_oauth_configured()

    url = "https://www.linkedin.com/oauth/v2/accessToken"
    data = {
        "grant_type": "authorization_code",
        "code": payload.code,
        "redirect_uri": payload.redirectUri,
        "client_id": LINKEDIN_CLIENT_ID,
        "client_secret": LINKEDIN_CLIENT_SECRET,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    response = requests.post(
        url,
        data=data,
        headers=headers,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


@app.post("/api/linkedin/profile")
def linkedin_profile(payload: LinkedInProfilePayload) -> dict[str, Any]:
    url = "https://api.linkedin.com/v2/userinfo"
    headers = {"Authorization": f"Bearer {payload.accessToken}"}
    response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


@app.post("/api/linkedin/refresh")
def linkedin_refresh(payload: LinkedInRefreshPayload) -> dict[str, Any]:
    ensure_linkedin_oauth_configured()

    url = "https://www.linkedin.com/oauth/v2/accessToken"
    data = {
        "grant_type": "refresh_token",
        "refresh_token": payload.refreshToken,
        "client_id": LINKEDIN_CLIENT_ID,
        "client_secret": LINKEDIN_CLIENT_SECRET,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    response = requests.post(
        url,
        data=data,
        headers=headers,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


@app.post("/api/linkedin/post")
def linkedin_post(payload: LinkedInPostPayload) -> dict[str, Any]:
    return publish_linkedin_share(
        access_token=payload.accessToken,
        author_id=payload.authorId,
        text=payload.text,
        link_url=payload.linkUrl,
        link_title=payload.linkTitle,
    )


@app.post("/api/linkedin/schedule")
def linkedin_schedule(payload: LinkedInSchedulePayload) -> dict[str, Any]:
    publish_at = parse_iso_datetime(payload.publishAt)
    if publish_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="publishAt must be in the future.")

    job = {
        "id": f"linkedin_{uuid.uuid4().hex}",
        "status": "scheduled",
        "publishAt": serialize_datetime(publish_at),
        "createdAt": serialize_datetime(datetime.now(timezone.utc)),
        "startedAt": None,
        "completedAt": None,
        "postId": None,
        "error": None,
        "authorId": payload.authorId,
        "text": payload.text,
        "linkUrl": payload.linkUrl,
        "linkTitle": payload.linkTitle,
        "accessToken": payload.accessToken,
    }

    return upsert_linkedin_job(job)


@app.get("/api/linkedin/schedules")
def linkedin_schedules() -> dict[str, Any]:
    with linkedin_schedule_lock:
        jobs = [
            sanitize_linkedin_job(job)
            for job in sorted(
                linkedin_schedule_jobs.values(),
                key=lambda item: item.get("publishAt") or "",
            )
        ]

    return {"jobs": jobs}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
