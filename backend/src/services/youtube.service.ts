import axios from "axios";
import { env } from "../config/env";

const YT_API = "https://www.googleapis.com/youtube/v3";

export interface VideoMetadata {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  tags: string[];
  channelTitle: string;
  publishedAt: string;
}

export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    const v = u.searchParams.get("v");
    if (v) return v;
    const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
    return shorts?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function fetchVideoMetadata(
  url: string
): Promise<VideoMetadata | null> {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  // If no API key, return minimal metadata from thumbnail URL pattern
  if (!env.YOUTUBE_API_KEY) {
    return {
      videoId,
      title: "",
      description: "",
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      tags: [],
      channelTitle: "",
      publishedAt: new Date().toISOString(),
    };
  }

  const res = await axios.get(`${YT_API}/videos`, {
    params: {
      part: "snippet",
      id: videoId,
      key: env.YOUTUBE_API_KEY,
    },
  });

  const item = res.data.items?.[0];
  if (!item) return null;

  const s = item.snippet;
  return {
    videoId,
    title: s.title ?? "",
    description: s.description ?? "",
    thumbnailUrl:
      s.thumbnails?.maxres?.url ??
      s.thumbnails?.high?.url ??
      s.thumbnails?.default?.url ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    tags: s.tags ?? [],
    channelTitle: s.channelTitle ?? "",
    publishedAt: s.publishedAt ?? new Date().toISOString(),
  };
}

export interface UploadParams {
  accessToken: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: "public" | "unlisted" | "private";
  publishAt?: string | null;
  videoBuffer: Buffer;
  mimeType: string;
}

export async function uploadVideoToYouTube(params: UploadParams): Promise<{
  videoId: string;
  videoUrl: string;
}> {
  const {
    accessToken,
    title,
    description,
    tags,
    privacyStatus,
    publishAt,
    videoBuffer,
    mimeType,
  } = params;

  const metadata = {
    snippet: { title, description, tags },
    status: {
      privacyStatus: publishAt ? "private" : privacyStatus,
      ...(publishAt ? { publishAt } : {}),
    },
  };

  // Step 1: Initiate resumable upload
  const initRes = await axios.post(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    metadata,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": videoBuffer.length,
      },
    }
  );

  const uploadUrl = initRes.headers["location"];
  if (!uploadUrl) throw new Error("No upload URL returned from YouTube");

  // Step 2: Upload bytes
  const uploadRes = await axios.put(uploadUrl, videoBuffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": videoBuffer.length,
    },
  });

  const videoId = uploadRes.data.id;
  return {
    videoId,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

export async function refreshGoogleToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const res = await axios.post("https://oauth2.googleapis.com/token", {
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  return {
    accessToken: res.data.access_token,
    expiresAt: new Date(Date.now() + res.data.expires_in * 1000),
  };
}
