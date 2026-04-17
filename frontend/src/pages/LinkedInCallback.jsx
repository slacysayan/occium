import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { workspaceRoutes } from "../lib/routes";

// LinkedIn OAuth is now handled entirely by the backend.
// This page just redirects — the backend callback goes directly to /workspace/accounts
const LinkedInCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      navigate(`${workspaceRoutes.accounts}?error=linkedin_failed`, { replace: true });
    } else {
      navigate(workspaceRoutes.accounts, { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#071119]">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
};

export default LinkedInCallback;
