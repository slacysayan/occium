# Occium: Autonomous Content Pipeline

Occium is a premium, localized content distribution system that automates the handoff between YouTube content and LinkedIn audience engagement.

## Production Stack

- **Frontend**: [Vercel](https://occium-contentsystem-linkedin-yt.vercel.app)
- **Engine**: [Render (occium-yt-dlp-host)](https://occium-yt-dlp-host.onrender.com)
- **Legal**: [Privacy](https://occium-contentsystem-linkedin-yt.vercel.app/privacy.html) | [Terms](https://occium-contentsystem-linkedin-yt.vercel.app/terms.html)

## Deployment Configuration

Set these exact environment variables in your Vercel Dashboard:

- `REACT_APP_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
- `REACT_APP_YOUTUBE_API_KEY`: Your YouTube Data API Key
- `REACT_APP_LOCAL_HELPER_URL`: `https://occium-yt-dlp-host.onrender.com`
- `REACT_APP_LINKEDIN_CLIENT_ID`: Your LinkedIn OAuth Client ID
- `REACT_APP_LINKEDIN_OAUTH_MODE`: `legacy` by default. Set to `oidc` only if your LinkedIn app is using OpenID Connect scopes.
- `REACT_APP_ENABLE_GOOGLE_CONNECT`: `true`

Set these exact environment variables in your Render service:

- `GOOGLE_CLIENT_ID`: Same value as `REACT_APP_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret
- `LINKEDIN_CLIENT_ID`: Same value as `REACT_APP_LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`: LinkedIn App Client Secret
- `PORT`: Render-provided port

## OAuth Configuration

Configure these values before going live:

- Google Authorized JavaScript Origin: `https://occium-contentsystem-linkedin-yt.vercel.app`
- Google Authorized Redirect URI: `https://occium-contentsystem-linkedin-yt.vercel.app`
- LinkedIn Authorized Redirect URL: `https://occium-contentsystem-linkedin-yt.vercel.app/connect`
- LinkedIn auth mode:
  - `legacy`: enable `Sign In with LinkedIn` plus `Share on LinkedIn`
  - `oidc`: enable `Sign In with LinkedIn using OpenID Connect` plus `Share on LinkedIn`, then set `REACT_APP_LINKEDIN_OAUTH_MODE=oidc`

## Production Workflow

1. **Connect**: Link your YouTube destination channel and LinkedIn profile in the **Accounts** page.
2. **Import**: Paste a YouTube link (Video, Playlist, or Channel) in the **Composer**.
3. **Draft**: Refine metadata, tags, and LinkedIn captions using the AI ghostwriter.
4. **Batch**: Use the **Bulk Strategy** to set a schedule interval (e.g., 60 mins between posts).
5. **Sync**: The Render Helper Engine securely downloads, uploads, and schedules the connected workflows.

## Production Notes

- YouTube OAuth now uses server-side code exchange via Render so refresh tokens can be used for uploads and analytics.
- LinkedIn OAuth, posting, and scheduling run through the Render helper.
- LinkedIn scheduled jobs currently persist in the helper service filesystem. For strict durability across redeploys, move that queue to a database or other durable store before relying on long-dated schedules.

---
&copy; 2026 Occium. Developed by Antigravity AI.
