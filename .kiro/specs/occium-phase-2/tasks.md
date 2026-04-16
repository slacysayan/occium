# Implementation Plan: Occium Phase 2

## Overview

Implement the five Phase 2 work areas on top of the wired Phase 1 system: production deployment readiness, YouTube video upload pipeline, Settings real data, Dashboard real data, and the GET /api/posts/:id endpoint. Backend is TypeScript/Express/Drizzle; frontend is React/JavaScript.

## Tasks

- [x] 1. Add GET /api/posts/:id endpoint
  - [x] 1.1 Implement single-post fetch route in `backend/src/routes/posts.ts`
    - Add `router.get("/:id", requireAuth, ...)` before the existing PATCH handler
    - Query posts table with `and(eq(posts.id, id), eq(posts.userId, req.session.userId!))`
    - Return 404 `{ error: "Post not found" }` if no row matches
    - Return full post row including `uploadProgress`, `status`, `platformPostId`, `errorMessage`
    - _Requirements: 6.1, 6.2, 6.3_
  - [~] 1.2 Write unit tests for GET /api/posts/:id
    - Test authenticated owner gets post
    - Test 404 for non-existent post
    - Test 404 when post belongs to different user
    - _Requirements: 6.1, 6.2_

- [x] 2. Add postsApi.get and youtubeApi.upload to frontend API client
  - [x] 2.1 Extend `frontend/src/lib/api.js` with new API methods
    - Add `get: (id) => api.get(\`/api/posts/\${id}\`)` to `postsApi`
    - Add `upload: (formData) => api.post("/api/youtube/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })` to `youtubeApi`
    - _Requirements: 3.2, 6.1_

- [x] 3. Implement uploadWithProgress in youtube.service.ts
  - [x] 3.1 Add `uploadWithProgress` function to `backend/src/services/youtube.service.ts`
    - Accept `params: UploadParams & { postId: string }` and `onProgress: (pct: number) => Promise<void>`
    - Step 1: POST to YouTube resumable upload initiation URL with JSON metadata and `X-Upload-Content-Type` / `X-Upload-Content-Length` headers; extract `Location` header as `uploadUrl`
    - Step 2: Split `videoBuffer` into 8 MB chunks; for each chunk PUT to `uploadUrl` with `Content-Range: bytes start-end/total`; call `onProgress(pct)` after each successful chunk
    - Handle YouTube 308 Resume Incomplete for intermediate chunks and 200/201 for final chunk
    - Return `{ videoId, videoUrl }`
    - _Requirements: 3.3, 3.4_
  - [ ]* 3.2 Write unit tests for uploadWithProgress chunk logic
    - Test progress callback is called with correct percentages
    - Test final chunk returns videoId
    - _Requirements: 3.3, 3.4_

- [x] 4. Implement POST /api/youtube/upload endpoint
  - [x] 4.1 Add multer middleware and upload route to `backend/src/routes/youtube.ts`
    - Configure `multer({ storage: memoryStorage(), limits: { fileSize: 4 * 1024 ** 3 } })`
    - Accept fields: `accountId`, `title`, `description`, `tags` (JSON string), `privacyStatus`, `scheduledAt` (optional ISO string)
    - Verify account ownership: look up accounts row for `accountId` where `userId = req.session.userId`
    - Refresh token if `account.expiresAt < now` using `refreshGoogleToken` and update the accounts row
    - INSERT posts row with `status = "uploading"`, `uploadProgress = 0`
    - Respond immediately with 202 `{ postId }`
    - Fire-and-forget: call `uploadWithProgress(...)` with an `onProgress` callback that UPDATEs `posts.uploadProgress`
    - On success: UPDATE post with `status = "published"` (or `"scheduled"` if `scheduledAt` provided), `platformPostId`, `publishedAt`
    - On failure: UPDATE post with `status = "failed"`, `errorMessage`
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.7, 3.9, 3.11_
  - [ ]* 4.2 Write integration tests for POST /api/youtube/upload
    - Test 202 response with postId
    - Test token refresh path
    - Test failure sets status = "failed"
    - _Requirements: 3.3, 3.9, 3.11_

- [ ] 5. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add UploadProgressBar component and wire upload flow in NewPost.jsx
  - [x] 6.1 Add file input to the YouTube tab in `frontend/src/pages/NewPost.jsx`
    - Add `videoFile` state (`File | null`)
    - Render `<input type="file" accept=".mp4,.mov,.avi,.mkv">` below the Source URL field
    - Show selected filename and file size when a file is chosen
    - _Requirements: 3.1_
  - [x] 6.2 Implement `UploadProgressBar` component inside `NewPost.jsx`
    - Add `uploadingPostId` and `completedVideoUrl` state
    - Mount `UploadProgressBar` when `uploadingPostId` is set
    - Poll `postsApi.get(uploadingPostId)` every 3 seconds using `setInterval`
    - Render a Framer Motion animated progress bar showing `post.uploadProgress %`
    - Call `onComplete(post)` when `status` becomes `"published"` or `"scheduled"`; stop polling
    - Call `onError(msg)` when `status` becomes `"failed"`; stop polling
    - _Requirements: 3.5, 3.8, 3.10_
  - [x] 6.3 Update submit handler in `NewPost.jsx` for the video upload path
    - When `videoFile` is set and `activeTab === "youtube"`: build `FormData` with file + metadata fields and call `youtubeApi.upload(formData)`
    - On 202 response, set `uploadingPostId = response.data.postId`
    - On polling completion (`onComplete`): show YouTube URL as a clickable link and call `refresh()`
    - On polling error (`onError`): display `errorMessage` from the post and stop polling
    - _Requirements: 3.2, 3.8, 3.10_
  - [ ]* 6.4 Write unit tests for UploadProgressBar polling logic
    - Test polling stops on "published" status
    - Test polling stops on "failed" status
    - Test progress percentage renders correctly
    - _Requirements: 3.5, 3.8, 3.10_

- [x] 7. Wire Settings page to real data
  - [x] 7.1 Add total post count stat card to Settings Overview tab in `frontend/src/pages/Settings.jsx`
    - Destructure `posts` from `useWorkspace()` in the Settings component
    - Pass `posts` to `OverviewTab`
    - Add a "Total Posts" stat card to the overview grid using `posts.length`
    - _Requirements: 4.3_
  - [x] 7.2 Create `backend/src/routes/settings.ts` with GET /api/settings/env-status
    - Return `{ [key]: boolean }` for all required env vars: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `YOUTUBE_API_KEY`, `GEMINI_API_KEY`, `SESSION_SECRET`, `FRONTEND_URL`, `PORT`
    - Never return raw values — only boolean presence
    - Protect with `requireAuth`
    - _Requirements: 4.4, 4.5_
  - [x] 7.3 Register settings router in `backend/src/index.ts`
    - Import `settingsRouter` from `./routes/settings`
    - Mount at `/api/settings`
    - _Requirements: 4.4_
  - [x] 7.4 Wire env-status badges in `ApiKeysTab` in `frontend/src/pages/Settings.jsx`
    - Fetch `GET /api/settings/env-status` on mount using `useEffect`
    - Render a "Configured" badge (green) or "Missing" badge (red) next to each backend env var key
    - _Requirements: 4.4, 4.5_
  - [x] 7.5 Fix account key prop and display channel_id / linkedin_urn in `IntegrationsTab`
    - Change `acc._id` to `acc.id` in the key prop inside `IntegrationCard`
    - Display `channelId` for YouTube accounts and `linkedinUrn` for LinkedIn accounts
    - _Requirements: 4.6, 4.7, 4.8, 4.9_

- [x] 8. Wire Dashboard to real data
  - [x] 8.1 Replace Queue Preview placeholder with real scheduled posts in `frontend/src/pages/Dashboard.jsx`
    - Derive `upcomingPosts` from `posts` in WorkspaceContext: filter `status === "scheduled"` and `scheduled_at > now`, sort ascending by `scheduled_at`, slice to 5
    - Render each post as a compact row showing platform badge, title, and formatted scheduled time
    - Show "Nothing scheduled yet" empty state when `upcomingPosts.length === 0`
    - _Requirements: 5.1, 5.2_
  - [x] 8.2 Replace static YouTubePulseSection with WorkspaceContext-driven version in `frontend/src/pages/Dashboard.jsx`
    - Read `youtubeAccounts` and `posts` from `useWorkspace()`
    - If no YouTube account: show "Connect YouTube" prompt linking to `/workspace/accounts`
    - If connected: show `accountName`, `profilePicture`, `channelId`, count of YouTube posts with `status = "published"`, count with `status = "scheduled"`
    - _Requirements: 5.5, 5.6, 5.7_
  - [x] 8.3 Add "Not connected" fallback to LinkedInSpotlightSection in `frontend/src/pages/Dashboard.jsx`
    - Replace the early `return null` with a fallback GlassCard showing "Not connected" state and a link to the Accounts page
    - _Requirements: 5.3, 5.4_

- [ ] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Verify production deployment configuration
  - [x] 10.1 Confirm cookie and CORS settings in `backend/src/index.ts` are production-ready
    - Verify `cookie.secure = true` and `cookie.sameSite = "none"` when `NODE_ENV = "production"`
    - Verify OAuth callbacks redirect to `env.FRONTEND_URL`, not hardcoded localhost
    - _Requirements: 1.4, 1.5, 1.6_
  - [x] 10.2 Confirm frontend API base URL reads from `REACT_APP_API_URL` env var in `frontend/src/lib/api.js`
    - Verify the existing `process.env.REACT_APP_API_URL || "http://localhost:4000"` fallback is correct
    - _Requirements: 2.1, 2.2_
  - [x] 10.3 Update `README.md` with Railway + Vercel deployment instructions and required env vars
    - Document all required backend env vars for Railway
    - Document all required frontend env vars for Vercel
    - Document local development setup steps
    - _Requirements: 7.4_

- [ ] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The upload pipeline uses a 202 + polling pattern to avoid HTTP timeouts on large files
- Backend secrets are never exposed to the frontend — only boolean presence via /api/settings/env-status
