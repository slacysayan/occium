import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any

import uvicorn
import yt_dlp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from pydantic import BaseModel, Field
import requests
from dotenv import load_dotenv

load_dotenv()


PORT = int(os.getenv("PORT", "4315"))
YTDLP_VERSION = (
    getattr(getattr(yt_dlp, "version", None), "__version__", None)
    or getattr(yt_dlp, "__version__", "unknown")
)

app = FastAPI(title="Occium Python Helper", version="1.0.0")

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


class LinkedInTokenPayload(BaseModel):
    code: str
    redirectUri: str
    clientId: str
    clientSecret: str


class LinkedInProfilePayload(BaseModel):
    accessToken: str


class LinkedInPostPayload(BaseModel):
    accessToken: str
    authorId: str
    text: str
    linkUrl: str | None = None
    linkTitle: str | None = None


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
        prepared = info.get("_filename") or out_template.replace("%(id)s", str(info.get("id", "video"))).replace("%(ext)s", str(info.get("ext", "mp4")))
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


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "occium-python-helper",
        "port": PORT,
        "pythonVersion": sys.version.split()[0],
        "ytDlp": {
            "available": True,
            "version": YTDLP_VERSION,
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


@app.post("/api/linkedin/token")
def linkedin_token(payload: LinkedInTokenPayload) -> dict[str, Any]:
    url = "https://www.linkedin.com/oauth/v2/accessToken"
    data = {
        "grant_type": "authorization_code",
        "code": payload.code,
        "redirect_uri": payload.redirectUri,
        "client_id": payload.clientId,
        "client_secret": payload.clientSecret,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    response = requests.post(url, data=data, headers=headers)
    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


@app.post("/api/linkedin/profile")
def linkedin_profile(payload: LinkedInProfilePayload) -> dict[str, Any]:
    url = "https://api.linkedin.com/v2/userinfo"
    headers = {"Authorization": f"Bearer {payload.accessToken}"}
    response = requests.get(url, headers=headers)
    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


@app.post("/api/linkedin/post")
def linkedin_post(payload: LinkedInPostPayload) -> dict[str, Any]:
    url = "https://api.linkedin.com/v2/ugcPosts"
    headers = {
        "Authorization": f"Bearer {payload.accessToken}",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
    }
    
    author_urn = f"urn:li:person:{payload.authorId}"
    body = {
        "author": author_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": payload.text},
                "shareMediaCategory": "ARTICLE" if payload.linkUrl else "NONE",
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    }
    
    if payload.linkUrl:
        body["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [
            {
                "status": "READY",
                "description": {"text": payload.linkTitle or "View on YouTube"},
                "originalUrl": payload.linkUrl,
            }
        ]
        
    response = requests.post(url, headers=headers, json=body)
    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")
