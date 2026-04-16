import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { authApi } from "../lib/api";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthWrapper = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me()
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const connectYouTubeAccount = () => authApi.connectGoogle();
  const connectLinkedInAccount = () => authApi.connectLinkedIn();

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    toast.success("Logged out.");
  };

  const refreshSession = async () => {
    const res = await authApi.me();
    setUser(res.data.user);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      logout,
      connectYouTubeAccount,
      connectLinkedInAccount,
      refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
