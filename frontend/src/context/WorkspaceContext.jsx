import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { accountsApi, postsApi } from "../lib/api";

const WorkspaceContext = createContext(null);

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};

export const WorkspaceProvider = ({ children }) => {
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [accRes, postsRes] = await Promise.all([
        accountsApi.list(),
        postsApi.list(),
      ]);
      setAccounts(accRes.data);
      setPosts(postsRes.data);
    } catch {
      // not logged in yet — keep empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Listen for account connection redirects (?connected=youtube|linkedin)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) {
      refresh();
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (error) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refresh]);

  const youtubeAccounts = accounts.filter((a) => a.platform === "youtube");
  const linkedinAccounts = accounts.filter((a) => a.platform === "linkedin");

  const removePost = async (id) => {
    await postsApi.remove(id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const removeAccount = async (id) => {
    await accountsApi.disconnect(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <WorkspaceContext.Provider value={{
      accounts,
      posts,
      youtubeAccounts,
      linkedinAccounts,
      loading,
      refresh,
      removePost,
      removeAccount,
      // legacy compat
      helperStatus: { available: true, status: "connected" },
      helperLoading: false,
      helperCheckedAt: new Date().toISOString(),
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
