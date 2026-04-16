import React, { useState } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { Wand2, Image as ImageIcon, Copy, Loader2, Sparkles, Mic, Save } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { aiApi } from "../lib/api";

import { aiApi } from "../lib/api";

const AIStudio = () => {
  const [prompt, setPrompt] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState("text");
  const [voices] = useState([
    { id: 1, name: "Professional", desc: "Corporate, clean, and concise." },
    { id: 2, name: "Casual", desc: "Friendly, engaging, and approachable." },
    { id: 3, name: "Viral", desc: "High energy, hook-heavy, and fast-paced." },
  ]);
  const [selectedVoice, setSelectedVoice] = useState(1);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const res = await aiApi.ghostwrite({
        title: prompt,
        voiceProfile: voices.find((v) => v.id === selectedVoice)?.name ?? "Professional",
      });
      setGeneratedText(res.data.post);
    } catch (error) {
      console.error(error);
      toast.error("Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-light text-white mb-2 tracking-tight flex items-center gap-4">
            AI Studio <Sparkles className="text-occium-gold" size={32} />
          </h1>
          <p className="text-white/40 font-light">Generate assets with your digital ghostwriter.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <button
            onClick={() => setMode("text")}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all border ${
              mode === "text"
                ? "bg-white text-black border-white"
                : "bg-black/20 text-white/60 border-transparent hover:bg-white/5 hover:text-white"
            }`}
          >
            <Wand2 size={20} /> Ghostwriter
          </button>
          <button
            onClick={() => setMode("image")}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all border ${
              mode === "image"
                ? "bg-white text-black border-white"
                : "bg-black/20 text-white/60 border-transparent hover:bg-white/5 hover:text-white"
            }`}
          >
            <ImageIcon size={20} /> Thumbnail Gen
          </button>
          <button
            onClick={() => setMode("voice")}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all border ${
              mode === "voice"
                ? "bg-white text-black border-white"
                : "bg-black/20 text-white/60 border-transparent hover:bg-white/5 hover:text-white"
            }`}
          >
            <Mic size={20} /> Voice Profile
          </button>
        </div>

        <div className="lg:col-span-9">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[600px]">
            <GlassCard className="flex flex-col h-full">
              <h3 className="text-lg font-medium text-white mb-6">Configuration</h3>

              {mode === "text" && (
                <div className="space-y-6 flex-1 flex flex-col">
                  <div className="grid grid-cols-3 gap-2">
                    {voices.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedVoice === voice.id
                            ? "bg-occium-gold/20 border-occium-gold text-white"
                            : "bg-white/5 border-white/10 text-white/50 hover:border-white/30"
                        }`}
                      >
                        <div className="font-medium text-sm mb-1">{voice.name}</div>
                        <div className="text-[10px] opacity-70 leading-tight">{voice.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="flex-1">
                    <label className="text-white/60 text-sm mb-2 block">Topic or Prompt</label>
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      className="w-full h-full glass-input rounded-xl p-4 resize-none min-h-[200px]"
                      placeholder="E.g., Write a LinkedIn post about the future of AI agents..."
                    />
                  </div>
                </div>
              )}

              {mode === "image" && (
                <div className="space-y-6 flex-1 flex flex-col justify-center items-center text-center opacity-60">
                  <ImageIcon size={48} className="mb-4 text-white/20" />
                  <p>Select a template style to generate thumbnails.</p>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    className="w-full h-40 glass-input rounded-xl p-4 resize-none mt-4"
                    placeholder="Describe your video thumbnail..."
                  />
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                  className="w-full bg-white text-black font-medium py-3 rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                >
                  {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                  Generate
                </button>
              </div>
            </GlassCard>

            <GlassCard className="flex flex-col h-full bg-black/60">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                <h3 className="text-lg font-medium text-white">Output</h3>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                    <Save size={18} />
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedText);
                      toast.success("Copied!");
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto text-white/90 leading-relaxed whitespace-pre-wrap font-body text-lg">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/30 gap-4">
                    <Loader2 className="animate-spin" size={32} />
                    <p className="animate-pulse">Thinking...</p>
                  </div>
                ) : generatedText ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {generatedText}
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-white/20">
                    <Sparkles size={48} className="mb-4 opacity-50" />
                    <p>Ready to create.</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIStudio;
