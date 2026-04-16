# Occium — Content Operations System

YouTube → LinkedIn content pipeline. Import a video, AI-ghostwrite a LinkedIn post, schedule and publish both.

## Local Development

### Prerequisites
- Node.js v18+
- Neon PostgreSQL database (free at neon.tech)
- Google Cloud project with YouTube Data API v3 enabled
- LinkedIn Developer App
- Gemini API key (free at aistudio.google.com)

### 1. Backend

```bash
cd backend
npm install
npm run db:push   # push schema to Neon
npm run dev       # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start         # starts on http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `LINKEDIN_CLIENT_ID` | LinkedIn App Client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn App Client Secret |
| `GEMINI_API_KEY` | Google Gemini API key |
| `SESSION_SECRET` | Random 64-char hex string |
| `FRONTEND_URL` | e.g. `http://localhost:3000` |
| `BACKEND_URL` | e.g. `http://localhost:4000` |
| `PORT` | Default: 4000 |
| `NODE_ENV` | `development` or `production` |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Backend URL |
| `REACT_APP_GOOGLE_CLIENT_ID` | Same as `GOOGLE_CLIENT_ID` |
| `REACT_APP_LINKEDIN_CLIENT_ID` | Same as `LINKEDIN_CLIENT_ID` |

---

## Google Cloud Setup

1. Create a project at console.cloud.google.com
2. Enable **YouTube Data API v3**
3. Create OAuth 2.0 credentials (Web Application)
   - Redirect URI: `https://your-backend.railway.app/auth/google/callback`
4. Create an API Key restricted to YouTube Data API v3

## LinkedIn Setup

1. Create an app at developer.linkedin.com
2. Add: **Sign In with LinkedIn using OpenID Connect** + **Share on LinkedIn**
3. Redirect URL: `https://your-backend.railway.app/auth/linkedin/callback`

---

## Deployment

### Backend → Railway
1. Push to GitHub, connect repo to Railway
2. Set root directory to `backend/`
3. Add all backend env vars in Railway dashboard

### Frontend → Vercel
1. Connect repo to Vercel, set root to `frontend/`
2. Add `REACT_APP_API_URL`, `REACT_APP_GOOGLE_CLIENT_ID`, `REACT_APP_LINKEDIN_CLIENT_ID`

After deploying, update OAuth redirect URIs in Google Cloud Console and LinkedIn to use your Railway URL.

---

## Stack

- Frontend: React 19 + Tailwind + Framer Motion → Vercel
- Backend: Node.js + Express + TypeScript → Railway
- Database: Neon PostgreSQL + Drizzle ORM
- Auth: Google OAuth 2.0 + LinkedIn OAuth 2.0
- AI: Google Gemini Flash 2.0 (free tier)
- Scheduling: node-cron

© 2026 Occium. Developed by Antigravity AI.
