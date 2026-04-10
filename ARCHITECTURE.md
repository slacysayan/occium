# Occium Architecture & Next Phase Planning

**Last Updated**: April 10, 2026  
**Current State**: Frontend-only with localStorage persistence  
**Status**: ✅ Decoupled from Render. Ready for backend bridge design.

---

## Current Architecture (Phase 1: Frontend-Only)

### What's Running Now
```
┌─────────────────────────────────────┐
│  React Frontend (localhost:3000)    │
│  - Accounts, Posts, Queue, Dashboard │
│  - Google/LinkedIn OAuth stubs      │
│  - localStorage persistence         │
└─────────────────────────────────────┘
         ⬇
┌─────────────────────────────────────┐
│   Browser localStorage              │
│   - User state                      │
│   - Connected accounts              │
│   - Scheduled posts                 │
│   - Drafts & metadata               │
└─────────────────────────────────────┘
```

### What's Stubbed  
All backend calls are replaced with deterministic mocks:
- `getYouTubeMetadata()` → Returns mock video title + thumbnail
- `uploadToYouTube()` → Creates local post, returns stub response
- `postToLinkedIn()` → Creates local post, returns stub response
- `exchangeLinkedInCode()` → Returns mock access token
- `fetchLinkedInProfile()` → Returns mock user data

### What's Preserved
- ✅ All UI shells (components, routing, styling intact)
- ✅ Local account management (CRUD on accounts)
- ✅ Post creation and scheduling workflows
- ✅ OAuth flow UI (redirects, callbacks, error screens)
- ✅ Settings panels and configuration pages
- ✅ Full visual design (glass cards, animations, dark theme)

### What's Removed
- ❌ Render (render.com) backend service
- ❌ local-helper/ Python server code
- ❌ Helper health checks and polling
- ❌ HTTP calls to `http://localhost:4315`
- ❌ Circuit breaker and retry logic
- ❌ yt-dlp integration (for now)
- ❌ Remote OAuth token exchange
- ❌ LinkedIn/YouTube API calls

---

## Next Phase: Backend Bridge (Choose Your Path)

### Option A: MCP (Model Context Protocol) Bridge

**How It Works**  
Use an MCP server as the backend integration point:

```
┌──────────────┐
│ React App    │
│ (Frontend)   │
└──────┬───────┘
       │ HTTP Tunnel
       ⬇
┌──────────────────────────┐
│ MCP Server Gateway       │
│ (Node.js / Python)       │
│ - Translates REST → MCP  │
│ - Manages auth tokens    │
│ - Queues async jobs      │
└──────┬───────────────────┘
       │
       ⬇
┌──────────────────────────┐
│ MCP Tool Implementations │
│ - YouTube integration   │
│ - LinkedIn API client   │
│ - yt-dlp wrapper        │
│ - OAuth handler         │
└──────────────────────────┘
```

**Pros**
- Native LLM integration (tools are first-class citizens)
- Extensible (add new tools = add new features)
- Serverless-friendly (deploy to Vercel, AWS Lambda, etc.)
- Clear separation of concerns

**Cons**
- Requires serialization/deserialization of complex payloads
- MCP is relatively new, smaller ecosystem
- May need a translation layer between REST and MCP

**Implementation Path**
1. Create `/api/mcp-gateway` route in Next.js or separate Node service
2. Wrap YouTube API, LinkedIn API, yt-dlp in MCP tools
3. Frontend sends HTTP requests → Gateway translates to MCP calls
4. Return responses in frontend-compatible format

**Estimated Timeline**
- Gateway scaffolding: 1-2 hours
- MCP tool wrappers: 6-8 hours
- Testing & deployment: 4-6 hours
- **Total**: ~12-16 hours

---

### Option B: Custom REST API Backend

**How It Works**  
Build a custom Node.js/Python API alongside the frontend:

```
┌──────────────┐
│ React App    │
│ (Frontend)   │
└──────┬───────┘
       │ REST HTTP
       ⬇
┌──────────────────────────┐
│ Backend API              │
│ (Node.js / FastAPI)      │
│ - /api/youtube           │
│ - /api/linkedin          │
│ - /api/auth/callback     │
│ - /api/media/upload      │
│ - /jobs (queues)         │
└──────┬───────────────────┘
       │
       ⬇
┌──────────────────────────┐
│ External APIs            │
│ - YouTube Data API v3    │
│ - LinkedIn API v2        │
│ - Redis queue (optional) │
│ - Database (PostgreSQL)  │
└──────────────────────────┘
```

**Pros**
- Simpler HTTP contracts (no MCP translation)
- Proven architecture (REST APIs are standard)
- Easier to debug (standard HTTP tools)
- Works with any frontend framework

**Cons**
- More boilerplate (routing, middleware, validation)
- Need separate deployment/scaling strategy
- Requires database for state management

**Implementation Path**
1. Boot a Next.js API route handler or Express server
2. Implement endpoints:
   - `POST /api/youtube/metadata?url=...`
   - `POST /api/youtube/upload` (multipart)
   - `POST /api/linkedin/post`
   - `POST /api/auth/linkedin/callback`
3. Connect to YouTube/LinkedIn APIs
4. Deploy to Vercel (Node functions) or Render/Railway (containers)

**Estimated Timeline**
- API scaffolding: 2-3 hours
- Endpoint implementation: 8-12 hours
- OAuth token handling: 4-6 hours
- Testing & deployment: 4-6 hours
- **Total**: ~18-27 hours

---

### Option C: Hybrid (Recommended)

Combine both approaches:
- **Frontend ↔ REST API** for synchronous operations (uploads, OAuth callback routing)
- **REST API ↔ MCP tools** for heavy lifting (yt-dlp parsing, batch operations)

**Pros**
- Flexibility (can swap implementations)
- Clear boundaries (REST for frontend contract, MCP for logic)
- Better testability

**Cons**
- More complex architecture
- Requires coordination between two systems

---

## Current Features & Their Backend Needs

| Feature | Current State | Needed For Production |
|---------|---|---|
| **YouTube Connect (OAuth)** | Stub | Real OAuth callback → token storage |
| **LinkedIn Connect (OAuth)** | Stub | Real OAuth callback → token storage |
| **Post to LinkedIn** | Mock | Real API call + scheduling |
| **Upload to YouTube** | Mock | yt-dlp + bytes upload + scheduling |
| **Metadata Extraction** | Mock | Real yt-dlp or YouTube API calls |
| **Video Scheduling** | Local draft | Persistent backend + cron jobs |
| **Token Management** | Browser-only | Encrypted server storage + refresh |
| **Job Queue** | localStorage | Redis/database + worker processes |

---

## Recommended Next Phase Roadmap

### Phase 2A: Setup Backend (Week 1)

Choose either **Option A (MCP)** or **Option B (REST API)**

```markdown
## Phase 2A: Backend Setup

**Goal**: Get a working backend server that the frontend can call

### Tasks
- [ ] Create `/api` directory or separate backend project
- [ ] Setup environment variables (YouTube API key, LinkedIn secrets)
- [ ] Implement health check endpoint
- [ ] Setup authentication (session/JWT middleware)
- [ ] Deploy to staging environment

**Deliverables**
- ✅ Backend responds to frontend calls
- ✅ Environment isolation (dev, staging, prod)
- ✅ Basic request validation
```

### Phase 2B: OAuth Integration (Week 2)

```markdown
## Phase 2B: Real OAuth Flows

**Goal**: Replace stubbed OAuth with real Google/LinkedIn flows

### Tasks
- [ ] Implement LinkedIn OAuth callback handler
- [ ] Implement Google OAuth token exchange  
- [ ] Secure token storage (encrypted DB or secrets manager)
- [ ] Handle token refresh flows
- [ ] Update frontend to use real endpoints

**Deliverables**
- ✅ Real accounts connect and disconnect
- ✅ Tokens are refreshed automatically
- ✅ Frontend doesn't store sensitive tokens
```

### Phase 2C: API Integrations (Week 3)

```markdown
## Phase 2C: Platform APIs

**Goal**: Wire up YouTube and LinkedIn APIs

### Tasks
- [ ] YouTube Data API v3 upload implementation
- [ ] YouTube scheduling via `publishAt` field
- [ ] LinkedIn API text post endpoint
- [ ] LinkedIn scheduled posts retrieval
- [ ] Error handling & user-facing messages

**Deliverables**
- ✅ Real posts appear on YouTube/LinkedIn
- ✅ Scheduling works end-to-end  
- ✅ Status updates flow back to UI
```

### Phase 2D: Job Queue & Persistence (Week 4)

```markdown
## Phase 2D: Production Reliability

**Goal**: Handle async operations and data persistence

### Tasks
- [ ] Setup PostgreSQL or similar for state
- [ ] Implement Redis queue for background jobs
- [ ] Long-running upload jobs (with progress)
- [ ] Data migrations & backup strategy
- [ ] Monitoring & error tracking (Sentry)

**Deliverables**
- ✅ Posts survive backend restarts
- ✅ Large uploads don't timeout
- ✅ User can see job progress in real-time
```

---

## Decision Framework: Which Backend Path?

### Choose **MCP Bridge** if:
- You want to integrate with AI agents / Claude tools
- You like functional, composable patterns
- You want to eventually expose tools via MCP marketplace
- You're comfortable with emerging technologies

### Choose **REST API** if:
- You want maximum compatibility (works with any client)
- You prefer traditional HTTP patterns
- You already have team experience with REST
- You want the shortest time-to-first-working-feature

### Choose **Hybrid** if:
- You want both interactivity (REST) and extensibility (MCP)
- You have time for more implementation (more phases)
- You want to build a product others might use as a tool

---

## Immediate Next Steps

1. **Decide on backend path** (MCP vs REST vs Hybrid)
2. **Create IMPLEMENTATION.md** with detailed coding plan
3. **Setup backend scaffolding** in your deployment platform
4. **Stub out API routes** that frontend can call
5. **Wire OAuth flows** into the new backend
6. **Test end-to-end** with real platforms

---

## Key Files to Update

When you choose your path, these files need updates:

```
frontend/src/lib/localApp.js  ← Replace stubs with real API calls
frontend/src/config/env.js    ← Add backend URL (e.g., REACT_APP_API_URL)
backend/                      ← Create this directory with your chosen approach
vercel.json                   ← Configure deployment
.env.local (git-ignored)      ← Store secrets during dev
```

---

## Questions Before You Decide?

📝 **Architecture questions to consider:**
- How often do users upload? (affects queue strategy)
- Do you need real-time progress? (affects WebSocket vs polling)
- Will the app support multiple users? (affects database design)
- Do you want AI-powered features later? (MCP advantages)
- What's your deployment budget? (affects infrastructure choices)

💡 **Next: Schedule a planning session with your team to choose Path A, B, or C above.**
