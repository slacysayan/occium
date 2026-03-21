import React, { useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { Youtube, Linkedin, Wand2, Calendar as CalendarIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { toast } from 'sonner';

const NewPost = () => {
    const { user, token } = useAuth();
    const [activeTab, setActiveTab] = useState('youtube');
    const [isGenerating, setIsGenerating] = useState(false);
    const [scheduleDate, setScheduleDate] = useState(null);
    const { register, handleSubmit, setValue, watch, reset } = useForm();
    const API_URL = process.env.REACT_APP_BACKEND_URL;

    const onSubmit = async (data) => {
        try {
            const payload = {
                user_id: user.id,
                account_id: "placeholder_account_id", // Need to select account
                platform: activeTab,
                ...data,
                scheduled_at: scheduleDate ? scheduleDate.toISOString() : null,
                status: scheduleDate ? 'scheduled' : 'draft'
            };
            
            await axios.post(`${API_URL}/posts/`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Post created successfully!");
            reset();
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
        <div className="space-y-8 pb-20">
            <h1 className="text-4xl font-medium text-white">Create New Post</h1>
            
            {/* Platform Tabs */}
            <div className="flex gap-4 border-b border-white/10 pb-4">
                <button 
                    onClick={() => setActiveTab('youtube')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all ${activeTab === 'youtube' ? 'bg-red-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                >
                    <Youtube size={18} /> YouTube
                </button>
                <button 
                    onClick={() => setActiveTab('linkedin')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all ${activeTab === 'linkedin' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                >
                    <Linkedin size={18} /> LinkedIn
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Area */}
                <div className="lg:col-span-2">
                    <GlassCard>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {activeTab === 'youtube' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-white/80 text-sm font-medium">Video Title</label>
                                        <input {...register('title')} className="w-full glass-input rounded-lg px-4 py-3" placeholder="Enter video title..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-white/80 text-sm font-medium flex justify-between">
                                            Description
                                            <button type="button" onClick={handleGhostwrite} className="text-xs flex items-center gap-1 text-occium-gold hover:text-yellow-300">
                                                {isGenerating ? <Loader2 className="animate-spin" size={12}/> : <Wand2 size={12}/>} AI Enhance
                                            </button>
                                        </label>
                                        <textarea {...register('description')} rows={6} className="w-full glass-input rounded-lg px-4 py-3" placeholder="Video description..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-white/80 text-sm font-medium">Tags (comma separated)</label>
                                        <input {...register('tags')} className="w-full glass-input rounded-lg px-4 py-3" placeholder="tech, coding, tutorial" />
                                    </div>
                                </>
                            )}

                            {activeTab === 'linkedin' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-white/80 text-sm font-medium flex justify-between">
                                            Post Content
                                            <button type="button" onClick={handleGhostwrite} className="text-xs flex items-center gap-1 text-occium-gold hover:text-yellow-300">
                                                {isGenerating ? <Loader2 className="animate-spin" size={12}/> : <Wand2 size={12}/>} Ghostwrite
                                            </button>
                                        </label>
                                        <textarea {...register('description')} rows={8} className="w-full glass-input rounded-lg px-4 py-3" placeholder="What do you want to talk about?" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-white/80 text-sm font-medium">Image URL (Optional)</label>
                                        <input {...register('thumbnail_url')} className="w-full glass-input rounded-lg px-4 py-3" placeholder="https://..." />
                                    </div>
                                </>
                            )}
                            
                            <div className="pt-4 flex items-center justify-end gap-4">
                                <div className="text-white/60 text-sm">
                                    {scheduleDate ? `Scheduled for: ${format(scheduleDate, 'MMM d, h:mm a')}` : 'Post immediately'}
                                </div>
                                <button type="submit" className="bg-white text-black px-8 py-3 rounded-full font-medium hover:scale-105 transition-transform">
                                    {scheduleDate ? 'Schedule' : 'Post Now'}
                                </button>
                            </div>
                        </form>
                    </GlassCard>
                </div>

                {/* Sidebar: Scheduler & Account Picker */}
                <div className="space-y-6">
                    <GlassCard>
                        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                            <CalendarIcon size={18} /> Schedule
                        </h3>
                        <div className="bg-white/5 rounded-xl p-2">
                            <DayPicker
                                mode="single"
                                selected={scheduleDate}
                                onSelect={setScheduleDate}
                                className="text-white"
                                modifiersClassNames={{
                                    selected: "bg-occium-gold text-black rounded-full"
                                }}
                            />
                        </div>
                        {scheduleDate && (
                            <div className="mt-4">
                                <label className="text-white/60 text-xs uppercase tracking-wide">Time</label>
                                <input 
                                    type="time" 
                                    className="w-full glass-input mt-1 rounded-lg px-3 py-2"
                                    onChange={(e) => {
                                        const [hours, minutes] = e.target.value.split(':');
                                        const newDate = new Date(scheduleDate);
                                        newDate.setHours(parseInt(hours), parseInt(minutes));
                                        setScheduleDate(newDate);
                                    }}
                                />
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default NewPost;
