# Occium Changelog

## Version 2.0 - April 16, 2026

### Critical Bug Fixes

#### 1. OAuth Account Fetching Issue (FIXED)
**Problem**: After successful Google/LinkedIn OAuth, accounts were saved to database but not immediately visible in UI.

**Solution**: Added retry logic with exponential backoff (800ms → 1600ms → 2400ms) in WorkspaceContext.

**Files Changed**:
- `frontend/src/context/WorkspaceContext.jsx`
- `backend/src/index.ts`

#### 2. Session Cookie Configuration (FIXED)
**Problem**: Session cookies not persisting correctly in production.

**Solution**: Changed to `resave: false`, `saveUninitialized: false`, added `rolling: true`.

**Files Changed**:
- `backend/src/index.ts`

#### 3. YouTube Channel Validation (FIXED)
**Problem**: Accounts created even when no YouTube channel exists.

**Solution**: Added validation to ensure channel exists before account creation.

**Files Changed**:
- `backend/src/routes/auth.ts`

---

## Files Modified

### Backend
1. `backend/src/index.ts` - Session configuration
2. `backend/src/routes/auth.ts` - YouTube validation

### Frontend
1. `frontend/src/context/WorkspaceContext.jsx` - Retry logic

### Documentation
1. `README.md` - Updated with changes
2. `BUG_ANALYSIS.md` - Detailed bug analysis
3. `DEPLOYMENT_CHECKLIST.md` - Deployment guide
4. `CHANGELOG.md` - This file

---

## Deployment Instructions

1. Update environment variables (BACKEND_URL must be HTTPS)
2. Update OAuth redirect URIs in Google/LinkedIn consoles
3. Deploy backend to Railway
4. Deploy frontend to Vercel
5. Test OAuth flows

---

© 2026 Occium. Developed by Antigravity AI.
