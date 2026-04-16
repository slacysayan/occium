# Design Document: Occium Phase 2

## Overview

Phase 2 ships five areas of work on top of the fully-wired Phase 1 local system:

1. **Production deployment** — Railway (backend) + Vercel (frontend) with correct cookie and CORS settings
2. **YouTube video upload pipeline** — multipart upload endpoint, resumable upload with chunk-level progress, polling UI
3. **Settings page real data** — wire Overview, API Keys, and Integrations tabs to WorkspaceContext and env vars
4. **Dashboard real data** — wire Queue Preview, LinkedIn Spotlight, and YouTube Pulse cards to WorkspaceContext
5. **GET /api/posts/:id** — single-post fetch endpoint to drive the upload progress bar

The design follows the existing patterns: Express + Drizzle on the backend, React + WorkspaceContext on the frontend. No new libraries are introduced beyond `multer` for multipart parsing.

---

## Architecture

### Existing System (Phase 1 — unchanged)

```
Vercel (React 19 + Tailwind)
  └─ axios (withCredentials) ──► Railway (Express + TypeScript)
                                    ├─ passport-google-oauth20
                                    ├─ LinkedIn manual OAuth
                                    ├─ Drizzle ORM
                                    └─ Neon PostgreSQL
```

### Phase 2 Additions

```
NewPost.jsx
  ├─ file input (mp4/mov/avi/mkv)
  ├─ POST /api/youtube/upload  (multipart/form-data)
  └─ UploadProgressBar
       └─ polls GET /api/posts/:id every 3 s

backend/src/routes/youtube.ts
  └─ POST /api/youtube/upload
       ├─ multer (memoryStorage, 4 GB limit)
       ├─ token refresh if expired
       ├─ YouTubeUploadService.uploadWithProgress()
       └─ updates posts.upload_progress + posts.status

backend/src/routes/posts.ts
  └─ GET /api/posts/:id  (new)

backend/src/services/youtube.service.ts
  └─ uploadWithProgress(params, onProgress)
       ├─ initiate resumable upload (POST to YouTube)
       ├─ stream chunks (8 MB each)
       └─ calls onProgress(pct) after each chunk
```

---

## Component Design

### 1. Backend — GET /api/posts/:id

**File:** `backend/src/routes/posts.ts`

Add before the existing PATCH /:id handler:

```typescript
router.get("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.userId, req.session.userId!)));
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});
```

Response includes all columns: id, status, upload_progress, platform_post_id, error_message, etc.

---

### 2. Backend — YouTube Upload Endpoint

**File:** `backend/src/routes/youtube.ts`

New route: POST /api/youtube/upload

- Uses multer({ storage: memoryStorage(), limits: { fileSize: 4 * 1024 ** 3 } }) as middleware
- Accepts fields: accountId, title, description, tags (JSON string), privacyStatus, scheduledAt (ISO string, optional)
- Flow:
  1. Look up the accounts row for accountId (must belong to req.session.userId)
  2. If account.expiresAt < now, call refreshGoogleToken(account.refreshToken) and update the row
  3. Create a posts row with status = "uploading", upload_progress = 0
  4. Respond immediately with { postId } (202 Accepted) so the frontend can start polling
  5. Fire-and-forget: call uploadWithProgress(...) in the background, updating the post row as chunks complete
  6. On success: set status = "published" (or "scheduled"), platform_post_id, published_at
  7. On failure: set status = "failed", error_message

---

### 3. Backend — uploadWithProgress in youtube.service.ts

**File:** `backend/src/services/youtube.service.ts`

New exported function:

```typescript
export async function uploadWithProgress(
  params: UploadParams & { postId: string },
  onProgress: (pct: number) => Promise<void>
): Promise<{ videoId: string; videoUrl: string }>
```

Implementation:

1. **Initiate resumable upload** — POST to https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status with JSON metadata and headers X-Upload-Content-Type, X-Upload-Content-Length. Extract Location header as uploadUrl.

2. **Chunk upload loop** — Split videoBuffer into 8 MB chunks. For each chunk:
   - PUT to uploadUrl with Content-Range: bytes start-end/total
   - After each successful chunk, compute pct = Math.round((end + 1) / total * 100) and call onProgress(pct)
   - YouTube returns 308 Resume Incomplete for intermediate chunks, 200/201 for the final chunk

3. **Return** { videoId: response.data.id, videoUrl: "https://www.youtube.com/watch?v=..." }

The onProgress callback passed from the route handler updates posts.upload_progress in the DB.

---

### 4. Frontend — File Input + Progress Bar in NewPost.jsx

**File:** `frontend/src/pages/NewPost.jsx`

New state variables:
- videoFile: File | null
- uploadingPostId: string | null
- completedVideoUrl: string | null

File input added below the Source URL field in the YouTube tab:
- accept=".mp4,.mov,.avi,.mkv"
- Shows filename and size when a file is selected

UploadProgressBar component:
- Mounts when uploadingPostId is set
- Polls GET /api/posts/:id every 3 seconds
- Renders a Framer Motion animated progress bar showing upload_progress %
- Calls onComplete(post) when status becomes "published" or "scheduled"
- Calls onError(msg) when status becomes "failed"
- Stops polling and unmounts on completion or error

Submit flow when videoFile is set and tab is "youtube":
- Build FormData with file + metadata fields
- POST to /api/youtube/upload
- On 202 response, set uploadingPostId = response.data.postId
- Do not call refresh() yet — wait for polling to confirm completion
- On completion, show YouTube URL as a clickable link and call refresh()

Add postsApi.get and youtubeApi.upload to frontend/src/lib/api.ts:
```typescript
// postsApi
get: (id: string) => api.get(`/api/posts/${id}`),

// youtubeApi
upload: (formData: FormData) =>
  api.post("/api/youtube/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
```

---

### 5. Frontend — Settings Page Real Data

**File:** `frontend/src/pages/Settings.jsx`

#### 5a. Overview Tab — post count stat card

Add posts to the useWorkspace() destructure in the Settings component and pass it to OverviewTab. Add a "Total Posts" stat card to the grid using posts.length.

#### 5b. API Keys Tab — backend env var status

Add a GET /api/settings/env-status endpoint (new file backend/src/routes/settings.ts) that returns { [key]: boolean } — present/absent, never the raw value.

New backend route backend/src/routes/settings.ts:
```typescript
router.get("/env-status", requireAuth, (_req, res) => {
  const keys = [
    "DATABASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
    "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET",
    "YOUTUBE_API_KEY", "GEMINI_API_KEY", "SESSION_SECRET",
    "FRONTEND_URL", "PORT",
  ];
  const status = Object.fromEntries(
    keys.map((k) => [k, Boolean(process.env[k])])
  );
  res.json(status);
});
```

Register in backend/src/index.ts:
```typescript
import settingsRouter from "./routes/settings";
app.use("/api/settings", settingsRouter);
```

In ApiKeysTab, fetch this on mount and render a "Configured" / "Missing" badge per key alongside the existing frontend env var section.

#### 5c. Integrations Tab — fix account key prop

The IntegrationCard already renders integration.accounts. The only fix needed is ensuring the key prop uses acc.id (not acc._id) since the backend returns id. Also display channel_id for YouTube accounts and linkedin_urn for LinkedIn accounts.

---

### 6. Frontend — Dashboard Real Data

**File:** `frontend/src/pages/Dashboard.jsx`

#### 6a. Queue Preview ("In Motion" card)

Replace the placeholder div with a real list derived from WorkspaceContext:

```javascript
const now = new Date();
const upcomingPosts = posts
  .filter((p) => p.status === "scheduled" && p.scheduled_at && new Date(p.scheduled_at) > now)
  .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
  .slice(0, 5);
```

Render each post as a compact row showing platform badge, title, and scheduled time. If upcomingPosts.length === 0, show "Nothing scheduled yet".

#### 6b. YouTube Pulse Section

Replace the static YouTubePulseSection with one that reads from WorkspaceContext:
- If no YouTube account: show "Connect YouTube" prompt linking to /workspace/accounts
- If connected: show account_name, profile_picture, channel_id, published count, scheduled count

#### 6c. LinkedIn Spotlight Section

The LinkedInSpotlightSection already reads from WorkspaceContext and returns null when no account is connected. Add a "Not connected" fallback card instead of returning null.

---

### 7. Backend — Production Cookie & CORS Settings

**File:** `backend/src/index.ts`

The cookie settings are already environment-aware (secure + sameSite="none" in production). No change needed.

The OAuth callbacks already redirect to ${env.FRONTEND_URL}/workspace/accounts?connected=... — correct for production.

BACKEND_URL is used as the Google OAuth callbackURL. It must be set as a Railway env var pointing to the Railway service URL.

---

### 8. Backend — Health Endpoint & Env Validation

The /health endpoint already exists and returns { status: "ok", db: "connected" | "error" }.

requireEnv() in env.ts already throws on missing required vars, causing process.exit(1) via the main() catch block.

---

## Data Flow

### Upload Pipeline (end-to-end)

```
User selects file → NewPost.jsx
  │
  ▼
FormData POST /api/youtube/upload
  │
  ▼
multer parses file into req.file.buffer
  │
  ▼
Route handler:
  1. Fetch account row (verify ownership)
  2. Refresh token if expired
  3. INSERT posts row (status="uploading", upload_progress=0)
  4. Respond 202 { postId }
  │
  ▼ (background)
uploadWithProgress(params, async (pct) => {
  UPDATE posts SET upload_progress=pct WHERE id=postId
})
  │
  ▼
On success: UPDATE posts SET status="published", platform_post_id=videoId
On failure: UPDATE posts SET status="failed", error_message=...
```

```
Frontend receives { postId }
  │
  ▼
UploadProgressBar mounts, starts polling GET /api/posts/:id every 3s
  │
  ▼
Renders progress bar with post.upload_progress
  │
  ▼
When status="published": stop polling, show YouTube URL link
When status="failed":    stop polling, show error message
```

---

## Key Decisions

| Decision | Rationale |
|---|---|
| multer with memoryStorage | Simplest approach for Railway; avoids disk I/O. 4 GB limit covers most video files. |
| 202 Accepted + background upload | Avoids HTTP timeout on large files. Frontend polls for status. |
| 8 MB chunk size | Matches YouTube recommended minimum resumable chunk size. |
| postsApi.get(id) polls every 3 s | Low enough frequency to avoid rate limits; fast enough for good UX. |
| Settings env-status via backend endpoint | Keeps backend secrets server-side; frontend only sees boolean presence. |
| No new frontend libraries | FormData + axios handle multipart natively. |

---

## File Change Summary

| File | Change |
|---|---|
| backend/src/routes/posts.ts | Add GET /:id |
| backend/src/routes/youtube.ts | Add POST /upload with multer |
| backend/src/routes/settings.ts | New file — GET /env-status |
| backend/src/services/youtube.service.ts | Add uploadWithProgress() |
| backend/src/index.ts | Register settings router |
| frontend/src/lib/api.ts | Add postsApi.get, youtubeApi.upload |
| frontend/src/pages/NewPost.jsx | File input + UploadProgressBar + upload submit path |
| frontend/src/pages/Dashboard.jsx | Wire Queue Preview, YouTube Pulse, LinkedIn Spotlight |
| frontend/src/pages/Settings.jsx | Wire post count, env-status badges, fix account key prop |
