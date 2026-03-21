import axios from "axios";
import { appEnv } from "../config/env";

const STORAGE_KEY = "occium.local.app.v1";
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
    access_token: null,
    refresh_token: null,
    token_expires_at: null,
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

export function ensureLocalSession() {
  const state = ensureState();
  return {
    user: state.currentUser,
    token: "local-session",
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

export function connectLinkedInAccount() {
  const { currentUser } = ensureState();
  const seed = getUserSeed(currentUser);
  const linkedinId = `${seed.firstName.toLowerCase().replace(/\s+/g, "-")}-local`;
  const nextAccount = buildAccount({
    platform: "linkedin",
    accountName: seed.name,
    profilePicture: seed.picture,
    linkedinId,
    connectionMode: "mock",
  });

  upsertAccount(
    (account) => account.platform === "linkedin" && account.linkedin_id === linkedinId,
    nextAccount,
  );

  return nextAccount;
}

export function connectYouTubeAccountFromGoogle({ googleProfile, channelProfile }) {
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

export function getPosts(userId) {
  const state = ensureState();
  return sortByNewest(state.posts.filter((post) => post.user_id === userId));
}

export function createPost(payload) {
  const now = new Date().toISOString();
  const status = payload.status || (payload.scheduled_at ? "scheduled" : "draft");
  const postId = createId("post");
  const tags = Array.isArray(payload.tags)
    ? payload.tags
    : typeof payload.tags === "string" && payload.tags.trim()
      ? payload.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [];

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
    status,
    scheduled_at: payload.scheduled_at || null,
    published_at: status === "published" ? now : null,
    platform_post_id: null,
    error_message: null,
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

export async function fetchVideoMetadata(url) {
  const videoId = extractYouTubeVideoId(url);
  const fallbackThumbnail = videoId
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : "";

  try {
    const response = await axios.get("https://www.youtube.com/oembed", {
      params: {
        url,
        format: "json",
      },
    });

    return {
      title: response.data.title || "Imported Video",
      description: buildFallbackVideoDescription(url, response.data.author_name),
      thumbnail: response.data.thumbnail_url || fallbackThumbnail,
      duration: 0,
      view_count: 0,
      uploader: response.data.author_name || "Unknown",
      source_url: url,
    };
  } catch (error) {
    console.error("Failed to fetch YouTube metadata, using fallback", error);

    return {
      title: videoId ? `Imported video ${videoId}` : "Imported Video",
      description: buildFallbackVideoDescription(url),
      thumbnail: fallbackThumbnail,
      duration: 0,
      view_count: 0,
      uploader: "Unknown",
      source_url: url,
    };
  }
}
