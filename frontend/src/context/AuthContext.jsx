import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('occium_token'));
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001/api';

  useEffect(() => {
    if (token) {
      // Validate token or just load user from storage/API
      // For now, let's assume valid if present (in a real app, verify with backend)
      const storedUser = JSON.parse(localStorage.getItem('occium_user'));
      if (storedUser) setUser(storedUser);
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
      } catch (error) {
        console.error("Login failed", error);
      }
    },
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly' 
  });

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('occium_token');
    localStorage.removeItem('occium_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loginWithGoogle, logout, loading }}>
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
