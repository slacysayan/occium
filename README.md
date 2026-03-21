# Occium Local

This repo now runs as a Vercel-hosted frontend plus an optional local Python helper for the YouTube import pipeline.

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

## Local Python helper run

1. Make sure Python 3 is available on your machine
2. From the repo root, run `start-helper.bat`

Quick start command:

- `start-helper.bat`

Manual fallback:

- `python -m pip install -r local-helper/requirements.txt`
- `python local-helper/server.py`

The helper listens on `http://127.0.0.1:4315` and is used for:

- inspecting single-video, playlist, and channel links
- pulling video metadata via `yt-dlp`
- downloading a source YouTube video locally
- uploading that video to the connected destination YouTube channel

The launcher creates a local virtual environment automatically and installs the Python dependencies, including `yt-dlp`.

## Flow

1. Connect a YouTube channel from the Accounts page
2. Start the local Python helper
3. Paste a single YouTube video, playlist, or channel URL in Composer
4. Fetch the source and select the exact videos to publish
5. Choose the connected destination channel
6. Apply privacy, tags, and optional schedule timing or interval
7. Hand off the download and upload to the Python helper
