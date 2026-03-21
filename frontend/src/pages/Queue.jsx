import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

const Queue = () => {
    const { user, token } = useAuth();
    const [posts, setPosts] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const API_URL = process.env.REACT_APP_BACKEND_URL;

    useEffect(() => {
        if (user && token) fetchPosts();
    }, [user, token]);

    const fetchPosts = async () => {
        try {
            const res = await axios.get(`${API_URL}/posts/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPosts(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const scheduledPosts = posts.filter(p => p.status === 'scheduled' && p.scheduled_at);
    const selectedDatePosts = scheduledPosts.filter(p => isSameDay(parseISO(p.scheduled_at), selectedDate));

    const modifiers = {
        hasPost: (date) => scheduledPosts.some(p => isSameDay(parseISO(p.scheduled_at), date))
    };

    const modifiersStyles = {
        hasPost: { 
            fontWeight: 'bold', 
            textDecoration: 'underline',
            color: '#D4AF37' // Gold
        }
    };

    const deletePost = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await axios.delete(`${API_URL}/posts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPosts(posts.filter(p => p._id !== id));
            toast.success("Post deleted");
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    return (
        <div className="space-y-8 h-full">
            <h1 className="text-4xl font-medium text-white flex items-center gap-3">
                <CalendarIcon className="text-occium-gold" /> Queue
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                {/* Calendar */}
                <div className="lg:col-span-1">
                    <GlassCard className="h-full">
                        <DayPicker
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            modifiers={modifiers}
                            modifiersStyles={modifiersStyles}
                            className="text-white mx-auto"
                            footer={<p className="text-center text-white/40 text-sm mt-4">Select a date to view scheduled content</p>}
                        />
                    </GlassCard>
                </div>

                {/* List */}
                <div className="lg:col-span-2">
                    <GlassCard className="h-full min-h-[500px]">
                        <h3 className="text-xl font-medium text-white mb-6">
                            Scheduled for {format(selectedDate, 'MMMM d, yyyy')}
                        </h3>

                        <div className="space-y-4">
                            {selectedDatePosts.length === 0 ? (
                                <div className="text-center py-20 text-white/30">
                                    <Clock size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No posts scheduled for this day.</p>
                                    <a href="/new" className="text-occium-gold hover:underline mt-2 inline-block">Schedule one now</a>
                                </div>
                            ) : (
                                selectedDatePosts.map(post => (
                                    <div key={post._id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-start justify-between group hover:bg-white/10 transition-colors">
                                        <div className="flex gap-4">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xs uppercase
                                                ${post.platform === 'youtube' ? 'bg-red-600/20 text-red-500' : 'bg-blue-600/20 text-blue-500'}
                                            `}>
                                                {post.platform.slice(0, 2)}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-medium line-clamp-1">{post.title || post.description}</h4>
                                                <div className="flex items-center gap-3 text-white/40 text-sm mt-1">
                                                    <span>{format(parseISO(post.scheduled_at), 'h:mm a')}</span>
                                                    <span>•</span>
                                                    <span className="capitalize">{post.platform}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => deletePost(post._id)} className="p-2 hover:bg-red-500/20 rounded-full text-white/60 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default Queue;
