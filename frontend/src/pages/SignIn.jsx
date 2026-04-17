import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { workspaceRoutes } from "../lib/routes";

const SignIn = () => {
  const { user, loading, signingIn, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate(workspaceRoutes.dashboard, { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#071119] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-gradient-to-b from-[#071119]/55 via-[#071119]/25 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-[10rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/5 blur-[130px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-md"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/6">
          <img src="/branding/occium-mark.webp" alt="Occium" className="h-10 w-10 object-contain" />
        </div>
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] mb-3">Welcome to Occium</h1>
          <p className="text-white/50 text-lg leading-relaxed">Your content operations system for YouTube and LinkedIn.</p>
        </div>

        {signingIn ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-white/60" />
            <p className="text-white/40 text-sm">Redirecting to Google...</p>
          </div>
        ) : (
          <button onClick={signIn} disabled={loading}
            className="flex items-center gap-3 bg-white text-slate-950 px-8 py-4 rounded-full font-semibold text-base hover:scale-[1.02] transition-transform shadow-xl shadow-white/10 disabled:opacity-60">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        )}

        <p className="text-white/30 text-sm">
          By signing in you agree to our{" "}
          <a href="/terms" className="text-white/50 hover:text-white underline">Terms</a> and{" "}
          <a href="/privacy" className="text-white/50 hover:text-white underline">Privacy Policy</a>
        </p>
      </motion.div>
    </div>
  );
};

export default SignIn;
