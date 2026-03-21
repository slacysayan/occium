import React from "react";
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthWrapper, useAuth } from "./context/AuthContext";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import NewPost from "./pages/NewPost";
import Queue from "./pages/Queue";
import AIStudio from "./pages/AIStudio";
import { Toaster } from "sonner";

const Settings = () => (
  <div className="text-white text-center py-20">Settings Page (Coming Soon)</div>
);

const AppLayout = () => {
  const { loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-6 md:p-12 overflow-y-auto min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto pb-20">
          <Outlet />
        </div>
      </main>
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
};

const App = () => (
  <AuthWrapper>
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/new" element={<NewPost />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/ai-studio" element={<AIStudio />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  </AuthWrapper>
);

export default App;
