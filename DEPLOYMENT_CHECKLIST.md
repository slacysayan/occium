# Occium Deployment Checklist

## Pre-Deployment

### 1. Environment Variables Setup

#### Backend (Railway)
Create these environment variables in Railway dashboard:

```bash
# Database
DATABASE_URL=postgresql://...  # From Neon

# Supabase
SUPABASE_URL=https://rkbvjtzbxhcvsmvdcnse.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...  # From Supabase project settings

# Google / YouTube
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
YOUTUBE_API_KEY=AIzaSy...  # Optional but recommended

# LinkedIn
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=WPL_AP1...

# AI
GEMINI_API_KEY=...

# Session
SESSION_SECRET=<64-char-random-hex>  # Generate with: openssl rand -hex 32

# App URLs (CRITICAL - Must be HTTPS in production)
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-app.railway.app
PORT=4000
NODE_ENV=production
```

#### Frontend (Vercel)
Create these environment variables in Vercel dashboard:

```bash
REACT_APP_API_URL=https://your-app.railway.app
REACT_APP_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
REACT_APP_LINKEDIN_CLIENT_ID=...
```

---

## Deployment Steps

### Step 1: Deploy Backend to Railway

1. Connect Repository - Go to railway.app, deploy from GitHub
2. Configure Build Settings - Root: backend, Build: npm install && npm run build, Start: npm start
3. Add Environment Variables - Copy all backend env vars
4. Deploy and note Railway URL
5. Verify at /health endpoint

### Step 2: Deploy Frontend to Vercel

1. Connect Repository - Go to vercel.com, import project
2. Configure Build Settings - Root: frontend, Framework: Create React App
3. Add Environment Variables - REACT_APP_API_URL, client IDs
4. Deploy and note Vercel URL
5. Update FRONTEND_URL in Railway

### Step 3: Configure OAuth Providers

#### Google Cloud Console
- Add Authorized JavaScript origins: https://your-vercel-app.vercel.app
- Add Authorized redirect URIs: https://your-railway-app.railway.app/auth/google/callback

#### LinkedIn Developer Portal
- Add Redirect URLs: https://your-railway-app.railway.app/auth/linkedin/callback

---

## Troubleshooting

### Issue: "No accounts showing after OAuth"
Solutions:
1. Check browser console for errors
2. Verify session cookie is set
3. Check Railway logs for OAuth errors
4. Verify FRONTEND_URL and BACKEND_URL are correct
5. Ensure both URLs use HTTPS

### Issue: "CORS errors"
Solutions:
1. Verify FRONTEND_URL in Railway matches Vercel URL exactly
2. Ensure credentials: true is set in frontend API calls

### Issue: "No YouTube channel found"
Solutions:
1. Ensure Google account has an active YouTube channel
2. Create channel at youtube.com/create_channel

---

## Security Checklist

- [ ] SESSION_SECRET is secure random string (64+ chars)
- [ ] All API keys in environment variables
- [ ] OAuth redirect URIs are exact matches
- [ ] HTTPS enforced in production
- [ ] CORS configured for frontend domain only

---

© 2026 Occium. Developed by Antigravity AI.
