import axios from "axios";
import { supabase } from "./supabase";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export const api = axios.create({ baseURL: API_URL });

// Attach Supabase JWT on every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// On 401, only redirect if we had a valid session (prevents redirect loop when backend is down)
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
        window.location.href = "/signin";
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  me: () => api.get("/auth/me"),
  logout: () => supabase.auth.signOut(),
  connectGoogle: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`${API_URL}/auth/youtube/init`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    const { url } = await res.json();
    window.location.href = url;
  },
  connectLinkedIn: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`${API_URL}/auth/linkedin/init`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    const { url } = await res.json();
    window.location.href = url;
  },
};

export const accountsApi = {
  list: () => api.get("/api/accounts"),
  disconnect: (id) => api.delete(`/api/accounts/${id}`),
};

export const youtubeApi = {
  metadata: (url) => api.get("/api/youtube/metadata", { params: { url } }),
  upload: (formData) => api.post("/api/youtube/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  importFromUrl: (payload) => api.post("/api/youtube/import", payload),
};

export const linkedinApi = {
  post: (payload) => api.post("/api/linkedin/post", payload),
};

export const aiApi = {
  ghostwrite: (payload) => api.post("/api/ai/ghostwrite", payload),
};

export const postsApi = {
  list: () => api.get("/api/posts"),
  get: (id) => api.get(`/api/posts/${id}`),
  create: (data) => api.post("/api/posts", data),
  update: (id, data) => api.patch(`/api/posts/${id}`, data),
  remove: (id) => api.delete(`/api/posts/${id}`),
};

export const settingsApi = {
  envStatus: () => api.get("/api/settings/env-status"),
};
