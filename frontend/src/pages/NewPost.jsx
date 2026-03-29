import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { GlassCard } from "../components/ui/GlassCard";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
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
  getAccessTokenHealth,
  ghostwrite,
  inspectYouTubeSource,
  uploadYouTubeImport,
} from "../lib/localApp";
import { createTask, updateTaskStatus } from "./Settings";
import { workspaceRoutes } from "../lib/routes";

const HELPER_BOOT_COMMAND = "start-helper.bat";

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
  const {
    accounts,
    youtubeAccounts,
    helperStatus,
    helperLoading,
    refreshHelperStatus,
  } = useWorkspace();
  const [activeTab, setActiveTab] = useState("youtube");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [metadataSource, setMetadataSource] = useState("");
  const [collectionSource, setCollectionSource] = useState(null);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
  const [collectionFilter, setCollectionFilter] = useState("");
  const [bulkIntervalMinutes, setBulkIntervalMinutes] = useState(60);
  const [bulkProgress, setBulkProgress] = useState({
    active: false,
    completed: 0,
    total: 0,
    currentTitle: "",
  });

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

  const helperLabel = helperStatus.available
    ? "Helper online"
    : helperLoading || helperStatus.status === "checking"
      ? "Checking helper"
    : helperStatus.status === "degraded"
      ? "Helper online, yt-dlp missing"
      : "Helper offline";
  const selectedYouTubeAccount = useMemo(
    () => accounts.find((account) => account._id === selectedAccount) || null,
    [accounts, selectedAccount],
  );
  const sourceUrl = watch("source_url");
  const currentTitle = watch("title");
  const currentPrivacyStatus = watch("privacy_status");
  const currentTagsInput = watch("tags_input");
  const tokenHealth = useMemo(
    () => getAccessTokenHealth(selectedYouTubeAccount),
    [selectedYouTubeAccount],
  );
  const filteredCollectionEntries = useMemo(() => {
    if (!collectionSource) {
      return [];
    }

    const query = collectionFilter.trim().toLowerCase();
    if (!query) {
      return collectionSource.entries;
    }

    return collectionSource.entries.filter((entry) =>
      entry.title.toLowerCase().includes(query),
    );
  }, [collectionSource, collectionFilter]);
  const selectedCollectionEntries = useMemo(() => {
    if (!collectionSource) {
      return [];
    }

    return collectionSource.entries.filter((entry) =>
      selectedCollectionIds.includes(entry.id),
    );
  }, [collectionSource, selectedCollectionIds]);
  const canUploadToYouTube = Boolean(
    selectedYouTubeAccount?.access_token &&
      helperStatus.available &&
      (
        collectionSource
          ? selectedCollectionEntries.length > 0
          : sourceUrl && currentTitle
      ),
  );

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
    const url = sourceUrl;
    if (!url) {
      return toast.error("Please enter a YouTube URL");
    }

    const toastId = toast.loading("Fetching video details...");

    try {
      const source = await inspectYouTubeSource(url);
      setMetadataSource(source.metadata_source || "");

      if (source.kind === "collection") {
        const nextCollection = source.collection;
        const firstEntry = nextCollection.entries[0] || null;

        setCollectionSource(nextCollection);
        setSelectedCollectionIds(nextCollection.entries.map((entry) => entry.id));
        setCollectionFilter("");
        setVideoPreview(firstEntry?.thumbnail || null);
        setValue("title", "");
        setValue("description", "");
        setValue("thumbnail_url", firstEntry?.thumbnail || "");

        toast.dismiss(toastId);
        toast.success(`Loaded ${nextCollection.entry_count} videos`);
        return;
      }

      const metadata = source.video;
      setCollectionSource(null);
      setSelectedCollectionIds([]);
      setCollectionFilter("");
      setValue("title", metadata.title);
      setValue("description", metadata.description);
      setValue("thumbnail_url", metadata.thumbnail);
      setVideoPreview(metadata.thumbnail);

      toast.dismiss(toastId);
      toast.success("Video imported!");
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error(error?.message || "Failed to fetch metadata");
    }
  };

  const resetFormState = () => {
    reset(defaultValues);
    setVideoPreview(null);
    setScheduleDate(null);
    setMetadataSource("");
    setCollectionSource(null);
    setSelectedCollectionIds([]);
    setCollectionFilter("");
    setBulkProgress({
      active: false,
      completed: 0,
      total: 0,
      currentTitle: "",
    });
  };

  const toggleCollectionItem = (entryId) => {
    setSelectedCollectionIds((currentIds) =>
      currentIds.includes(entryId)
        ? currentIds.filter((id) => id !== entryId)
        : [...currentIds, entryId],
    );
  };

  const selectVisibleCollectionItems = () => {
    setSelectedCollectionIds((currentIds) => {
      const mergedIds = new Set(currentIds);
      filteredCollectionEntries.forEach((entry) => mergedIds.add(entry.id));
      return [...mergedIds];
    });
  };

  const clearCollectionSelection = () => {
    setSelectedCollectionIds([]);
  };

  const buildScheduledPublishAt = (index) => {
    if (!scheduleDate) {
      return null;
    }

    const nextDate = new Date(scheduleDate);
    nextDate.setMinutes(nextDate.getMinutes() + index * bulkIntervalMinutes);
    return nextDate.toISOString();
  };

  const selectionSummary = useMemo(() => {
    if (!collectionSource) {
      return null;
    }

    const totalDurationSeconds = selectedCollectionEntries.reduce(
      (total, entry) => total + (entry.duration || 0),
      0,
    );

    return {
      sourceType: collectionSource.source_type,
      selectedCount: selectedCollectionEntries.length,
      totalDurationSeconds,
      totalDurationLabel: formatVideoDuration(totalDurationSeconds),
    };
  }, [collectionSource, selectedCollectionEntries]);

  const batchSchedulePreview = useMemo(() => {
    if (!collectionSource || selectedCollectionEntries.length === 0) {
      return [];
    }

    return selectedCollectionEntries.slice(0, 4).map((entry, index) => {
      if (!scheduleDate) {
        return {
          id: entry.id,
          title: entry.title,
          publishAt: null,
        };
      }

      const nextDate = new Date(scheduleDate);
      nextDate.setMinutes(nextDate.getMinutes() + index * bulkIntervalMinutes);

      return {
        id: entry.id,
        title: entry.title,
        publishAt: nextDate.toISOString(),
      };
    });
  }, [collectionSource, selectedCollectionEntries, scheduleDate, bulkIntervalMinutes]);

  const onSubmit = async (data) => {
    if (!selectedAccount) {
      return toast.error(`Please connect a ${activeTab} account first`);
    }

    setIsSubmitting(true);

    try {
      if (activeTab === "youtube") {
        const account = selectedYouTubeAccount;
        const publishAt = scheduleDate ? scheduleDate.toISOString() : null;
        const requestedPrivacy = data.privacy_status || "private";

        if (!account?.access_token) {
          throw new Error("Reconnect the YouTube channel before uploading.");
        }

        if (collectionSource) {
          if (selectedCollectionEntries.length === 0) {
            throw new Error("Select at least one video from the playlist or channel.");
          }

          let uploadedCount = 0;
          const failures = [];

          setBulkProgress({
            active: true,
            completed: 0,
            total: selectedCollectionEntries.length,
            currentTitle: "",
          });

          for (const [index, entry] of selectedCollectionEntries.entries()) {
            setBulkProgress({
              active: true,
              completed: index,
              total: selectedCollectionEntries.length,
              currentTitle: entry.title,
            });

            const taskId = `task_bulk_${entry.id}_${Date.now()}`;
            createTask({
              id: taskId,
              title: entry.title,
              sourceUrl: entry.source_url,
              accountName: account.account_name,
              kind: "bulk",
            });
            updateTaskStatus(taskId, { status: "running", startedAt: new Date().toISOString(), progress: 5 });

            try {
              const entryMetadata = await fetchVideoMetadata(entry.source_url);
              const publishAt = buildScheduledPublishAt(index);
              updateTaskStatus(taskId, { progress: 30 });
              const uploadResult = await uploadYouTubeImport({
                account,
                sourceUrl: entry.source_url,
                title: entryMetadata.title || entry.title,
                description:
                  entryMetadata.description ||
                  `Imported from YouTube.\n\nSource: ${entry.source_url}`,
                tags: currentTagsInput,
                privacyStatus: currentPrivacyStatus || "private",
                publishAt,
              });

              createPost({
                user_id: user.id,
                account_id: selectedAccount,
                platform: "youtube",
                content_type: "video",
                title: entryMetadata.title || entry.title,
                description:
                  entryMetadata.description ||
                  `Imported from YouTube.\n\nSource: ${entry.source_url}`,
                tags: currentTagsInput,
                source_url: entry.source_url,
                thumbnail_url: entryMetadata.thumbnail || entry.thumbnail,
                privacy_status: uploadResult.privacyStatus,
                scheduled_at: publishAt,
                status: publishAt ? "scheduled" : "published",
                platform_post_id: uploadResult.videoId,
                platform_post_url: uploadResult.videoUrl,
                upload_mode: "python-helper",
                helper_status: "uploaded",
              });

              updateTaskStatus(taskId, {
                status: "completed",
                progress: 100,
                completedAt: new Date().toISOString(),
                videoId: uploadResult.videoId,
                videoUrl: uploadResult.videoUrl,
              });
              uploadedCount += 1;
            } catch (error) {
              console.error(error);
              updateTaskStatus(taskId, {
                status: "failed",
                completedAt: new Date().toISOString(),
                errorMessage: error?.message || "Upload failed",
              });
              failures.push({
                title: entry.title,
                message: error?.message || "Upload failed",
              });
            } finally {
              setBulkProgress({
                active: true,
                completed: index + 1,
                total: selectedCollectionEntries.length,
                currentTitle: entry.title,
              });
            }
          }

          setBulkProgress({
            active: false,
            completed: selectedCollectionEntries.length,
            total: selectedCollectionEntries.length,
            currentTitle: "",
          });

          if (uploadedCount === 0 && failures.length > 0) {
            throw new Error(failures[0].message);
          }

          if (failures.length > 0) {
            toast.error(`${failures.length} videos failed. ${uploadedCount} uploaded successfully.`);
          } else {
            toast.success(
              scheduleDate
                ? `${uploadedCount} videos scheduled on YouTube!`
                : `${uploadedCount} videos uploaded to YouTube!`,
            );
          }

          resetFormState();
          return;
        }

        const singleTaskId = `task_single_${Date.now()}`;
        createTask({
          id: singleTaskId,
          title: data.title,
          sourceUrl: data.source_url,
          accountName: account.account_name,
          kind: "single",
        });
        updateTaskStatus(singleTaskId, { status: "running", startedAt: new Date().toISOString(), progress: 10 });

        try {
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
            upload_mode: "python-helper",
            helper_status: "uploaded",
          });

          updateTaskStatus(singleTaskId, {
            status: "completed",
            progress: 100,
            completedAt: new Date().toISOString(),
            videoId: uploadResult.videoId,
            videoUrl: uploadResult.videoUrl,
          });
        } catch (uploadError) {
          updateTaskStatus(singleTaskId, {
            status: "failed",
            completedAt: new Date().toISOString(),
            errorMessage: uploadError?.message || "Upload failed",
          });
          throw uploadError;
        }

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
      setBulkProgress((currentState) => ({
        ...currentState,
        active: false,
      }));
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
                  <RouterLink to={workspaceRoutes.accounts} className="text-occium-gold text-xs hover:underline">
                    Connect Account
                  </RouterLink>
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
                        Vercel hosts the app. The local Python helper handles source inspection, yt-dlp downloads, and the YouTube upload handoff from your own machine.
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
                            Run the helper locally from the repo root, then come back here and refresh helper status.
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
                              {helperLoading ? "Checking..." : "Refresh helper status"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedYouTubeAccount?.access_token && tokenHealth.status !== "healthy" && (
                    <div
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        tokenHealth.status === "expired"
                          ? "border-rose-400/20 bg-rose-500/5 text-rose-200"
                          : "border-amber-300/20 bg-amber-500/5 text-amber-100"
                      }`}
                    >
                      <p className="font-medium">
                        {tokenHealth.status === "expired"
                          ? "This channel token has expired."
                          : "This channel token is expiring soon."}
                      </p>
                      <p className="text-xs mt-1 opacity-80">
                        Reconnect the channel from Accounts before a large import so the upload handoff does not fail mid-batch.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wide flex items-center gap-2">
                      <Link size={14} /> Import from YouTube
                    </label>
                    <div className="flex gap-2">
                      <input
                        {...register("source_url")}
                        className="w-full glass-input rounded-lg px-4 py-3 font-mono text-sm"
                        placeholder="Paste a YouTube video, playlist, or channel link..."
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
                        {metadataSource !== "python-helper" && " . Upload still needs the local Python helper."}
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

                  {collectionSource ? (
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-white text-sm font-medium">{collectionSource.title}</p>
                            <p className="text-white/40 text-xs mt-1">
                              {collectionSource.entry_count} videos ready from {collectionSource.source_type}.
                              {collectionSource.has_more && " Showing the first batch for faster selection."}
                            </p>
                          </div>
                          <div className="text-white/50 text-xs uppercase tracking-[0.2em]">
                            {selectedCollectionEntries.length} selected
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr,160px] gap-3 mt-4">
                          <input
                            value={collectionFilter}
                            onChange={(event) => setCollectionFilter(event.target.value)}
                            className="w-full glass-input rounded-lg px-4 py-3 text-sm"
                            placeholder="Filter imported videos..."
                          />
                          <input
                            type="number"
                            min="1"
                            value={bulkIntervalMinutes}
                            onChange={(event) =>
                              setBulkIntervalMinutes(Math.max(1, Number.parseInt(event.target.value || "1", 10)))
                            }
                            className="w-full glass-input rounded-lg px-4 py-3 text-sm"
                            placeholder="Gap (mins)"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            type="button"
                            onClick={selectVisibleCollectionItems}
                            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs transition-colors"
                          >
                            Select visible
                          </button>
                          <button
                            type="button"
                            onClick={clearCollectionSelection}
                            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs transition-colors"
                          >
                            Clear selection
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                        {filteredCollectionEntries.map((entry) => {
                          const isSelected = selectedCollectionIds.includes(entry.id);

                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => toggleCollectionItem(entry.id)}
                              className={`w-full text-left rounded-2xl border p-3 transition-colors ${
                                isSelected ? "border-occium-gold/40 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-5 h-5 rounded-md border flex-shrink-0 ${
                                    isSelected ? "bg-occium-gold border-occium-gold" : "border-white/20"
                                  }`}
                                />
                                {entry.thumbnail ? (
                                  <img
                                    src={entry.thumbnail}
                                    alt=""
                                    className="w-24 h-14 object-cover rounded-lg border border-white/10"
                                  />
                                ) : (
                                  <div className="w-24 h-14 rounded-lg border border-white/10 bg-white/5" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-white text-sm font-medium line-clamp-2">{entry.title}</p>
                                  <div className="flex flex-wrap items-center gap-3 text-white/35 text-xs mt-2">
                                    <span>#{entry.position}</span>
                                    <span>{entry.uploader}</span>
                                    <span>{formatVideoDuration(entry.duration)}</span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <p className="text-white/60 text-xs uppercase tracking-[0.2em] mb-2">Bulk Apply</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <div className="space-y-2">
                            <label className="text-white/60 text-xs font-medium uppercase tracking-wide">Tags Applied To All</label>
                            <input
                              {...register("tags_input")}
                              className="w-full glass-input rounded-lg px-4 py-3"
                              placeholder="marketing, ai, growth"
                            />
                          </div>
                        </div>
                        <p className="text-white/35 text-xs mt-3">
                          Selected videos keep their own titles and descriptions. Privacy, tags, and the schedule interval apply across the batch.
                        </p>
                      </div>

                      {selectionSummary && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <CollectionMetric label="Selected Videos" value={selectionSummary.selectedCount} />
                          <CollectionMetric label="Source Type" value={selectionSummary.sourceType} />
                          <CollectionMetric label="Selected Runtime" value={selectionSummary.totalDurationLabel} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}

                  {selectedYouTubeAccount?.token_expires_at && (
                    <p className="text-white/30 text-xs">
                      Channel token valid until {format(new Date(selectedYouTubeAccount.token_expires_at), "MMM d, h:mm a")}
                      {tokenHealth.status === "expiring" && tokenHealth.expiresInMinutes !== null
                        ? ` · ${tokenHealth.expiresInMinutes} minutes remaining`
                        : ""}
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
                    collectionSource ? `Schedule ${selectedCollectionEntries.length || 0} Videos` : "Schedule Post"
                  ) : activeTab === "youtube" ? (
                    collectionSource ? `Upload ${selectedCollectionEntries.length || 0} Videos` : "Upload to YouTube"
                  ) : (
                    "Post Now"
                  )}
                </button>
              </div>
              {activeTab === "youtube" && bulkProgress.active && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-white/55">
                    <span>Bulk upload progress</span>
                    <span>
                      {bulkProgress.completed}/{bulkProgress.total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden mt-3">
                    <div
                      className="h-full bg-occium-gold transition-all duration-300"
                      style={{
                        width: `${bulkProgress.total ? (bulkProgress.completed / bulkProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  {bulkProgress.currentTitle && (
                    <p className="text-white/40 text-xs mt-3 line-clamp-1">
                      Processing: {bulkProgress.currentTitle}
                    </p>
                  )}
                </div>
              )}
              {activeTab === "youtube" && !helperStatus.available && (
                <p className="text-amber-200/80 text-xs">
                  Upload is paused until the local Python helper is online at `http://127.0.0.1:4315`.
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

          {activeTab === "youtube" && collectionSource && (
            <GlassCard>
              <h3 className="text-lg font-medium text-white mb-4">Batch Plan</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CollectionMetric
                    label="Ready To Upload"
                    value={selectionSummary?.selectedCount || 0}
                  />
                  <CollectionMetric
                    label="Gap"
                    value={`${bulkIntervalMinutes} min`}
                  />
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-white/55 text-xs uppercase tracking-[0.18em] mb-2">Schedule Preview</p>
                  {batchSchedulePreview.length === 0 ? (
                    <p className="text-white/40 text-sm">
                      Select at least one video to preview the first publish slots.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {batchSchedulePreview.map((item, index) => (
                        <div key={item.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white text-sm line-clamp-2">{item.title}</p>
                            <p className="text-white/30 text-xs mt-1">Video {index + 1}</p>
                          </div>
                          <div className="text-right text-xs text-white/45 shrink-0">
                            {item.publishAt
                              ? format(new Date(item.publishAt), "MMM d, h:mm a")
                              : "Uploads immediately"}
                          </div>
                        </div>
                      ))}
                      {selectedCollectionEntries.length > batchSchedulePreview.length && (
                        <p className="text-white/30 text-xs">
                          +{selectedCollectionEntries.length - batchSchedulePreview.length} more videos follow the same interval pattern.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          )}

          {activeTab === "youtube" && (
            <GlassCard>
              <h3 className="text-lg font-medium text-white mb-4">YouTube Import Flow</h3>
              <div className="space-y-3 text-sm text-white/45">
                <p>1. Connect the destination channel from the Accounts page.</p>
                <p>2. Start the Python helper on your machine.</p>
                <p>3. Paste a single video, playlist, or channel URL.</p>
                <p>4. Pick the exact videos you want to publish.</p>
                <p>5. Apply privacy, tags, and an optional schedule interval.</p>
                <p>6. The helper downloads and uploads each selected video to the connected channel.</p>
              </div>
              <div className="mt-5 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/75 font-mono break-all">
                {HELPER_BOOT_COMMAND}
              </div>
              {youtubeAccounts.length === 0 && (
                <RouterLink
                  to={workspaceRoutes.accounts}
                  className="inline-flex items-center gap-2 text-occium-gold hover:text-white transition-colors mt-5"
                >
                  Connect a YouTube channel first
                </RouterLink>
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

const CollectionMetric = ({ label, value }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <p className="text-white/35 text-xs uppercase tracking-[0.18em]">{label}</p>
    <p className="text-white text-lg font-medium mt-3">{value}</p>
  </div>
);

const formatVideoDuration = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) {
    return "Duration n/a";
  }

  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, remainingSeconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  return [minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

export default NewPost;
