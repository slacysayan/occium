import { appEnv } from "../config/env";

const STORAGE_KEY = "occium.local.app.v2";
const STORAGE_EVENT = "occium:statechange";
const LOCAL_USER_ID = "local_owner";

function getDefaultUser() {
  return {
    _id: LOCAL_USER_ID,
    id: LOCAL_USER_ID,
    name: appEnv.defaultUserName,
    email: appEnv.defaultUserEmail,
    profile_picture: null,
    auth_provider: "local",
  };
}

function createId(prefix) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readState() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to read local Occium state", error);
    return null;
  }
}

function writeState(state) {
  if (typeof window === "undefined") return state;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: state }));
  return state;
}

function ensureState() {
  const state = readState() || {};
  const normalized = {
    currentUser: state.currentUser || getDefaultUser(),
    accounts: Array.isArray(state.accounts) ? state.accounts : [],
    posts: Array.isArray(state.posts) ? state.posts : [],
  };
  writeState(normalized);
  return normalized;
}

function updateState(updater) {
  const current = ensureState();
  const next = updater({
    ...current,
    currentUser: { ...current.currentUser },
    accounts: [...current.accounts],
    posts: [...current.posts],
  });
  return writeState(next);
}

function getUserSeed(user) {
  const name = user?.name || appEnv.defaultUserName;
  const firstName = name.split(" ")[0];
  return { name, firstName, picture: user?.profile_picture || null };
}

function upsertAccount(matchFn, nextAccount) {
  return updateState((state) => {
    const index = state.accounts.findIndex(matchFn);
    if (index >= 0) {
      state.accounts[index] = { ...state.accounts[index], ...nextAccount };
    } else {
      state.accounts.unshift(nextAccount);
    }
    return state;
  });
}

// --- Frontend-Only Stubs (Backend Decoupled) ---

/**
 * [STUB] Helper server health check
 * Original: http://localhost:4315/health
 * This app is now frontend-only. Return mock status.
 */
export async function getLocalHelperStatus() {
  // Simulate a brief async operation for UI continuity
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        available: false,
        status: "offline",
        message: "Backend helper disconnected. App running frontend-only."
      });
    }, 100);
  });
}

/**
 * [STUB] YouTube metadata extraction
 * Original: POST http://localhost:4315/api/youtube/metadata
 * Returns mock metadata for YouTube URLs
 */
export async function getYouTubeMetadata(url) {
  // Simulate async extraction
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        // Extract video ID from URL if possible for realistic preview
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : "dQw4w9WgXcQ";
        
        resolve({
          title: "Video Title (Mock Data)",
          description: "This is mock metadata. Configure your real backend to enable YouTube integration.",
          thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          video_id: videoId,
          duration: 600,
        });
      } catch (error) {
        reject(new Error("Failed to parse YouTube URL"));
      }
    }, 300);
  });
}

/**
 * [STUB] YouTube upload
 * Original: POST http://localhost:4315/api/youtube/upload
 * Stubs upload but preserves locally in posts
 */
export async function uploadToYouTube(payload) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Create local post record for the upload
      const post = createPost({
        platform: "youtube",
        account_id: payload.channelId,
        title: payload.title,
        description: payload.description,
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        scheduled_at: payload.publishAt,
        status: payload.publishAt ? "scheduled" : "published",
        content_type: "video",
        thumbnail_url: payload.thumbnail || null,
        privacy_status: payload.privacyStatus,
      });
      
      resolve({
        success: true,
        video_id: `stub_${post._id}`,
        status: payload.publishAt ? "scheduled" : "published",
        scheduled_at: payload.publishAt,
        message: "Video would be uploaded to YouTube when backend is connected.",
        platform_post_id: `stub_${post._id}`,
      });
    }, 500);
  });
}

/**
 * [STUB] LinkedIn post/schedule
 * Original: POST http://localhost:4315/api/linkedin/{post|schedule}
 * Stubs post but preserves locally in posts
 */
export async function postToLinkedIn(payload) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Create local post record for the LinkedIn post
      const post = createPost({
        platform: "linkedin",
        account_id: payload.accountId,
        content_type: "text",
        description: payload.text,
        source_url: payload.linkUrl,
        title: payload.linkTitle,
        status: payload.publishAt ? "scheduled" : "published",
        scheduled_at: payload.publishAt,
      });
      
      resolve({
        success: true,
        post_id: `stub_${post._id}`,
        status: payload.publishAt ? "scheduled" : "published",
        scheduled_at: payload.publishAt,
        message: payload.publishAt 
          ? "Post would be scheduled on LinkedIn when backend is connected."
          : "Post would be published to LinkedIn when backend is connected.",
        platform_post_id: `stub_${post._id}`,
      });
    }, 500);
  });
}

/**
 * [STUB] Sync LinkedIn scheduled posts
 * Original: GET http://localhost:4315/api/linkedin/schedules
 * No-op in frontend-only mode (posts exist only locally)
 */
export async function syncLinkedInScheduledPosts() {
  // No-op: all posts exist only in localStorage
  return Promise.resolve();
}

// --- Local State Management ---

export function ensureLocalSession() {
  const state = ensureState();
  return { user: state.currentUser, token: "local-session" };
}

export function getWorkspaceState() {
  return ensureState();
}

export function subscribeToWorkspaceState(listener) {
  if (typeof window === "undefined") return () => {};
  const notify = () => listener(ensureState());
  const handleStateChange = (event) => listener(event.detail || ensureState());
  const handleStorage = (event) => {
    if (!event.key || event.key === STORAGE_KEY) notify();
  };
  notify();
  window.addEventListener(STORAGE_EVENT, handleStateChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(STORAGE_EVENT, handleStateChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function resetLocalUser() {
  const state = updateState((current) => ({
    ...current,
    currentUser: getDefaultUser(),
  }));
  return state.currentUser;
}

export function getAccounts() {
  const state = ensureState();
  return state.accounts;
}

export function getAccountById(accountId) {
  const state = ensureState();
  return state.accounts.find((account) => account._id === accountId) || null;
}

export function deleteAccount(accountId) {
  const state = updateState((current) => ({
    ...current,
    accounts: current.accounts.filter((account) => account._id !== accountId),
  }));
  return state.accounts;
}

export function connectMockYouTubeAccount(customDetails = {}) {
  const { currentUser } = ensureState();
  const seed = getUserSeed(currentUser);
  const nextAccount = {
    _id: createId("account"),
    id: createId("account"),
    user_id: LOCAL_USER_ID,
    platform: "youtube",
    account_name: customDetails.account_name || `${seed.firstName} Channel`,
    profile_picture: customDetails.profile_picture || seed.picture,
    channel_id: customDetails.channel_id || `UC${createId("ch")}`,
    access_token: "local-helper-mode",
    is_active: true,
    connection_mode: "local-helper",
    created_at: new Date().toISOString(),
  };
  upsertAccount(
    (account) => account.platform === "youtube" && account.channel_id === nextAccount.channel_id,
    nextAccount,
  );
  return nextAccount;
}

export function connectLinkedInAccount(customDetails = {}) {
  const { currentUser } = ensureState();
  const seed = getUserSeed(currentUser);
  const nextAccount = {
    _id: createId("account"),
    id: createId("account"),
    user_id: LOCAL_USER_ID,
    platform: "linkedin",
    account_name: customDetails.account_name || seed.name,
    profile_picture: customDetails.profile_picture || seed.picture,
    linkedin_id: customDetails.linkedin_id || `urn:li:person:${createId("li")}`,
    access_token: "local-helper-mode",
    is_active: true,
    connection_mode: "local-helper",
    created_at: new Date().toISOString(),
  };
  upsertAccount(
    (account) => account.platform === "linkedin" && account.linkedin_id === nextAccount.linkedin_id,
    nextAccount,
  );
  return nextAccount;
}

export function getPosts() {
  const state = ensureState();
  return state.posts;
}

export function createPost(payload) {
  const now = new Date().toISOString();
  const status = payload.status || (payload.scheduled_at ? "scheduled" : "draft");
  const postId = createId("post");
  const nextPost = {
    _id: postId,
    id: postId,
    user_id: LOCAL_USER_ID,
    account_id: payload.account_id || null,
    platform: payload.platform,
    content_type: payload.content_type || (payload.platform === "youtube" ? "video" : "text"),
    title: (payload.title || "").toString().slice(0, 200) || null,
    description: (payload.description || "").toString().slice(0, 5000) || null,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    source_url: (payload.source_url || "").toString().trim() || null,
    thumbnail_url: (payload.thumbnail_url || "").toString().trim() || null,
    privacy_status: payload.privacy_status || null,
    status,
    scheduled_at: payload.scheduled_at || null,
    published_at: status === "published" ? now : null,
    platform_post_id: payload.platform_post_id || null,
    platform_post_url: payload.platform_post_url || null,
    upload_mode: "local",
    error_message: payload.error_message || null,
    created_at: now,
  };
  updateState((state) => ({ ...state, posts: [nextPost, ...state.posts] }));
  return nextPost;
}

export function updatePost(postId, updateData) {
  let nextPost = null;
  updateState((state) => {
    state.posts = state.posts.map((post) => {
      if (post._id !== postId) return post;
      nextPost = { ...post, ...updateData };
      return nextPost;
    });
    return state;
  });
  return nextPost;
}

export function deletePost(postId) {
  const state = updateState((current) => ({
    ...current,
    posts: current.posts.filter((post) => post._id !== postId),
  }));
  return state.posts;
}

// --- OAuth Stubs (Frontend-Only) ---

/**
 * [STUB] LinkedIn OAuth code exchange
 * Original: Backend would exchange auth code for access token
 * Stubs with mock token for UI flow
 */
export async function exchangeLinkedInCode(code, redirectUri) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        access_token: `stub_linkedin_token_${Date.now()}`,
        refresh_token: `stub_refresh_${Date.now()}`,
        expires_in: 5184000, // 60 days in seconds
        token_type: "Bearer"
      });
    }, 200);
  });
}

/**
 * [STUB] Fetch LinkedIn profile
 * Original: https://api.linkedin.com/v2/me
 * Returns mock profile data for UI flow
 */
export async function fetchLinkedInProfile(accessToken) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const { currentUser } = ensureState();
      const seed = getUserSeed(currentUser);
      
      resolve({
        id: `urn:li:person:${createId("li")}`,
        localizedFirstName: seed.firstName,
        localizedLastName: seed.name.split(" ").slice(1).join(" ") || "User",
        name: seed.name,
        picture: seed.picture,
        given_name: seed.firstName,
        family_name: seed.name.split(" ").slice(1).join(" ") || "User",
        sub: `stub_linkedin_${Date.now()}`
      });
    }, 300);
  });
}

/**
 * [STUB] YouTube OAuth code exchange
 * Original: Backend Google OAuth code exchange
 * Stubs with mock token for UI flow
 */
export async function exchangeGoogleCode(code, redirectUri) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        access_token: `stub_google_token_${Date.now()}`,
        refresh_token: `stub_google_refresh_${Date.now()}`,
        expires_in: 3600,
        token_type: "Bearer",
        scope: "https://www.googleapis.com/auth/youtube"
      });
    }, 200);
  });
}

/**
 * [STUB] Connect YouTube account from Google OAuth
 * Creates a local YouTube account record
 */
export function connectYouTubeAccountFromGoogle(googleProfile) {
  const { currentUser } = ensureState();
  const seed = getUserSeed(currentUser);
  
  const nextAccount = {
    _id: createId("account"),
    id: createId("account"),
    user_id: LOCAL_USER_ID,
    platform: "youtube",
    account_name: googleProfile.name || `${seed.firstName} Channel`,
    profile_picture: googleProfile.picture || seed.picture,
    channel_id: googleProfile.channel_id || `UC${createId("ch")}`,
    access_token: googleProfile.access_token || "stub-token",
    refresh_token: googleProfile.refresh_token || null,
    is_active: true,
    connection_mode: "oauth",
    created_at: new Date().toISOString(),
  };
  
  upsertAccount(
    (account) => account.platform === "youtube" && account.channel_id === nextAccount.channel_id,
    nextAccount,
  );
  
  return nextAccount;
}

