import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send session cookie on every request
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
  connectGoogle: () => { window.location.href = `${API_URL}/auth/google`; },
  connectLinkedIn: () => { window.location.href = `${API_URL}/auth/linkedin`; },
};

// ─── Accounts ─────────────────────────────────────────────────────────────────

export const accountsApi = {
  list: () => api.get("/api/accounts"),
  disconnect: (id: string) => api.delete(`/api/accounts/${id}`),
};

// ─── YouTube ──────────────────────────────────────────────────────────────────

export const youtubeApi = {
  metadata: (url: string) =>
    api.get("/api/youtube/metadata", { params: { url } }),
};

// ─── LinkedIn ─────────────────────────────────────────────────────────────────

export const linkedinApi = {
  post: (payload: {
    accountId: string;
    text: string;
    linkUrl?: string;
    linkTitle?: string;
    scheduledAt?: string;
  }) => api.post("/api/linkedin/post", payload),
};

// ─── AI ───────────────────────────────────────────────────────────────────────

export const aiApi = {
  ghostwrite: (payload: {
    title: string;
    description?: string;
    tags?: string[];
    voiceProfile?: string;
  }) => api.post("/api/ai/ghostwrite", payload),
};

// ─── Posts ────────────────────────────────────────────────────────────────────

export const postsApi = {
  list: () => api.get("/api/posts"),
  create: (data: Record<string, unknown>) => api.post("/api/posts", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/posts/${id}`, data),
  remove: (id: string) => api.delete(`/api/posts/${id}`),
};
