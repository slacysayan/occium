# Occium Local

This repo now runs as a Vercel-hosted frontend plus an optional localhost helper for the YouTube import pipeline.

## Vercel deployment

Production URL:
`https://occium-contentsystem-linkedin-yt.vercel.app`

Vercel environment variables:

- `REACT_APP_GOOGLE_CLIENT_ID=65703749084-0okg8lrvfahrpb7h2chfuudsm9cgjdq0.apps.googleusercontent.com`
- `REACT_APP_YOUTUBE_API_KEY=AIzaSyA7daPmmKShkzq2Opg-AizTXRVQ89ews0o`
- `REACT_APP_ENABLE_GOOGLE_CONNECT=true`
- `REACT_APP_LOCAL_HELPER_URL=http://127.0.0.1:4315`

## Google OAuth setup

For the existing popup-based browser flow, use these exact settings in Google Cloud:

- Authorized JavaScript origins:
  `https://occium-contentsystem-linkedin-yt.vercel.app`
  `http://localhost:3000` if you still want local testing
- Authorized redirect URIs:
  none required for the current popup flow

## Frontend run

1. `npm run install:frontend`
2. Update `frontend/.env` only if you want to override defaults locally
3. `npm start`

## Local helper run

1. Install `yt-dlp` on your machine and make sure it is available on PATH
2. `npm run install:helper`
3. `npm run start:helper`

The helper listens on `http://127.0.0.1:4315` and is only used for:

- pulling video metadata via `yt-dlp`
- downloading a source YouTube video locally
- uploading that video to the connected destination YouTube channel

## Flow

1. Connect a YouTube channel from the Accounts page
2. Paste a source YouTube video URL in Composer
3. Fetch metadata
4. Choose the connected destination channel
5. Edit title, description, tags, privacy, and optional publish date
6. Hand off the download and upload to the localhost helper
