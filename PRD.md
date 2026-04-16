# Occium — Product Requirements Document
**Version**: 1.0  
**Date**: April 16, 2026  
**Status**: Ready to Ship

---

## 1. What We Are Building

A single-user content operations system that:
1. Imports a YouTube video URL → extracts metadata (title, description, thumbnail, tags)
2. Uses that metadata to AI-ghostwrite a LinkedIn post (via a local LLM call — no paid API)
3. Lets the user edit both, schedule them, and publish to YouTube + LinkedIn
4. Tracks everything in a persistent database

No SaaS fees. No third-party scheduling APIs. No Postiz cloud. We extract only the
open-source OAuth + posting patterns from Postiz and wire them directly into our stack.

---

## 2. What We Are NOT Building (Scope Cuts for Day 1)

- Multi-user / team accounts
- Twitter, Instagram, TikTok
- Analytics dashboards (post-launch)
- Paid AI APIs (Gemini, OpenAI) — we use a free local model or a free-tier key
- Bulk batch scheduling (post-launch)

---

## 3. The Core User Loop

```
[User pastes YouTube URL]
        ↓
[Backend fetches metadata via YouTube Data API v3]
        ↓
[AI ghostwrites LinkedIn post from metadata]
        ↓
[User edits title, description, LinkedIn copy, schedule date]
        ↓
[User clicks Publish / Schedule]
        ↓
[Backend posts to LinkedIn via OAuth]
[Backend uploads/schedules to YouTube via OAuth + publishAt]
        ↓
[Post saved to DB with status: scheduled | published]
        ↓
[Dashboard shows live queue + status]
```

---

## 4. Google Cloud APIs — What to Enable

Enable these in one Google Cloud Project (free):

| API | Purpose | Cost |
|-----|---------|------|
| **YouTube Data API v3** | Fetch video metadata (title, description, thumbnail, tags, channel info) | Free — 10,000 units/day. Metadata fetch = ~1 unit. Upload = 1,600 units. Plenty for personal use. |
| **Google OAuth 2.0** | Auth the user's Google account to get a refresh token for YouTube uploads | Free |
| **YouTube upload scope** | `https://www.googleapis.com/auth/youtube.upload` | Free |
| **YouTube readonly scope** | `https://www.googleapis.com/auth/youtube.readonly` | Free |

**Do NOT enable**: YouTube Analytics API (not needed day 1), Cloud Storage, Pub/Sub.

### OAuth Credentials to Create
- Type: **Web Application**
- Authorized JS Origins: `http://localhost:3000` (dev) + your Vercel URL (prod)
- Authorized Redirect URIs: `http://localhost:4000/auth/google/callback` (backend)

---

## 5. LinkedIn API — What to Use

LinkedIn's free developer tier (no paid plan needed):

| Scope | Purpose |
|-------|---------|
| `openid` + `profile` + `email` | Sign in, get person URN |
| `w_member_social` | Post text + link posts to personal profile |

**Endpoint used**: `POST https://api.linkedin.com/v2/ugcPosts`  
**Auth flow**: Standard OAuth 2.0 Authorization Code flow  
**Redirect URI**: `http://localhost:4000/auth/linkedin/callback`

**What Postiz does that we borrow**: Their LinkedIn provider (`libs/nestjs-libraries/src/integrations/social/linkedin.provider.ts`) handles the OAuth dance and the UGC post payload. We extract that pattern — not their code verbatim — and implement it cleanly in our Express backend.

---

## 6. AI Ghostwriter — Zero Cost Strategy

**Option A (Recommended for Day 1)**: Google Gemini Flash 2.0  
- Free tier: 15 requests/minute, 1M tokens/day  
- No credit card required for the free tier  
- API key from `aistudio.google.com`  
- Single prompt: feed video title + description → get LinkedIn post

**Option B (Fully offline)**: Ollama running `llama3.2:3b` locally  
- Zero cost, zero API calls  
- Requires user to have Ollama installed  
- Good for dev, not for Vercel deployment

**Day 1 decision**: Gemini Flash free tier. One env var: `GEMINI_API_KEY`.

---

## 7. Tech Stack Decision

### Frontend (already built)
- React 19 + Tailwind + Framer Motion — keep as-is
- Deployed on **Vercel** (free, already configured)

### Backend (to build)
- **Runtime**: Node.js + Express (not NestJS — too heavy for day 1 speed)
- **ORM**: Drizzle ORM (lightweight, TypeScript-native, works perfectly with Neon)
- **Auth**: Better Auth (already in the skills directory — handles Google + LinkedIn OAuth)
- **Job Queue**: `node-cron` for scheduled posts (no Redis needed day 1)
- **File handling**: None — we use YouTube's `publishAt` field for scheduling, no yt-dlp

### Database
- **Neon PostgreSQL** (free tier)
  - 0.5 GB storage, scale-to-zero, no credit card required
  - Serverless Postgres — perfect for a low-traffic personal tool
  - Works natively with Drizzle ORM
  - Better free tier than Supabase for pure DB needs (Supabase bundles auth/storage we don't need)

### Backend Deployment
- **Railway** (recommended)
  - $5/month free credit (Hobby plan) — enough for a Node.js API with low traffic
  - One-click deploy from GitHub
  - Native environment variable management
  - No sleep/cold start on paid tier (unlike Render free)
  - Alternatively: **Render** free tier works but sleeps after 15 min inactivity

---

## 8. Full Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Vercel (Frontend)                                       │
│  React 19 + Tailwind                                     │
│  - Landing, Dashboard, Composer, Queue, AI Studio        │
│  - Calls backend via REACT_APP_API_URL                   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS REST
                       ↓
┌─────────────────────────────────────────────────────────┐
│  Railway (Backend API)                                   │
│  Node.js + Express                                       │
│                                                          │
│  /auth/google          → Google OAuth flow               │
│  /auth/linkedin        → LinkedIn OAuth flow             │
│  /api/youtube/metadata → Fetch video info from YT API    │
│  /api/youtube/upload   → Upload + schedule via YT API    │
│  /api/linkedin/post    → Post via LinkedIn UGC API       │
│  /api/ai/ghostwrite    → Gemini Flash prompt             │
│  /api/posts            → CRUD for post queue             │
│  /api/accounts         → Connected account management    │
│                                                          │
│  node-cron             → Fires scheduled posts           │
└──────────────────────┬──────────────────────────────────┘
                       │ Drizzle ORM
                       ↓
┌─────────────────────────────────────────────────────────┐
│  Neon PostgreSQL (Free Tier)                             │
│                                                          │
│  Tables:                                                 │
│  - users (id, name, email, picture)                      │
│  - accounts (id, user_id, platform, access_token,        │
│              refresh_token, expires_at, profile_data)    │
│  - posts (id, user_id, platform, title, description,     │
│           thumbnail_url, tags, status, scheduled_at,     │
│           published_at, platform_post_id, source_url)    │
│  - sessions (Better Auth managed)                        │
└─────────────────────────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ↓                         ↓
┌──────────────────┐    ┌──────────────────────────┐
│  YouTube API v3  │    │  LinkedIn API v2          │
│  - metadata      │    │  - UGC Posts endpoint     │
│  - upload        │    │  - OAuth token exchange   │
│  - publishAt     │    │                           │
└──────────────────┘    └──────────────────────────┘
          │
          ↓
┌──────────────────┐
│  Gemini Flash    │
│  (free tier)     │
│  - ghostwrite    │
└──────────────────┘
```

---

## 9. Database Schema (Drizzle)

```typescript
// users
id: uuid PK
email: text UNIQUE
name: text
picture: text
created_at: timestamp

// accounts
id: uuid PK
user_id: uuid FK → users.id
platform: enum('youtube', 'linkedin')
account_name: text
profile_picture: text
access_token: text (encrypted)
refresh_token: text (encrypted)
expires_at: timestamp
channel_id: text (YouTube only)
linkedin_urn: text (LinkedIn only)
created_at: timestamp

// posts
id: uuid PK
user_id: uuid FK → users.id
account_id: uuid FK → accounts.id
platform: enum('youtube', 'linkedin')
source_url: text
title: text
description: text
thumbnail_url: text
tags: text[]
privacy_status: enum('public', 'unlisted', 'private')
status: enum('draft', 'scheduled', 'published', 'failed')
scheduled_at: timestamp
published_at: timestamp
platform_post_id: text
error_message: text
created_at: timestamp
```

---

## 10. API Endpoints (Express)

### Auth
```
GET  /auth/google                    → Redirect to Google OAuth
GET  /auth/google/callback           → Exchange code, store tokens, set session
GET  /auth/linkedin                  → Redirect to LinkedIn OAuth
GET  /auth/linkedin/callback         → Exchange code, store tokens
POST /auth/logout                    → Clear session
GET  /auth/me                        → Return current user + accounts
```

### YouTube
```
GET  /api/youtube/metadata?url=      → Fetch title, description, thumbnail, tags
POST /api/youtube/upload             → Upload video + set publishAt
GET  /api/youtube/channel            → Get connected channel info
```

### LinkedIn
```
POST /api/linkedin/post              → Create UGC post (immediate or scheduled)
```

### AI
```
POST /api/ai/ghostwrite              → Input: {title, description, tags} → Output: {linkedinPost}
```

### Posts (internal queue)
```
GET    /api/posts                    → List all posts for user
POST   /api/posts                    → Create draft
PATCH  /api/posts/:id                → Update post
DELETE /api/posts/:id                → Delete post
```

### Accounts
```
GET    /api/accounts                 → List connected accounts
DELETE /api/accounts/:id             → Disconnect account
```

---

## 11. What We Extract from Postiz (Pattern, Not Code)

Postiz's value for us is their OAuth + posting patterns. We study:

1. **LinkedIn OAuth flow** — `apps/backend/src/app/auth/` — how they handle the code exchange and store tokens
2. **LinkedIn UGC post payload** — `libs/nestjs-libraries/src/integrations/social/linkedin.provider.ts` — the exact JSON shape for `POST /v2/ugcPosts`
3. **YouTube upload flow** — how they handle resumable uploads and `publishAt`

We do NOT copy their NestJS/Temporal/Prisma stack. We implement the same API calls in plain Express + Drizzle. This keeps us under AGPL-3.0 compliance (we're not distributing their code, we're reading their patterns as reference).

---

## 12. Implementation Phases (Ship Today)

### Phase 1 — Backend Scaffold (2 hours)
- [ ] Create `backend/` directory with Express + TypeScript
- [ ] Setup Drizzle + Neon connection
- [ ] Run migrations (create tables)
- [ ] Health check endpoint
- [ ] CORS configured for localhost:3000

### Phase 2 — Auth (2 hours)
- [ ] Better Auth setup with Google provider
- [ ] LinkedIn OAuth manual flow (Better Auth doesn't have LinkedIn built-in)
- [ ] Session management (cookie-based)
- [ ] `/auth/me` endpoint wired to frontend

### Phase 3 — YouTube Metadata (1 hour)
- [ ] `GET /api/youtube/metadata?url=` using YouTube Data API v3
- [ ] Wire to Composer frontend — auto-fill title/description/thumbnail on URL paste

### Phase 4 — AI Ghostwriter (1 hour)
- [ ] `POST /api/ai/ghostwrite` calling Gemini Flash
- [ ] Wire to AI Studio + Composer "Ghostwrite" button

### Phase 5 — LinkedIn Posting (2 hours)
- [ ] LinkedIn OAuth callback + token storage
- [ ] `POST /api/linkedin/post` with UGC payload
- [ ] Scheduled posts via node-cron

### Phase 6 — YouTube Upload (2 hours)
- [ ] YouTube upload endpoint using resumable upload API
- [ ] `publishAt` scheduling
- [ ] Progress tracking stored in DB

### Phase 7 — Frontend Wiring (2 hours)
- [ ] Replace all `console.log('UI shell: ...')` stubs with real API calls
- [ ] WorkspaceContext fetches real data from backend
- [ ] AuthContext uses real session
- [ ] Dashboard shows real post counts

### Phase 8 — Deploy (1 hour)
- [ ] Push backend to Railway
- [ ] Set env vars in Railway dashboard
- [ ] Update Vercel env vars with Railway URL
- [ ] Test end-to-end

**Total estimated time: ~13 hours**

---

## 13. Environment Variables

### Backend (Railway)
```
DATABASE_URL=postgresql://...neon.tech/occium
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
YOUTUBE_API_KEY=
GEMINI_API_KEY=
SESSION_SECRET=
FRONTEND_URL=https://occium-contentsystem-linkedin-yt.vercel.app
PORT=4000
```

### Frontend (Vercel)
```
REACT_APP_API_URL=https://your-backend.railway.app
REACT_APP_GOOGLE_CLIENT_ID=
REACT_APP_LINKEDIN_CLIENT_ID=
```

---

## 14. Free Tier Cost Summary

| Service | Free Tier | Limit Before Paying |
|---------|-----------|---------------------|
| Vercel | Free | 100GB bandwidth/mo |
| Railway | $5 credit/mo | ~500 hours compute |
| Neon PostgreSQL | Free | 0.5 GB storage |
| YouTube Data API | Free | 10,000 units/day |
| LinkedIn API | Free | Rate limits apply |
| Gemini Flash | Free | 15 req/min, 1M tokens/day |
| **Total monthly cost** | **$0** | — |

---

## 15. What Ships on Day 1 vs Later

### Day 1
- Connect YouTube account (Google OAuth)
- Connect LinkedIn account (LinkedIn OAuth)
- Paste YouTube URL → auto-fill metadata
- AI ghostwrite LinkedIn post from video metadata
- Edit + schedule both posts
- Publish to LinkedIn immediately or at scheduled time
- Upload to YouTube with `publishAt` scheduling
- Dashboard shows real queue

### Post-Launch
- Bulk batch scheduling
- YouTube Analytics pull
- Multi-user support
- Twitter/X integration
- RSS feed auto-import
- Thumbnail AI generation
