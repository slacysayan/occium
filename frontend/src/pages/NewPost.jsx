import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useForm } from "react-hook-form";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Linkedin, Wand2, X, Youtube, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "../components/ui/GlassCard";
import { useWorkspace } from "../context/WorkspaceContext";
import { workspaceRoutes } from "../lib/routes";
import { youtubeApi, linkedinApi, aiApi, postsApi } from "../lib/api";

const defaultValues = {
  source_url: "",
  title: "",
  description: "",
  thumbnail_url: "",
  privacy_status: "private",
  tags_input: "",
};

const NewPost = () => {
  const { accounts, youtubeAccounts, linkedinAccounts, refresh } = useWorkspace();
  const [activeTab, setActiveTab] = useState("youtube");
  const [scheduleDate, setScheduleDate] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [isGhostwriting, setIsGhostwriting] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("Professional");

  const { register, handleSubmit, setValue, watch, reset } = useForm({ defaultValues });

  useEffect(() => {
    const firstAccount = accounts.find((a) => a.platform === activeTab);
    const stillExists = accounts.some((a) => a.id === selectedAccount);
    if (!stillExists && firstAccount) setSelectedAccount(firstAccount.id);
    else if (!firstAccount) setSelectedAccount(null);
  }, [activeTab, accounts, selectedAccount]);

  const sourceUrl = watch("source_url");
  const currentTitle = watch("title");
  const currentDescription = watch("description");
  const manualThumbnail = watch("thumbnail_url");

  // Auto-fetch YouTube metadata on URL change (debounced)
  useEffect(() => {
    if (activeTab !== "youtube" || !sourceUrl?.trim()) return;
    const timer = setTimeout(async () => {
      try {
        setIsFetchingMeta(true);
        const res = await youtubeApi.metadata(sourceUrl.trim());
        const m = res.data;
        if (m.title) setValue("title", m.title);
        if (m.description) setValue("description", m.description.slice(0, 500));
        if (m.tags?.length) setValue("tags_input", m.tags.slice(0, 8).join(", "));
        if (m.thumbnailUrl) setValue("thumbnail_url", m.thumbnailUrl);
        toast.success("Metadata loaded");
      } catch {
        // silent — user may still be typing
      } finally {
        setIsFetchingMeta(false);
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [sourceUrl, activeTab, setValue]);

  const handleGhostwrite = async () => {
    const title = watch("title");
    const description = watch("description");
    const tagsRaw = watch("tags_input");
    if (!title) { toast.error("Add a title first"); return; }
    setIsGhostwriting(true);
    try {
      const res = await aiApi.ghostwrite({
        title,
        description,
        tags: tagsRaw ? tagsRaw.split(",").map((t) => t.trim()) : [],
        voiceProfile: selectedVoice,
      });
      setValue("description", res.data.post);
      toast.success("Ghostwritten!");
    } catch {
      toast.error("AI generation failed");
    } finally {
      setIsGhostwriting(false);
    }
  };

  const previewThumbnail = useMemo(() => {
    if (manualThumbnail?.trim()) return manualThumbnail.trim();
    if (activeTab !== "youtube") return "";
    const videoId = getYouTubeVideoId(sourceUrl);
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
  }, [activeTab, manualThumbnail, sourceUrl]);

  const onSubmit = async (data) => {
    if (!selectedAccount) { toast.error(`Connect a ${activeTab} account first.`); return; }
    setIsSubmitting(true);
    try {
      if (activeTab === "linkedin") {
        await linkedinApi.post({
          accountId: selectedAccount,
          text: data.description,
          linkUrl: data.source_url || undefined,
          linkTitle: data.title || undefined,
          scheduledAt: scheduleDate ? scheduleDate.toISOString() : undefined,
        });
        toast.success(scheduleDate ? "LinkedIn post scheduled!" : "Posted to LinkedIn!");
      } else {
        // YouTube — save as draft/scheduled post for now
        await postsApi.create({
          accountId: selectedAccount,
          platform: "youtube",
          sourceUrl: data.source_url,
          title: data.title,
          description: data.description,
          thumbnailUrl: data.thumbnail_url,
          tags: data.tags_input ? data.tags_input.split(",").map((t) => t.trim()) : [],
          privacyStatus: data.privacy_status,
          scheduledAt: scheduleDate ? scheduleDate.toISOString() : null,
          status: scheduleDate ? "scheduled" : "draft",
        });
        toast.success(scheduleDate ? "YouTube post scheduled!" : "Saved as draft!");
      }
      await refresh();
      resetComposer();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetComposer = () => { reset(defaultValues); setScheduleDate(null); };
  const activeAccounts = activeTab === "youtube" ? youtubeAccounts : linkedinAccounts;

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-5xl font-light text-white mb-2 tracking-tight">Composer</h1>
          <p className="text-white/40 font-light max-w-2xl">
            Import a YouTube video, ghostwrite a LinkedIn post, schedule both.
          </p>
        </div>
        <div className="rounded-full border border-occium-gold/20 bg-occium-gold/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-occium-gold">
          Live
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr),360px] gap-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard>
            <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-8">
              <TabButton active={activeTab === "youtube"} onClick={() => setActiveTab("youtube")} icon={Youtube} label="YouTube" color="text-red-400" />
              <TabButton active={activeTab === "linkedin"} onClick={() => setActiveTab("linkedin")} icon={Linkedin} label="LinkedIn" color="text-blue-400" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Account selector */}
              <div className="space-y-3">
                <label className="text-white/50 text-xs font-medium uppercase tracking-[0.2em]">Destination</label>
                {activeAccounts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-5 py-5 bg-white/[0.02]">
                    <p className="text-white/60 text-sm">No {activeTab} account connected yet.</p>
                    <RouterLink to={workspaceRoutes.accounts} className="inline-flex items-center gap-2 text-occium-gold hover:text-white transition-colors mt-4">
                      Connect Account →
                    </RouterLink>
                  </div>
                ) : (
                  <select value={selectedAccount || ""} onChange={(e) => setSelectedAccount(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3">
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id} className="text-black">{a.accountName}</option>
                    ))}
                  </select>
                )}
              </div>

              {activeTab === "youtube" ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wide flex items-center gap-2">
                      Source URL
                      {isFetchingMeta && <Loader2 size={12} className="animate-spin text-occium-gold" />}
                    </label>
                    <input {...register("source_url")} className="w-full glass-input rounded-lg px-4 py-3" placeholder="https://www.youtube.com/watch?v=..." />
                    <p className="text-white/30 text-xs">Metadata auto-fills when you paste a valid URL.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Title</label>
                      <input {...register("title")} className="w-full glass-input rounded-lg px-4 py-3" placeholder="Video title" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Privacy</label>
                      <select {...register("privacy_status")} className="w-full glass-input rounded-lg px-4 py-3">
                        <option value="private" className="text-black">Private</option>
                        <option value="unlisted" className="text-black">Unlisted</option>
                        <option value="public" className="text-black">Public</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Description</label>
                    <textarea {...register("description")} rows={7} className="w-full glass-input rounded-lg px-4 py-3 leading-relaxed" placeholder="Video description..." />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Tags</label>
                      <input {...register("tags_input")} className="w-full glass-input rounded-lg px-4 py-3" placeholder="marketing, ai, systems" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Thumbnail URL</label>
                      <input {...register("thumbnail_url")} className="w-full glass-input rounded-lg px-4 py-3" placeholder="Optional custom thumbnail" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Voice selector */}
                  <div className="space-y-2">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Voice Profile</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Professional", "Casual", "Viral"].map((v) => (
                        <button key={v} type="button" onClick={() => setSelectedVoice(v)}
                          className={`p-3 rounded-lg border text-left transition-all text-sm font-medium ${selectedVoice === v ? "bg-occium-gold/20 border-occium-gold text-white" : "bg-white/5 border-white/10 text-white/50 hover:border-white/30"}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wide flex justify-between items-center">
                      Post Content
                      <button type="button" onClick={handleGhostwrite} disabled={isGhostwriting}
                        className="text-xs flex items-center gap-1 text-occium-gold hover:text-white transition-colors disabled:opacity-50">
                        {isGhostwriting ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                        Ghostwrite
                      </button>
                    </label>
                    <textarea {...register("description")} rows={12} className="w-full glass-input rounded-lg px-4 py-3 text-lg leading-relaxed" placeholder="What do you want to talk about? Or paste a YouTube URL above and click Ghostwrite." />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Link URL (Optional)</label>
                      <input {...register("source_url")} className="w-full glass-input rounded-lg px-4 py-3" placeholder="https://..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Link Title (Optional)</label>
                      <input {...register("title")} className="w-full glass-input rounded-lg px-4 py-3" placeholder="Article or video title" />
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule + Submit */}
              <div className="mt-8 pt-8 border-t border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${scheduleDate ? "bg-occium-gold/10 text-occium-gold" : "bg-white/5 text-white/40"}`}>
                      <CalendarIcon size={20} />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {scheduleDate ? format(scheduleDate, "MMM d, h:mm a") : "Publish now or schedule"}
                      </p>
                    </div>
                  </div>
                  {!scheduleDate ? (
                    <button type="button" onClick={() => setScheduleDate(new Date())} className="text-occium-gold text-sm font-medium hover:underline">Set Schedule</button>
                  ) : (
                    <button type="button" onClick={() => setScheduleDate(null)} className="text-white/40 text-sm font-medium hover:text-red-400">Cancel</button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button type="button" onClick={resetComposer} className="px-5 py-3 rounded-full border border-white/10 bg-white/5 text-white/80 text-sm font-medium hover:bg-white/10 transition-colors">
                    Reset
                  </button>
                  <button type="submit" disabled={isSubmitting || !selectedAccount}
                    className="bg-white text-black px-10 py-3 rounded-full font-medium hover:scale-105 transition-transform shadow-lg disabled:opacity-60 disabled:scale-100">
                    {isSubmitting ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Working...</span>
                      : scheduleDate ? (activeTab === "youtube" ? "Schedule Upload" : "Schedule Post")
                      : activeTab === "youtube" ? "Save Draft" : "Post to LinkedIn"}
                  </button>
                </div>
              </div>
            </form>
          </GlassCard>
        </motion.div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <GlassCard>
            <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
              <CalendarIcon size={18} /> Schedule
            </h3>
            <div className="calendar-shell mb-4">
              <DayPicker mode="single" selected={scheduleDate} onSelect={setScheduleDate}
                className="rdp-occium text-white mx-auto" showOutsideDays
                modifiersClassNames={{ selected: "bg-occium-gold text-black rounded-full font-bold" }} />
            </div>
            <AnimatePresence>
              {scheduleDate && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <label className="text-white/60 text-xs uppercase tracking-wide mb-2 block">Time</label>
                  <input type="time" className="w-full glass-input rounded-lg px-3 py-3 text-center text-lg tracking-widest"
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(":");
                      const d = new Date(scheduleDate);
                      d.setHours(parseInt(h, 10), parseInt(m, 10));
                      setScheduleDate(d);
                    }} />
                  <button onClick={() => setScheduleDate(null)} className="w-full text-center text-white/40 hover:text-red-400 text-xs mt-4 transition-colors flex items-center justify-center gap-1">
                    <X size={12} /> Clear Schedule
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          <GlassCard>
            <h3 className="text-lg font-medium text-white mb-4">Preview</h3>
            {previewThumbnail ? (
              <img src={previewThumbnail} alt="" className="w-full aspect-video object-cover rounded-2xl border border-white/10" />
            ) : (
              <div className="w-full aspect-video rounded-2xl border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center text-white/25 text-sm">
                Thumbnail preview
              </div>
            )}
            <div className="mt-5 space-y-3">
              <p className="text-white text-base font-medium">{currentTitle?.trim() || "Untitled draft"}</p>
              <p className="text-white/40 text-sm leading-relaxed">{currentDescription?.trim() || "Start writing to see a preview."}</p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label, color }) => (
  <button type="button" onClick={onClick}
    className={`relative px-6 py-3 transition-all duration-300 group flex items-center gap-2 ${active ? "text-white" : "text-white/40 hover:text-white"}`}>
    <Icon size={18} className={active ? color : ""} />
    <span className="font-medium">{label}</span>
    {active && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />}
  </button>
);

function getYouTubeVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    const v = u.searchParams.get("v");
    if (v) return v;
    const s = u.pathname.match(/\/shorts\/([^/?]+)/);
    return s?.[1] ?? null;
  } catch { return null; }
}

export default NewPost;
