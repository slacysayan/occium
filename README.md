# Occium — Content Operations System

**Version**: 2.0  
**Last Updated**: April 16, 2026

YouTube → LinkedIn content pipeline. Import a video, AI-ghostwrite a LinkedIn post, re-upload to your YouTube channel, schedule and publish both.

**Live**: [occium-contentsystem-linkedin-yt.vercel.app](https://occium-contentsystem-linkedin-yt.vercel.app)  
**Legal**: [Privacy](https://occium-contentsystem-linkedin-yt.vercel.app/privacy.html) | [Terms](https://occium-contentsystem-linkedin-yt.vercel.app/terms.html)

---

## Recent Updates (April 16, 2026)

### Bug Fixes
- ✅ Fixed OAuth account fetching with retry logic (3 attempts with exponential backoff)
- ✅ Improved session cookie configuration for cross-origin requests
- ✅ Added validation for YouTube channel existence before account creation
- ✅ Fixed session persistence issues in production
- ✅ Enhanced error handling in OAuth callbacks

### Changes
- Session configuration now uses `resave: false` and `saveUninitialized: false` for better performance
- OAuth redirect now waits longer (800ms → 1600ms → 2400ms) with retry logic
- YouTube accounts require a valid channel to be connected
- Better error messages when OAuth fails

---

## What It Does

1. **Import** — Paste any YouTube URL. Occium auto-fetches title, description, thumbnail, and tags via YouTube Data API v3.
2. **Ghostwrite** — One click generates a LinkedIn post from the video metadata using Google Gemini Flash.
3. **Edit** — Refine title, description, LinkedIn copy, tags, and privacy settings.
4. **YouTube Auto-Upload** — Re-upload the video to your connected YouTube channel with edited metadata, privacy status (`public` / `unlisted` / `private`), and optional scheduled publish date via `publishAt`.
5. **Publish or Schedule** — Post immediately or pick a date/time. The backend scheduler fires at the right moment.
6. **Track** — Dashboard shows the full post queue with live statuses (`draft → scheduled → uploading → published / failed`).

---

## Stack

| Layer | Technology | Host |
|---|---|---|
| Frontend | React 19, Tailwind CSS, Framer Motion, Radix UI | Vercel |
| Backend | Node.js, Express, Passport.js, Drizzle ORM | Railway |
| Primary Database | PostgreSQL — users, accounts, posts, sessions | Neon |
| Storage & Reliability | File storage, CDN, real-time, backups | Supabase |
| AI | Google Gemini Flash (`gemini-2.0-flash`) | Google AI |
| Scheduling | node-cron | Railway |

### Hybrid Backend: Neon + Supabase

Occium uses a dual-backend architecture:

- **Neon** — primary relational store. All structured data (users, connected OAuth accounts, post metadata, sessions) is managed here via Drizzle ORM. Fast serverless Postgres with branching for migrations.
- **Supabase** — storage and reliability layer. Video thumbnails are cached to Supabase Storage for CDN delivery. Video files are staged in private buckets before YouTube re-upload. Supabase provides automatic backups, real-time subscriptions, and S3-compatible storage — things Neon doesn't offer out of the box.

This split keeps relational queries fast and type-safe on Neon while offloading all file I/O and durability concerns to Supabase's purpose-built infrastructure.

**Hosted project**: `db.rkbvjtzbxhcvsmvdcnse.supabase.co`

---

## Local Development

### Prerequisites
- Node.js v18+
- Neon PostgreSQL database (free at [neon.tech](https://neon.tech))
- Supabase project (free at [supabase.com](https://supabase.com)) — project ref `rkbvjtzbxhcvsmvdcnse`
- Google Cloud project with YouTube Data API v3 enabled
- LinkedIn Developer App
- Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))
- Docker Desktop (only needed for `supabase start` local stack)

### 1. Backend

```bash
cd backend
npm install
npm run db:push   # push Drizzle schema to Neon
npm run dev       # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start         # starts on http://localhost:3000
```

### 3. Local Supabase Stack (optional — requires Docker Desktop)

Supabase CLI is installed at `~/.supabase/supabase.exe` and the project is initialised (`supabase/config.toml` linked to `rkbvjtzbxhcvsmvdcnse`).

```bash
# One-time login
supabase login    # opens browser — paste access token from supabase.com/dashboard/account/tokens

# Link to hosted project
supabase link --project-ref rkbvjtzbxhcvsmvdcnse

# Spin up local stack (Docker required)
supabase start    # local Postgres :54322, Storage API :54321, Studio :54323

# Push schema changes to hosted project
supabase db push
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `SUPABASE_URL` | `https://rkbvjtzbxhcvsmvdcnse.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (from project Settings → API) |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `LINKEDIN_CLIENT_ID` | LinkedIn App Client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn App Client Secret |
| `GEMINI_API_KEY` | Google Gemini API key |
| `SESSION_SECRET` | Random 64-char hex string |
| `FRONTEND_URL` | e.g. `http://localhost:3000` |
| `BACKEND_URL` | e.g. `http://localhost:4000` |
| `PORT` | Default: `4000` |
| `NODE_ENV` | `development` or `production` |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | Backend URL |
| `REACT_APP_GOOGLE_CLIENT_ID` | Same as `GOOGLE_CLIENT_ID` |
| `REACT_APP_LINKEDIN_CLIENT_ID` | Same as `LINKEDIN_CLIENT_ID` |

---

## OAuth Setup

### Google (YouTube)

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **YouTube Data API v3**
3. Create OAuth 2.0 credentials (Web Application)
   - Redirect URI: `<BACKEND_URL>/auth/google/callback`
   - Scopes: `profile`, `email`, `youtube.upload`, `youtube.readonly`
4. Create an API Key restricted to YouTube Data API v3

### LinkedIn

1. Create an app at [developer.linkedin.com](https://developer.linkedin.com)
2. Add: **Sign In with LinkedIn using OpenID Connect** + **Share on LinkedIn**
3. Redirect URL: `<BACKEND_URL>/auth/linkedin/callback`
4. Scopes: `openid`, `profile`, `email`, `w_member_social`

---

## YouTube Auto-Upload

When composing a post on the YouTube tab, Occium can re-upload the video to your connected channel:

- Metadata (title, description, tags) is pre-filled from the imported video and fully editable.
- Privacy status: `public`, `unlisted`, or `private`.
- Setting a schedule date marks the video `private` on YouTube with a `publishAt` timestamp — YouTube publishes it automatically at that time.
- Uses the [YouTube Resumable Upload API](https://developers.google.com/youtube/v3/guides/using_a_resumable_upload) for reliability.
- Video files are staged in Supabase Storage (`uploads` bucket) before upload and cleaned up after.
- Google OAuth tokens are automatically refreshed server-side when expired.

---

## Deployment

### Backend → Railway

**Important**: Ensure your Railway backend URL uses HTTPS for session cookies to work correctly.

1. Push to GitHub, connect repo to Railway
2. Set root directory to `backend/`
3. Add all backend env vars in Railway dashboard (including `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`)
4. **Critical**: Set `BACKEND_URL` to your Railway HTTPS URL (e.g., `https://your-app.railway.app`)
5. **Critical**: Set `FRONTEND_URL` to your Vercel URL (e.g., `https://your-app.vercel.app`)

### Frontend → Vercel
1. Connect repo to Vercel, set root to `frontend/`
2. Add `REACT_APP_API_URL` (your Railway HTTPS URL)
3. Add `REACT_APP_GOOGLE_CLIENT_ID`, `REACT_APP_LINKEDIN_CLIENT_ID`

### Post-Deployment Steps

After deploying, **you must update OAuth redirect URIs**:

#### Google Cloud Console
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   - `https://your-railway-app.railway.app/auth/google/callback`
5. Add to **Authorized JavaScript origins**:
   - `https://your-vercel-app.vercel.app`

#### LinkedIn Developer Portal
1. Go to [developer.linkedin.com](https://developer.linkedin.com)
2. Select your app
3. Go to Auth tab
4. Add to **Redirect URLs**:
   - `https://your-railway-app.railway.app/auth/linkedin/callback`

### Troubleshooting Deployment

**Issue**: Accounts not showing after OAuth  
**Solution**: Check that:
- `BACKEND_URL` and `FRONTEND_URL` are set correctly
- Both URLs use HTTPS in production
- OAuth redirect URIs match exactly (including `/auth/google/callback` and `/auth/linkedin/callback`)
- Session cookies are being set (check browser DevTools → Application → Cookies)

**Issue**: CORS errors  
**Solution**: Verify `FRONTEND_URL` in Railway matches your Vercel deployment URL exactly

**Issue**: "No YouTube channel found"  
**Solution**: Ensure the Google account has an active YouTube channel before connecting

---

## Database Migrations

```bash
cd backend
npm run db:generate   # generate Drizzle migration files
npm run db:migrate    # apply migrations to Neon
```

---

© 2026 Occium. Developed by Antigravity AI.
