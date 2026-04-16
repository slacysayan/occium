import { Router, Request, Response } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.middleware";
import { fetchVideoMetadata, uploadWithProgress, refreshGoogleToken } from "../services/youtube.service";
import { db } from "../db/client";
import { accounts, posts } from "../db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 ** 3 } });

// GET /api/youtube/metadata?url=<youtube_url>
router.get("/metadata", requireAuth, async (req: Request, res: Response) => {
  const { url } = req.query as { url?: string };

  if (!url) {
    return res.status(400).json({ error: "url query param required" });
  }

  try {
    const metadata = await fetchVideoMetadata(url);
    if (!metadata) {
      return res.status(404).json({ error: "Video not found or invalid URL" });
    }
    res.json(metadata);
  } catch (err) {
    console.error("[youtube metadata]", err);
    res.status(500).json({ error: "Failed to fetch video metadata" });
  }
});

// GET /api/youtube/channel — get connected YouTube channel info
router.get("/channel", requireAuth, async (req: Request, res: Response) => {
  try {
    const [account] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, req.session.userId!),
          eq(accounts.platform, "youtube")
        )
      );

    if (!account) {
      return res.status(404).json({ error: "No YouTube account connected" });
    }

    res.json({
      id: account.id,
      accountName: account.accountName,
      profilePicture: account.profilePicture,
      channelId: account.channelId,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch channel" });
  }
});

// POST /api/youtube/upload — multipart video upload with progress tracking
router.post(
  "/upload",
  requireAuth,
  upload.single("video"),
  async (req: Request, res: Response) => {
    const { accountId, title, description, tags, privacyStatus, scheduledAt } = req.body as {
      accountId: string; title: string; description?: string;
      tags?: string; privacyStatus?: "public" | "unlisted" | "private"; scheduledAt?: string;
    };

    if (!req.file) return res.status(400).json({ error: "No video file provided" });
    if (!accountId || !title) return res.status(400).json({ error: "accountId and title are required" });

    const [account] = await db.select().from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, req.session.userId!), eq(accounts.platform, "youtube")));
    if (!account) return res.status(404).json({ error: "YouTube account not found" });

    let accessToken = account.accessToken;
    if (account.expiresAt && account.expiresAt < new Date() && account.refreshToken) {
      const refreshed = await refreshGoogleToken(account.refreshToken);
      accessToken = refreshed.accessToken;
      await db.update(accounts).set({ accessToken, expiresAt: refreshed.expiresAt }).where(eq(accounts.id, account.id));
    }

    const [post] = await db.insert(posts).values({
      userId: req.session.userId!,
      accountId,
      platform: "youtube",
      title,
      description: description ?? "",
      tags: tags ? JSON.parse(tags) : [],
      privacyStatus: (privacyStatus ?? "private") as "public" | "unlisted" | "private",
      status: "uploading",
      uploadProgress: 0,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    }).returning();

    res.status(202).json({ postId: post.id });

    (async () => {
      try {
        const result = await uploadWithProgress({
          accessToken, title, description: description ?? "",
          tags: tags ? JSON.parse(tags) : [],
          privacyStatus: (privacyStatus ?? "private") as "public" | "unlisted" | "private",
          publishAt: scheduledAt ?? null,
          videoBuffer: req.file!.buffer,
          mimeType: req.file!.mimetype || "video/mp4",
        }, async (pct) => {
          await db.update(posts).set({ uploadProgress: pct }).where(eq(posts.id, post.id));
        });

        await db.update(posts).set({
          status: scheduledAt ? "scheduled" : "published",
          platformPostId: result.videoId,
          publishedAt: scheduledAt ? null : new Date(),
          uploadProgress: 100,
        }).where(eq(posts.id, post.id));
      } catch (err) {
        await db.update(posts).set({
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Upload failed",
        }).where(eq(posts.id, post.id));
      }
    })();
  }
);

export default router;
