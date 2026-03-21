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
      className="w-20 md:w-64 flex-shrink-0 flex flex-col glass-panel md:rounded-r-2xl border-r border-white/10 h-screen fixed left-0 top-0 z-50"
    >
      <div className="p-6 flex items-center justify-center md:justify-start gap-3">
        {/* Logo Placeholder */}
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black font-bold text-xs">O</div>
        <span className="text-xl font-bold text-white hidden md:block tracking-tight">Occium</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                isActive 
                  ? "bg-white text-black shadow-lg shadow-white/10 scale-105" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <link.icon size={20} className={cn("transition-colors", isActive ? "text-black" : "group-hover:text-white")} />
              <span className="hidden md:block font-medium">{link.name}</span>
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
