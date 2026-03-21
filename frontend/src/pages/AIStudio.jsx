import React, { useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Wand2, Image as ImageIcon, Copy, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const AIStudio = () => {
    const { token } = useAuth();
    const [prompt, setPrompt] = useState('');
    const [generatedText, setGeneratedText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [mode, setMode] = useState('text'); // text or image
    const API_URL = process.env.REACT_APP_BACKEND_URL;

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        try {
            if (mode === 'text') {
                const res = await axios.post(`${API_URL}/ai/ghostwrite`, {
                    prompt,
                    platform: "linkedin", // Default
                    tone: "professional"
                }, { headers: { Authorization: `Bearer ${token}` }});
                setGeneratedText(res.data.content);
            } else {
                 // For Image generation, we need to implement the route or use integration playbook's suggestion
                 // For now, let's mock or use text generation as placeholder since I haven't implemented image gen route yet
                 // Wait, I did implement /ai/analyze-image but not generate-image
                 // I will stick to text for now as per my available routes
                 toast.info("Image generation coming soon!");
            }
        } catch (error) {
            console.error(error);
            toast.error("Generation failed");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-medium text-white flex items-center gap-3">
                <Sparkles className="text-occium-gold" /> AI Studio
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <GlassCard>
                        <h3 className="text-xl font-medium text-white mb-4">Input</h3>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setMode('text')}
                                    className={`px-4 py-2 rounded-full text-sm transition-all ${mode === 'text' ? 'bg-white text-black' : 'bg-white/5 text-white/60'}`}
                                >
                                    Ghostwriter
                                </button>
                                <button 
                                    onClick={() => setMode('image')}
                                    className={`px-4 py-2 rounded-full text-sm transition-all ${mode === 'image' ? 'bg-white text-black' : 'bg-white/5 text-white/60'}`}
                                >
                                    Thumbnail Gen
                                </button>
                            </div>

                            <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full h-40 glass-input rounded-xl p-4 resize-none"
                                placeholder={mode === 'text' ? "Describe what you want to write about..." : "Describe the image you want to generate..."}
                            />

                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt}
                                className="w-full bg-occium-gold text-black font-medium py-3 rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
                                Generate Magic
                            </button>
                        </div>
                    </GlassCard>
                </div>

                <div className="space-y-6">
                    <GlassCard className="h-full min-h-[400px]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-medium text-white">Result</h3>
                            {generatedText && (
                                <button 
                                    onClick={() => {navigator.clipboard.writeText(generatedText); toast.success("Copied!");}}
                                    className="text-white/40 hover:text-white transition-colors"
                                >
                                    <Copy size={18} />
                                </button>
                            )}
                        </div>
                        
                        <div className="bg-black/20 rounded-xl p-6 h-[calc(100%-60px)] overflow-y-auto text-white/90 leading-relaxed whitespace-pre-wrap font-body">
                            {generatedText || <span className="text-white/30 italic">AI output will appear here...</span>}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default AIStudio;
