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
  exchangeGoogleCode,
  ensureLocalSession,
  resetLocalUser,
} from "../lib/localApp";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

function createOAuthState() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `linkedin_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

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

  const connectLinkedInAccount = async () => {
    if (!appEnv.linkedinClientId) {
      throw new Error(
        "LinkedIn OAuth is not configured on this deployment. Add REACT_APP_LINKEDIN_CLIENT_ID in Vercel and redeploy.",
      );
    }

    const redirectUri = `${window.location.origin}/connect`;
    const scope =
      appEnv.linkedinOauthMode === "oidc"
        ? "openid profile email w_member_social"
        : "r_liteprofile r_emailaddress w_member_social";
    const state = createOAuthState();

    window.sessionStorage.setItem("occium.linkedin.oauth.state", state);

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${appEnv.linkedinClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
    window.location.href = authUrl;
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
        connectLinkedInAccount,
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
    flow: "auth-code",
    ux_mode: "popup",
    select_account: true,
    scope:
      "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload",
    onSuccess: async (codeResponse) => {
      try {
        const redirectUri = window.location.origin;
        const tokenResponse = await exchangeGoogleCode(codeResponse.code, redirectUri);
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
          refreshToken: tokenResponse.refresh_token,
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
