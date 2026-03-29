import axios from "axios";
import { appEnv } from "../config/env";

const STORAGE_KEY = "occium.local.app.v2";
const STORAGE_EVENT = "occium:statechange";
const LOCAL_USER_ID = "local_owner";

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
      post.status === "scheduled" &&
      post.scheduled_at &&
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
    refresh_token: null,
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
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === "string" && tags.trim()) {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
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

function getHelperUrl() {
  return appEnv.localHelperUrl.replace(/\/$/, "");
}

async function fetchHelper(path, options = {}) {
  const baseUrl = getHelperUrl();
  const url = `${baseUrl}${path}`;
  const response = await axios({
    url,
    method: options.method || "get",
    data: options.data,
    timeout: options.timeout || 1500,
    headers: options.headers,
  });

  return response.data;
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

  const nextAccount = buildAccount({
    platform: "linkedin",
    accountName,
    profilePicture,
    linkedinId,
    connectionMode: customDetails.connection_mode || "mock",
  });

  upsertAccount(
    (account) => account.platform === "linkedin" && account.linkedin_id === linkedinId,
    nextAccount,
  );

  return nextAccount;
}

export function connectYouTubeAccountFromGoogle({
  googleProfile,
  channelProfile,
  accessToken,
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
    title: payload.title || null,
    description: payload.description || null,
    tags,
    source_url: payload.source_url || null,
    thumbnail_url: payload.thumbnail_url || null,
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
    const response = await fetchHelper("/health", { timeout: 1200 });
    return {
      available: response.status === "ok",
      ...response,
    };
  } catch (error) {
    return {
      available: false,
      status: "offline",
      error: error?.message || "Local helper unavailable",
    };
  }
}

export async function fetchVideoMetadata(url) {
  const helperStatus = await getLocalHelperStatus();
  const videoId = extractYouTubeVideoId(url);
  const fallbackThumbnail = videoId
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : "";

  if (helperStatus.available) {
    try {
      const response = await fetchHelper("/api/youtube/metadata", {
        method: "post",
        data: { url },
        timeout: 15000,
      });

      return {
        ...response,
        metadata_source: "python-helper",
      };
    } catch (error) {
      console.error("Local helper metadata lookup failed", error);
    }
  }

  const apiMetadata = await fetchMetadataWithYouTubeApi(url, videoId);
  if (apiMetadata) {
    return apiMetadata;
  }

  try {
    const response = await axios.get("https://www.youtube.com/oembed", {
      params: {
        url,
        format: "json",
      },
      timeout: 3000,
    });

    return {
      title: response.data.title || "Imported Video",
      description: buildFallbackVideoDescription(url, response.data.author_name),
      thumbnail: response.data.thumbnail_url || fallbackThumbnail,
      duration: "",
      view_count: 0,
      uploader: response.data.author_name || "Unknown",
      source_url: url,
      metadata_source: "oembed",
    };
  } catch (error) {
    console.error("Failed to fetch YouTube metadata, using fallback", error);

    return {
      title: videoId ? `Imported video ${videoId}` : "Imported Video",
      description: buildFallbackVideoDescription(url),
      thumbnail: fallbackThumbnail,
      duration: "",
      view_count: 0,
      uploader: "Unknown",
      source_url: url,
      metadata_source: "fallback",
    };
  }
}

export async function inspectYouTubeSource(url, maxItems = 80) {
  const helperStatus = await getLocalHelperStatus();

  if (helperStatus.available) {
    const response = await fetchHelper("/api/youtube/source", {
      method: "post",
      data: {
        url,
        max_items: maxItems,
      },
      timeout: 30000,
    });

    return response;
  }

  if (looksLikeCollectionUrl(url)) {
    throw new Error(`Start the helper at ${getHelperUrl()} to inspect playlists and channels.`);
  }

  const video = await fetchVideoMetadata(url);
  return {
    kind: "video",
    metadata_source: video.metadata_source,
    video,
  };
}

export async function fetchYouTubeChannelAnalytics(account) {
  if (!account?.channel_id || !account?.access_token) {
    return null;
  }

  const response = await fetchYouTubeApi(
    "channels",
    account.access_token,
    {
      part: "snippet,statistics,contentDetails",
      id: account.channel_id,
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
        account.access_token,
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
    title: item.snippet?.title || account.account_name,
    thumbnail:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.default?.url ||
      account.profile_picture ||
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
}) {
  if (!account?.access_token) {
    throw new Error("Reconnect the YouTube channel before uploading.");
  }

  const helperStatus = await getLocalHelperStatus();
  if (!helperStatus.available) {
    throw new Error(`Start the local helper at ${appEnv.localHelperUrl} before importing.`);
  }

  const response = await fetchHelper("/api/youtube/upload", {
    method: "post",
    timeout: 1200000,
    data: {
      url: sourceUrl,
      accessToken: account.access_token,
      title,
      description,
      tags: parseTags(tags),
      privacyStatus,
      publishAt,
      channelId: account.channel_id,
    },
  });

  return response;
}
