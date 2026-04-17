import React from "react";
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AuthWrapper, useAuth } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import AppBackdrop from "./components/layout/AppBackdrop";
import Sidebar from "./components/layout/Sidebar";
import LandingPage from "./pages/LandingPage";
import SignIn from "./pages/SignIn";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import NewPost from "./pages/NewPost";
import Queue from "./pages/Queue";
import AIStudio from "./pages/AIStudio";
import LinkedInCallback from "./pages/LinkedInCallback";
import Settings from "./pages/Settings";
import { Toaster } from "sonner";
import { workspaceRoutes } from "./lib/routes";

const MarketingLayout = () => (
  <div className="relative min-h-screen">
    <AppBackdrop />
    <main className="relative z-10 min-h-screen"><Outlet /></main>
  </div>
);

const ProtectedWorkspaceLayout = () => {
  const { user, loading } = useAuth();
  const hasOAuthHash = window.location.hash.includes("access_token");

  if (loading || hasOAuthHash) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[#071119]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/signin" replace />;
  return (
    <div className="relative flex min-h-screen">
      <AppBackdrop />
      <Sidebar />
      <main className="flex-1 md:ml-64 p-6 md:p-12 overflow-y-auto min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto pb-20"><Outlet /></div>
      </main>
    </div>
  );
};

const App = () => (
  <AuthWrapper>
    <WorkspaceProvider>
      <>
        <Router>
          <Routes>
            <Route element={<MarketingLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/connect" element={<LinkedInCallback />} />
            </Route>
            <Route element={<ProtectedWorkspaceLayout />}>
              <Route path={workspaceRoutes.dashboard} element={<Dashboard />} />
              <Route path={workspaceRoutes.accounts} element={<Accounts />} />
              <Route path={workspaceRoutes.newPost} element={<NewPost />} />
              <Route path={workspaceRoutes.queue} element={<Queue />} />
              <Route path={workspaceRoutes.aiStudio} element={<AIStudio />} />
              <Route path={workspaceRoutes.settings} element={<Settings />} />
            </Route>
            <Route path="/login" element={<Navigate to="/signin" replace />} />
            <Route path="/app" element={<Navigate to={workspaceRoutes.dashboard} replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <Toaster position="bottom-right" theme="dark" />
        <Analytics />
        <SpeedInsights />
      </>
    </WorkspaceProvider>
  </AuthWrapper>
);

export default App;
