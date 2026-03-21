import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Link2, PenSquare, Calendar, Sparkles, Settings, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const links = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Accounts', path: '/accounts', icon: Link2 },
    { name: 'New Post', path: '/new', icon: PenSquare },
    { name: 'Queue', path: '/queue', icon: Calendar },
    { name: 'AI Studio', path: '/ai-studio', icon: Sparkles },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-20 md:w-64 flex-shrink-0 flex flex-col glass-panel md:rounded-r-2xl border-r border-white/10 h-screen fixed left-0 top-0 z-50 bg-black/80 backdrop-blur-xl"
    >
      <div className="p-8 flex items-center justify-center md:justify-start gap-3">
        {/* Transparent Modern Logo */}
        <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44C35.0457 44 44 35.0457 44 24" stroke="white" strokeWidth="4" strokeLinecap="round"/>
            <path d="M24 14V34" stroke="#D4AF37" strokeWidth="4" strokeLinecap="round"/>
        </svg>
        <span className="text-2xl font-bold text-white hidden md:block tracking-tighter font-sans">Occium</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                isActive 
                  ? "bg-white text-black shadow-lg shadow-white/10 scale-105" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <link.icon size={20} className={cn("transition-colors relative z-10", isActive ? "text-black" : "group-hover:text-white")} />
              <span className="hidden md:block font-medium relative z-10">{link.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button 
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 text-white/60 hover:text-red-400 hover:bg-white/5 rounded-xl transition-all duration-300"
        >
          <LogOut size={20} />
          <span className="hidden md:block font-medium">Logout</span>
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
