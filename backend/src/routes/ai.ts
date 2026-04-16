import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { ghostwriteLinkedInPost } from "../services/gemini.service";

const router = Router();

// POST /api/ai/ghostwrite
router.post("/ghostwrite", requireAuth, async (req: Request, res: Response) => {
  const { title, description, tags, voiceProfile } = req.body as {
    title: string;
    description?: string;
    tags?: string[];
    voiceProfile?: string;
  };

  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }

  try {
    const post = await ghostwriteLinkedInPost({
      title,
      description: description ?? "",
      tags: tags ?? [],
      voiceProfile,
    });

    res.json({ post });
  } catch (err) {
    console.error("[ai ghostwrite]", err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

export default router;
