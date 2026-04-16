import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { postToLinkedIn } from "../services/linkedin.service";
import { db } from "../db/client";
import { accounts, posts } from "../db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// POST /api/linkedin/post
router.post("/post", requireAuth, async (req: Request, res: Response) => {
  const { accountId, text, linkUrl, linkTitle, scheduledAt } = req.body as {
    accountId: string;
    text: string;
    linkUrl?: string;
    linkTitle?: string;
    scheduledAt?: string;
  };

  if (!accountId || !text) {
    return res.status(400).json({ error: "accountId and text are required" });
  }

  try {
    const [account] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.id, accountId),
          eq(accounts.userId, req.session.userId!),
          eq(accounts.platform, "linkedin")
        )
      );

    if (!account) {
      return res.status(404).json({ error: "LinkedIn account not found" });
    }

    // If scheduled — save to DB and let cron handle it
    if (scheduledAt) {
      const [post] = await db
        .insert(posts)
        .values({
          userId: req.session.userId!,
          accountId,
          platform: "linkedin",
          description: text,
          sourceUrl: linkUrl,
          title: linkTitle,
          status: "scheduled",
          scheduledAt: new Date(scheduledAt),
        })
        .returning();

      return res.json({ scheduled: true, postId: post.id });
    }

    // Immediate post
    const result = await postToLinkedIn({
      accessToken: account.accessToken,
      personUrn: account.linkedinUrn ?? "",
      text,
      linkUrl,
      linkTitle,
    });

    // Save to DB
    const [post] = await db
      .insert(posts)
      .values({
        userId: req.session.userId!,
        accountId,
        platform: "linkedin",
        description: text,
        sourceUrl: linkUrl,
        title: linkTitle,
        status: "published",
        publishedAt: new Date(),
        platformPostId: result.postId,
      })
      .returning();

    res.json({ published: true, postId: post.id, linkedinPostId: result.postId, postUrl: result.postUrl });
  } catch (err) {
    console.error("[linkedin post]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to post" });
  }
});

export default router;
