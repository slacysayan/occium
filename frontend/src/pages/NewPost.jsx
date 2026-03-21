import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { Youtube, Linkedin, Wand2, Calendar as CalendarIcon, Image as ImageIcon, Loader2, ArrowRight, X, Link, PlayCircle } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const NewPost = () => {
    const { user, token } = useAuth();
    const [activeTab, setActiveTab] = useState('youtube');
    const [isGenerating, setIsGenerating] = useState(false);
    const [scheduleDate, setScheduleDate] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    
    const { register, handleSubmit, setValue, watch, reset } = useForm();
    const API_URL = process.env.REACT_APP_BACKEND_URL;

    useEffect(() => {
        if (user && token) fetchAccounts();
    }, [user, token]);

    const fetchAccounts = async () => {
        try {
            const res = await axios.get(`${API_URL}/accounts/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAccounts(res.data);
            const first = res.data.find(a => a.platform === activeTab);
            if (first) setSelectedAccount(first._id);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const first = accounts.find(a => a.platform === activeTab);
        if (first) setSelectedAccount(first._id);
        else setSelectedAccount(null);
    }, [activeTab, accounts]);

    const handleFetchMetadata = async () => {
        const url = watch('source_url');
        if (!url) return toast.error("Please enter a YouTube URL");
        
        const toastId = toast.loading("Fetching video details...");
        
        try {
            // Real backend call using yt-dlp
            const res = await axios.post(`${API_URL}/video/fetch`, { url }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const { title, description, thumbnail } = res.data;

            setValue('title', title);
            setValue('description', description);
            setValue('thumbnail_url', thumbnail); 
            setVideoPreview(thumbnail);
            
            toast.dismiss(toastId);
            toast.success("Video imported!");

        } catch (e) {
            toast.dismiss(toastId);
            toast.error("Failed to fetch metadata");
        }
    };

    const onSubmit = async (data) => {
        if (!selectedAccount) return toast.error(`Please connect a ${activeTab} account first`);

        try {
            const payload = {
                user_id: user.id,
                account_id: selectedAccount, 
                platform: activeTab,
                ...data,
                scheduled_at: scheduleDate ? scheduleDate.toISOString() : null,
                status: scheduleDate ? 'scheduled' : 'draft'
            };
            
            await axios.post(`${API_URL}/posts/`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Post scheduled successfully!");
            reset();
            setVideoPreview(null);
            setScheduleDate(null);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create post");
        }
    };

    const handleGhostwrite = async () => {
        const prompt = watch('description') || watch('title');
        if (!prompt) return toast.error("Enter a topic first");
        
        setIsGenerating(true);
        try {
            const res = await axios.post(`${API_URL}/ai/ghostwrite`, {
                prompt,
                platform: activeTab,
                tone: "professional"
            }, { headers: { Authorization: `Bearer ${token}` }});
            
            setValue('description', res.data.content);
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
             <div>
                <h1 className="text-5xl font-light text-white mb-2 tracking-tight">Composer</h1>
                <p className="text-white/40 font-light">Import content, AI-enhance, and schedule.</p>
            </div>
            
            <div className="flex gap-4 border-b border-white/10 pb-1">
                <TabButton 
                    active={activeTab === 'youtube'} 
                    onClick={() => setActiveTab('youtube')} 
                    icon={Youtube} 
                    label="YouTube" 
                    color="text-red-500"
                />
                <TabButton 
                    active={activeTab === 'linkedin'} 
                    onClick={() => setActiveTab('linkedin')} 
                    icon={Linkedin} 
                    label="LinkedIn" 
                    color="text-blue-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Area */}
                <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2"
                >
                    <GlassCard className="min-h-[600px] flex flex-col">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 flex-1 flex flex-col">
                            
                            {/* Account Selector */}
                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-white/40 text-sm">Post to:</span>
                                <select 
                                    value={selectedAccount || ''}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                    className="bg-transparent text-white font-medium outline-none flex-1"
                                >
                                    <option value="" disabled>Select Account</option>
                                    {accounts.filter(a => a.platform === activeTab).map(acc => (
                                        <option key={acc._id} value={acc._id} className="text-black">
                                            {acc.account_name}
                                        </option>
                                    ))}
                                </select>
                                {accounts.filter(a => a.platform === activeTab).length === 0 && (
                                    <a href="/accounts" className="text-occium-gold text-xs hover:underline">Connect Account</a>
                                )}
                            </div>

                            {activeTab === 'youtube' && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-white/60 text-xs font-medium uppercase tracking-wide flex items-center gap-2">
                                            <Link size={14} /> Import from YouTube
                                        </label>
                                        <div className="flex gap-2">
                                            <input 
                                                {...register('source_url')} 
                                                className="w-full glass-input rounded-lg px-4 py-3 font-mono text-sm" 
                                                placeholder="Paste YouTube Video Link..." 
                                            />
                                            <button 
                                                type="button" 
                                                onClick={handleFetchMetadata}
                                                className="px-6 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
                                            >
                                                Fetch
                                            </button>
                                        </div>
                                    </div>

                                    {videoPreview && (
                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group">
                                            <img src={videoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PlayCircle size={48} className="text-white" />
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="space-y-2">
                                        <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Title</label>
                                        <input {...register('title')} className="w-full glass-input rounded-lg px-4 py-3 text-lg font-medium" placeholder="Video Title" />
                                    </div>
                                    
                                    <div className="space-y-2 flex-1">
                                        <label className="text-white/60 text-xs font-medium uppercase tracking-wide flex justify-between items-center">
                                            Description
                                            <button type="button" onClick={handleGhostwrite} className="text-xs flex items-center gap-1 text-occium-gold hover:text-white transition-colors">
                                                {isGenerating ? <Loader2 className="animate-spin" size={12}/> : <Wand2 size={12}/>} AI Enhance
                                            </button>
                                        </label>
                                        <textarea {...register('description')} rows={6} className="w-full glass-input rounded-lg px-4 py-3 leading-relaxed" placeholder="Video description..." />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'linkedin' && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-white/60 text-xs font-medium uppercase tracking-wide flex justify-between items-center">
                                            Post Content
                                            <button type="button" onClick={handleGhostwrite} className="text-xs flex items-center gap-1 text-occium-gold hover:text-white transition-colors">
                                                {isGenerating ? <Loader2 className="animate-spin" size={12}/> : <Wand2 size={12}/>} Ghostwrite
                                            </button>
                                        </label>
                                        <textarea {...register('description')} rows={12} className="w-full glass-input rounded-lg px-4 py-3 text-lg leading-relaxed" placeholder="What do you want to talk about?" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Image URL (Optional)</label>
                                        <input {...register('thumbnail_url')} className="w-full glass-input rounded-lg px-4 py-3" placeholder="https://..." />
                                    </div>
                                </div>
                            )}
                            
                            <div className="mt-auto pt-8 flex items-center justify-between border-t border-white/10">
                                <div className="text-white/60 text-sm flex items-center gap-2">
                                    {scheduleDate && <CalendarIcon size={16} className="text-occium-gold" />}
                                    {scheduleDate ? `Scheduled: ${format(scheduleDate, 'MMM d, h:mm a')}` : 'Ready to post'}
                                </div>
                                <button type="submit" className="bg-white text-black px-10 py-3 rounded-full font-medium hover:scale-105 transition-transform shadow-lg shadow-white/5">
                                    {scheduleDate ? 'Schedule Post' : 'Post Now'}
                                </button>
                            </div>
                        </form>
                    </GlassCard>
                </motion.div>

                {/* Sidebar: Scheduler */}
                <div className="space-y-6">
                    <GlassCard>
                        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
                            <CalendarIcon size={18} /> Schedule
                        </h3>
                        <div className="bg-black/20 rounded-xl p-2 mb-4">
                            <DayPicker
                                mode="single"
                                selected={scheduleDate}
                                onSelect={setScheduleDate}
                                className="text-white mx-auto"
                                modifiersClassNames={{
                                    selected: "bg-occium-gold text-black rounded-full font-bold"
                                }}
                            />
                        </div>
                        <AnimatePresence>
                            {scheduleDate && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <label className="text-white/60 text-xs uppercase tracking-wide mb-2 block">Time</label>
                                    <input 
                                        type="time" 
                                        className="w-full glass-input rounded-lg px-3 py-3 text-center text-lg tracking-widest"
                                        onChange={(e) => {
                                            const [hours, minutes] = e.target.value.split(':');
                                            const newDate = new Date(scheduleDate);
                                            newDate.setHours(parseInt(hours), parseInt(minutes));
                                            setScheduleDate(newDate);
                                        }}
                                    />
                                    <button 
                                        onClick={() => setScheduleDate(null)}
                                        className="w-full text-center text-white/40 hover:text-red-400 text-xs mt-4 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <X size={12} /> Clear Schedule
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon: Icon, label, color }) => (
    <button 
        onClick={onClick}
        className={`relative px-6 py-3 transition-all duration-300 group flex items-center gap-2 ${active ? 'text-white' : 'text-white/40 hover:text-white'}`}
    >
        <Icon size={18} className={active ? color : ''} />
        <span className="font-medium">{label}</span>
        {active && (
            <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
            />
        )}
    </button>
);

export default NewPost;
