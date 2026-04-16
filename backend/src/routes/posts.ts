import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { db } from "../db/client";
import { posts } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// GET /api/posts/:id
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, req.session.userId!)));
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

// GET /api/posts
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.userId, req.session.userId!))
      .orderBy(desc(posts.createdAt));

    res.json(userPosts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// POST /api/posts — create draft
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const {
    accountId,
    platform,
    sourceUrl,
    title,
    description,
    thumbnailUrl,
    tags,
    privacyStatus,
    scheduledAt,
  } = req.body;

  try {
    const [post] = await db
      .insert(posts)
      .values({
        userId: req.session.userId!,
        accountId,
        platform,
        sourceUrl,
        title,
        description,
        thumbnailUrl,
        tags,
        privacyStatus,
        status: "draft",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      })
      .returning();

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to create post" });
  }
});

// PATCH /api/posts/:id
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const [post] = await db
      .update(posts)
      .set({ ...req.body, scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined })
      .where(and(eq(posts.id, id), eq(posts.userId, req.session.userId!)))
      .returning();
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to update post" });
  }
});

// DELETE /api/posts/:id
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    await db.delete(posts).where(and(eq(posts.id, id), eq(posts.userId, req.session.userId!)));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post" });
  }
});

export default router;
