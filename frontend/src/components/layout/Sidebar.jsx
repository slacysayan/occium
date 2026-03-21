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
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-20 md:w-72 flex-shrink-0 flex flex-col h-screen fixed left-0 top-0 z-50 bg-black/40 backdrop-blur-2xl border-r border-white/5"
    >
      <div className="p-8 flex items-center gap-4">
        <motion.div 
          initial={{ rotate: -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent rounded-xl border border-white/10 shadow-2xl shadow-occium-gold/5"
        >
             <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44C35.0457 44 44 35.0457 44 24" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                <path d="M24 14V34" stroke="#D4AF37" strokeWidth="4" strokeLinecap="round"/>
            </svg>
        </motion.div>
        <motion.span 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-2xl font-bold text-white hidden md:block tracking-tighter font-sans"
        >
          Occium
        </motion.span>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2">
        {links.map((link, index) => {
          const isActive = location.pathname === link.path;
          return (
            <NavLink
              key={link.path}
              to={link.path}
            >
              {({ isActive }) => (
                <div className="relative group">
                    {isActive && (
                        <motion.div
                            layoutId="activeNav"
                            className="absolute inset-0 bg-white/10 rounded-xl"
                            initial={false}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 * index + 0.5 }}
                        className={cn(
                            "relative z-10 flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300",
                            isActive ? "text-white" : "text-white/40 group-hover:text-white"
                        )}
                    >
                        <link.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                        <span className="hidden md:block font-medium tracking-wide text-sm">{link.name}</span>
                    </motion.div>
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5">
        <button 
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 text-white/40 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-300 group"
        >
          <LogOut size={20} strokeWidth={1.5} className="group-hover:stroke-2" />
          <span className="hidden md:block font-medium text-sm">Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
