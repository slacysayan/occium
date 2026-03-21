# Occium Local

This repo now runs as a frontend-only local MVP.

## Run locally

1. `npm run install:frontend`
2. Update `frontend/.env` if you want live Google YouTube connect.
3. `npm start`

## Deploy on Vercel

1. Import the repo into Vercel.
2. Keep the root directory as the repository root.
3. Add project environment variables:
   `REACT_APP_GOOGLE_CLIENT_ID`
   `REACT_APP_YOUTUBE_API_KEY`
   `REACT_APP_ENABLE_GOOGLE_CONNECT=true`
4. Deploy. The included `vercel.json` already sets the install command, build command, output directory, and SPA rewrites.

## Google OAuth Setup

- Authorized JavaScript origins:
  `https://YOUR_PROJECT.vercel.app`
  `https://YOUR_CUSTOM_DOMAIN` if you add one
  `http://localhost:3000` only if you still want local testing
- Authorized redirect URIs:
  Not required for the current popup-based browser flow.
  If you later switch to a redirect flow, add a dedicated callback such as `https://YOUR_PROJECT.vercel.app/oauth-callback`.
- Restrict the YouTube API key to:
  Application restriction: `HTTP referrers`
  Allowed referrers: your Vercel domain(s)
  API restriction: `YouTube Data API v3` only

## Notes

- The app keeps the existing UI and now stores session data, connected accounts, and posts in browser local storage.
- Google YouTube connect uses the browser flow when `REACT_APP_GOOGLE_CLIENT_ID` is set.
- LinkedIn, AI generation, and scheduling stay local MVP flows without the previous server dependency.
