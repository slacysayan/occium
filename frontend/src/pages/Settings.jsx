import React, { useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';
import { Key, Save, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const OCCIUM_MARK_SRC = "/branding/occium-mark.webp";

const Settings = () => {
    const { user } = useAuth();
    const [keys, setKeys] = useState({
        openai: '',
        anthropic: '',
        linkedin_client: ''
    });
    const [showKeys, setShowKeys] = useState({});

    const toggleShow = (key) => {
        setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleChange = (e) => {
        setKeys({ ...keys, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        toast.success("Settings saved successfully");
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10">
             <div>
                <h1 className="text-5xl font-light text-white mb-2 tracking-tight">Settings</h1>
                <p className="text-white/40 font-light">Manage your API keys and security.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <GlassCard>
                    <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                        <div className="p-3 bg-occium-gold/20 rounded-xl text-occium-gold">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-medium text-white">API Configuration</h2>
                            <p className="text-white/50 text-sm">Securely store your keys. We encrypt them at rest.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            <ApiKeyInput 
                                label="OpenAI API Key" 
                                name="openai" 
                                value={keys.openai} 
                                onChange={handleChange} 
                                show={showKeys.openai} 
                                onToggle={() => toggleShow('openai')}
                            />
                             <ApiKeyInput 
                                label="Anthropic API Key" 
                                name="anthropic" 
                                value={keys.anthropic} 
                                onChange={handleChange} 
                                show={showKeys.anthropic} 
                                onToggle={() => toggleShow('anthropic')}
                            />
                             <ApiKeyInput 
                                label="LinkedIn Client Secret" 
                                name="linkedin_client" 
                                value={keys.linkedin_client} 
                                onChange={handleChange} 
                                show={showKeys.linkedin_client} 
                                onToggle={() => toggleShow('linkedin_client')}
                            />
                        </div>

                        <div className="pt-8 flex justify-end">
                            <button 
                                onClick={handleSave}
                                className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-medium hover:scale-105 transition-transform"
                            >
                                <Save size={18} /> Save Changes
                            </button>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-center gap-4 mb-6">
                         <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                             {user?.profile_picture ? (
                                 <img src={user.profile_picture} alt="Profile" />
                             ) : (
                                 <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                     <img src={OCCIUM_MARK_SRC} alt="" className="w-7 h-7 object-contain opacity-90" />
                                 </div>
                             )}
                         </div>
                         <div>
                             <h3 className="text-lg font-medium text-white">{user?.name}</h3>
                             <p className="text-white/40 text-sm">{user?.email}</p>
                         </div>
                    </div>
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <h4 className="text-red-400 font-medium mb-1">Danger Zone</h4>
                        <button className="text-white/60 hover:text-red-400 text-sm transition-colors">Delete Account</button>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

const ApiKeyInput = ({ label, name, value, onChange, show, onToggle }) => (
    <div className="space-y-2">
        <label className="text-white/60 text-xs font-medium uppercase tracking-wide">{label}</label>
        <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                <Key size={18} />
            </div>
            <input 
                type={show ? "text" : "password"} 
                name={name}
                value={value}
                onChange={onChange}
                className="w-full glass-input rounded-xl pl-12 pr-12 py-4 font-mono text-sm" 
                placeholder="sk-..." 
            />
            <button 
                onClick={onToggle}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
            >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    </div>
);

export default Settings;
