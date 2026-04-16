# Requirements Document

## Introduction

Occium Phase 2 completes the YouTube → LinkedIn content operations pipeline by shipping
five areas of work: production deployment (Railway + Vercel), a real YouTube video upload
pipeline with progress tracking, live data in the Settings page, live data in the
Dashboard, and a clean GitHub commit history going forward.

Phase 1 delivered a fully wired local system: Google OAuth, LinkedIn OAuth, metadata
fetch, AI ghostwrite, LinkedIn posting, and post CRUD all work on localhost. Phase 2
takes that system to production and fills in the remaining UI shells with real data.

## Glossary

- **System**: The Occium application as a whole (Frontend + Backend + Database).
- **Composer**: The NewPost.jsx page where users create YouTube and LinkedIn posts.
- **Dashboard**: The Dashboard.jsx overview page showing pipeline stats and cards.
- **Settings**: The Settings.jsx page with Overview, API Keys, Integrations, and Tasks tabs.
- **Backend**: The Node.js + Express + TypeScript service running on Railway (production) or localhost:4000 (dev).
- **Frontend**: The React 19 + Tailwind app running on Vercel (production) or localhost:3000 (dev).
- **Database**: Neon PostgreSQL accessed via Drizzle ORM.
- **Post**: A record in the posts table representing a YouTube or LinkedIn content item.
- **Account**: A record in the accounts table representing a connected YouTube channel or LinkedIn profile.
- **Upload_Pipeline**: The backend flow that accepts a local video file, uploads it to YouTube via the resumable upload API, and tracks progress in the posts table.
- **Resumable_Upload**: YouTube's multi-part upload protocol that supports large files and progress tracking.
- **Railway**: The cloud platform hosting the Backend service.
- **Vercel**: The cloud platform hosting the Frontend.
- **Queue_Preview**: The "In Motion" card on the Dashboard showing upcoming scheduled posts.
- **LinkedIn_Spotlight**: The Dashboard card showing the connected LinkedIn account and post counts.
- **YouTube_Pulse**: The Dashboard card showing the connected YouTube channel.
- **Settings_Overview**: The Overview tab in Settings showing account and post counts.
- **API_Keys_Tab**: The API Keys tab in Settings showing which environment variables are configured.
- **Integrations_Tab**: The Integrations tab in Settings showing real connected account status.
- **Upload_Progress_Bar**: A visual progress indicator in the Composer that polls GET /api/posts/:id every 3 seconds while a post has status = "uploading".
- **Env_Var**: An environment variable set in Railway (backend) or Vercel (frontend) dashboard.
- **WorkspaceContext**: The React context that holds accounts and posts fetched from the Backend.

---

## Requirements

### Requirement 1: Deploy Backend to Railway

**User Story:** As a developer, I want the backend deployed to Railway so that the
production frontend can make authenticated API calls without running a local server.

#### Acceptance Criteria

1. THE Backend SHALL expose a `GET /health` endpoint that returns `{ status: "ok", db: "connected" }` when the Railway service is running and the Database is reachable.
2. WHEN the Railway service starts, THE Backend SHALL read all required Env_Vars (`DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `YOUTUBE_API_KEY`, `GEMINI_API_KEY`, `SESSION_SECRET`, `FRONTEND_URL`, `PORT`) from the Railway environment and exit with a descriptive error message if any required variable is absent.
3. WHEN a request arrives at the Railway URL, THE Backend SHALL respond with the same behaviour as it does on localhost:4000.
4. THE Backend SHALL set `cookie.secure = true` and `cookie.sameSite = "none"` when `NODE_ENV = "production"` so that cross-origin session cookies work between the Vercel Frontend and the Railway Backend.
5. WHEN the Google OAuth callback fires in production, THE Backend SHALL redirect to the `FRONTEND_URL` Env_Var value, not to a hardcoded localhost URL.
6. WHEN the LinkedIn OAuth callback fires in production, THE Backend SHALL redirect to the `FRONTEND_URL` Env_Var value, not to a hardcoded localhost URL.

---

### Requirement 2: Deploy Frontend to Vercel

**User Story:** As a developer, I want the frontend deployed to Vercel with the correct
API URL so that users can access Occium from a public URL.

#### Acceptance Criteria

1. WHEN the Vercel build runs, THE Frontend SHALL read `REACT_APP_API_URL` from the Vercel Env_Var and use it as the base URL for all Axios API calls.
2. WHEN `REACT_APP_API_URL` points to the Railway service URL, THE Frontend SHALL complete Google OAuth and LinkedIn OAuth flows without CORS errors.
3. THE Frontend SHALL compile without errors that block the Vercel build.
4. WHEN a user completes Google OAuth on the production Vercel URL, THE Frontend SHALL display the connected YouTube account in the Accounts page within 3 seconds of the OAuth callback completing.
5. WHEN a user completes LinkedIn OAuth on the production Vercel URL, THE Frontend SHALL display the connected LinkedIn account in the Accounts page within 3 seconds of the OAuth callback completing.

---

### Requirement 3: YouTube Video Upload Pipeline

**User Story:** As a content creator, I want to upload a local video file from the
Composer so that my video is published or scheduled on YouTube without leaving Occium.

#### Acceptance Criteria

1. WHEN the YouTube tab is active in the Composer, THE Composer SHALL display a file input that accepts `.mp4`, `.mov`, `.avi`, and `.mkv` files.
2. WHEN a user selects a video file and submits the form, THE Composer SHALL send the file and post metadata (title, description, tags, privacyStatus, scheduledAt) to `POST /api/youtube/upload` as a `multipart/form-data` request.
3. WHEN `POST /api/youtube/upload` receives a valid request, THE Backend SHALL initiate a Resumable_Upload to the YouTube Data API v3 using the connected Account's OAuth access token.
4. WHEN the Resumable_Upload is in progress, THE Backend SHALL update `posts.upload_progress` (0–100) and `posts.status = "uploading"` in the Database after each uploaded chunk.
5. WHILE a Post has `status = "uploading"`, THE Upload_Progress_Bar SHALL poll `GET /api/posts/:id` every 3 seconds and display the current `upload_progress` percentage.
6. WHEN the Resumable_Upload completes successfully and no `scheduledAt` was provided, THE Backend SHALL set `posts.status = "published"`, `posts.platform_post_id` to the YouTube video ID, and `posts.published_at` to the current timestamp.
7. WHEN the Resumable_Upload completes and `scheduledAt` was provided, THE Backend SHALL set `status.privacyStatus = "private"` and `status.publishAt` on the YouTube video resource so YouTube publishes it automatically, and SHALL set `posts.status = "scheduled"` in the Database.
8. WHEN the Resumable_Upload completes, THE Upload_Progress_Bar SHALL stop polling and THE Composer SHALL display the YouTube video URL as a clickable link.
9. IF the Resumable_Upload fails at any point, THEN THE Backend SHALL set `posts.status = "failed"` and `posts.error_message` to a human-readable description of the failure.
10. IF the Resumable_Upload fails, THEN THE Composer SHALL display the error message from `posts.error_message` and stop polling.
11. WHEN the YouTube OAuth access token has expired, THE Backend SHALL use the stored refresh token to obtain a new access token before initiating the Resumable_Upload.

---

### Requirement 4: Settings Page — Real Data

**User Story:** As a user, I want the Settings page to show real account counts, real
environment variable status, and real connected account status so that I can verify my
workspace configuration at a glance.

#### Acceptance Criteria

1. WHEN the Settings_Overview tab loads, THE Settings SHALL display the count of connected YouTube Accounts by reading from WorkspaceContext and filtering by `platform = "youtube"`.
2. WHEN the Settings_Overview tab loads, THE Settings SHALL display the count of connected LinkedIn Accounts by reading from WorkspaceContext and filtering by `platform = "linkedin"`.
3. WHEN the Settings_Overview tab loads, THE Settings SHALL display the total Post count by reading from WorkspaceContext and counting all Post records.
4. WHEN the API_Keys_Tab loads, THE Settings SHALL display a "Configured" badge next to each Env_Var that is present and non-empty in the current build, and a "Missing" badge next to each Env_Var that is absent or empty.
5. THE API_Keys_Tab SHALL NOT expose the raw value of any secret Env_Var — only the presence or absence of the variable SHALL be shown.
6. WHEN the Integrations_Tab loads and a YouTube Account exists in WorkspaceContext, THE Settings SHALL display the connected YouTube account name and channel ID.
7. WHEN the Integrations_Tab loads and a LinkedIn Account exists in WorkspaceContext, THE Settings SHALL display the connected LinkedIn account name and LinkedIn URN.
8. IF no YouTube Account is connected, THEN THE Integrations_Tab SHALL display a "Not connected" state for the YouTube integration row.
9. IF no LinkedIn Account is connected, THEN THE Integrations_Tab SHALL display a "Not connected" state for the LinkedIn integration row.

---

### Requirement 5: Dashboard — Real Analytics

**User Story:** As a user, I want the Dashboard to show real pipeline data so that I
can see my actual content queue, connected accounts, and post counts without placeholder text.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL replace the "UI Shell - No Pipeline Data" placeholder in the Queue_Preview card with the next 5 Posts that have `status = "scheduled"` and `scheduled_at > now()`, ordered by `scheduled_at` ascending, sourced from WorkspaceContext.
2. IF no scheduled Posts exist, THEN THE Queue_Preview card SHALL display an empty-state message ("Nothing scheduled yet") instead of the placeholder text.
3. WHEN the Dashboard loads and a LinkedIn Account is connected, THE LinkedIn_Spotlight section SHALL display the connected Account's `account_name` and `profile_picture` from WorkspaceContext.
4. WHEN the Dashboard loads and a LinkedIn Account is connected, THE LinkedIn_Spotlight section SHALL display the count of LinkedIn Posts with `status = "published"` and the count with `status = "scheduled"` from WorkspaceContext.
5. WHEN the Dashboard loads and a YouTube Account is connected, THE YouTube_Pulse section SHALL display the connected Account's `account_name`, `profile_picture`, and `channel_id` from WorkspaceContext.
6. WHEN the Dashboard loads and a YouTube Account is connected, THE YouTube_Pulse section SHALL display the count of YouTube Posts with `status = "published"` and the count with `status = "scheduled"` from WorkspaceContext.
7. IF no YouTube Account is connected, THEN THE YouTube_Pulse section SHALL display a "Connect YouTube" prompt linking to the Accounts page.
8. THE Dashboard summary cards (Connections, Drafts, Scheduled, Published) SHALL derive their values from WorkspaceContext without making additional API calls.

---

### Requirement 6: GET /api/posts/:id Endpoint

**User Story:** As a developer, I want a single-post fetch endpoint so that the
Upload_Progress_Bar can poll for upload status without fetching the entire post list.

#### Acceptance Criteria

1. WHEN `GET /api/posts/:id` is called by an authenticated user, THE Backend SHALL return the full Post record for the given `id` if it belongs to the authenticated user.
2. IF the Post does not exist or belongs to a different user, THEN THE Backend SHALL return HTTP 404 with `{ error: "Post not found" }`.
3. THE Backend SHALL include `upload_progress` and `status` fields in the response so the Frontend can drive the Upload_Progress_Bar.

---

### Requirement 7: GitHub Repository — Clean Commit History

**User Story:** As a developer, I want all future code changes committed to the
`slacysayan/occium` GitHub repository so that the project has a clean, traceable history.

#### Acceptance Criteria

1. THE Repository SHALL have a `main` branch that reflects the current production-ready state of both `frontend/` and `backend/`.
2. WHEN a new feature or fix is implemented, THE Developer SHALL commit the changes to the `slacysayan/occium` repository with a commit message following the format `type(scope): description` (e.g., `feat(upload): add resumable YouTube upload endpoint`).
3. THE Repository SHALL contain a `.gitignore` that excludes `backend/.env`, `frontend/.env.local`, `node_modules/`, and `dist/` from all commits.
4. THE Repository SHALL contain a `README.md` at the root that documents how to run the project locally, what environment variables are required, and how to deploy to Railway and Vercel.
