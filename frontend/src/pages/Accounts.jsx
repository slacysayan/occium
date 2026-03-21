import React, { useEffect, useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Check, Plus, Trash2, Youtube, Linkedin, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const Accounts = () => {
    const { user, token } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const API_URL = process.env.REACT_APP_BACKEND_URL;

    useEffect(() => {
        if (user && token) fetchAccounts();
        
        // Check for LinkedIn callback code in URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        
        if (code && state === 'linkedin_connect') {
            handleLinkedInCallback(code);
        }
    }, [user, token]);

    const fetchAccounts = async () => {
        try {
            const res = await axios.get(`${API_URL}/accounts/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAccounts(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleLinkedInCallback = async (code) => {
        setIsLoading(true);
        try {
            // Clean URL
            window.history.replaceState({}, document.title, "/accounts");
            
            await axios.post(`${API_URL}/auth/linkedin/callback`, null, {
                params: {
                    code,
                    redirect_uri: window.location.origin + "/accounts", // Using accounts page as redirect
                    user_id: user.id
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("LinkedIn connected successfully!");
            fetchAccounts();
        } catch (error) {
            console.error(error);
            toast.error("Failed to connect LinkedIn");
        } finally {
            setIsLoading(false);
        }
    };

    const connectLinkedIn = async () => {
        try {
            setIsLoading(true);
            const redirectUri = window.location.origin + "/accounts";
            const res = await axios.get(`${API_URL}/auth/linkedin/url`, {
                params: { redirect_uri: redirectUri, state: "linkedin_connect" }
            });
            window.location.href = res.data.url;
        } catch (error) {
            toast.error("Could not initiate LinkedIn connection");
            setIsLoading(false);
        }
    };

    const connectYouTube = async () => {
         try {
            setIsLoading(true);
            // Reuse Google Auth but force consent
            const redirectUri = window.location.origin + "/login"; // Or specific callback
            // For simplicity in MVP, we might need to rely on the main login flow updating the token
            // But let's try to hit the auth endpoint to get a fresh URL
            const res = await axios.get(`${API_URL}/auth/google/url`, {
                params: { redirect_uri: redirectUri, state: "connect_youtube" }
            });
            window.location.href = res.data.url;
        } catch (error) {
             toast.error("Could not initiate YouTube connection");
             setIsLoading(false);
        }
    };

    const disconnectAccount = async (id) => {
        if (!window.confirm("Disconnect this account?")) return;
        try {
            await axios.delete(`${API_URL}/accounts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAccounts(accounts.filter(a => a._id !== id));
            toast.success("Account disconnected");
        } catch (error) {
            toast.error("Failed to disconnect");
        }
    };
    
    return (
        <div className="space-y-10 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-5xl font-light text-white mb-2 tracking-tight">Connections</h1>
                    <p className="text-white/40 font-light">Manage your social presence integrations.</p>
                </div>
                {isLoading && <Loader2 className="animate-spin text-occium-gold" />}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* YouTube Card */}
                <GlassCard className="relative group overflow-visible">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Youtube size={120} />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-red-600 rounded-2xl text-white shadow-lg shadow-red-900/20">
                                <Youtube size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-medium text-white">YouTube</h3>
                                <p className="text-white/40">Video Distribution</p>
                            </div>
                        </div>

                        <div className="space-y-4 min-h-[120px]">
                            {accounts.filter(a => a.platform === 'youtube').map(account => (
                                <div key={account._id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors group/item">
                                    <div className="flex items-center gap-4">
                                        {account.profile_picture ? (
                                            <img src={account.profile_picture} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                                                {account.account_name[0]}
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-white font-medium">{account.account_name}</div>
                                            <div className="text-white/30 text-xs flex items-center gap-1">
                                                <Check size={10} className="text-green-400" /> Synced
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => disconnectAccount(account._id)} 
                                        className="p-2 text-white/20 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors opacity-0 group-hover/item:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            
                            {accounts.filter(a => a.platform === 'youtube').length === 0 && (
                                <div className="p-4 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center py-8">
                                    <p className="text-white/30 text-sm mb-4">No channels connected</p>
                                    <button 
                                        onClick={connectYouTube}
                                        className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-full font-medium text-sm hover:scale-105 transition-transform"
                                    >
                                        <Plus size={16} /> Connect Channel
                                    </button>
                                </div>
                            )}
                             {accounts.filter(a => a.platform === 'youtube').length > 0 && (
                                <button 
                                    onClick={connectYouTube}
                                    className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-white py-2 transition-colors text-sm border-t border-white/5 pt-4 mt-2"
                                >
                                    <Plus size={14} /> Add Another Channel
                                </button>
                            )}
                        </div>
                    </div>
                </GlassCard>

                {/* LinkedIn Card */}
                <GlassCard className="relative group overflow-visible">
                     <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Linkedin size={120} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-900/20">
                                <Linkedin size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-medium text-white">LinkedIn</h3>
                                <p className="text-white/40">Professional Network</p>
                            </div>
                        </div>

                        <div className="space-y-4 min-h-[120px]">
                             {accounts.filter(a => a.platform === 'linkedin').map(account => (
                                <div key={account._id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors group/item">
                                    <div className="flex items-center gap-4">
                                         {account.profile_picture ? (
                                            <img src={account.profile_picture} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                                                {account.account_name[0]}
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-white font-medium">{account.account_name}</div>
                                            <div className="text-white/30 text-xs flex items-center gap-1">
                                                <Check size={10} className="text-green-400" /> Synced
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => disconnectAccount(account._id)} 
                                        className="p-2 text-white/20 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors opacity-0 group-hover/item:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            
                             {accounts.filter(a => a.platform === 'linkedin').length === 0 && (
                                <div className="p-4 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center py-8">
                                    <p className="text-white/30 text-sm mb-4">No profiles connected</p>
                                    <button 
                                        onClick={connectLinkedIn}
                                        className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-full font-medium text-sm hover:scale-105 transition-transform"
                                    >
                                        <Plus size={16} /> Connect Profile
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </div>
            
            <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/5 flex items-start gap-3">
                <AlertCircle className="text-white/40 mt-1 flex-shrink-0" size={20} />
                <div>
                    <h4 className="text-white font-medium text-sm">Connection Status</h4>
                    <p className="text-white/40 text-sm mt-1">
                        If connections fail, ensure you have enabled popup windows for this site. 
                        YouTube integration requires `youtube.upload` scope permissions during Google Sign-In.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Accounts;
