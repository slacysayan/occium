const cors = require("cors");
const express = require("express");
const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { google } = require("googleapis");

const app = express();
const port = Number.parseInt(process.env.PORT || "4315", 10);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

function runYtDlp(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("yt-dlp", args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || `yt-dlp exited with code ${code}`));
    });
  });
}

async function fetchMetadata(url) {
  const { stdout } = await runYtDlp([
    "--dump-single-json",
    "--no-warnings",
    "--skip-download",
    url,
  ]);

  const data = JSON.parse(stdout);

  return {
    title: data.title || "Imported Video",
    description: data.description || "",
    thumbnail: data.thumbnail || "",
    duration: data.duration || 0,
    view_count: data.view_count || 0,
    uploader: data.uploader || "Unknown",
    source_url: url,
  };
}

async function detectYtDlp() {
  try {
    const { stdout } = await runYtDlp(["--version"]);
    return {
      available: true,
      version: stdout.trim() || "unknown",
    };
  } catch (error) {
    return {
      available: false,
      version: null,
      error: error.message || "yt-dlp is not available",
    };
  }
}

async function downloadVideo(url) {
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "occium-yt-"));
  const outputTemplate = path.join(tempDir, "%(id)s.%(ext)s");
  const { stdout } = await runYtDlp([
    "--no-warnings",
    "--print",
    "after_move:filepath",
    "-f",
    "mp4/best",
    "-o",
    outputTemplate,
    url,
  ]);

  const filePath = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .pop();

  if (!filePath) {
    throw new Error("Could not determine the downloaded file path.");
  }

  return {
    tempDir,
    filePath,
  };
}

async function cleanupDownload(tempDir, filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fsp.unlink(filePath);
    }
  } catch (error) {
    console.error("Failed to remove downloaded file", error);
  }

  try {
    if (tempDir && fs.existsSync(tempDir)) {
      await fsp.rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Failed to remove temp directory", error);
  }
}

async function uploadToYouTube({
  accessToken,
  title,
  description,
  tags,
  privacyStatus,
  publishAt,
  filePath,
}) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({
    access_token: accessToken,
  });

  const youtube = google.youtube({
    version: "v3",
    auth,
  });

  const effectivePrivacyStatus = publishAt ? "private" : privacyStatus || "private";

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title,
        description,
        tags: Array.isArray(tags) ? tags : [],
      },
      status: {
        privacyStatus: effectivePrivacyStatus,
        publishAt: publishAt || undefined,
      },
    },
    media: {
      body: fs.createReadStream(filePath),
    },
  });

  return {
    videoId: response.data.id,
    videoUrl: response.data.id ? `https://www.youtube.com/watch?v=${response.data.id}` : null,
    privacyStatus: effectivePrivacyStatus,
    publishAt: publishAt || null,
  };
}

app.get("/health", async (_request, response) => {
  const ytDlp = await detectYtDlp();

  response.json({
    status: ytDlp.available ? "ok" : "degraded",
    service: "occium-local-helper",
    port,
    ytDlp,
  });
});

app.post("/api/youtube/metadata", async (request, response) => {
  try {
    const metadata = await fetchMetadata(request.body.url);
    response.json(metadata);
  } catch (error) {
    console.error("Metadata lookup failed", error);
    response.status(500).json({
      error: error.message || "Metadata lookup failed",
    });
  }
});

app.post("/api/youtube/upload", async (request, response) => {
  const {
    url,
    accessToken,
    title,
    description,
    tags = [],
    privacyStatus = "private",
    publishAt = null,
  } = request.body;

  let tempDir = null;
  let filePath = null;

  try {
    if (!url || !accessToken) {
      response.status(400).json({
        error: "url and accessToken are required",
      });
      return;
    }

    const download = await downloadVideo(url);
    tempDir = download.tempDir;
    filePath = download.filePath;

    const uploadResult = await uploadToYouTube({
      accessToken,
      title,
      description,
      tags,
      privacyStatus,
      publishAt,
      filePath,
    });

    response.json(uploadResult);
  } catch (error) {
    console.error("YouTube upload failed", error);
    response.status(500).json({
      error: error.message || "YouTube upload failed",
    });
  } finally {
    await cleanupDownload(tempDir, filePath);
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Occium local helper running on http://127.0.0.1:${port}`);
});
