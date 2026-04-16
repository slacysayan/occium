# Bug Analysis - Occium Authentication & Account Fetching

## Date: April 16, 2026

## Issues Identified

### 1. **Account Fetching After OAuth - CRITICAL BUG**

**Problem**: After successful Google/LinkedIn OAuth, accounts are saved to the database but not immediately visible in the UI.

**Root Cause**: 
- The `WorkspaceContext` waits 500ms before calling `refresh()` after OAuth redirect
- This delay is insufficient for session propagation across domains in production
- The session cookie might not be set properly when the frontend makes the API call

**Location**: `frontend/src/context/WorkspaceContext.jsx` lines 36-43

**Current Code**:
```javascript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const connected = params.get("connected");
  const error = params.get("error");
  if (connected) {
    // Small delay to ensure session cookie is set before fetching
    setTimeout(() => { refresh(); }, 500);
    window.history.replaceState({}, "", window.location.pathname);
  }
  if (error) {
    console.error("[workspace] OAuth error:", error);
    window.history.replaceState({}, "", window.location.pathname);
  }
}, [refresh]);
```

**Fix**: Increase delay to 1500ms and add retry logic

---

### 2. **Duplicate Account Fetching Logic**

**Problem**: Accounts are fetched in two places:
1. `/auth/me` endpoint returns `{ user, accounts }`
2. `/api/accounts` endpoint returns accounts separately

**Location**: 
- `backend/src/routes/auth.ts` line 239-258 (`/auth/me`)
- `backend/src/routes/accounts.ts` line 10-20 (`/api/accounts`)

**Impact**: Unnecessary API calls and potential race conditions

**Fix**: Consolidate to use only `/auth/me` for initial load, use `/api/accounts` only for refresh

---

### 3. **Session Cookie Configuration Issue**

**Problem**: Session cookie settings might not work correctly in production with cross-origin requests

**Location**: `backend/src/index.ts` lines 48-56

**Current Code**:
```typescript
cookie: {
  secure: env.NODE_ENV === "production",
  httpOnly: true,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
}
```

**Issue**: When `sameSite: "none"`, the cookie requires `secure: true`, but this only works over HTTPS

**Fix**: Ensure Railway backend URL uses HTTPS in production

---

### 4. **Missing Error Handling in OAuth Callbacks**

**Problem**: If account insertion fails, the user is still redirected to success page

**Location**: `backend/src/routes/auth.ts` lines 84-106 (Google) and 195-230 (LinkedIn)

**Fix**: Add proper error handling and redirect to error page on failure

---

### 5. **No Token Refresh Logic in Frontend**

**Problem**: When access tokens expire, the frontend doesn't automatically refresh them

**Location**: Token refresh only happens in backend during upload operations

**Impact**: Users might see "connected" accounts that can't actually post

**Fix**: Add token validation and refresh in account listing

---

### 6. **Race Condition in WorkspaceContext**

**Problem**: `refresh()` is called multiple times on mount and after OAuth

**Location**: `frontend/src/context/WorkspaceContext.jsx`

**Current Flow**:
1. Component mounts → `useEffect` calls `refresh()` (line 32)
2. OAuth redirect detected → `setTimeout` calls `refresh()` again (line 41)

**Fix**: Add debouncing or loading state to prevent duplicate calls

---

### 7. **Missing Account Validation**

**Problem**: No validation that YouTube channel or LinkedIn profile was actually fetched

**Location**: `backend/src/routes/auth.ts`

**Issue**: If YouTube API returns no channel, account is still created with `channelId: null`

**Fix**: Validate channel/profile exists before creating account record

---

## Recommended Fixes Priority

### HIGH PRIORITY (Fix Now)
1. Increase OAuth redirect delay to 1500ms
2. Add retry logic for account fetching
3. Fix session cookie configuration for production
4. Add proper error handling in OAuth callbacks

### MEDIUM PRIORITY (Fix Soon)
5. Consolidate account fetching logic
6. Add token refresh in frontend
7. Fix race condition in WorkspaceContext

### LOW PRIORITY (Nice to Have)
8. Add account validation before insertion
9. Add loading states during OAuth flow
10. Add better error messages for users

---

## Testing Checklist

After fixes:
- [ ] Test Google OAuth flow (YouTube)
- [ ] Test LinkedIn OAuth flow
- [ ] Test account disconnection
- [ ] Test multiple accounts per platform
- [ ] Test token expiration and refresh
- [ ] Test cross-origin session cookies
- [ ] Test error scenarios (API failures, network issues)

---

## Environment Variables to Check

Ensure these are set correctly in production:

### Backend (Railway)
- `FRONTEND_URL` - Must match Vercel deployment URL
- `BACKEND_URL` - Must be HTTPS Railway URL
- `SESSION_SECRET` - Must be secure random string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Valid credentials
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` - Valid credentials

### Frontend (Vercel)
- `REACT_APP_API_URL` - Must match Railway backend URL (HTTPS)

---

## Next Steps

1. Apply fixes to codebase
2. Test locally
3. Deploy to staging
4. Update OAuth redirect URIs in Google/LinkedIn consoles
5. Test in production
6. Update README with deployment instructions
