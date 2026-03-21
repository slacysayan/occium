import React, { useEffect, useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Activity, CheckCircle, Clock, AlertCircle, TrendingUp, Users, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({ scheduled: 0, published: 0, failed: 0 });
  const [posts, setPosts] = useState([]);
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  // Mock data for chart
  const data = [
    { name: 'Mon', views: 4000 },
    { name: 'Tue', views: 3000 },
    { name: 'Wed', views: 2000 },
    { name: 'Thu', views: 2780 },
    { name: 'Fri', views: 1890 },
    { name: 'Sat', views: 2390 },
    { name: 'Sun', views: 3490 },
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !user) return;
      try {
        // Mock if demo
        if (user.id === 'demo_user_123') {
            setPosts([
                { _id: '1', title: 'Launch Day Vlog', platform: 'youtube', status: 'published', scheduled_at: new Date().toISOString() },
                { _id: '2', title: 'Product Update', platform: 'linkedin', status: 'scheduled', scheduled_at: new Date(Date.now() + 86400000).toISOString() },
                { _id: '3', title: 'Tech Stack Review', platform: 'youtube', status: 'draft', scheduled_at: null },
            ]);
            setStats({ scheduled: 1, published: 5, failed: 0 });
            return;
        }

        const res = await axios.get(`${API_URL}/posts/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(res.data);
        const scheduled = res.data.filter(p => p.status === 'scheduled').length;
        const published = res.data.filter(p => p.status === 'published').length;
        const failed = res.data.filter(p => p.status === 'failed').length;
        setStats({ scheduled, published, failed });
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      }
    };
    fetchData();
  }, [user, token, API_URL]);

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
            <h1 className="text-5xl font-light text-white mb-2 tracking-tight">Overview</h1>
            <p className="text-white/40 font-light">Welcome back, {user?.name.split(' ')[0]}. Here is your content velocity.</p>
        </div>
        <div className="text-right hidden md:block">
             <p className="text-occium-gold font-mono text-sm">{format(new Date(), 'EEEE, MMMM do')}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard 
            icon={Clock} 
            label="Scheduled" 
            value={stats.scheduled} 
            color="text-blue-400" 
            bg="bg-blue-500/10" 
            delay={0.1}
        />
        <StatsCard 
            icon={CheckCircle} 
            label="Published" 
            value={stats.published} 
            color="text-green-400" 
            bg="bg-green-500/10" 
            delay={0.2}
        />
        <StatsCard 
            icon={Eye} 
            label="Total Views" 
            value="12.5K" 
            color="text-purple-400" 
            bg="bg-purple-500/10" 
            delay={0.3}
        />
         <StatsCard 
            icon={Users} 
            label="Subscribers" 
            value="3,402" 
            color="text-occium-gold" 
            bg="bg-yellow-500/10" 
            delay={0.4}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chart Section */}
        <GlassCard className="lg:col-span-2 min-h-[400px] flex flex-col" delay={0.5}>
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-medium text-white flex items-center gap-2">
                    <TrendingUp size={20} className="text-white/40" />
                    Engagement Growth
                </h3>
                <select className="bg-white/5 border border-white/10 rounded-lg text-white/60 text-sm px-3 py-1 outline-none">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                </select>
            </div>
            
            <div className="flex-1 w-full h-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}} tickLine={false} axisLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.2)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}} tickLine={false} axisLine={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="views" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </GlassCard>

        {/* Recent Activity Feed */}
        <GlassCard className="min-h-[400px]" delay={0.6}>
            <h3 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
                <Activity size={20} className="text-white/40" />
                Recent Activity
            </h3>
            <div className="space-y-4 relative">
                 {/* Timeline Line */}
                 <div className="absolute left-4 top-2 bottom-2 w-[1px] bg-white/5"></div>

                {posts.slice(0, 5).map((post, i) => (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + (i * 0.1) }}
                        key={post._id} 
                        className="relative pl-10 py-2 group"
                    >
                        {/* Timeline Dot */}
                        <div className={`absolute left-[13px] top-4 w-2 h-2 rounded-full border border-black ${
                            post.status === 'published' ? 'bg-green-400' :
                            post.status === 'scheduled' ? 'bg-blue-400' :
                            'bg-white/40'
                        }`}></div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group-hover:translate-x-1">
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                                    post.platform === 'youtube' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                                }`}>{post.platform}</span>
                                <span className="text-white/30 text-xs">{post.scheduled_at ? format(new Date(post.scheduled_at), 'MMM d') : 'Draft'}</span>
                            </div>
                            <p className="font-medium text-white truncate">{post.title || post.description || "Untitled Post"}</p>
                            <p className="text-white/40 text-xs mt-1 capitalize">{post.status}</p>
                        </div>
                    </motion.div>
                ))}
                
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="pl-10 pt-4"
                >
                    <a href="/new" className="flex items-center gap-2 text-white/40 hover:text-occium-gold transition-colors text-sm font-medium group">
                        <div className="w-8 h-8 rounded-full border border-dashed border-white/20 flex items-center justify-center group-hover:border-occium-gold/50">
                            <span className="text-lg">+</span>
                        </div>
                        Create New
                    </a>
                </motion.div>
            </div>
        </GlassCard>
      </div>
    </div>
  );
};

const StatsCard = ({ icon: Icon, label, value, color, bg, delay }) => (
    <GlassCard className="p-6 relative overflow-hidden group" delay={delay}>
        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${bg} blur-2xl group-hover:scale-150 transition-transform duration-700`}></div>
        <div className="relative z-10">
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4 ${color}`}>
                <Icon size={24} />
            </div>
            <h2 className="text-3xl font-medium text-white tracking-tight mb-1">{value}</h2>
            <p className="text-white/40 text-sm font-medium uppercase tracking-wider">{label}</p>
        </div>
    </GlassCard>
);

export default Dashboard;
