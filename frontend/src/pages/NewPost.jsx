import React, { useEffect, useMemo, useState } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import {
  Youtube,
  Linkedin,
  Wand2,
  Calendar as CalendarIcon,
  Loader2,
  X,
  Link,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  createPost,
  fetchVideoMetadata,
  getAccountById,
  getAccounts,
  getLocalHelperStatus,
  ghostwrite,
  uploadYouTubeImport,
} from "../lib/localApp";

const HELPER_BOOT_COMMAND = "npm run install:helper && npm run start:helper";

const defaultValues = {
  source_url: "",
  title: "",
  description: "",
  thumbnail_url: "",
  privacy_status: "private",
  tags_input: "",
};

const NewPost = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("youtube");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [helperStatus, setHelperStatus] = useState({ available: false, status: "checking" });
  const [metadataSource, setMetadataSource] = useState("");
  const [isCheckingHelper, setIsCheckingHelper] = useState(false);

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues,
  });

  const youtubeAccounts = useMemo(
    () => accounts.filter((account) => account.platform === "youtube"),
    [accounts],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    const nextAccounts = getAccounts(user.id);
    setAccounts(nextAccounts);
    const firstAccount = nextAccounts.find((account) => account.platform === activeTab);
    if (firstAccount) {
      setSelectedAccount(firstAccount._id);
    }
  }, [user, activeTab]);

  useEffect(() => {
    const firstAccount = accounts.find((account) => account.platform === activeTab);
    if (firstAccount) {
      setSelectedAccount(firstAccount._id);
    } else {
      setSelectedAccount(null);
    }
  }, [activeTab, accounts]);

  useEffect(() => {
    if (activeTab !== "youtube") {
      return;
    }

    let isMounted = true;

    const checkHelper = async () => {
      setIsCheckingHelper(true);
      const nextStatus = await getLocalHelperStatus();
      if (isMounted) {
        setHelperStatus(nextStatus);
        setIsCheckingHelper(false);
      }
    };

    checkHelper();

    const intervalId = window.setInterval(checkHelper, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activeTab]);

  const helperLabel = helperStatus.available
    ? "Helper online"
    : helperStatus.status === "degraded"
      ? "Helper online, yt-dlp missing"
      : "Helper offline";
  const selectedYouTubeAccount = selectedAccount ? getAccountById(selectedAccount) : null;
  const canUploadToYouTube = Boolean(
    selectedYouTubeAccount?.access_token &&
      helperStatus.available &&
      watch("source_url") &&
      watch("title"),
  );

  const refreshHelperStatus = async () => {
    setIsCheckingHelper(true);
    const nextStatus = await getLocalHelperStatus();
    setHelperStatus(nextStatus);
    setIsCheckingHelper(false);
  };

  const copyHelperCommand = async () => {
    try {
      await navigator.clipboard.writeText(HELPER_BOOT_COMMAND);
      toast.success("Helper command copied");
    } catch (error) {
      console.error(error);
      toast.error("Could not copy helper command");
    }
  };

  const handleVideoMetadataFetch = async () => {
    const url = watch("source_url");
    if (!url) {
      return toast.error("Please enter a YouTube URL");
    }

    const toastId = toast.loading("Fetching video details...");

    try {
      const metadata = await fetchVideoMetadata(url);

      setValue("title", metadata.title);
      setValue("description", metadata.description);
      setValue("thumbnail_url", metadata.thumbnail);
      setVideoPreview(metadata.thumbnail);
      setMetadataSource(metadata.metadata_source || "");

      toast.dismiss(toastId);
      toast.success("Video imported!");
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error("Failed to fetch metadata");
    }
  };

  const resetFormState = () => {
    reset(defaultValues);
    setVideoPreview(null);
    setScheduleDate(null);
    setMetadataSource("");
  };

  const onSubmit = async (data) => {
    if (!selectedAccount) {
      return toast.error(`Please connect a ${activeTab} account first`);
    }

    setIsSubmitting(true);

    try {
      if (activeTab === "youtube") {
        const account = getAccountById(selectedAccount);
        const publishAt = scheduleDate ? scheduleDate.toISOString() : null;
        const requestedPrivacy = data.privacy_status || "private";

        if (!account?.access_token) {
          throw new Error("Reconnect the YouTube channel before uploading.");
        }

        const uploadResult = await uploadYouTubeImport({
          account,
          sourceUrl: data.source_url,
          title: data.title,
          description: data.description,
          tags: data.tags_input,
          privacyStatus: requestedPrivacy,
          publishAt,
        });

        createPost({
          user_id: user.id,
          account_id: selectedAccount,
          platform: "youtube",
          content_type: "video",
          title: data.title,
          description: data.description,
          tags: data.tags_input,
          source_url: data.source_url,
          thumbnail_url: data.thumbnail_url,
          privacy_status: uploadResult.privacyStatus,
          scheduled_at: publishAt,
          status: publishAt ? "scheduled" : "published",
          platform_post_id: uploadResult.videoId,
          platform_post_url: uploadResult.videoUrl,
          upload_mode: "local-helper",
          helper_status: "uploaded",
        });

        toast.success(publishAt ? "Video uploaded and scheduled on YouTube!" : "Video uploaded to YouTube!");
        resetFormState();
        return;
      }

      createPost({
        user_id: user.id,
        account_id: selectedAccount,
        platform: activeTab,
        ...data,
        scheduled_at: scheduleDate ? scheduleDate.toISOString() : null,
        status: scheduleDate ? "scheduled" : "draft",
      });

      toast.success("Post saved successfully!");
      resetFormState();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGhostwrite = async () => {
    const prompt = watch("description") || watch("title");
    if (!prompt) {
      return toast.error("Enter a topic first");
    }

    setIsGenerating(true);
    try {
      const response = await ghostwrite({
        prompt,
        platform: activeTab,
        tone: "professional",
      });
      setValue("description", response.content);
    } catch (error) {
      console.error(error);
      toast.error("Generation failed");
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
          active={activeTab === "youtube"}
          onClick={() => setActiveTab("youtube")}
          icon={Youtube}
          label="YouTube"
          color="text-red-500"
        />
        <TabButton
          active={activeTab === "linkedin"}
          onClick={() => setActiveTab("linkedin")}
          icon={Linkedin}
          label="LinkedIn"
          color="text-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2"
        >
          <GlassCard className="min-h-[600px] flex flex-col">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 flex-1 flex flex-col">
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-white/40 text-sm">Post to:</span>
                <select
                  value={selectedAccount || ""}
                  onChange={(event) => setSelectedAccount(event.target.value)}
                  className="bg-transparent text-white font-medium outline-none flex-1"
                >
                  <option value="" disabled>
                    Select Account
                  </option>
                  {accounts
                    .filter((account) => account.platform === activeTab)
                    .map((account) => (
                      <option key={account._id} value={account._id} className="text-black">
                        {account.account_name}
                      </option>
                    ))}
                </select>
                {accounts.filter((account) => account.platform === activeTab).length === 0 && (
                  <a href="/accounts" className="text-occium-gold text-xs hover:underline">
                    Connect Account
                  </a>
                )}
              </div>

              {activeTab === "youtube" && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-start gap-3">
                    {helperStatus.available ? (
                      <CheckCircle2 size={18} className="text-emerald-300 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={18} className="text-amber-300 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{helperLabel}</p>
                      <p className="text-white/40 text-xs mt-1">
                        Vercel hosts the app. The localhost helper handles yt-dlp and the YouTube upload handoff from your own machine.
                      </p>
                      {helperStatus.ytDlp?.version && (
                        <p className="text-white/30 text-xs mt-1">yt-dlp version: {helperStatus.ytDlp.version}</p>
                      )}
                      {helperStatus.ytDlp && !helperStatus.ytDlp.available && (
                        <p className="text-amber-200/80 text-xs mt-1">
                          Helper is reachable, but yt-dlp is not installed or not on PATH yet.
                        </p>
                      )}
                      {!helperStatus.available && (
                        <div className="mt-3 space-y-2">
                          <p className="text-white/55 text-xs">
                            Run the helper locally, then come back here and refresh helper status.
                          </p>
                          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white/80 text-xs font-mono break-all">
                            {HELPER_BOOT_COMMAND}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={copyHelperCommand}
                              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs transition-colors"
                            >
                              Copy command
                            </button>
                            <button
                              type="button"
                              onClick={refreshHelperStatus}
                              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs transition-colors"
                            >
                              {isCheckingHelper ? "Checking..." : "Refresh helper status"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wide flex items-center gap-2">
                      <Link size={14} /> Import from YouTube
                    </label>
                    <div className="flex gap-2">
                      <input
                        {...register("source_url")}
                        className="w-full glass-input rounded-lg px-4 py-3 font-mono text-sm"
                        placeholder="Paste YouTube Video Link..."
                      />
                      <button
                        type="button"
                        onClick={handleVideoMetadataFetch}
                        className="px-6 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
                      >
                        Fetch
                      </button>
                    </div>
                    {metadataSource && (
                      <p className="text-white/30 text-xs">
                        Metadata source: {metadataSource}
                        {metadataSource !== "local-helper" && " . Upload still needs the localhost helper."}
                      </p>
                    )}
                  </div>

                  {videoPreview && (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group">
                      <img src={videoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle size={48} className="text-white" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Title</label>
                      <input
                        {...register("title")}
                        className="w-full glass-input rounded-lg px-4 py-3 text-lg font-medium"
                        placeholder="Video Title"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Privacy</label>
                      <select
                        {...register("privacy_status")}
                        className="w-full glass-input rounded-lg px-4 py-3 text-white bg-transparent"
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

                  <div className="space-y-2 flex-1">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wide flex justify-between items-center">
                      Description
                      <button
                        type="button"
                        onClick={handleGhostwrite}
                        className="text-xs flex items-center gap-1 text-occium-gold hover:text-white transition-colors"
                      >
                        {isGenerating ? (
                          <Loader2 className="animate-spin" size={12} />
                        ) : (
                          <Wand2 size={12} />
                        )}{" "}
                        AI Enhance
                      </button>
                    </label>
                    <textarea
                      {...register("description")}
                      rows={6}
                      className="w-full glass-input rounded-lg px-4 py-3 leading-relaxed"
                      placeholder="Video description..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Tags</label>
                    <input
                      {...register("tags_input")}
                      className="w-full glass-input rounded-lg px-4 py-3"
                      placeholder="marketing, ai, growth"
                    />
                  </div>

                  {selectedYouTubeAccount?.token_expires_at && (
                    <p className="text-white/30 text-xs">
                      Channel token valid until {format(new Date(selectedYouTubeAccount.token_expires_at), "MMM d, h:mm a")}
                    </p>
                  )}
                </div>
              )}

              {activeTab === "linkedin" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wide flex justify-between items-center">
                      Post Content
                      <button
                        type="button"
                        onClick={handleGhostwrite}
                        className="text-xs flex items-center gap-1 text-occium-gold hover:text-white transition-colors"
                      >
                        {isGenerating ? (
                          <Loader2 className="animate-spin" size={12} />
                        ) : (
                          <Wand2 size={12} />
                        )}{" "}
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
                  <div className="space-y-2">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wide">
                      Image URL (Optional)
                    </label>
                    <input
                      {...register("thumbnail_url")}
                      className="w-full glass-input rounded-lg px-4 py-3"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}

              <div className="mt-auto pt-8 flex items-center justify-between border-t border-white/10">
                <div className="text-white/60 text-sm flex items-center gap-2">
                  {scheduleDate && <CalendarIcon size={16} className="text-occium-gold" />}
                  {scheduleDate ? `Scheduled: ${format(scheduleDate, "MMM d, h:mm a")}` : "Ready to post"}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || (activeTab === "youtube" && !canUploadToYouTube)}
                  className="bg-white text-black px-10 py-3 rounded-full font-medium hover:scale-105 transition-transform shadow-lg shadow-white/5 disabled:opacity-60 disabled:scale-100"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Working...
                    </span>
                  ) : scheduleDate ? (
                    "Schedule Post"
                  ) : activeTab === "youtube" ? (
                    "Upload to YouTube"
                  ) : (
                    "Post Now"
                  )}
                </button>
              </div>
              {activeTab === "youtube" && !helperStatus.available && (
                <p className="text-amber-200/80 text-xs">
                  Upload is paused until the local helper is online at `http://127.0.0.1:4315`.
                </p>
              )}
            </form>
          </GlassCard>
        </motion.div>

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
                  selected: "bg-occium-gold text-black rounded-full font-bold",
                }}
              />
            </div>
            <AnimatePresence>
              {scheduleDate && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <label className="text-white/60 text-xs uppercase tracking-wide mb-2 block">Time</label>
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

          {activeTab === "youtube" && (
            <GlassCard>
              <h3 className="text-lg font-medium text-white mb-4">YouTube Import Flow</h3>
              <div className="space-y-3 text-sm text-white/45">
                <p>1. Connect the destination channel from the Accounts page.</p>
                <p>2. Start the local helper on your machine.</p>
                <p>3. Paste a source video URL and pull metadata.</p>
                <p>4. Edit title, description, privacy, tags, and schedule.</p>
                <p>5. The localhost helper downloads with yt-dlp and uploads to the selected channel.</p>
              </div>
              <div className="mt-5 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/75 font-mono break-all">
                {HELPER_BOOT_COMMAND}
              </div>
              {youtubeAccounts.length === 0 && (
                <a href="/accounts" className="inline-flex items-center gap-2 text-occium-gold hover:text-white transition-colors mt-5">
                  Connect a YouTube channel first
                </a>
              )}
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label, color }) => (
  <button
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

export default NewPost;
