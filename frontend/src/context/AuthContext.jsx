import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { toast } from "sonner";
import { appEnv } from "../config/env";
import {
  connectYouTubeAccountFromGoogle,
  ensureLocalSession,
  resetLocalUser,
} from "../lib/localApp";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const AuthStateProvider = ({ children, connectYouTubeImpl }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = ensureLocalSession();
    setUser(session.user);
    setLoading(false);
  }, []);

  const refreshSession = () => {
    const session = ensureLocalSession();
    setUser(session.user);
    return session;
  };

  const connectYouTubeAccount = async () => {
    const result = await connectYouTubeImpl();
    refreshSession();
    return result;
  };

  const connectLocalLinkedInAccount = async () => {
    throw new Error("LinkedIn live connect is not wired yet. We are finishing YouTube first.");
  };

  const loginAsDemo = () => {
    const session = refreshSession();
    toast.success("Local workspace ready.");
    return session.user;
  };

  const logout = () => {
    const nextUser = resetLocalUser();
    setUser(nextUser);
    toast.info("Local workspace reset.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token: "local-session",
        loading,
        loginAsDemo,
        logout,
        connectYouTubeAccount,
        connectLinkedInAccount: connectLocalLinkedInAccount,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const LocalAuthProvider = ({ children }) => {
  const connectYouTubeImpl = async () => {
    throw new Error(
      "Google YouTube connect is not configured on this deployment. Add REACT_APP_GOOGLE_CLIENT_ID in Vercel and redeploy.",
    );
  };

  return (
    <AuthStateProvider connectYouTubeImpl={connectYouTubeImpl}>
      {children}
    </AuthStateProvider>
  );
};

const GoogleAuthProvider = ({ children }) => {
  const pendingRequestRef = useRef({
    resolve: null,
    reject: null,
  });

  const clearPendingRequest = () => {
    pendingRequestRef.current = {
      resolve: null,
      reject: null,
    };
  };

  const googleLogin = useGoogleLogin({
    flow: "implicit",
    scope:
      "openid profile email https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload",
    onSuccess: async (tokenResponse) => {
      try {
        const headers = {
          Authorization: `Bearer ${tokenResponse.access_token}`,
        };

        const [profileResult, channelResult] = await Promise.allSettled([
          axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers,
          }),
          axios.get("https://www.googleapis.com/youtube/v3/channels", {
            headers,
            params: {
              part: "snippet",
              mine: true,
            },
          }),
        ]);

        const googleProfile =
          profileResult.status === "fulfilled" ? profileResult.value.data : null;
        const channelProfile =
          channelResult.status === "fulfilled"
            ? channelResult.value.data?.items?.[0] || null
            : null;

        const result = connectYouTubeAccountFromGoogle({
          googleProfile,
          channelProfile,
          accessToken: tokenResponse.access_token,
          expiresIn: tokenResponse.expires_in,
          scope: tokenResponse.scope,
        });

        pendingRequestRef.current.resolve?.(result);
        toast.success("YouTube channel connected.");
      } catch (error) {
        console.error("Google connect failed", error);
        pendingRequestRef.current.reject?.(error);
        toast.error("Google sign-in completed, but channel sync failed.");
      } finally {
        clearPendingRequest();
      }
    },
    onError: (error) => {
      console.error("Google auth error", error);
      pendingRequestRef.current.reject?.(error);
      clearPendingRequest();
      toast.error("Google authentication failed.");
    },
  });

  const connectYouTubeImpl = () =>
    new Promise((resolve, reject) => {
      pendingRequestRef.current = { resolve, reject };
      googleLogin();
    });

  return (
    <AuthStateProvider connectYouTubeImpl={connectYouTubeImpl}>
      {children}
    </AuthStateProvider>
  );
};

export const AuthWrapper = ({ children }) => {
  const hasGoogleConfig = appEnv.enableGoogleConnect && Boolean(appEnv.googleClientId);

  if (!hasGoogleConfig) {
    return <LocalAuthProvider>{children}</LocalAuthProvider>;
  }

  return (
    <GoogleOAuthProvider clientId={appEnv.googleClientId}>
      <GoogleAuthProvider>{children}</GoogleAuthProvider>
    </GoogleOAuthProvider>
  );
};
