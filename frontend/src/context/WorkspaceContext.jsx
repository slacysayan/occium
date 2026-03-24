import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getLocalHelperStatus,
  getWorkspaceState,
  subscribeToWorkspaceState,
} from "../lib/localApp";

const WorkspaceContext = createContext(null);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }

  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState(() => getWorkspaceState());
  const [helperStatus, setHelperStatus] = useState({
    available: false,
    status: "checking",
  });
  const [helperLoading, setHelperLoading] = useState(false);
  const [helperCheckedAt, setHelperCheckedAt] = useState(null);

  useEffect(() => subscribeToWorkspaceState(setSnapshot), []);

  const activeUserId = user?.id || snapshot.currentUser?.id;

  const accounts = useMemo(
    () => snapshot.accounts.filter((account) => account.user_id === activeUserId),
    [activeUserId, snapshot.accounts],
  );
  const posts = useMemo(
    () => snapshot.posts.filter((post) => post.user_id === activeUserId),
    [activeUserId, snapshot.posts],
  );

  const refreshHelperStatus = async () => {
    setHelperLoading(true);
    try {
      const nextStatus = await getLocalHelperStatus();
      setHelperStatus(nextStatus);
      setHelperCheckedAt(new Date().toISOString());
      return nextStatus;
    } finally {
      setHelperLoading(false);
    }
  };

  useEffect(() => {
    if (!activeUserId) {
      return undefined;
    }

    let isMounted = true;

    const pollHelper = async () => {
      const nextStatus = await getLocalHelperStatus();
      if (!isMounted) {
        return;
      }

      setHelperStatus(nextStatus);
      setHelperCheckedAt(new Date().toISOString());
    };

    pollHelper();
    const intervalId = window.setInterval(pollHelper, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activeUserId]);

  const value = useMemo(
    () => ({
      currentUser: snapshot.currentUser,
      accounts,
      posts,
      youtubeAccounts: accounts.filter((account) => account.platform === "youtube"),
      linkedinAccounts: accounts.filter((account) => account.platform === "linkedin"),
      helperStatus,
      helperLoading,
      helperCheckedAt,
      refreshHelperStatus,
    }),
    [accounts, helperCheckedAt, helperLoading, helperStatus, posts, snapshot.currentUser],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
