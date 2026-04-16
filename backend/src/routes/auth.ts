import { Router, Request, Response } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "../db/client";
import { users, accounts } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { env } from "../config/env";
import {
  getLinkedInAuthUrl,
  exchangeLinkedInCode,
  fetchLinkedInProfile,
} from "../services/linkedin.service";
import crypto from "crypto";

const router = Router();

// ─── Passport Google Strategy ─────────────────────────────────────────────────

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${env.BACKEND_URL}/auth/google/callback`,
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
      ],
    },
    async (_accessToken: string, refreshToken: string, params: { expires_in?: number }, profile: { emails?: {value:string}[]; displayName?: string; photos?: {value:string}[] }, done: (err: Error | null, user?: { userId: string }) => void) => {
      try {
        const email = profile.emails?.[0]?.value ?? "";
        const name = profile.displayName ?? "";
        const picture = profile.photos?.[0]?.value ?? "";
        const accessToken = _accessToken;
        const expiresAt = params.expires_in
          ? new Date(Date.now() + Number(params.expires_in) * 1000)
          : null;

        // Upsert user
        let [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email));

        if (!user) {
          [user] = await db
            .insert(users)
            .values({ email, name, picture })
            .returning();
        }

        // Fetch the YouTube channel ID so we can distinguish multiple channels
        let channelId: string | null = null;
        let channelName = name;
        let channelPicture = picture;
        try {
          const axiosLib = (await import("axios")).default;
          const chRes = await axiosLib.get(
            "https://www.googleapis.com/youtube/v3/channels",
            {
              params: { part: "id,snippet", mine: true },
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          const ch = chRes.data.items?.[0];
          if (ch) {
            channelId = ch.id;
            channelName = ch.snippet?.title ?? name;
            channelPicture =
              ch.snippet?.thumbnails?.medium?.url ??
              ch.snippet?.thumbnails?.default?.url ??
              picture;
          } else {
            console.log("[google oauth] No YouTube channel found for this account");
          }
        } catch (chErr: unknown) {
          console.error("[google oauth] Channel fetch failed:", chErr instanceof Error ? chErr.message : chErr);
        }

        // Match by channelId to allow multiple channels per user
        const [existing] = channelId
          ? await db.select().from(accounts).where(and(eq(accounts.userId, user.id), eq(accounts.platform, "youtube"), eq(accounts.channelId, channelId)))
          : await db.select().from(accounts).where(and(eq(accounts.userId, user.id), eq(accounts.platform, "youtube")));

        if (existing) {
          await db.update(accounts).set({
            accessToken,
            refreshToken: refreshToken ?? existing.refreshToken,
            expiresAt,
            accountName: channelName,
            profilePicture: channelPicture,
            channelId: channelId ?? existing.channelId,
          }).where(eq(accounts.id, existing.id));
        } else {
          await db.insert(accounts).values({
            userId: user.id,
            platform: "youtube",
            accountName: channelName,
            profilePicture: channelPicture,
            accessToken,
            refreshToken: refreshToken ?? null,
            expiresAt,
            channelId,
          });
        }

        done(null, { userId: user.id });
      } catch (err) {
        done(err as Error);
      }
    }
  )
);

passport.serializeUser((user: Express.User, done) => done(null, user));
passport.deserializeUser((user: Express.User, done) => done(null, user));

// ─── Google OAuth Routes ──────────────────────────────────────────────────────

router.get(
  "/google",
  passport.authenticate("google", {
    accessType: "offline",
    prompt: "consent",
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${env.FRONTEND_URL}/workspace/accounts?error=google_failed` }),
  (req: Request, res: Response) => {
    const user = req.user as { userId: string };
    req.session.userId = user.userId;
    res.redirect(`${env.FRONTEND_URL}/workspace/accounts?connected=youtube`);
  }
);

// ─── LinkedIn OAuth Routes ────────────────────────────────────────────────────

router.get("/linkedin", (req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.linkedinState = state;
  res.redirect(getLinkedInAuthUrl(state));
});

router.get("/linkedin/callback", async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code) {
    return res.redirect(
      `${env.FRONTEND_URL}/workspace/accounts?error=linkedin_failed`
    );
  }

  // Only enforce state check if session has it — cross-origin cookie loss can drop the session
  const storedState = req.session.linkedinState;
  if (storedState && state !== storedState) {
    return res.redirect(
      `${env.FRONTEND_URL}/workspace/accounts?error=linkedin_state_mismatch`
    );
  }

  try {
    const { accessToken, expiresAt } = await exchangeLinkedInCode(code);
    const profile = await fetchLinkedInProfile(accessToken);

    // Ensure user exists (create if first time)
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, profile.email));

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          email: profile.email || `linkedin_${profile.urn}@occium.local`,
          name: profile.name,
          picture: profile.picture,
        })
        .returning();
    }

    // If already logged in via Google, use that userId
    const userId = req.session.userId ?? user.id;

    // Match by URN to allow multiple LinkedIn accounts per user
    const [existing] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.platform, "linkedin"), eq(accounts.linkedinUrn, profile.urn)));

    if (existing) {
      await db.update(accounts).set({
        accessToken, expiresAt,
        accountName: profile.name,
        profilePicture: profile.picture,
        linkedinUrn: profile.urn,
      }).where(eq(accounts.id, existing.id));
    } else {
      await db.insert(accounts).values({
        userId, platform: "linkedin",
        accountName: profile.name,
        profilePicture: profile.picture,
        accessToken, expiresAt,
        linkedinUrn: profile.urn,
      });
    }

    req.session.userId = userId;
    res.redirect(`${env.FRONTEND_URL}/workspace/accounts?connected=linkedin`);
  } catch (err) {
    console.error("[linkedin callback]", err);
    res.redirect(`${env.FRONTEND_URL}/workspace/accounts?error=linkedin_failed`);
  }
});

// ─── Session Routes ───────────────────────────────────────────────────────────

router.get("/me", async (req: Request, res: Response) => {
  if (!req.session?.userId) {
    return res.json({ user: null, accounts: [] });
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!user) {
      req.session.destroy(() => {});
      return res.json({ user: null, accounts: [] });
    }

    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, user.id));

    // Strip tokens from response
    const safeAccounts = userAccounts.map(({ accessToken, refreshToken, ...rest }) => rest);

    res.json({ user, accounts: safeAccounts });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie("occium.sid");
    res.json({ ok: true });
  });
});

export default router;
