import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { db } from "../db/client";
import { users, accounts } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth.middleware";
import { exchangeLinkedInCode, fetchLinkedInProfile, getLinkedInAuthUrl } from "../services/linkedin.service";

const router = Router();

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── State JWT helpers ────────────────────────────────────────────────────────

function signState(userId: string): string {
  return jwt.sign(
    { userId, nonce: crypto.randomBytes(16).toString("hex") },
    env.STATE_JWT_SECRET,
    { expiresIn: "10m" }
  );
}

function verifyState(state: string): { userId: string } {
  return jwt.verify(state, env.STATE_JWT_SECRET) as { userId: string };
}

// ─── User upsert ──────────────────────────────────────────────────────────────

async function upsertUser(userId: string, token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return;
  const existing = await db.select().from(users).where(eq(users.id, userId));
  if (existing.length === 0) {
    await db.insert(users).values({
      id: userId,
      email: user.email ?? `${userId}@occium.local`,
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? "User",
      picture: user.user_metadata?.avatar_url ?? null,
    });
  }
}

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization!.slice(7);
    await upsertUser(req.userId, token);
    const [user] = await db.select().from(users).where(eq(users.id, req.userId));
    if (!user) return res.json({ user: null, accounts: [] });
    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, req.userId));
    const safeAccounts = userAccounts.map(({ accessToken, refreshToken, ...rest }) => rest);
    res.json({ user, accounts: safeAccounts });
  } catch {
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// ─── Init endpoints — return redirect URL for frontend fetch+redirect ─────────

router.get("/youtube/init", requireAuth, (req: Request, res: Response) => {
  const state = signState(req.userId);
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${env.BACKEND_URL}/auth/youtube/callback`,
    response_type: "code",
    scope: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly", "profile", "email"].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

router.get("/linkedin/init", requireAuth, (req: Request, res: Response) => {
  const state = signState(req.userId);
  res.json({ url: getLinkedInAuthUrl(state) });
});

// ─── YouTube OAuth ────────────────────────────────────────────────────────────

router.get("/youtube", requireAuth, (req: Request, res: Response) => {
  const state = signState(req.userId);
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${env.BACKEND_URL}/auth/youtube/callback`,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "profile",
      "email",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/youtube/callback", async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;
  if (error || !code || !state) {
    return res.redirect(`${env.FRONTEND_URL}/workspace/accounts?error=youtube_failed`);
  }
  let userId: string;
  try { ({ userId } = verifyState(state)); }
  catch { return res.redirect(`${env.FRONTEND_URL}/workspace/accounts?error=youtube_state_invalid`); }

  try {
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
      code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${env.BACKEND_URL}/auth/youtube/callback`, grant_type: "authorization_code",
    });
    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    let channelId: string | null = null;
    let channelName = "YouTube Channel";
    let channelPicture: string | null = null;
    try {
      const chRes = await axios.get("https://www.googleapis.com/youtube/v3/channels",
        { params: { part: "id,snippet", mine: true }, headers: { Authorization: `Bearer ${access_token}` } });
      const ch = chRes.data.items?.[0];
      if (!ch) return res.redirect(`${env.FRONTEND_URL}/workspace/accounts?error=no_youtube_channel`);
      channelId = ch.id;
      channelName = ch.snippet?.title ?? channelName;
      channelPicture = ch.snippet?.thumbnails?.medium?.url ?? ch.snippet?.thumbnails?.default?.url ?? null;
    } catch {
      return res.redirect(`${env.FRONTEND_URL}/workspace/accounts?error=no_youtube_channel`);
    }

    const [existing] = await db.select().from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.platform, "youtube"), eq(accounts.channelId, channelId!)));
    if (existing) {
      await db.update(accounts).set({
        accessToken: access_token, refreshToken: refresh_token ?? existing.refreshToken,
        expiresAt, accountName: channelName, profilePicture: channelPicture,
      }).where(eq(accounts.id, existing.id));
    } else {
      await db.insert(accounts).values({
        userId, platform: "youtube", accountName: channelName, profilePicture: channelPicture,
        accessToken: access_token, refreshToken: refresh_token ?? null, expiresAt, channelId,
      });
    }
    res.redirect(`${env.FRONTEND_URL}/workspace/accounts?connected=youtube`);
  } catch (err) {
    console.error("[youtube callback]", err);
    res.redirect(`${env.FRONTEND_URL}/workspace/accounts?error=youtube_failed`);
  }
});

// ─── LinkedIn OAuth ───────────────────────────────────────────────────────────

router.get("/linkedin", requireAuth, (req: Request, res: Response) => {
  const state = signState(req.userId);
  res.redirect(getLinkedInAuthUrl(state));
});

router.get("/linkedin/callback", async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;
  if (error || !code || !state) {
    return res.redirect(`${env.FRONTEND_URL}/workspace/accounts?error=linkedin_failed`);
  }
  let userId: string;
  try { ({ userId } = verifyState(state)); }
  catch { return res.redirect(`${env.FRONTEND_URL}/workspace/accounts?error=linkedin_state_invalid`); }

  try {
    const { accessToken, expiresAt } = await exchangeLinkedInCode(code);
    const profile = await fetchLinkedInProfile(accessToken);
    const [existing] = await db.select().from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.platform, "linkedin"), eq(accounts.linkedinUrn, profile.urn)));
    if (existing) {
      await db.update(accounts).set({
        accessToken, expiresAt, accountName: profile.name, profilePicture: profile.picture, linkedinUrn: profile.urn,
      }).where(eq(accounts.id, existing.id));
    } else {
      await db.insert(accounts).values({
        userId, platform: "linkedin", accountName: profile.name, profilePicture: profile.picture,
        accessToken, expiresAt, linkedinUrn: profile.urn,
      });
    }
    res.redirect(`${env.FRONTEND_URL}/workspace/accounts?connected=linkedin`);
  } catch (err) {
    console.error("[linkedin callback]", err);
    res.redirect(`${env.FRONTEND_URL}/workspace/accounts?error=linkedin_failed`);
  }
});

export default router;
