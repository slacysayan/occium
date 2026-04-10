import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useForm } from "react-hook-form";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Linkedin, Wand2, X, Youtube } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "../components/ui/GlassCard";
import { useWorkspace } from "../context/WorkspaceContext";
import { workspaceRoutes } from "../lib/routes";
import { uploadToYouTube, postToLinkedIn, createPost, getYouTubeMetadata } from "../lib/localApp";

const defaultValues = {
  source_url: "",
  title: "",
  description: "",
  thumbnail_url: "",
  privacy_status: "private",
  tags_input: "",
};

const NewPost = () => {
  const { accounts, youtubeAccounts, linkedinAccounts } = useWorkspace();
  const [activeTab, setActiveTab] = useState("youtube");
  const [scheduleDate, setScheduleDate] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues,
  });

  useEffect(() => {
    const firstAccount = accounts.find((account) => account.platform === activeTab);
    const selectedStillExists = accounts.some((account) => account._id === selectedAccount);

    if (!selectedStillExists && firstAccount) {
      setSelectedAccount(firstAccount._id);
    } else if (!firstAccount) {
      setSelectedAccount(null);
    }
  }, [activeTab, accounts, selectedAccount]);

  const sourceUrl = watch("source_url");
  const currentTitle = watch("title");
  const currentDescription = watch("description");
  const manualThumbnail = watch("thumbnail_url");

  useEffect(() => {
    if (activeTab === "youtube" && sourceUrl && sourceUrl.includes("youtube.com")) {
      const fetchMetadata = async () => {
        try {
          const metadata = await getYouTubeMetadata(sourceUrl);
          if (metadata) {
            setValue("title", metadata.title);
            setValue("description", metadata.description);
          }
        } catch (error) {
          console.error("Metadata fetch failed", error);
        }
      };
      fetchMetadata();
    }
  }, [sourceUrl, activeTab, setValue]);

  const previewThumbnail = useMemo(() => {
    if (manualThumbnail?.trim()) {
      return manualThumbnail.trim();
    }

    if (activeTab !== "youtube") {
      return "";
    }

    const videoId = getYouTubeVideoId(sourceUrl);
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
  }, [activeTab, manualThumbnail, sourceUrl]);

  const onSubmit = async (data) => {
    if (!selectedAccount) {
      toast.error(`Add a ${activeTab} account first.`);
      return;
    }

    const account = accounts.find((a) => a._id === selectedAccount);

    try {
      setIsSubmitting(true);
      if (activeTab === "youtube") {
        const result = await uploadToYouTube({
          url: data.source_url,
          accessToken: account.access_token || "local-helper-mode",
          title: data.title,
          description: data.description,
          tags: data.tags_input ? data.tags_input.split(",").map((t) => t.trim()) : [],
          privacyStatus: data.privacy_status,
          publishAt: scheduleDate ? scheduleDate.toISOString() : null,
          channelId: account.channel_id,
        });
        toast.success("Successfully uploaded to YouTube!");
        createPost({
          ...data,
          status: "published",
          platform_post_id: result.videoId,
          platform_post_url: result.videoUrl,
          account_id: selectedAccount,
          platform: "youtube",
        });
      } else {
        const result = await postToLinkedIn({
          accessToken: account.access_token || "local-helper-mode",
          authorId: account.linkedin_id.replace("urn:li:person:", ""),
          text: data.description,
          linkUrl: data.source_url,
          linkTitle: data.title,
          publishAt: scheduleDate ? scheduleDate.toISOString() : null,
        });
        toast.success(scheduleDate ? "Post scheduled on LinkedIn!" : "Successfully posted to LinkedIn!");
        createPost({
          ...data,
          status: scheduleDate ? "scheduled" : "published",
          platform_post_id: result.postId,
          account_id: selectedAccount,
          platform: "linkedin",
          scheduled_at: scheduleDate ? scheduleDate.toISOString() : null,
        });
      }
      resetComposer();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to submit post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetComposer = () => {
    reset(defaultValues);
    setScheduleDate(null);
  };

  const activeAccounts = activeTab === "youtube" ? youtubeAccounts : linkedinAccounts;

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-5xl font-light text-white mb-2 tracking-tight">Composer</h1>
          <p className="text-white/40 font-light max-w-2xl">
            The UI shell stays live while backend publishing is rebuilt around Better Auth.
          </p>
        </div>
        <div className="rounded-full border border-occium-gold/20 bg-occium-gold/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-occium-gold">
          Local Engine
        </div>
      </div>



      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr),360px] gap-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard>
            <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-8">
              <TabButton
                active={activeTab === "youtube"}
                onClick={() => setActiveTab("youtube")}
                icon={Youtube}
                label="YouTube"
                color="text-red-400"
              />
              <TabButton
                active={activeTab === "linkedin"}
                onClick={() => setActiveTab("linkedin")}
                icon={Linkedin}
                label="LinkedIn"
                color="text-blue-400"
              />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-3">
                <label className="text-white/50 text-xs font-medium uppercase tracking-[0.2em]">
                  Destination
                </label>
                {activeAccounts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-5 py-5 bg-white/[0.02]">
                    <p className="text-white/60 text-sm">
                      No {activeTab} placeholder accounts are connected yet.
                    </p>
                    <RouterLink
                      to={workspaceRoutes.accounts}
                      className="inline-flex items-center gap-2 text-occium-gold hover:text-white transition-colors mt-4"
                    >
                      Open Accounts
                    </RouterLink>
                  </div>
                ) : (
                  <select
                    value={selectedAccount || ""}
                    onChange={(event) => setSelectedAccount(event.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-3"
                  >
                    {activeAccounts.map((account) => (
                      <option key={account._id} value={account._id} className="text-black">
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {activeTab === "youtube" ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wide">
                      Source URL
                    </label>
                    <input
                      {...register("source_url")}
                      className="w-full glass-input rounded-lg px-4 py-3"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <p className="text-white/30 text-xs">
                      YouTube Metadata is automatically fetched via the Local Engine.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">
                        Title
                      </label>
                      <input
                        {...register("title")}
                        className="w-full glass-input rounded-lg px-4 py-3"
                        placeholder="Title for the video"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">
                        Privacy
                      </label>
                      <select
                        {...register("privacy_status")}
                        className="w-full glass-input rounded-lg px-4 py-3"
                      >
                        <option value="private" className="text-black">
                          Private
                        </option>
                        <option value="unlisted" className="text-black">
                          Unlisted
                        </option>
                        <option value="public" className="text-black">
                          Public
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wide flex justify-between items-center">
                      Description
                      <button
                        type="button"
                        onClick={() => toast.info("Backend migration in progress. Action disabled.")}
                        className="text-xs flex items-center gap-1 text-occium-gold hover:text-white transition-colors"
                      >
                        <Wand2 size={12} />
                        AI Enhance
                      </button>
                    </label>
                    <textarea
                      {...register("description")}
                      rows={7}
                      className="w-full glass-input rounded-lg px-4 py-3 leading-relaxed"
                      placeholder="Video description..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">
                        Tags
                      </label>
                      <input
                        {...register("tags_input")}
                        className="w-full glass-input rounded-lg px-4 py-3"
                        placeholder="marketing, ai, systems"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">
                        Thumbnail URL
                      </label>
                      <input
                        {...register("thumbnail_url")}
                        className="w-full glass-input rounded-lg px-4 py-3"
                        placeholder="Optional custom thumbnail"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wide flex justify-between items-center">
                      Post Content
                      <button
                        type="button"
                        onClick={() => toast.info("Backend migration in progress. Action disabled.")}
                        className="text-xs flex items-center gap-1 text-occium-gold hover:text-white transition-colors"
                      >
                        <Wand2 size={12} />
                        Ghostwrite
                      </button>
                    </label>
                    <textarea
                      {...register("description")}
                      rows={12}
                      className="w-full glass-input rounded-lg px-4 py-3 text-lg leading-relaxed"
                      placeholder="What do you want to talk about?"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">
                        Link URL (Optional)
                      </label>
                      <input
                        {...register("source_url")}
                        className="w-full glass-input rounded-lg px-4 py-3"
                        placeholder="https://www.linkedin.com/posts/..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">
                        Link Title (Optional)
                      </label>
                      <input
                        {...register("title")}
                        className="w-full glass-input rounded-lg px-4 py-3"
                        placeholder="Optional article or video title"
                      />
                    </div>
                  </div>

                  <p className="text-white/30 text-xs leading-relaxed">
                    Programmatic publishing is paused. This composer remains as the UI shell for the
                    upcoming Better Auth migration.
                  </p>
                </div>
              )}

              <div className="mt-8 pt-8 border-t border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        scheduleDate
                          ? "bg-occium-gold/10 text-occium-gold"
                          : "bg-white/5 text-white/40"
                      }`}
                    >
                      <CalendarIcon size={20} />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {scheduleDate ? format(scheduleDate, "MMM d, h:mm a") : "Publish later or now"}
                      </p>
                      <p className="text-white/40 text-xs">
                        The schedule picker is preserved, but delivery is paused.
                      </p>
                    </div>
                  </div>
                  {!scheduleDate ? (
                    <button
                      type="button"
                      onClick={() => setScheduleDate(new Date())}
                      className="text-occium-gold text-sm font-medium hover:underline"
                    >
                      Set Schedule
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setScheduleDate(null)}
                      className="text-white/40 text-sm font-medium hover:text-red-400"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={resetComposer}
                    className="px-5 py-3 rounded-full border border-white/10 bg-white/5 text-white/80 text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedAccount}
                    className="bg-white text-black px-10 py-3 rounded-full font-medium hover:scale-105 transition-transform shadow-lg shadow-white/5 disabled:opacity-60 disabled:scale-100"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="animate-spin">⏳</span> Working...
                      </span>
                    ) : scheduleDate ? (
                      activeTab === "youtube"
                        ? "Schedule Upload"
                        : "Schedule Post"
                    ) : activeTab === "youtube" ? (
                      "Upload to YouTube"
                    ) : (
                      "Post Now"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </GlassCard>
        </motion.div>

        <div className="space-y-6">
          <GlassCard>
            <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
              <CalendarIcon size={18} /> Schedule
            </h3>
            <div className="calendar-shell mb-4">
              <DayPicker
                mode="single"
                selected={scheduleDate}
                onSelect={setScheduleDate}
                className="rdp-occium text-white mx-auto"
                showOutsideDays
                modifiersClassNames={{
                  selected: "bg-occium-gold text-black rounded-full font-bold",
                }}
              />
            </div>
            <AnimatePresence>
              {scheduleDate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-white/60 text-xs uppercase tracking-wide mb-2 block">
                    Time
                  </label>
                  <input
                    type="time"
                    className="w-full glass-input rounded-lg px-3 py-3 text-center text-lg tracking-widest"
                    onChange={(event) => {
                      const [hours, minutes] = event.target.value.split(":");
                      const nextDate = new Date(scheduleDate);
                      nextDate.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10));
                      setScheduleDate(nextDate);
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

          <GlassCard>
            <h3 className="text-lg font-medium text-white mb-4">Preview</h3>
            {previewThumbnail ? (
              <img
                src={previewThumbnail}
                alt=""
                className="w-full aspect-video object-cover rounded-2xl border border-white/10"
              />
            ) : (
              <div className="w-full aspect-video rounded-2xl border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center text-white/25 text-sm">
                Thumbnail preview
              </div>
            )}

            <div className="mt-5 space-y-3">
              <p className="text-white text-base font-medium">
                {currentTitle?.trim() || "Untitled draft"}
              </p>
              <p className="text-white/40 text-sm leading-relaxed">
                {currentDescription?.trim() || "Start writing to populate the live preview panel."}
              </p>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-lg font-medium text-white mb-4">Migration State</h3>
            <div className="space-y-3 text-sm text-white/55 leading-relaxed">
              <p>Occium Local Engine is active and connected to your social accounts.</p>
              <p>YouTube uploads and LinkedIn posts are processed through the local automation layer.</p>
              <p>Check the Dashboard for real-time status of your scheduled deliveries.</p>
            </div>
            <RouterLink
              to={workspaceRoutes.accounts}
              className="inline-flex items-center gap-2 text-occium-gold hover:text-white transition-colors mt-5"
            >
              Manage placeholder accounts
            </RouterLink>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label, color }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative px-6 py-3 transition-all duration-300 group flex items-center gap-2 ${
      active ? "text-white" : "text-white/40 hover:text-white"
    }`}
  >
    <Icon size={18} className={active ? color : ""} />
    <span className="font-medium">{label}</span>
    {active && (
      <motion.div
        layoutId="activeTab"
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
      />
    )}
  </button>
);

function getYouTubeVideoId(url) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.slice(1) || null;
    }

    const directId = parsedUrl.searchParams.get("v");
    if (directId) {
      return directId;
    }

    const shortsMatch = parsedUrl.pathname.match(/\/shorts\/([^/?]+)/);
    return shortsMatch?.[1] || null;
  } catch {
    return null;
  }
}

export default NewPost;
