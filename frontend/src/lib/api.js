import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
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
  disconnect: (id) => api.delete(`/api/accounts/${id}`),
};

// ─── YouTube ──────────────────────────────────────────────────────────────────

export const youtubeApi = {
  metadata: (url) => api.get("/api/youtube/metadata", { params: { url } }),
};

// ─── LinkedIn ─────────────────────────────────────────────────────────────────

export const linkedinApi = {
  post: (payload) => api.post("/api/linkedin/post", payload),
};

// ─── AI ───────────────────────────────────────────────────────────────────────

export const aiApi = {
  ghostwrite: (payload) => api.post("/api/ai/ghostwrite", payload),
};

// ─── Posts ────────────────────────────────────────────────────────────────────

export const postsApi = {
  list: () => api.get("/api/posts"),
  create: (data) => api.post("/api/posts", data),
  update: (id, data) => api.patch(`/api/posts/${id}`, data),
  remove: (id) => api.delete(`/api/posts/${id}`),
};
