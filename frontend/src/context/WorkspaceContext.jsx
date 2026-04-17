import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
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
  const retryTimers = useRef([]);
  const hasFetched = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const [accRes, postsRes] = await Promise.all([accountsApi.list(), postsApi.list()]);
      setAccounts(accRes.data ?? []);
      setPosts(postsRes.data ?? []);
      return accRes.data ?? [];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch — once only
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      refresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // After OAuth redirect: retry with exponential backoff
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");

    if (connected) {
      window.history.replaceState({}, "", window.location.pathname);
      retryTimers.current.forEach(clearTimeout);
      retryTimers.current = [];
      [800, 1600, 2400].forEach((delay, i) => {
        const timer = setTimeout(async () => {
          try {
            const [accRes, postsRes] = await Promise.all([accountsApi.list(), postsApi.list()]);
            setAccounts(accRes.data ?? []);
            setPosts(postsRes.data ?? []);
            setLoading(false);
            if ((accRes.data ?? []).length > 0) retryTimers.current.forEach(clearTimeout);
          } catch (err) {
            console.error(`[workspace] Retry ${i + 1} failed:`, err);
          }
        }, delay);
        retryTimers.current.push(timer);
      });
    }

    if (error) {
      console.error("[workspace] OAuth error:", error);
      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => { retryTimers.current.forEach(clearTimeout); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      accounts, posts, youtubeAccounts, linkedinAccounts,
      loading, refresh, removePost, removeAccount,
      helperStatus: { available: true, status: "connected" },
      helperLoading: false,
      helperCheckedAt: new Date().toISOString(),
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
