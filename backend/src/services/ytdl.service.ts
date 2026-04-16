import ytdl from "@distube/ytdl-core";

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
}

export async function downloadYouTubeVideo(
  url: string,
  onProgress: (progress: DownloadProgress) => Promise<void>
): Promise<{ buffer: Buffer; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let downloaded = 0;
    let total = 0;

    const stream = ytdl(url, {
      quality: "highestvideo",
      filter: (format) => format.hasVideo && format.hasAudio && format.container === "mp4",
    });

    stream.on("info", (_info: unknown, format: { contentLength?: string }) => {
      total = format.contentLength ? parseInt(format.contentLength, 10) : 0;
    });

    stream.on("data", async (chunk: Buffer) => {
      chunks.push(chunk);
      downloaded += chunk.length;
      if (total > 0) {
        const percent = Math.round((downloaded / total) * 100);
        try { await onProgress({ downloaded, total, percent }); } catch { /* non-fatal */ }
      }
    });

    stream.on("end", () => resolve({ buffer: Buffer.concat(chunks), mimeType: "video/mp4" }));
    stream.on("error", (err: Error) => reject(err));
  });
}

export async function getVideoInfo(url: string) {
  const info = await ytdl.getInfo(url);
  const d = info.videoDetails;
  return {
    title: d.title,
    description: d.description ?? "",
    thumbnailUrl: d.thumbnails?.at(-1)?.url ?? "",
    tags: d.keywords ?? [],
    channelTitle: d.author?.name ?? "",
  };
}
