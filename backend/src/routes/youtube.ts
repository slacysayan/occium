import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { fetchVideoMetadata } from "../services/youtube.service";
import { db } from "../db/client";
import { accounts } from "../db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

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

export default router;
