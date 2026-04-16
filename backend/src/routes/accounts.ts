import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { db } from "../db/client";
import { accounts } from "../db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/accounts
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, req.session.userId!));

    // Strip tokens
    const safe = userAccounts.map(({ accessToken, refreshToken, ...rest }) => rest);
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// DELETE /api/accounts/:id
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await db
      .delete(accounts)
      .where(
        and(eq(accounts.id, id), eq(accounts.userId, req.session.userId!))
      );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to disconnect account" });
  }
});

export default router;
