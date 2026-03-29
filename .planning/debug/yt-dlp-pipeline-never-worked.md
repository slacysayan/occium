---
status: investigating
trigger: "yt-dlp-pipeline-never-worked: Brand new implementation where yt-dlp fails or returns errors. No visible errors in console. Issue manifests when connecting accounts first in the Composer page."
created: 2026-03-29T00:00:00.000Z
updated: 2026-03-29T12:30:00.000Z
---

## Current Focus
hypothesis: "OAuth credentials are NOT configured on the Render helper - LINKEDIN_CLIENT_ID/LINKEDIN_CLIENT_SECRET and GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are missing from Render environment variables. This causes account connection to fail silently from user perspective."
test: "Test OAuth endpoints on helper to confirm they fail with proper error"
expecting: "OAuth endpoints return 500 error with message about missing credentials"
next_action: "Verify by testing /api/linkedin/token endpoint"

## Symptoms
expected: Full YouTube→metadata→schedule→upload pipeline works, and LinkedIn posting works
actual: yt-dlp fails silently - no errors shown but functionality doesn't work
reproduction: Navigate to Composer, try to connect account or import YouTube URL
started: Never worked - brand new implementation
errors: ["LinkedIn OAuth is not configured on the Render helper. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET."]

## Eliminated
- hypothesis: "yt-dlp is not installed or not working"
  evidence: "Tested /api/youtube/metadata endpoint - returns proper video metadata (Rick Astley video). yt-dlp IS working correctly."
  timestamp: 2026-03-29T12:20:00.000Z

- hypothesis: "Render helper is not deployed or accessible"
  evidence: "Health endpoint returns 200 OK with ytDlp available: true, version 2026.03.17"
  timestamp: 2026-03-29T12:10:00.000Z

- hypothesis: "Frontend cannot reach helper (CORS/network issue)"
  evidence: "Helper is reachable at https://occium-yt-dlp-host.onrender.com - responds correctly"
  timestamp: 2026-03-29T12:10:00.000Z

## Evidence
- timestamp: 2026-03-29T12:10:00.000Z
  checked: "Render helper health endpoint"
  found: "status: ok, ytDlp: {available: true, version: 2026.03.17}, linkedin.oauthConfigured: false, google.oauthConfigured: false"
  implication: "Helper is running but OAuth credentials are NOT configured on Render"

- timestamp: 2026-03-29T12:15:00.000Z
  checked: "YouTube metadata endpoint (/api/youtube/metadata)"
  found: "Returns proper video metadata: title, description, thumbnail, duration, view_count, uploader all present"
  implication: "yt-dlp IS WORKING - the pipeline itself is functional"

- timestamp: 2026-03-29T12:25:00.000Z
  checked: "LinkedIn token endpoint (/api/linkedin/token)"
  found: "Returns 500 error: 'LinkedIn OAuth is not configured on the Render helper. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET.'"
  implication: "OAuth fails because credentials not set in Render environment"

- timestamp: 2026-03-29T12:26:00.000Z
  checked: "Frontend Accounts.jsx line 248-250"
  found: "Shows message: 'LinkedIn OAuth is not configured on this deployment. Add REACT_APP_LINKEDIN_CLIENT_ID in Vercel and LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET in Render.'"
  implication: "Frontend DOES show warning about missing OAuth config"

- timestamp: 2026-03-29T12:27:00.000Z
  checked: "Frontend env.js config"
  found: "linkedinClientId: process.env.REACT_APP_LINKEDIN_CLIENT_ID || '' - configured via Vercel env vars"
  implication: "Frontend config depends on REACT_APP_LINKEDIN_CLIENT_ID being set in Vercel"

## Resolution
root_cause: "OAuth credentials are missing from Render helper environment variables. Both LinkedIn (LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET) and Google (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) need to be set in the Render dashboard for the helper to handle OAuth token exchanges."
fix: "Add the following environment variables in Render dashboard for the occium-yt-dlp-host service: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET. Also ensure REACT_APP_LINKEDIN_CLIENT_ID and REACT_APP_GOOGLE_CLIENT_ID are set in Vercel."
verification: "Need to verify: 1) OAuth credentials added to Render, 2) User can connect accounts, 3) YouTube import works"
files_changed: []
