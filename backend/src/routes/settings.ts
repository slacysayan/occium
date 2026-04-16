import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

const REQUIRED_VARS = [
  "DATABASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "YOUTUBE_API_KEY",
  "GEMINI_API_KEY", "SESSION_SECRET", "FRONTEND_URL", "PORT",
];

router.get("/env-status", requireAuth, (_req: Request, res: Response) => {
  const status: Record<string, boolean> = {};
  for (const key of REQUIRED_VARS) status[key] = Boolean(process.env[key]);
  res.json(status);
});

export default router;
