import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export const AuthWrapper = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    // Handle Supabase auth errors returned in URL (e.g. server_error from Google)
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const authError = params.get("error") || hashParams.get("error");
    const errorDesc = params.get("error_description") || hashParams.get("error_description");
    if (authError) {
      console.error("[auth] Supabase auth error:", authError, errorDesc);
      window.history.replaceState({}, "", window.location.pathname);
      if (authError === "server_error") {
        toast.error("Google sign-in failed — please try again.");
      }
    }

    // Get initial session once
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialized.current) {
        setUser(session?.user ?? null);
        setLoading(false);
        initialized.current = true;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" && initialized.current) return;
      setUser(session?.user ?? null);
      setLoading(false);
      initialized.current = true;
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/workspace/accounts`,
        scopes: "profile email",
      },
    });
    if (error) toast.error(`Sign in failed: ${error.message}`);
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
      user, loading, signIn, signOut,
      connectYouTubeAccount, connectLinkedInAccount, refreshSession,
      loginAsDemo: () => toast.info("Use Sign in with Google"),
      logout: signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
