# Occium Content System Sitemap

### 1. Internal Application Paths (Vercel Frontend)
- `/` - **Dashboard**: Core analytics, LinkedIn pulse, and scheduled post queue.
- `/new` - **Composer**: Interactive YouTube importer and LinkedIn ghostwriter. Supports bulk batching.
- `/posts` - **Library**: History of all sent and scheduled posts.
- `/accounts` - **Connections**: OAuth status for Google (YouTube) and LinkedIn.
- `/settings` - **Engine Control**: Manual status checks and health monitoring for the Helper Engine.

### 2. Legal & Public Documentation (Static)
- `/terms.html` - **Terms of Service**: Legal agreement for Google and LinkedIn API usage.
- `/privacy.html` - **Privacy Policy**: Disclosure on data handling and OAuth scope usage.
- `/EMAIL.md` - **Project Brief**: High-level summary of the Occium production goals.
- `/README.md` - **Production Guide**: Deployment and environment instructions for developers.

### 3. API & Service Infrastructure (Render Python Engine)
- `https://occium-yt-dlp-host.onrender.com/health` - Health check.
- `https://occium-yt-dlp-host.onrender.com/api/youtube/source` - Playlist/Channel inspector.
- `https://occium-yt-dlp-host.onrender.com/api/youtube/upload` - Secure download-and-upload handoff.
- `https://occium-yt-dlp-host.onrender.com/api/linkedin/post` - LinkedIn distribution proxy.
