import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { toast } from 'sonner';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('occium_token'));
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001/api';

  useEffect(() => {
    const storedUser = localStorage.getItem('occium_user');
    if (token && storedUser) {
      try {
          setUser(JSON.parse(storedUser));
      } catch (e) {
          console.error("Failed to parse user", e);
      }
    }
    setLoading(false);
  }, [token]);

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        const res = await axios.post(`${API_URL}/auth/google/callback`, {
          code: codeResponse.code,
          redirect_uri: window.location.origin
        });
        
        const { token, user } = res.data;
        setToken(token);
        setUser(user);
        localStorage.setItem('occium_token', token);
        localStorage.setItem('occium_user', JSON.stringify(user));
        toast.success("Successfully logged in!");
      } catch (error) {
        console.error("Login failed", error);
        toast.error("Login failed. Please try Demo Mode if this persists.");
      }
    },
    onError: (error) => {
        console.error("Google Login Error", error);
        toast.error("Google Login Popup Failed");
    },
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly' 
  });

  const loginAsDemo = () => {
      const demoUser = {
          id: "demo_user_123",
          name: "Demo User",
          email: "demo@occium.app",
          profile_picture: null
      };
      const demoToken = "demo_token_123"; // Backend needs to accept this or we mock requests
      setUser(demoUser);
      setToken(demoToken);
      localStorage.setItem('occium_token', demoToken);
      localStorage.setItem('occium_user', JSON.stringify(demoUser));
      toast.success("Welcome to Demo Mode!");
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('occium_token');
    localStorage.removeItem('occium_user');
    toast.info("Logged out");
  };

  return (
    <AuthContext.Provider value={{ user, token, loginWithGoogle, loginAsDemo, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const AuthWrapper = ({ children }) => {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || "65703749084-0okg8lrvfahrpb7h2chfuudsm9cgjdq0.apps.googleusercontent.com"}>
      <AuthProvider>{children}</AuthProvider>
    </GoogleOAuthProvider>
  );
};
