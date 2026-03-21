import React, { useEffect, useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({ scheduled: 0, published: 0, failed: 0 });
  const [posts, setPosts] = useState([]);
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !user) return;
      try {
        const res = await axios.get(`${API_URL}/posts/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(res.data);
        
        // Calculate stats
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
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-medium text-white mb-2">Welcome back, {user?.name}</h1>
        <p className="text-white/60">Here's what's happening with your content today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard delay={0.1}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-white/60 text-sm uppercase tracking-wider">Scheduled</p>
              <h2 className="text-3xl font-semibold text-white">{stats.scheduled}</h2>
            </div>
          </div>
        </GlassCard>

        <GlassCard delay={0.2}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500/20 text-green-400">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-white/60 text-sm uppercase tracking-wider">Published</p>
              <h2 className="text-3xl font-semibold text-white">{stats.published}</h2>
            </div>
          </div>
        </GlassCard>

        <GlassCard delay={0.3}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500/20 text-red-400">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-white/60 text-sm uppercase tracking-wider">Failed</p>
              <h2 className="text-3xl font-semibold text-white">{stats.failed}</h2>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard className="min-h-[400px]" delay={0.4}>
            <h3 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
                <Activity size={20} className="text-white/60" />
                Recent Activity
            </h3>
            <div className="space-y-4">
                {posts.slice(0, 5).map(post => (
                    <div key={post._id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <div>
                            <p className="font-medium text-white truncate max-w-[200px]">{post.title || post.description || "Untitled Post"}</p>
                            <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                                <span className="capitalize">{post.platform}</span>
                                <span>•</span>
                                <span>{post.scheduled_at ? format(new Date(post.scheduled_at), 'MMM d, h:mm a') : 'Draft'}</span>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                            post.status === 'published' ? 'bg-green-500/20 text-green-400' :
                            post.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-white/10 text-white/60'
                        }`}>
                            {post.status}
                        </span>
                    </div>
                ))}
                {posts.length === 0 && (
                    <p className="text-white/40 text-center py-12">No recent activity.</p>
                )}
            </div>
        </GlassCard>

        <GlassCard className="min-h-[400px] flex items-center justify-center" delay={0.5}>
            <div className="text-center">
                <h3 className="text-xl font-medium text-white mb-2">Ready to create?</h3>
                <p className="text-white/60 mb-6">Schedule your next masterpiece.</p>
                <a href="/new" className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-white text-black font-medium hover:scale-105 transition-transform">
                    Create New Post
                </a>
            </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Dashboard;
