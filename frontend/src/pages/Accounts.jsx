import React, { useEffect, useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Check, Plus, Trash2, Youtube, Linkedin } from 'lucide-react';

const Accounts = () => {
    const { user, token } = useAuth();
    const [accounts, setAccounts] = useState([]);
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
        } catch (error) {
            console.error(error);
        }
    };

    const disconnectAccount = async (id) => {
        try {
            await axios.delete(`${API_URL}/accounts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAccounts(accounts.filter(a => a._id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const connectLinkedIn = async () => {
        // Redirect to backend auth url
        // Ideally backend should provide the URL
        const clientId = process.env.REACT_APP_LINKEDIN_CLIENT_ID || "77nqokfdfj11on";
        const redirectUri = window.location.origin + "/auth/linkedin/callback"; // We need to handle this route in frontend
        const scope = "openid profile email w_member_social";
        const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
        window.location.href = url;
    };
    
    // Google/YouTube connection is handled via Login flow initially
    // But we can add a specific "Add YouTube Channel" flow if needed
    
    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-medium text-white">Connected Accounts</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* YouTube */}
                <GlassCard className="relative group">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-600 rounded-full text-white">
                                <Youtube size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-medium text-white">YouTube</h3>
                                <p className="text-white/60">Video Platform</p>
                            </div>
                        </div>
                        {accounts.find(a => a.platform === 'youtube') ? (
                            <span className="flex items-center gap-2 text-green-400 text-sm bg-green-400/10 px-3 py-1 rounded-full">
                                <Check size={14} /> Connected
                            </span>
                        ) : (
                            <button className="text-white/60 hover:text-white transition-colors">
                                <Plus size={20} />
                            </button>
                        )}
                    </div>
                    
                    <div className="mt-6 space-y-3">
                        {accounts.filter(a => a.platform === 'youtube').map(account => (
                            <div key={account._id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3">
                                    {account.profile_picture && <img src={account.profile_picture} alt="" className="w-8 h-8 rounded-full" />}
                                    <span className="text-white font-medium">{account.account_name}</span>
                                </div>
                                <button onClick={() => disconnectAccount(account._id)} className="text-white/40 hover:text-red-400 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* LinkedIn */}
                <GlassCard className="relative group">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-full text-white">
                                <Linkedin size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-medium text-white">LinkedIn</h3>
                                <p className="text-white/60">Professional Network</p>
                            </div>
                        </div>
                        <button onClick={connectLinkedIn} className="flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-sm">
                            <Plus size={16} /> Connect
                        </button>
                    </div>

                    <div className="mt-6 space-y-3">
                         {accounts.filter(a => a.platform === 'linkedin').map(account => (
                            <div key={account._id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="text-white font-medium">{account.account_name}</span>
                                </div>
                                <button onClick={() => disconnectAccount(account._id)} className="text-white/40 hover:text-red-400 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {accounts.filter(a => a.platform === 'linkedin').length === 0 && (
                            <p className="text-white/40 text-sm">No accounts connected.</p>
                        )}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default Accounts;
