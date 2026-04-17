import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export const AuthWrapper = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    // Handle Supabase auth errors in URL
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const authError = params.get("error") || hashParams.get("error");
    if (authError) {
      console.error("[auth] Supabase error:", authError);
      window.history.replaceState({}, "", window.location.pathname);
      toast.error("Google sign-in failed — please try again.");
    }

    // onAuthStateChange is the ONLY source of truth for user state.
    // It fires: INITIAL_SESSION (on load), SIGNED_IN (after OAuth redirect), SIGNED_OUT, TOKEN_REFRESHED
    // Do NOT use getSession() separately — it races with onAuthStateChange and causes the "initialized" guard bug
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === "SIGNED_IN") {
        setSigningIn(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setSigningIn(true);
    const redirectBase = process.env.REACT_APP_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${redirectBase}/workspace/accounts`,
        scopes: "profile email",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      toast.error(`Sign in failed: ${error.message}`);
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast.success("Signed out.");
    window.location.href = "/";
  };

  const connectYouTubeAccount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sign in first"); return; }
    try {
      const res = await fetch(`${API_URL}/auth/youtube/init`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error("[auth] YouTube init failed:", err);
      toast.error("Failed to start YouTube connection");
    }
  };

  const connectLinkedInAccount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sign in first"); return; }
    try {
      const res = await fetch(`${API_URL}/auth/linkedin/init`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error("[auth] LinkedIn init failed:", err);
      toast.error("Failed to start LinkedIn connection");
    }
  };

  const refreshSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    return { user: session?.user ?? null };
  };

  return (
    <AuthContext.Provider value={{
      user, loading, signingIn, signIn, signOut,
      connectYouTubeAccount, connectLinkedInAccount, refreshSession,
      loginAsDemo: () => toast.info("Use Sign in with Google"),
      logout: signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
