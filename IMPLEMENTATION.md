# Occium — Implementation Plan
**Version**: 1.0  
**Date**: April 16, 2026  
**Status**: Pre-build — awaiting credentials

This document is the handoff contract between you (credentials + decisions) and the
build agent (code). Fill in every section marked **[YOU PROVIDE]** before we start.
Everything else is already decided.

---

## Part 1 — Credentials You Need to Gather

Before any code is written, collect these. Each section tells you exactly where to get it.

---

### 1.1 Google Cloud Project

**Where**: [console.cloud.google.com](https://console.cloud.google.com)

**Steps**:
1. Create a new project — name it `occium`
2. Go to **APIs & Services → Library**
3. Enable: **YouTube Data API v3**
4. Go to **APIs & Services → OAuth consent screen**
   - User type: External
   - App name: Occium
   - Scopes to add: `youtube.upload`, `youtube.readonly`, `userinfo.email`, `userinfo.profile`
   - Test users: add your own Google email
5. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:4000/auth/google/callback`
6. Go to **APIs & Services → Credentials → Create Credentials → API Key**
   - Restrict it to: YouTube Data API v3

**Keys to collect**:
```
GOOGLE_CLIENT_ID=        [YOU PROVIDE]
GOOGLE_CLIENT_SECRET=    [YOU PROVIDE]
YOUTUBE_API_KEY=         [YOU PROVIDE]
```

---

### 1.2 LinkedIn Developer App

**Where**: [developer.linkedin.com/apps](https://developer.linkedin.com/apps)

**Steps**:
1. Create a new app — name it `Occium`
2. Associate it with a LinkedIn Company Page (required — create a dummy one if needed)
3. Go to **Auth** tab
   - Add OAuth 2.0 redirect URL: `http://localhost:4000/auth/linkedin/callback`
4. Go to **Products** tab
   - Request access to: **Sign In with LinkedIn using OpenID Connect**
   - Request access to: **Share on LinkedIn**
   - Both are auto-approved instantly for personal use
5. Go to **Auth** tab → copy Client ID and Client Secret

**Keys to collect**:
```
LINKEDIN_CLIENT_ID=      [YOU PROVIDE]
LINKEDIN_CLIENT_SECRET=  [YOU PROVIDE]
```

---

### 1.3 Neon PostgreSQL Database

**Where**: [neon.tech](https://neon.tech) — free, no credit card

**Steps**:
1. Sign up / log in
2. Create a new project — name it `occium`
3. Create a database named `occium`
4. Go to **Dashboard → Connection string**
5. Copy the connection string (format: `postgresql://user:pass@host/occium?sslmode=require`)

**Keys to collect**:
```
DATABASE_URL=            [YOU PROVIDE]
```

---

### 1.4 Gemini API Key (AI Ghostwriter)

**Where**: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

**Steps**:
1. Sign in with your Google account
2. Click **Create API Key**
3. Select the `occium` Google Cloud project you created above
4. Copy the key

**Keys to collect**:
```
GEMINI_API_KEY=          [YOU PROVIDE]
```

---

### 1.5 Session Secret

Generate a random 64-character string. You can use this command in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Keys to collect**:
```
SESSION_SECRET=          [YOU PROVIDE — generate with command above]
```

---

### 1.6 Railway (Backend Deployment)

**Where**: [railway.app](https://railway.app)

**Steps**:
1. Sign up with GitHub
2. Do NOT create a project yet — we'll do that when the backend code is ready
3. Just confirm your account is active

**No keys needed yet** — Railway env vars are set after deploy.

---

## Part 2 — Dev Environment Requirements

What needs to be installed on your machine before I start writing code.

### 2.1 Required (check these now)

```bash
node --version    # Need v18+ (you have v25 ✓)
npm --version     # Need v9+
git --version     # Any version
```

### 2.2 Install if missing

```bash
# TypeScript compiler (global)
npm install -g typescript ts-node

# Drizzle Kit (for running migrations)
npm install -g drizzle-kit
```

### 2.3 Verify frontend still runs

```bash
# In the frontend/ directory
npm start
# Should open http://localhost:3000
```

---

## Part 3 — MCP Servers (Optional but Powerful)

If you want me to interact with your services directly during the build (query the DB,
check Railway logs, etc.), set up these MCPs. They are optional — I can build without
them, but they make debugging and iteration much faster.

### 3.1 Supabase / Neon MCP (Database)

Lets me run SQL queries directly against your Neon database to verify migrations,
inspect data, and debug schema issues without you having to copy-paste query results.

**MCP to install**: `@neondatabase/mcp-server-neon`

Add to your `.kiro/settings/mcp.json`:
```json
{
  "mcpServers": {
    "neon": {
      "command": "npx",
      "args": ["-y", "@neondatabase/mcp-server-neon", "start"],
      "env": {
        "DATABASE_URL": "[YOUR NEON DATABASE_URL]"
      }
    }
  }
}
```

### 3.2 GitHub MCP (Source Control)

Lets me create branches, commit code, and open PRs directly. Useful if you want
version control on each phase.

**MCP to install**: `@modelcontextprotocol/server-github`

Add to `.kiro/settings/mcp.json`:
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "[YOUR GITHUB PAT]"
      }
    }
  }
}
```

**How to get a GitHub PAT**:
1. GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. Generate new token → scopes: `repo`, `workflow`
3. Copy the token

### 3.3 Filesystem MCP (already available via Kiro tools)

No setup needed — I already have full read/write access to your workspace.

---

## Part 4 — What I Will Build (File Map)

Once you hand over the keys, here is exactly what gets created:

```
backend/
├── src/
│   ├── index.ts                  ← Express app entry point
│   ├── config/
│   │   └── env.ts                ← Typed env var loader (zod validation)
│   ├── db/
│   │   ├── client.ts             ← Neon + Drizzle connection
│   │   ├── schema.ts             ← All table definitions
│   │   └── migrations/           ← Auto-generated by drizzle-kit
│   ├── auth/
│   │   ├── google.ts             ← Google OAuth flow (passport-google-oauth20)
│   │   ├── linkedin.ts           ← LinkedIn OAuth flow (manual, no passport)
│   │   └── session.ts            ← express-session + connect-pg-simple
│   ├── routes/
│   │   ├── auth.ts               ← /auth/* endpoints
│   │   ├── youtube.ts            ← /api/youtube/* endpoints
│   │   ├── linkedin.ts           ← /api/linkedin/* endpoints
│   │   ├── ai.ts                 ← /api/ai/ghostwrite
│   │   ├── posts.ts              ← /api/posts CRUD
│   │   └── accounts.ts           ← /api/accounts CRUD
│   ├── services/
│   │   ├── youtube.service.ts    ← YouTube API v3 calls
│   │   ├── linkedin.service.ts   ← LinkedIn UGC API calls
│   │   ├── gemini.service.ts     ← Gemini Flash calls
│   │   └── scheduler.service.ts  ← node-cron job runner
│   ├── middleware/
│   │   ├── auth.middleware.ts    ← requireAuth guard
│   │   └── error.middleware.ts   ← Global error handler
│   └── types/
│       └── index.ts              ← Shared TypeScript types
├── drizzle.config.ts             ← Drizzle Kit config
├── package.json
├── tsconfig.json
└── .env                          ← Local dev secrets (git-ignored)

frontend/src/
├── lib/
│   └── api.ts                    ← NEW: Axios client pointing to backend
├── context/
│   ├── AuthContext.jsx           ← UPDATED: real session from /auth/me
│   └── WorkspaceContext.jsx      ← UPDATED: real data from /api/posts + /api/accounts
└── pages/
    ├── Accounts.jsx              ← UPDATED: real connect/disconnect
    ├── NewPost.jsx               ← UPDATED: real metadata fetch + submit
    ├── Queue.jsx                 ← UPDATED: real scheduled posts
    ├── Dashboard.jsx             ← UPDATED: real stats
    └── AIStudio.jsx              ← UPDATED: real ghostwrite call
```

---

## Part 5 — Build Phases (Detailed)

### Phase 1 — Backend Scaffold
**Time**: ~45 min  
**What I do**: Create `backend/` with Express + TypeScript + Drizzle + Neon connection.
Run first migration. Verify DB tables exist.

**You need**: `DATABASE_URL` from Neon

**Done when**: `GET http://localhost:4000/health` returns `{ status: "ok", db: "connected" }`

---

### Phase 2 — Auth (Google + LinkedIn OAuth)
**Time**: ~1.5 hours  
**What I do**:
- Google OAuth: `passport-google-oauth20` → on callback, upsert user in DB, store
  access_token + refresh_token in `accounts` table, set session cookie
- LinkedIn OAuth: manual PKCE flow → exchange code at
  `https://www.linkedin.com/oauth/v2/accessToken` → fetch profile from
  `https://api.linkedin.com/v2/userinfo` → store in `accounts` table

**You need**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `LINKEDIN_CLIENT_ID`,
`LINKEDIN_CLIENT_SECRET`, `SESSION_SECRET`

**Done when**:
- Clicking "Link Channel" in Accounts page opens Google OAuth popup
- Clicking "Link Account" opens LinkedIn OAuth redirect
- Both return to the app with the account showing in the Accounts page

---

### Phase 3 — YouTube Metadata Fetch
**Time**: ~30 min  
**What I do**:
- `GET /api/youtube/metadata?url=<youtube_url>`
- Parses video ID from URL (handles `watch?v=`, `youtu.be/`, `/shorts/`)
- Calls `youtube.googleapis.com/youtube/v3/videos?part=snippet&id=<videoId>&key=<API_KEY>`
- Returns: `{ title, description, thumbnail, tags, channelTitle, publishedAt }`
- Frontend Composer auto-fills fields on URL paste (debounced 800ms)

**You need**: `YOUTUBE_API_KEY`

**Done when**: Pasting a YouTube URL in the Composer auto-fills title, description,
and shows the thumbnail preview

---

### Phase 4 — AI Ghostwriter
**Time**: ~30 min  
**What I do**:
- `POST /api/ai/ghostwrite` body: `{ title, description, tags, voiceProfile }`
- Calls Gemini Flash 2.0: `generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- Prompt template:
  ```
  You are a LinkedIn ghostwriter for a content creator.
  Write a compelling LinkedIn post based on this YouTube video:
  Title: {title}
  Description: {description}
  Tags: {tags}
  Voice: {voiceProfile} (Professional / Casual / Viral)
  
  Rules:
  - Max 1300 characters
  - Start with a hook, not "I"
  - End with a question or CTA
  - No hashtag spam (max 3)
  - Return only the post text, nothing else
  ```
- Returns: `{ post: string }`

**You need**: `GEMINI_API_KEY`

**Done when**: Clicking "Ghostwrite" in the Composer fills the LinkedIn textarea with
a real AI-generated post

---

### Phase 5 — LinkedIn Posting
**Time**: ~1.5 hours  
**What I do**:
- `POST /api/linkedin/post` body: `{ accountId, text, linkUrl?, linkTitle?, scheduledAt? }`
- If `scheduledAt` is null → post immediately via LinkedIn UGC API
- If `scheduledAt` is set → save to DB with status `scheduled`, node-cron fires it
- UGC payload shape (from Postiz pattern):
  ```json
  {
    "author": "urn:li:person:{personId}",
    "lifecycleState": "PUBLISHED",
    "specificContent": {
      "com.linkedin.ugc.ShareContent": {
        "shareCommentary": { "text": "{postText}" },
        "shareMediaCategory": "ARTICLE",
        "media": [{
          "status": "READY",
          "originalUrl": "{linkUrl}",
          "title": { "text": "{linkTitle}" }
        }]
      }
    },
    "visibility": { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
  }
  ```
- Token refresh: if `expires_at` < now, use refresh_token to get new access_token

**You need**: LinkedIn account connected (Phase 2 done)

**Done when**: Clicking "Post Now" in the Composer creates a real LinkedIn post visible
on your profile

---

### Phase 6 — YouTube Upload + Scheduling
**Time**: ~1.5 hours  
**What I do**:
- `POST /api/youtube/upload` body: `{ accountId, sourceUrl, title, description, tags, privacyStatus, publishAt? }`
- Uses YouTube resumable upload API:
  1. Initiate: `POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable`
  2. Upload bytes in chunks (handles large files)
  3. If `publishAt` is set → set `status.privacyStatus = "private"` + `status.publishAt = ISO8601`
     (YouTube holds it and publishes automatically — no cron needed for YouTube)
- Progress stored in DB: `posts.upload_progress` (0-100)
- Frontend polls `GET /api/posts/:id` every 3s while status is `uploading`

**You need**: YouTube account connected (Phase 2 done)

**Done when**: Uploading a video from the Composer creates a real YouTube video
(private or scheduled)

---

### Phase 7 — Frontend Wiring
**Time**: ~1.5 hours  
**What I do**:
- Create `frontend/src/lib/api.ts` — Axios instance with `baseURL = REACT_APP_API_URL`,
  `withCredentials: true` (for session cookies)
- `AuthContext.jsx` — on mount, call `GET /auth/me` → set user + accounts in state
- `WorkspaceContext.jsx` — fetch `GET /api/posts` + `GET /api/accounts` → real data
- `Accounts.jsx` — connect buttons redirect to `/auth/google` and `/auth/linkedin`
- `NewPost.jsx` — URL paste triggers metadata fetch, Ghostwrite button calls AI,
  submit calls upload/post endpoints
- `Queue.jsx` — reads real scheduled posts from DB
- `Dashboard.jsx` — real counts from workspace state

**Done when**: Full end-to-end flow works locally with no stubs

---

### Phase 8 — Deploy
**Time**: ~45 min  
**What I do**:
1. Add `Procfile` to backend: `web: node dist/index.js`
2. Push backend to GitHub (or Railway direct deploy)
3. Create Railway project → connect repo → set all env vars
4. Update Google OAuth redirect URI to Railway URL
5. Update LinkedIn redirect URI to Railway URL
6. Update Vercel env: `REACT_APP_API_URL=https://your-app.railway.app`
7. Redeploy Vercel frontend
8. Smoke test end-to-end on production

**Done when**: Full flow works on the live Vercel URL

---

## Part 6 — The `.env` File I Need You to Create

Once you have all the keys from Part 1, create this file at `backend/.env`:

```bash
# Database
DATABASE_URL=postgresql://[user]:[pass]@[host]/occium?sslmode=require

# Google / YouTube
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
YOUTUBE_API_KEY=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# AI
GEMINI_API_KEY=

# Session
SESSION_SECRET=

# App
PORT=4000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

And this file at `frontend/.env.local`:

```bash
REACT_APP_API_URL=http://localhost:4000
REACT_APP_GOOGLE_CLIENT_ID=   # same as GOOGLE_CLIENT_ID above
REACT_APP_LINKEDIN_CLIENT_ID= # same as LINKEDIN_CLIENT_ID above
```

**Both files are already in `.gitignore` — they will never be committed.**

---

## Part 7 — Checklist Before We Start Building

Hand this back to me with all boxes checked:

```
[ ] Google Cloud project created, YouTube Data API v3 enabled
[ ] Google OAuth credentials created (Web App type)
[ ] GOOGLE_CLIENT_ID collected
[ ] GOOGLE_CLIENT_SECRET collected
[ ] YOUTUBE_API_KEY collected

[ ] LinkedIn Developer App created
[ ] "Sign In with LinkedIn using OpenID Connect" product added
[ ] "Share on LinkedIn" product added
[ ] LINKEDIN_CLIENT_ID collected
[ ] LINKEDIN_CLIENT_SECRET collected

[ ] Neon account created, database named "occium" created
[ ] DATABASE_URL collected

[ ] Gemini API key generated at aistudio.google.com
[ ] GEMINI_API_KEY collected

[ ] SESSION_SECRET generated (node crypto command above)

[ ] backend/.env file created with all values filled in
[ ] frontend/.env.local file created

[ ] (Optional) Neon MCP configured in .kiro/settings/mcp.json
[ ] (Optional) GitHub MCP configured in .kiro/settings/mcp.json
[ ] (Optional) Railway account created
```

Once all boxes are checked, reply with:
> "Ready — keys are in place"

And I will start Phase 1 immediately.

---

## Part 8 — Questions I Need Answered Before Building

These affect implementation decisions. Answer them now so I don't have to stop mid-build.

**Q1: YouTube upload source**
The Composer currently has a "Source URL" field for a YouTube URL. Are you:
- (A) Re-uploading an existing YouTube video to your own channel (download + re-upload)
- (B) Uploading a local video file from your computer
- (C) Both

> Answer: [YOU DECIDE]

**Q2: LinkedIn post type**
When posting to LinkedIn, do you want:
- (A) Text only post
- (B) Text + link preview (article share)
- (C) Text + image
- (D) All of the above

> Answer: [YOU DECIDE]

**Q3: Single user or multi-user**
The PRD says single-user for Day 1. Confirm:
- (A) Yes, just me — no login screen needed, auto-login as the first user in DB
- (B) I want a simple email/password login so others can use it too

> Answer: [YOU DECIDE]

**Q4: Scheduling precision**
For LinkedIn scheduled posts (node-cron fires them):
- (A) Minute-level precision is fine (cron runs every minute)
- (B) I need exact second-level precision

> Answer: [YOU DECIDE — A is fine for content scheduling]

**Q5: Video source for YouTube upload**
If you chose (A) or (C) in Q1 — re-uploading from a YouTube URL — this requires
downloading the video first (yt-dlp). Do you want:
- (A) Yes, include yt-dlp download → re-upload pipeline (adds complexity, ~1 extra hour)
- (B) No, local file upload only for now (simpler, ships faster)

> Answer: [YOU DECIDE]
