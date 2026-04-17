import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export const AuthWrapper = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
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

  // YouTube/LinkedIn connections use /auth/youtube/init and /auth/linkedin/init
  // which return a redirect URL — avoids the Bearer token in URL problem
  const connectYouTubeAccount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sign in first"); return; }
    try {
      const res = await fetch(`${API_URL}/auth/youtube/init`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
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
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
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
      user,
      loading,
      signIn,
      signOut,
      connectYouTubeAccount,
      connectLinkedInAccount,
      refreshSession,
      loginAsDemo: () => toast.info("Use Sign in with Google"),
      logout: signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
