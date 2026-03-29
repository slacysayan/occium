import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Linkedin, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { exchangeLinkedInCode, fetchLinkedInProfile, connectLinkedInAccount as connectLinkedInAccountImpl } from "../lib/localApp";
import { workspaceRoutes } from "../lib/routes";

const LinkedInCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");
    const expectedState = window.sessionStorage.getItem("occium.linkedin.oauth.state");

    if (errorParam) {
      setStatus("failed");
      setError(searchParams.get("error_description") || "LinkedIn authorization denied.");
      return;
    }

    if (!code) {
      setStatus("failed");
      setError("No authorization code found in the callback.");
      return;
    }

    if (!state || !expectedState || state !== expectedState) {
      setStatus("failed");
      setError("LinkedIn OAuth state check failed. Start the connection again.");
      return;
    }

    const processAuth = async () => {
      try {
        const redirectUri = `${window.location.origin}/connect`;
        const tokenResponse = await exchangeLinkedInCode(code, redirectUri);

        if (!tokenResponse.access_token) {
          throw new Error("Failed to retrieve access token from LinkedIn.");
        }

        const profile = await fetchLinkedInProfile(tokenResponse.access_token);
        if (!profile.sub) {
          throw new Error("LinkedIn profile lookup did not return a member id.");
        }
        const accountName =
          profile.name ||
          [profile.given_name, profile.family_name].filter(Boolean).join(" ").trim() ||
          "LinkedIn Member";

        connectLinkedInAccountImpl({
          account_name: accountName,
          linkedin_id: profile.sub,
          profile_picture: profile.picture || null,
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token,
          expires_in: tokenResponse.expires_in,
          connection_mode: "oauth",
        });

        window.sessionStorage.removeItem("occium.linkedin.oauth.state");
        refreshSession();
        setStatus("success");
        toast.success("LinkedIn profile connected!");

        setTimeout(() => {
          navigate(workspaceRoutes.accounts);
        }, 1500);
      } catch (err) {
        console.error("LinkedIn OAuth error", err);
        window.sessionStorage.removeItem("occium.linkedin.oauth.state");
        setStatus("failed");
        setError(err.message || "Failed to process LinkedIn connection.");
        toast.error("LinkedIn connection failed.");
      }
    };

    processAuth();
  }, [searchParams, navigate, refreshSession]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#071119] text-white p-6">
      <div className="w-full max-w-md bg-[#091521] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-blue-500/10 blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/40">
            <Linkedin size={32} />
          </div>

          <h1 className="text-2xl font-semibold mb-2 tracking-tight">LinkedIn Connection</h1>
          
          <div className="min-h-[80px] flex items-center justify-center">
            {status === "connecting" && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-blue-400" size={32} />
                <p className="text-white/40 text-sm">Finishing the handshake...</p>
              </div>
            )}

            {status === "success" && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="flex flex-col items-center gap-3"
              >
                <CheckCircle2 className="text-emerald-400" size={48} />
                <p className="text-emerald-400/80 font-medium">Successfully Connected!</p>
              </motion.div>
            )}

            {status === "failed" && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="flex flex-col items-center gap-3"
              >
                <AlertCircle className="text-red-400" size={48} />
                <p className="text-red-400/80 text-sm">{error}</p>
                <button 
                  onClick={() => navigate(workspaceRoutes.accounts)}
                  className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm font-medium transition-colors"
                >
                  Return to Account Settings
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-white/20 text-xs tracking-widest uppercase">Occium Engine · Secured via OAuth</p>
    </div>
  );
};

export default LinkedInCallback;
