# Occium — Phase 3 Plan
**Date**: April 16, 2026

---

## Answers to Your Questions

### Database: Neon vs Supabase

**Keep Neon only.** Supabase would duplicate what we already have. The only thing Supabase adds is built-in auth, storage, and realtime — we don't need any of those since we have our own OAuth flows. Adding Supabase now creates two databases to sync and two connection strings. Neon is free, already wired, schema pushed, working.

### Hosting: DigitalOcean

**Yes — DigitalOcean App Platform for production.**
- $200 free credits for 60 days (new accounts)
- Node.js native support, no Docker needed
- No cold starts (unlike Render free tier)
- Custom domain support built-in
- Railway stays for staging ($5/mo credit)

### Auth: Why It Breaks in Production

The code already handles production correctly (`NODE_ENV=production` switches `cookie.secure=true` and `sameSite="none"`). The only thing that breaks auth in production is **OAuth redirect URIs not being updated** in Google Cloud Console and LinkedIn Developer Portal. No code changes needed — just add the DigitalOcean URL to both consoles.

### YouTube API — Will Re-uploads Work?

Yes. `videos.insert` uploads any video bytes you send — it doesn't check if content originated from YouTube. You need:
- OAuth scope `youtube.upload` ← already configured
- App in "Production" mode OR uploading user is a test user
- Quota: 1,600 units per upload, 10,000 free/day = ~6 uploads/day (request increase for more)

---

## Phase 3 — Build Plan

### 3A: YouTube Import & Re-upload Flow

The exact user flow:
```
Paste YouTube URL → metadata auto-fills → user edits title/description/tags
    ↓
Select destination YouTube channel
    ↓
Choose: [Import from URL]  OR  [Upload Local File]
    ↓
Progress: download % + upload % tracked separately
    ↓
Video live on their YouTube channel with new metadata
```

**What to build:**
- `yt-dlp-wrap` Node package wraps yt-dlp binary for URL downloads
- `POST /api/youtube/import` — download from URL + re-upload pipeline
- Frontend: "Import from URL" button alongside existing file upload
- Dual progress bar: download phase + upload phase

### 3B: Multiple Accounts Per Platform

**Current bug**: Google OAuth callback upserts (overwrites) the existing YouTube account. LinkedIn does the same.

**Fix**: Remove the upsert logic. Each OAuth connect creates a NEW account row. Users can connect Channel A, then connect Channel B — both appear in the Composer dropdown.

**Schema**: Already supports multiple accounts (no migration needed).
**Composer**: Already has a `<select>` dropdown — just needs multiple options.
**Accounts page**: Already renders a list — "Add Another Channel" button just needs to trigger the OAuth flow again.

### 3C: SEO + Google Search Console + Analytics

**Landing page discoverability:**

1. `frontend/public/robots.txt` — allow all crawlers, point to sitemap
2. `frontend/public/sitemap.xml` — list the landing page URL
3. Meta tags in `frontend/public/index.html`:
   - `<meta name="description">` 
   - `<meta property="og:title">`, `og:description`, `og:image`
   - `<meta name="twitter:card">`
4. Google Analytics 4 — add `react-ga4`, fire pageview on route change
5. Google Search Console — submit sitemap after deploy

### 3D: Production Deployment to DigitalOcean

1. Create App Platform app from `slacysayan/occium` GitHub repo
2. Root directory: `backend/`
3. Build command: `npm run build`
4. Run command: `node dist/index.js`
5. Set all env vars in DigitalOcean dashboard
6. Update Google OAuth redirect URI → `https://YOUR_APP.ondigitalocean.app/auth/google/callback`
7. Update LinkedIn redirect URI → `https://YOUR_APP.ondigitalocean.app/auth/linkedin/callback`
8. Update Vercel env: `REACT_APP_API_URL=https://YOUR_APP.ondigitalocean.app`

---

## Phase 4 — Post-Launch

| Feature | Notes |
|---------|-------|
| Token encryption at rest | AES-256 for access_token + refresh_token in DB |
| Bulk playlist scheduling | Import full playlist → batch schedule posts |
| LinkedIn image posts | Attach thumbnail as image to LinkedIn post |
| yt-dlp large file streaming | Stream to YouTube instead of buffering in memory |
| Google OAuth verification | Submit app for verification to allow non-test users |

---

## Infrastructure Summary

| Layer | Dev | Production |
|-------|-----|------------|
| Frontend | localhost:3000 | Vercel (free) |
| Backend | localhost:4000 | DigitalOcean App Platform ($200 credit) |
| Database | Neon (free) | Neon (free) |
| AI | Gemini Flash free | Same |

---

## Execution Order for Phase 3

1. Fix multiple accounts (remove upsert in auth callbacks)
2. Add `yt-dlp-wrap` + `POST /api/youtube/import` endpoint
3. Update Composer with Import vs Upload choice
4. Add SEO: robots.txt, sitemap.xml, meta tags, GA4
5. Deploy backend to DigitalOcean
6. Update OAuth redirect URIs in both consoles
7. Update Vercel `REACT_APP_API_URL`
8. Smoke test full OAuth + upload flow in production
