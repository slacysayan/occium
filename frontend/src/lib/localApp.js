import axios from "axios";
import { appEnv } from "../config/env";

const STORAGE_KEY = "occium.local.app.v2";
const STORAGE_EVENT = "occium:statechange";
const LOCAL_USER_ID = "local_owner";
const DEBUG_LOG_KEY = "occium.debug.logs.v1";
const MAX_DEBUG_LOGS = 200;
const HELPER_FAILURE_THRESHOLD = 3;
const HELPER_CIRCUIT_COOLDOWN_MS = 10000;
const HELPER_RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const YOUTUBE_HOST_PATTERN = /(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/i;

const helperCircuitState = {
  consecutiveAvailabilityFailures: 0,
  openedAt: null,
  lastError: null,
};

const toneMap = {
  professional: {
    opener: "Here is a clear, polished draft",
    voice: "insightful and credible",
  },
  casual: {
    opener: "Here is a more relaxed draft",
    voice: "friendly and conversational",
  },
  viral: {
    opener: "Here is a hook-first draft",
    voice: "high-energy and attention-grabbing",
  },
};

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

function appendDebugLog(level, event, details = {}) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const existing = JSON.parse(window.localStorage.getItem(DEBUG_LOG_KEY) || "[]");
    const nextEntry = {
      id: createId("log"),
      at: new Date().toISOString(),
      level,
      event,
      details,
    };

    const nextLogs = [nextEntry, ...existing].slice(0, MAX_DEBUG_LOGS);
    window.localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(nextLogs));
  } catch (error) {
    console.error("Failed to append Occium debug log", error);
  }
}

function sanitizeTextInput(value, maxLength = 5000) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

function sanitizeUrlInput(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function resetHelperCircuit() {
  helperCircuitState.consecutiveAvailabilityFailures = 0;
  helperCircuitState.openedAt = null;
  helperCircuitState.lastError = null;
}

function isHelperAvailabilityFailure(error) {
  if (!error) {
    return false;
  }

  if (!error.response) {
    return error.code !== "ERR_CANCELED";
  }

  return Number(error.response.status) >= 500;
}

function isRetryableHelperError(error) {
  if (!error || error.code === "ERR_CANCELED") {
    return false;
  }

  if (!error.response) {
    return true;
  }

  return HELPER_RETRYABLE_STATUS_CODES.has(Number(error.response.status));
}

function registerHelperFailure(error) {
  if (!isHelperAvailabilityFailure(error)) {
    return;
  }

  helperCircuitState.consecutiveAvailabilityFailures += 1;
  helperCircuitState.lastError = error?.message || "Helper request failed";

  if (helperCircuitState.consecutiveAvailabilityFailures >= HELPER_FAILURE_THRESHOLD) {
    helperCircuitState.openedAt = Date.now();
  }
}

function getHelperCircuitError() {
  if (!helperCircuitState.openedAt) {
    return null;
  }

  const remainingMs =
    helperCircuitState.openedAt + HELPER_CIRCUIT_COOLDOWN_MS - Date.now();

  if (remainingMs <= 0) {
    resetHelperCircuit();
    return null;
  }

  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const error = new Error(
    `Render helper requests are paused after repeated failures. Wait ${seconds}s and retry.`,
  );
  error.code = "HELPER_CIRCUIT_OPEN";
  return error;
}

function buildActionableError(error, path) {
  if (error?.code === "REQUEST_CANCELED") {
    return error;
  }

  if (error?.code === "HELPER_CIRCUIT_OPEN") {
    return error;
  }

  const detail =
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    "Unknown helper error";
  const status = Number(error?.response?.status || 0);
  const lowerDetail = String(detail).toLowerCase();

  let message = String(detail);

  if (error?.code === "ECONNABORTED" || lowerDetail.includes("timeout")) {
    message = "Render helper is waking up or running slowly. Wait a few seconds and retry.";
  } else if (status === 400 && path.includes("/youtube/")) {
    message = "Paste a full YouTube video, playlist, channel, or Shorts URL.";
  } else if ((status === 401 || status === 403) && path.includes("/youtube/")) {
    message = "Reconnect the YouTube channel. The upload token expired or is missing required scopes.";
  } else if ((status === 401 || status === 403) && path.includes("/linkedin/")) {
    message = "Reconnect LinkedIn. The token expired or the app is missing the required LinkedIn scopes.";
  } else if (status === 429) {
    message = "The helper or upstream API is rate-limiting requests. Wait a minute and retry.";
  } else if (status >= 500) {
    message = "Render helper returned a server error. Retry once, then inspect helper logs if it persists.";
  } else if (lowerDetail.includes("could not read this youtube source")) {
    message = "That YouTube URL could not be parsed. Paste a public video, playlist, channel, or Shorts URL.";
  }

  const actionableError = new Error(message);
  actionableError.status = status;
  actionableError.detail = detail;
  return actionableError;
}

function readState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to read local Occium state", error);
    return null;
  }
}

function writeState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: state }));
  }
  return state;
}

function sortByNewest(items) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  });
}

function reconcilePosts(posts) {
  const now = Date.now();

  return posts.map((post) => {
    if (
      post.platform === "youtube" &&
      post.status === "scheduled" &&
      post.scheduled_at &&
      post.platform_post_id &&
      post.helper_status === "uploaded" &&
      new Date(post.scheduled_at).getTime() <= now
    ) {
      return {
        ...post,
        status: "published",
        published_at: post.published_at || new Date().toISOString(),
      };
    }

    return post;
  });
}

function ensureState() {
  const state = readState() || {};
  const normalized = {
    currentUser: state.currentUser || getDefaultUser(),
    accounts: Array.isArray(state.accounts) ? state.accounts : [],
    posts: reconcilePosts(Array.isArray(state.posts) ? state.posts : []),
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

  return writeState({
    ...next,
    posts: reconcilePosts(next.posts || []),
  });
}

function getUserSeed(user) {
  const name = user?.name || appEnv.defaultUserName;
  const firstName = name.split(" ")[0];

  return {
    name,
    firstName,
    picture: user?.profile_picture || null,
  };
}

function buildAccount({
  id,
  platform,
  accountName,
  profilePicture,
  channelId = null,
  linkedinId = null,
  connectionMode = "local",
  accessToken = null,
  refreshToken = null,
  tokenExpiresAt = null,
  scope = "",
}) {
  const accountId = id || createId("account");

  return {
    _id: accountId,
    id: accountId,
    user_id: LOCAL_USER_ID,
    platform,
    account_name: accountName,
    channel_id: channelId,
    linkedin_id: linkedinId,
    profile_picture: profilePicture,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_at: tokenExpiresAt,
    scope,
    is_active: true,
    connection_mode: connectionMode,
    created_at: new Date().toISOString(),
  };
}

function upsertAccount(matchFn, nextAccount) {
  return updateState((state) => {
    const index = state.accounts.findIndex(matchFn);

    if (index >= 0) {
      state.accounts[index] = {
        ...state.accounts[index],
        ...nextAccount,
      };
    } else {
      state.accounts.unshift(nextAccount);
    }

    return state;
  });
}

function extractYouTubeVideoId(url) {
  try {
    const parsedUrl = new URL(url);
    const shortId = parsedUrl.hostname.includes("youtu.be")
      ? parsedUrl.pathname.slice(1)
      : parsedUrl.searchParams.get("v");

    if (shortId) {
      return shortId;
    }

    const shortsMatch = parsedUrl.pathname.match(/\/shorts\/([^/?]+)/);
    if (shortsMatch) {
      return shortsMatch[1];
    }
  } catch (error) {
    console.error("Invalid YouTube URL", error);
  }

  return null;
}

function looksLikeCollectionUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return Boolean(
      parsedUrl.searchParams.get("list") ||
        parsedUrl.pathname.includes("/playlist") ||
        parsedUrl.pathname.includes("/channel/") ||
        parsedUrl.pathname.includes("/user/") ||
        parsedUrl.pathname.includes("/c/") ||
        parsedUrl.pathname.startsWith("/@"),
    );
  } catch (error) {
    console.error("Invalid YouTube URL", error);
    return false;
  }
}

function validateYouTubeSourceUrl(url, { allowCollections = true } = {}) {
  const normalizedUrl = sanitizeUrlInput(url);
  if (!normalizedUrl) {
    throw new Error("Paste a full YouTube URL before importing.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch (error) {
    appendDebugLog("warn", "youtube.url.invalid", {
      reason: "invalid_url",
      rawUrl: normalizedUrl,
    });
    throw new Error("Use a valid absolute YouTube URL, e.g. https://www.youtube.com/watch?v=...");
  }

  if (!YOUTUBE_HOST_PATTERN.test(parsedUrl.hostname.toLowerCase())) {
    throw new Error("Only YouTube video, playlist, channel, and Shorts URLs are supported.");
  }

  const hasVideoId = Boolean(extractYouTubeVideoId(normalizedUrl));
  const isCollection = looksLikeCollectionUrl(normalizedUrl);

  if (!hasVideoId && !isCollection) {
    throw new Error("Paste a full YouTube video, playlist, channel, or Shorts URL.");
  }

  if (!allowCollections && !hasVideoId) {
    throw new Error("This action supports single-video URLs only.");
  }

  return {
    normalizedUrl: parsedUrl.toString(),
    hasVideoId,
    isCollection,
  };
}

function buildGhostwriteCopy(prompt, platform, tone) {
  const config = toneMap[tone] || toneMap.professional;
  const platformLabel = platform === "youtube" ? "YouTube" : "LinkedIn";

  if (platform === "youtube") {
    return `${config.opener} for ${platformLabel}.\n\nTitle angle: ${prompt}\n\nIn this video, we break down the core idea, show the practical takeaway, and leave viewers with one clear next step. Keep the delivery ${config.voice}, focused on value, and easy to scan.\n\nIf this topic helped, subscribe for more grounded, tactical updates.`;
  }

  return `${config.opener} for ${platformLabel}.\n\n${prompt}\n\nThe strongest teams are not chasing noise. They are building repeatable systems, tightening feedback loops, and communicating with clarity. That is where consistent momentum comes from.\n\nIf this resonates, I would love to hear how you are approaching it in your work.`;
}

function buildFallbackVideoDescription(url, author) {
  const authorLine = author ? ` by ${author}` : "";
  return `Imported from YouTube${authorLine}.\n\nSource: ${url}`;
}

function parseTags(tags) {
  if (Array.isArray(tags)) {
    return [...new Set(tags.map((tag) => sanitizeTextInput(String(tag), 40)).filter(Boolean))];
  }

  if (typeof tags === "string" && tags.trim()) {
    return [
      ...new Set(
        tags
          .split(",")
          .map((tag) => sanitizeTextInput(tag, 40))
          .filter(Boolean),
      ),
    ];
  }

  return [];
}

function parseIsoDurationToSeconds(value) {
  if (!value || typeof value !== "string") {
    return 0;
  }

  const parts = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!parts) {
    return 0;
  }

  const hours = Number.parseInt(parts[1] || "0", 10);
  const minutes = Number.parseInt(parts[2] || "0", 10);
  const seconds = Number.parseInt(parts[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

export function getHelperUrl() {
  return appEnv.localHelperUrl.replace(/\/$/, "");
}

async function fetchHelper(path, options = {}) {
  const circuitError = path === "/health" ? null : getHelperCircuitError();
  if (circuitError) {
    appendDebugLog("warn", "helper.circuit_open", { path });
    throw circuitError;
  }

  const baseUrl = getHelperUrl();
  const url = `${baseUrl}${path}`;

  const defaultTimeout = path === "/health" ? 10000 : 5000;
  const method = (options.method || "get").toLowerCase();
  const retryConfig =
    options.retry === false
      ? { attempts: 1, backoffMs: 0 }
      : {
          attempts: options.retry?.attempts || 1,
          backoffMs: options.retry?.backoffMs || 700,
          idempotent: options.retry?.idempotent ?? method === "get",
        };

  for (let attempt = 1; attempt <= retryConfig.attempts; attempt += 1) {
    try {
      appendDebugLog("info", "helper.request", {
        path,
        method,
        attempt,
      });

      const response = await axios({
        url,
        method,
        data: options.data,
        timeout: options.timeout || defaultTimeout,
        headers: options.headers,
        signal: options.signal,
      });

      resetHelperCircuit();
      appendDebugLog("info", "helper.response", {
        path,
        method,
        attempt,
        status: response.status,
      });
      return response.data;
    } catch (error) {
      if (error?.code === "ERR_CANCELED" || options.signal?.aborted) {
        const canceledError = new Error("Request canceled.");
        canceledError.code = "REQUEST_CANCELED";
        throw canceledError;
      }

      registerHelperFailure(error);
      appendDebugLog("error", "helper.failure", {
        path,
        method,
        attempt,
        status: error?.response?.status || null,
        message: error?.message || "Unknown helper failure",
      });

      const shouldRetry =
        attempt < retryConfig.attempts &&
        retryConfig.idempotent &&
        isRetryableHelperError(error);

      if (shouldRetry) {
        await delay(retryConfig.backoffMs * attempt);
        continue;
      }

      throw buildActionableError(error, path);
    }
  }

  throw new Error("Helper request did not complete.");
}

async function fetchYouTubeApi(path, accessToken, params, timeout = 5000) {
  const response = await axios.get(`https://www.googleapis.com/youtube/v3/${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params,
    timeout,
  });

  return response.data;
}

async function fetchMetadataWithYouTubeApi(url, videoId) {
  if (!appEnv.youtubeApiKey || !videoId) {
    return null;
  }

  try {
    const response = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: "snippet,contentDetails",
        id: videoId,
        key: appEnv.youtubeApiKey,
      },
      timeout: 3000,
    });

    const item = response.data?.items?.[0];

    if (!item) {
      return null;
    }

    return {
      title: item.snippet?.title || "Imported Video",
      description: item.snippet?.description || buildFallbackVideoDescription(url, item.snippet?.channelTitle),
      thumbnail:
        item.snippet?.thumbnails?.maxres?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url ||
        "",
      duration: item.contentDetails?.duration || "",
      view_count: 0,
      uploader: item.snippet?.channelTitle || "Unknown",
      source_url: url,
      metadata_source: "youtube-api",
    };
  } catch (error) {
    console.error("YouTube API metadata lookup failed", error);
    return null;
  }
}

export function ensureLocalSession() {
  const state = ensureState();
  return {
    user: state.currentUser,
    token: "local-session",
  };
}

export function getWorkspaceState() {
  return ensureState();
}

export function subscribeToWorkspaceState(listener) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const notify = () => listener(ensureState());
  const handleStateChange = (event) => listener(event.detail || ensureState());
  const handleStorage = (event) => {
    if (!event.key || event.key === STORAGE_KEY) {
      notify();
    }
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

export function getAccounts(userId) {
  const state = ensureState();
  return sortByNewest(state.accounts.filter((account) => account.user_id === userId));
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

export function connectMockYouTubeAccount() {
  const { currentUser } = ensureState();
  const seed = getUserSeed(currentUser);
  const channelId = createId("yt");
  const nextAccount = buildAccount({
    platform: "youtube",
    accountName: `${seed.firstName} Channel`,
    profilePicture: seed.picture,
    channelId,
    connectionMode: "mock",
  });

  upsertAccount(
    (account) => account.platform === "youtube" && account.channel_id === channelId,
    nextAccount,
  );

  return nextAccount;
}

export function connectLinkedInAccount(customDetails = {}) {
  const { currentUser } = ensureState();
  const seed = getUserSeed(currentUser);
  
  const linkedinId = customDetails.linkedin_id || `${seed.firstName.toLowerCase().replace(/\s+/g, "-")}-local`;
  const accountName = customDetails.account_name || seed.name;
  const profilePicture = customDetails.profile_picture || seed.picture;
  const accessToken = customDetails.access_token || null;
  const refreshToken = customDetails.refresh_token || null;
  const tokenExpiresAt = customDetails.expires_in
    ? new Date(Date.now() + customDetails.expires_in * 1000).toISOString()
    : null;

  const nextAccount = buildAccount({
    platform: "linkedin",
    accountName,
    profilePicture,
    linkedinId,
    accessToken,
    refreshToken,
    tokenExpiresAt,
    connectionMode: customDetails.connection_mode || "mock",
  });

  upsertAccount(
    (account) => account.platform === "linkedin" && account.linkedin_id === linkedinId,
    nextAccount,
  );

  return nextAccount;
}

export async function exchangeLinkedInCode(code, redirectUri) {
  const response = await fetchHelper("/api/linkedin/token", {
    method: "post",
    data: {
      code,
      redirectUri,
    },
    timeout: 15000,
  });
  return response;
}

export async function exchangeGoogleCode(code, redirectUri) {
  return fetchHelper("/api/google/token", {
    method: "post",
    timeout: 15000,
    data: {
      code,
      redirectUri,
    },
  });
}

export async function fetchLinkedInProfile(accessToken) {
  return fetchHelper("/api/linkedin/profile", {
    method: "post",
    timeout: 15000,
    data: { accessToken },
  });
}

export function connectYouTubeAccountFromGoogle({
  googleProfile,
  channelProfile,
  accessToken,
  refreshToken,
  expiresIn,
  scope,
}) {
  const accountName =
    channelProfile?.snippet?.title ||
    googleProfile?.name ||
    appEnv.defaultUserName;
  const profilePicture =
    channelProfile?.snippet?.thumbnails?.high?.url ||
    channelProfile?.snippet?.thumbnails?.default?.url ||
    googleProfile?.picture ||
    null;
  const channelId = channelProfile?.id || googleProfile?.sub || googleProfile?.id || createId("yt");
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  const state = updateState((current) => ({
    ...current,
    currentUser: {
      ...current.currentUser,
      name: googleProfile?.name || current.currentUser.name,
      email: googleProfile?.email || current.currentUser.email,
      profile_picture: googleProfile?.picture || current.currentUser.profile_picture,
      auth_provider: "google",
    },
  }));

  const nextAccount = buildAccount({
    platform: "youtube",
    accountName,
    profilePicture,
    channelId,
    connectionMode: "google",
    accessToken,
    refreshToken,
    tokenExpiresAt,
    scope,
  });

  upsertAccount(
    (account) => account.platform === "youtube" && account.channel_id === channelId,
    nextAccount,
  );

  return {
    account: nextAccount,
    user: state.currentUser,
  };
}

export function getAccessTokenHealth(account, warningWindowMinutes = 20) {
  if (!account?.access_token) {
    return {
      status: "missing",
      expiresAt: null,
      expiresInMinutes: null,
    };
  }

  if (!account?.token_expires_at) {
    return {
      status: "connected",
      expiresAt: null,
      expiresInMinutes: null,
    };
  }

  const expiresAt = new Date(account.token_expires_at);
  const expiresInMs = expiresAt.getTime() - Date.now();
  const expiresInMinutes = Math.floor(expiresInMs / 60000);

  if (Number.isNaN(expiresAt.getTime())) {
    return {
      status: "connected",
      expiresAt: null,
      expiresInMinutes: null,
    };
  }

  if (expiresInMs <= 0) {
    return {
      status: "expired",
      expiresAt,
      expiresInMinutes: 0,
    };
  }

  if (expiresInMinutes <= warningWindowMinutes) {
    return {
      status: "expiring",
      expiresAt,
      expiresInMinutes,
    };
  }

  return {
    status: "healthy",
    expiresAt,
    expiresInMinutes,
  };
}

async function refreshLinkedInAccessToken(account) {
  // LinkedIn OAuth for standard apps does not issue refresh tokens.
  // When the access token expires, the user must reconnect via OAuth.
  // Attempting a refresh_token grant will fail and trigger misleading errors.
  appendDebugLog("info", "linkedin.refresh.skipped", {
    accountId: account?._id,
    reason: "LinkedIn tokens are not renewable. Reconnect is required when the token expires.",
  });
  return account;
}

async function refreshGoogleAccessToken(account) {
  if (!account?.refresh_token) {
    return account;
  }

  const response = await fetchHelper("/api/google/refresh", {
    method: "post",
    timeout: 15000,
    data: {
      refreshToken: account.refresh_token,
    },
  });

  const nextAccount = {
    ...account,
    access_token: response.access_token || account.access_token,
    refresh_token: response.refresh_token || account.refresh_token,
    token_expires_at: response.expires_in
      ? new Date(Date.now() + response.expires_in * 1000).toISOString()
      : account.token_expires_at,
  };

  upsertAccount(
    (existingAccount) => existingAccount._id === account._id,
    nextAccount,
  );

  return nextAccount;
}

async function ensureFreshYouTubeAccount(account) {
  const tokenHealth = getAccessTokenHealth(account, 5);
  if (
    (tokenHealth.status === "expiring" || tokenHealth.status === "expired") &&
    account?.refresh_token
  ) {
    try {
      return await refreshGoogleAccessToken(account);
    } catch (error) {
      appendDebugLog("warn", "youtube.refresh.failed", {
        accountId: account?._id,
        message: error?.message || "Google refresh failed",
      });
    }
  }

  return account;
}

async function ensureFreshLinkedInAccount(account) {
  const tokenHealth = getAccessTokenHealth(account, 5);
  if (tokenHealth.status === "expired") {
    appendDebugLog("warn", "linkedin.token.expired", {
      accountId: account?._id,
    });
    throw new Error(
      "LinkedIn access token has expired. Reconnect your LinkedIn profile from the Accounts page to get a new token.",
    );
  }

  if (tokenHealth.status === "expiring") {
    appendDebugLog("warn", "linkedin.token.expiring_soon", {
      accountId: account?._id,
      expiresInMinutes: tokenHealth.expiresInMinutes,
    });
  }

  return account;
}

export function getPosts(userId) {
  const state = ensureState();
  return sortByNewest(state.posts.filter((post) => post.user_id === userId));
}

export function createPost(payload) {
  const now = new Date().toISOString();
  const status = payload.status || (payload.scheduled_at ? "scheduled" : "draft");
  const postId = createId("post");
  const tags = parseTags(payload.tags);

  const nextPost = {
    _id: postId,
    id: postId,
    user_id: payload.user_id || LOCAL_USER_ID,
    account_id: payload.account_id,
    platform: payload.platform,
    content_type: payload.content_type || (payload.platform === "youtube" ? "video" : "text"),
    title: sanitizeTextInput(payload.title || "", 200) || null,
    description: sanitizeTextInput(payload.description || "", 5000) || null,
    tags,
    source_url: sanitizeUrlInput(payload.source_url || "") || null,
    thumbnail_url: sanitizeUrlInput(payload.thumbnail_url || "") || null,
    privacy_status: payload.privacy_status || null,
    status,
    scheduled_at: payload.scheduled_at || null,
    published_at: status === "published" ? now : null,
    platform_post_id: payload.platform_post_id || null,
    platform_post_url: payload.platform_post_url || null,
    upload_mode: payload.upload_mode || "local",
    helper_status: payload.helper_status || null,
    error_message: payload.error_message || null,
    created_at: now,
  };

  updateState((state) => ({
    ...state,
    posts: [nextPost, ...state.posts],
  }));

  return nextPost;
}

export function updatePost(postId, updateData) {
  let nextPost = null;

  updateState((state) => {
    state.posts = state.posts.map((post) => {
      if (post._id !== postId) {
        return post;
      }

      nextPost = {
        ...post,
        ...updateData,
      };

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

export async function ghostwrite({ prompt, platform, tone = "professional" }) {
  await new Promise((resolve) => window.setTimeout(resolve, 450));
  return {
    content: buildGhostwriteCopy(prompt, platform, tone),
  };
}

export async function getLocalHelperStatus() {
  try {
    const response = await fetchHelper("/health", {
      timeout: 10000,
      retry: {
        attempts: 3,
        backoffMs: 1200,
      },
    });
    return {
      available: response.status === "ok",
      status: "online",
      ...response,
    };
  } catch (error) {
    const isTimeout =
      error.code === "ECONNABORTED" ||
      error.message?.toLowerCase().includes("waking up") ||
      error.message?.toLowerCase().includes("timeout");

    return {
      available: false,
      status: isTimeout ? "starting" : "offline",
      error: isTimeout
        ? "Render helper is waking up..."
        : (error?.message || "Helper unavailable"),
    };
  }
}

export async function fetchVideoMetadata(url, options = {}) {
  const { normalizedUrl } = validateYouTubeSourceUrl(url, { allowCollections: false });
  const helperStatus = await getLocalHelperStatus();
  const videoId = extractYouTubeVideoId(normalizedUrl);
  const fallbackThumbnail = videoId
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : "";

  if (helperStatus.available) {
    try {
      const response = await fetchHelper("/api/youtube/metadata", {
        method: "post",
        data: { url: normalizedUrl },
        timeout: 15000,
        retry: {
          attempts: 2,
          backoffMs: 1000,
          idempotent: true,
        },
        signal: options.signal,
      });

      return {
        ...response,
        metadata_source: "python-helper",
      };
    } catch (error) {
      console.error("Local helper metadata lookup failed", error);
    }
  }

  const apiMetadata = await fetchMetadataWithYouTubeApi(normalizedUrl, videoId);
  if (apiMetadata) {
    return apiMetadata;
  }

  try {
    const response = await axios.get("https://www.youtube.com/oembed", {
      params: {
        url: normalizedUrl,
        format: "json",
      },
      timeout: 3000,
      signal: options.signal,
    });

    return {
      title: response.data.title || "Imported Video",
      description: buildFallbackVideoDescription(normalizedUrl, response.data.author_name),
      thumbnail: response.data.thumbnail_url || fallbackThumbnail,
      duration: "",
      view_count: 0,
      uploader: response.data.author_name || "Unknown",
      source_url: normalizedUrl,
      metadata_source: "oembed",
    };
  } catch (error) {
    console.error("Failed to fetch YouTube metadata, using fallback", error);

      return {
        title: videoId ? `Imported video ${videoId}` : "Imported Video",
      description: buildFallbackVideoDescription(normalizedUrl),
      thumbnail: fallbackThumbnail,
      duration: "",
      view_count: 0,
      uploader: "Unknown",
      source_url: normalizedUrl,
      metadata_source: "fallback",
    };
  }
}

export async function inspectYouTubeSource(url, maxItems = 80, options = {}) {
  const { normalizedUrl } = validateYouTubeSourceUrl(url, { allowCollections: true });
  const helperStatus = await getLocalHelperStatus();

  if (helperStatus.available) {
    const response = await fetchHelper("/api/youtube/source", {
      method: "post",
      data: {
        url: normalizedUrl,
        max_items: maxItems,
      },
      timeout: 30000,
      retry: {
        attempts: 2,
        backoffMs: 1200,
        idempotent: true,
      },
      signal: options.signal,
    });

    return response;
  }

  if (looksLikeCollectionUrl(normalizedUrl)) {
    throw new Error(`Render helper is required at ${getHelperUrl()} to inspect playlists and channels.`);
  }

  const video = await fetchVideoMetadata(normalizedUrl, options);
  return {
    kind: "video",
    metadata_source: video.metadata_source,
    video,
  };
}

export async function fetchYouTubeChannelAnalytics(account) {
  const activeAccount = await ensureFreshYouTubeAccount(account);
  if (!activeAccount?.channel_id || !activeAccount?.access_token) {
    return null;
  }

  const response = await fetchYouTubeApi(
    "channels",
    activeAccount.access_token,
    {
      part: "snippet,statistics,contentDetails",
      id: activeAccount.channel_id,
    },
    5000,
  );

  const item = response?.items?.[0];
  if (!item) {
    return null;
  }

  const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads || null;
  let recentVideos = [];

  if (uploadsPlaylistId) {
    const playlistData = await fetchYouTubeApi(
      "playlistItems",
      account.access_token,
      {
        part: "snippet,contentDetails",
        playlistId: uploadsPlaylistId,
        maxResults: 6,
      },
      5000,
    );

    const playlistItems = playlistData?.items || [];
    const recentVideoIds = playlistItems
      .map((entry) => entry.contentDetails?.videoId)
      .filter(Boolean);

    if (recentVideoIds.length > 0) {
      const videosData = await fetchYouTubeApi(
        "videos",
        activeAccount.access_token,
        {
          part: "snippet,statistics,contentDetails",
          id: recentVideoIds.join(","),
          maxResults: recentVideoIds.length,
        },
        5000,
      );

      const videosById = new Map((videosData?.items || []).map((video) => [video.id, video]));

      recentVideos = recentVideoIds
        .map((videoId) => {
          const video = videosById.get(videoId);
          if (!video) {
            return null;
          }

          return {
            id: video.id,
            title: video.snippet?.title || "Untitled video",
            thumbnail:
              video.snippet?.thumbnails?.medium?.url ||
              video.snippet?.thumbnails?.default?.url ||
              "",
            publishedAt: video.snippet?.publishedAt || null,
            views: Number(video.statistics?.viewCount || 0),
            likes: Number(video.statistics?.likeCount || 0),
            comments: Number(video.statistics?.commentCount || 0),
            durationSeconds: parseIsoDurationToSeconds(video.contentDetails?.duration),
            url: `https://www.youtube.com/watch?v=${video.id}`,
          };
        })
        .filter(Boolean);
    }
  }

  const recentTotals = recentVideos.reduce(
    (totals, video) => ({
      views: totals.views + video.views,
      likes: totals.likes + video.likes,
      comments: totals.comments + video.comments,
      durationSeconds: totals.durationSeconds + video.durationSeconds,
    }),
    {
      views: 0,
      likes: 0,
      comments: 0,
      durationSeconds: 0,
    },
  );
  const topVideo = [...recentVideos].sort((left, right) => right.views - left.views)[0] || null;
  const cadenceDays =
    recentVideos.length > 1
      ? recentVideos
          .slice(1)
          .map((video, index) => {
            const currentTime = new Date(recentVideos[index].publishedAt || 0).getTime();
            const nextTime = new Date(video.publishedAt || 0).getTime();
            return Math.abs(currentTime - nextTime) / 86400000;
          })
          .reduce((total, value) => total + value, 0) /
        (recentVideos.length - 1)
      : null;

  return {
    title: item.snippet?.title || activeAccount.account_name,
    thumbnail:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.default?.url ||
      activeAccount.profile_picture ||
      null,
    subscribers: Number(item.statistics?.subscriberCount || 0),
    views: Number(item.statistics?.viewCount || 0),
    videos: Number(item.statistics?.videoCount || 0),
    recentVideos,
    recentTotals,
    recentAverageViews: recentVideos.length ? recentTotals.views / recentVideos.length : 0,
    cadenceDays,
    topVideo,
  };
}

export async function uploadYouTubeImport({
  account,
  sourceUrl,
  title,
  description,
  tags,
  privacyStatus,
  publishAt,
  signal,
}) {
  const activeAccount = await ensureFreshYouTubeAccount(account);
  if (!activeAccount?.access_token) {
    throw new Error("Reconnect the YouTube channel before uploading.");
  }

  const helperStatus = await getLocalHelperStatus();
  if (!helperStatus.available) {
    throw new Error(`Render helper is unavailable at ${appEnv.localHelperUrl}.`);
  }

  const response = await fetchHelper("/api/youtube/upload", {
    method: "post",
    timeout: 1200000,
    data: {
      url: validateYouTubeSourceUrl(sourceUrl, { allowCollections: false }).normalizedUrl,
      accessToken: activeAccount.access_token,
      title: sanitizeTextInput(title, 200),
      description: sanitizeTextInput(description, 5000),
      tags: parseTags(tags),
      privacyStatus,
      publishAt,
      channelId: activeAccount.channel_id,
    },
    signal,
  });

  return response;
}
export async function publishLinkedInPost({ account, text, url, title, signal }) {
  const activeAccount = await ensureFreshLinkedInAccount(account);
  if (!activeAccount?.access_token) {
    throw new Error("Reconnect the LinkedIn profile before posting.");
  }

  const helperStatus = await getLocalHelperStatus();
  if (!helperStatus.available) {
    throw new Error(`Render helper is unavailable at ${appEnv.localHelperUrl}.`);
  }

  return fetchHelper("/api/linkedin/post", {
    method: "post",
    timeout: 15000,
    data: {
      accessToken: activeAccount.access_token,
      authorId: activeAccount.linkedin_id,
      text: sanitizeTextInput(text, 3000),
      linkUrl: sanitizeUrlInput(url),
      linkTitle: sanitizeTextInput(title, 200),
    },
    signal,
  });
}

export async function scheduleLinkedInPost({
  account,
  text,
  url,
  title,
  publishAt,
  signal,
}) {
  const activeAccount = await ensureFreshLinkedInAccount(account);
  if (!activeAccount?.access_token) {
    throw new Error("Reconnect the LinkedIn profile before scheduling.");
  }

  if (!publishAt) {
    throw new Error("Choose a publish date before scheduling.");
  }

  const helperStatus = await getLocalHelperStatus();
  if (!helperStatus.available) {
    throw new Error(`Render helper is unavailable at ${appEnv.localHelperUrl}.`);
  }

  return fetchHelper("/api/linkedin/schedule", {
    method: "post",
    timeout: 15000,
    data: {
      accessToken: activeAccount.access_token,
      authorId: activeAccount.linkedin_id,
      text: sanitizeTextInput(text, 3000),
      linkUrl: sanitizeUrlInput(url),
      linkTitle: sanitizeTextInput(title, 200),
      publishAt,
    },
    signal,
  });
}

export async function fetchLinkedInScheduleJobs() {
  const helperStatus = await getLocalHelperStatus();
  if (!helperStatus.available) {
    return [];
  }

  const response = await fetchHelper("/api/linkedin/schedules", {
    timeout: 10000,
  });

  return Array.isArray(response.jobs) ? response.jobs : [];
}

export async function syncLinkedInScheduledPosts() {
  const jobs = await fetchLinkedInScheduleJobs();
  if (jobs.length === 0) {
    return [];
  }

  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const changes = [];

  updateState((state) => {
    state.posts = state.posts.map((post) => {
      if (
        post.platform !== "linkedin" ||
        !post.platform_post_id ||
        !["scheduled", "running", "failed"].includes(post.helper_status || "")
      ) {
        return post;
      }

      const job = jobsById.get(post.platform_post_id);
      if (!job) {
        return post;
      }

      if (job.status === "completed" && post.status !== "published") {
        const nextPost = {
          ...post,
          status: "published",
          published_at: job.completedAt || new Date().toISOString(),
          helper_status: "completed",
          error_message: null,
        };
        changes.push(nextPost);
        return nextPost;
      }

      if (job.status === "failed" && (post.status !== "failed" || post.error_message !== job.error)) {
        const nextPost = {
          ...post,
          status: "failed",
          helper_status: "failed",
          error_message: job.error || "LinkedIn schedule failed.",
        };
        changes.push(nextPost);
        return nextPost;
      }

      if (job.status === "running" && post.helper_status !== "running") {
        return {
          ...post,
          helper_status: "running",
        };
      }

      return post;
    });

    return state;
  });

  return changes;
}
