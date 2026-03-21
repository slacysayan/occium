import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthWrapper, useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import NewPost from './pages/NewPost';
import Queue from './pages/Queue';
import AIStudio from './pages/AIStudio';
import { GlassCard } from './components/ui/GlassCard';
import { motion } from 'framer-motion';
import { Toaster } from 'sonner';

const Settings = () => <div className="text-white text-center py-20">Settings Page (Coming Soon)</div>;

const Login = () => {
    const { loginWithGoogle, user } = useAuth();
    if (user) return <Navigate to="/" />;

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <GlassCard className="w-full max-w-md text-center py-16">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black font-bold text-2xl mx-auto mb-6">O</div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Occium</h1>
                    <p className="text-white/60 mb-8 font-light">The Organic Futurist Scheduling Tool</p>
                    
                    <button 
                        onClick={() => loginWithGoogle()}
                        className="w-full max-w-xs bg-white text-black font-medium py-3 px-6 rounded-full hover:scale-105 transition-transform flex items-center justify-center gap-2 mx-auto shadow-xl shadow-white/10"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24-1.19-.6z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </button>
                </motion.div>
            </GlassCard>
        </div>
    );
};

const PrivateLayout = () => {
    const { user, loading } = useAuth();
    if (loading) return null; // Or a spinner
    if (!user) return <Navigate to="/login" />;

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

const App = () => {
    return (
        <AuthWrapper>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    
                    <Route element={<PrivateLayout />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/accounts" element={<Accounts />} />
                        <Route path="/new" element={<NewPost />} />
                        <Route path="/queue" element={<Queue />} />
                        <Route path="/ai-studio" element={<AIStudio />} />
                        <Route path="/settings" element={<Settings />} />
                    </Route>
                </Routes>
            </Router>
        </AuthWrapper>
    );
};

export default App;
