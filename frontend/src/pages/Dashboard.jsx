import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Flame,
  Link2,
  PenSquare,
  PlayCircle,
  TrendingUp,
} from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import {
  fetchYouTubeChannelAnalytics,
  getAccessTokenHealth,
} from "../lib/localApp";
import { workspaceRoutes } from "../lib/routes";

const Dashboard = () => {
  const { user } = useAuth();
  const { accounts, posts, youtubeAccounts } = useWorkspace();
  const [youtubeAnalytics, setYouTubeAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const connectedYouTubeAccount = useMemo(
    () => youtubeAccounts.find((account) => account.access_token) || null,
    [youtubeAccounts],
  );

  useEffect(() => {
    if (!connectedYouTubeAccount) {
      setYouTubeAnalytics(null);
      setAnalyticsLoading(false);
      return undefined;
    }

    let isMounted = true;

    setAnalyticsLoading(true);
    fetchYouTubeChannelAnalytics(connectedYouTubeAccount)
      .then((analytics) => {
        if (isMounted) {
          setYouTubeAnalytics(analytics);
        }
      })
      .catch((error) => {
        console.error("Failed to load YouTube analytics", error);
        if (isMounted) {
          setYouTubeAnalytics(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setAnalyticsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [connectedYouTubeAccount]);

  const stats = useMemo(() => {
    const drafts = posts.filter((post) => post.status === "draft").length;
    const scheduled = posts.filter((post) => post.status === "scheduled").length;
    const published = posts.filter((post) => post.status === "published").length;

    return {
      connectedAccounts: accounts.length,
      drafts,
      scheduled,
      published,
    };
  }, [accounts, posts]);

  const funnelSteps = useMemo(() => {
    const hasAccounts = stats.connectedAccounts > 0;
    const hasPosts = posts.length > 0;
    const hasLiveContent = stats.scheduled + stats.published > 0;

    return [
      {
        title: "Connect an account",
        description: "Link a YouTube channel or LinkedIn profile so the workspace has a destination.",
        href: workspaceRoutes.accounts,
        action: hasAccounts ? "Manage accounts" : "Connect account",
        icon: Link2,
        done: hasAccounts,
      },
      {
        title: "Create your first post",
        description: "Draft a post or import a video so the workspace has content to work with.",
        href: workspaceRoutes.newPost,
        action: hasPosts ? "Create another post" : "Create first post",
        icon: PenSquare,
        done: hasPosts,
      },
      {
        title: "Schedule or publish",
        description: "Move content out of draft so your queue starts doing real work.",
        href: hasLiveContent ? workspaceRoutes.queue : workspaceRoutes.newPost,
        action: hasLiveContent ? "Open queue" : "Schedule a post",
        icon: CalendarClock,
        done: hasLiveContent,
      },
    ];
  }, [posts.length, stats.connectedAccounts, stats.published, stats.scheduled]);

  const completedSteps = funnelSteps.filter((step) => step.done).length;
  const nextStep = funnelSteps.find((step) => !step.done) || funnelSteps[funnelSteps.length - 1];
  const tokenHealth = getAccessTokenHealth(connectedYouTubeAccount);
  const recentUploads = youtubeAnalytics?.recentVideos || [];

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end gap-6">
        <div>
          <h1 className="text-5xl font-light text-white mb-2 tracking-tight">Overview</h1>
          <p className="text-white/40 font-light">
            Welcome back, {user?.name.split(" ")[0]}. This workspace reflects live local state plus your connected YouTube pulse.
          </p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-occium-gold font-mono text-sm">{format(new Date(), "EEEE, MMMM do")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard icon={Link2} label="Connected" value={stats.connectedAccounts} detail="Accounts ready" />
        <SummaryCard icon={FileText} label="Drafts" value={stats.drafts} detail="Posts to refine" />
        <SummaryCard icon={Clock3} label="Scheduled" value={stats.scheduled} detail="Queued to go out" />
        <SummaryCard icon={CheckCircle2} label="Published" value={stats.published} detail="Already completed" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr,0.85fr] gap-8">
        <GlassCard className="space-y-8" delay={0.1}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-2">Bridge The Gap</p>
              <h2 className="text-3xl font-light text-white tracking-tight">Simple funnel to first momentum</h2>
            </div>
            <div className="text-sm text-white/50">
              {completedSteps}/{funnelSteps.length} complete
            </div>
          </div>

          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-occium-gold transition-all duration-500"
              style={{ width: `${(completedSteps / funnelSteps.length) * 100}%` }}
            />
          </div>

          <div className="space-y-4">
            {funnelSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className={`rounded-2xl border p-5 transition-colors ${
                    step.done ? "border-emerald-400/20 bg-emerald-500/5" : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        step.done ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white"
                      }`}
                    >
                      {step.done ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-2">Step {index + 1}</p>
                          <h3 className="text-xl text-white font-medium">{step.title}</h3>
                        </div>
                        <span className={`text-xs uppercase tracking-[0.18em] ${step.done ? "text-emerald-300" : "text-white/35"}`}>
                          {step.done ? "Complete" : "Pending"}
                        </span>
                      </div>
                      <p className="text-white/45 text-sm mt-3 max-w-2xl">{step.description}</p>
                      <Link
                        to={step.href}
                        className="inline-flex items-center gap-2 text-sm text-occium-gold hover:text-white transition-colors mt-4"
                      >
                        {step.action} <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <div className="space-y-8">
          <GlassCard delay={0.15}>
            <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-2">Next Move</p>
            <h2 className="text-2xl font-light text-white tracking-tight">{nextStep.title}</h2>
            <p className="text-white/45 text-sm mt-3">{nextStep.description}</p>
            <Link
              to={nextStep.href}
              className="inline-flex items-center gap-2 bg-white text-black px-5 py-3 rounded-full font-medium hover:scale-105 transition-transform mt-6"
            >
              {nextStep.action} <ArrowRight size={16} />
            </Link>
          </GlassCard>

          <GlassCard delay={0.18}>
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-2">YouTube Pulse</p>
                <h2 className="text-2xl font-light text-white tracking-tight">Channel performance</h2>
              </div>
              {connectedYouTubeAccount && (
                <span className={`text-[10px] uppercase tracking-[0.18em] ${
                  tokenHealth.status === "healthy"
                    ? "text-emerald-300"
                    : tokenHealth.status === "expiring"
                      ? "text-amber-200"
                      : "text-rose-300"
                }`}>
                  {formatTokenHealth(tokenHealth)}
                </span>
              )}
            </div>

            {analyticsLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/45 text-sm">
                Loading connected channel analytics...
              </div>
            ) : youtubeAnalytics ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  {youtubeAnalytics.thumbnail ? (
                    <img
                      src={youtubeAnalytics.thumbnail}
                      alt=""
                      className="w-14 h-14 rounded-2xl object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10" />
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-medium line-clamp-1">{youtubeAnalytics.title}</p>
                    <p className="text-white/35 text-sm mt-1">Live stats and recent upload momentum from the connected channel.</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <AnalyticsStat label="Subscribers" value={formatCompactNumber(youtubeAnalytics.subscribers)} />
                  <AnalyticsStat label="Views" value={formatCompactNumber(youtubeAnalytics.views)} />
                  <AnalyticsStat label="Videos" value={formatCompactNumber(youtubeAnalytics.videos)} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <PerformanceMetric
                    icon={TrendingUp}
                    label="Recent Avg Views"
                    value={formatCompactNumber(Math.round(youtubeAnalytics.recentAverageViews || 0))}
                  />
                  <PerformanceMetric
                    icon={CalendarClock}
                    label="Upload Cadence"
                    value={youtubeAnalytics.cadenceDays ? `${youtubeAnalytics.cadenceDays.toFixed(1)} days` : "Need more uploads"}
                  />
                  <PerformanceMetric
                    icon={Flame}
                    label="Recent Likes"
                    value={formatCompactNumber(youtubeAnalytics.recentTotals?.likes || 0)}
                  />
                </div>

                {youtubeAnalytics.topVideo && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-white/35 text-xs uppercase tracking-[0.18em] mb-2">Top Recent Video</p>
                    <div className="flex items-start gap-4">
                      {youtubeAnalytics.topVideo.thumbnail ? (
                        <img
                          src={youtubeAnalytics.topVideo.thumbnail}
                          alt=""
                          className="w-24 h-16 rounded-xl object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-24 h-16 rounded-xl border border-white/10 bg-white/5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium line-clamp-2">{youtubeAnalytics.topVideo.title}</p>
                        <p className="text-white/35 text-sm mt-2">
                          {formatCompactNumber(youtubeAnalytics.topVideo.views)} views
                          {youtubeAnalytics.topVideo.publishedAt
                            ? ` · ${formatDistanceToNow(new Date(youtubeAnalytics.topVideo.publishedAt), { addSuffix: true })}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-white/35 text-xs uppercase tracking-[0.18em]">Recent Uploads</p>
                    <span className="text-white/30 text-xs">
                      {recentUploads.length ? `Latest ${recentUploads.length} videos` : "No recent uploads"}
                    </span>
                  </div>
                  {recentUploads.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 p-4 text-white/45 text-sm">
                      Connect a channel with at least one upload to unlock recent-video tracking.
                    </div>
                  ) : (
                    recentUploads.slice(0, 4).map((video) => (
                      <RecentUploadRow key={video.id} video={video} />
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-white/55">No live YouTube analytics yet.</p>
                <p className="text-white/35 text-sm mt-2">
                  Connect a YouTube channel to surface subscribers, views, recent uploads, and upload pace here.
                </p>
              </div>
            )}
          </GlassCard>

          <GlassCard delay={0.2}>
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-2">Recent Posts</p>
                <h2 className="text-2xl font-light text-white tracking-tight">What is in motion</h2>
              </div>
              <Link to={workspaceRoutes.newPost} className="text-sm text-occium-gold hover:text-white transition-colors">
                Create new
              </Link>
            </div>

            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-white/55">No posts yet.</p>
                <p className="text-white/35 text-sm mt-2">Once you create content, it will show up here instead of mock analytics.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.slice(0, 5).map((post) => (
                  <div key={post._id} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span
                        className={`text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full ${
                          post.platform === "youtube" ? "bg-red-500/10 text-red-300" : "bg-blue-500/10 text-blue-300"
                        }`}
                      >
                        {post.platform}
                      </span>
                      <span className="text-xs text-white/30 capitalize">{post.status}</span>
                    </div>
                    <p className="text-white font-medium mt-3 line-clamp-1">{post.title || post.description || "Untitled Post"}</p>
                    <p className="text-white/35 text-xs mt-2">
                      {post.scheduled_at
                        ? `Scheduled for ${format(new Date(post.scheduled_at), "MMM d, h:mm a")}`
                        : `Created ${format(new Date(post.created_at), "MMM d, h:mm a")}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

const AnalyticsStat = ({ label, value }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <p className="text-white/35 text-xs uppercase tracking-[0.18em]">{label}</p>
    <p className="text-white text-2xl font-light mt-3">{value}</p>
  </div>
);

const PerformanceMetric = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <div className="flex items-center gap-2 text-white/35 text-xs uppercase tracking-[0.18em]">
      <Icon size={14} />
      {label}
    </div>
    <p className="text-white text-lg font-medium mt-3">{value}</p>
  </div>
);

const RecentUploadRow = ({ video }) => (
  <a
    href={video.url}
    target="_blank"
    rel="noreferrer"
    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors"
  >
    {video.thumbnail ? (
      <img src={video.thumbnail} alt="" className="w-20 h-12 object-cover rounded-lg border border-white/10" />
    ) : (
      <div className="w-20 h-12 rounded-lg border border-white/10 bg-white/5" />
    )}
    <div className="min-w-0 flex-1">
      <p className="text-white text-sm font-medium line-clamp-2">{video.title}</p>
      <div className="flex flex-wrap items-center gap-3 text-white/35 text-xs mt-2">
        <span className="inline-flex items-center gap-1">
          <PlayCircle size={12} />
          {formatCompactNumber(video.views)}
        </span>
        <span>{formatDurationSeconds(video.durationSeconds)}</span>
        <span>
          {video.publishedAt
            ? formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true })
            : "Publish date n/a"}
        </span>
      </div>
    </div>
  </a>
);

const SummaryCard = ({ icon: Icon, label, value, detail }) => (
  <GlassCard className="p-6" delay={0.05}>
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-white/35 text-xs uppercase tracking-[0.2em] mb-3">{label}</p>
        <h2 className="text-4xl font-light text-white tracking-tight">{value}</h2>
        <p className="text-white/35 text-sm mt-2">{detail}</p>
      </div>
      <div className="w-12 h-12 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/75">
        <Icon size={20} />
      </div>
    </div>
  </GlassCard>
);

const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);

const formatDurationSeconds = (seconds) => {
  if (!seconds) {
    return "Duration n/a";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return [hours, minutes, remainingSeconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  return [minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const formatTokenHealth = (tokenHealth) => {
  if (tokenHealth.status === "expiring") {
    return `${tokenHealth.expiresInMinutes} min left`;
  }

  if (tokenHealth.status === "expired") {
    return "Reconnect required";
  }

  return "OAuth healthy";
};

export default Dashboard;
