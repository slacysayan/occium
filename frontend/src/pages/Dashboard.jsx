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
import { DayPicker } from "react-day-picker";
import { motion } from "framer-motion";
import { isSameDay, parseISO } from "date-fns";
import "react-day-picker/style.css";
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          icon={Link2} 
          label="Connections" 
          value={stats.connectedAccounts} 
          detail="Active endpoints" 
          status={stats.connectedAccounts === 0 ? "danger" : "success"}
        />
        <SummaryCard icon={FileText} label="Drafts" value={stats.drafts} detail="Content to refine" />
        <SummaryCard icon={Clock3} label="Scheduled" value={stats.scheduled} detail="Upcoming releases" status={stats.scheduled > 0 ? "warning" : undefined} />
        <SummaryCard icon={CheckCircle2} label="Published" value={stats.published} detail="Total reach" />
      </div>

      {/* Hero Section: Progress & Next Move */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <GlassCard className="xl:col-span-2 relative overflow-hidden group" delay={0.1}>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-occium-gold/5 rounded-full blur-3xl group-hover:bg-occium-gold/10 transition-colors duration-1000" />
          
          <div className="flex flex-col h-full">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
              <div>
                <p className="text-occium-gold text-xs uppercase tracking-[0.3em] font-bold mb-2">Onboarding Roadmap</p>
                <h2 className="text-3xl font-light text-white tracking-tight">System Momentum</h2>
              </div>
              <div className="text-sm font-mono text-white/40">
                <span className="text-white font-bold">{completedSteps}</span>
                <span className="mx-1">/</span>
                {funnelSteps.length} COMPLETE
              </div>
            </div>

            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(completedSteps / funnelSteps.length) * 100}%` }}
                className="h-full bg-gradient-to-r from-occium-gold/40 to-occium-gold shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              {funnelSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Link
                    key={step.title}
                    to={step.href}
                    className={`group/step relative p-5 rounded-2xl border transition-all duration-300 ${
                      step.done 
                        ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10" 
                        : "border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover/step:scale-110 ${
                      step.done ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/40"
                    }`}>
                      {step.done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                    </div>
                    <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${step.done ? "text-emerald-400/80" : "text-white"}`}>
                      {step.title}
                    </h3>
                    <p className="text-white/40 text-xs leading-relaxed line-clamp-2 italic">
                      {step.description}
                    </p>
                    {step.done && (
                      <div className="absolute top-4 right-4 text-[10px] font-bold text-emerald-400/50">OK</div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="relative flex flex-col justify-between border-occium-gold/20" delay={0.15}>
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <TrendingUp size={120} />
          </div>
          
          <div>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-bold mb-2">Priority Action</p>
            <h2 className="text-2xl font-light text-white tracking-tight leading-tight">{nextStep.title}</h2>
            <p className="text-white/40 text-sm mt-4 leading-relaxed font-light">
              {nextStep.description}
            </p>
          </div>

          <div className="mt-10">
            <Link
              to={nextStep.href}
              className="group flex items-center justify-between bg-white text-black pl-6 pr-2 py-2 rounded-full font-bold text-sm transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>{nextStep.action}</span>
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight size={14} />
              </div>
            </Link>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <ScheduleCard />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <GlassCard delay={0.2}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-bold mb-1">Queue Preview</p>
                  <h2 className="text-xl font-light text-white tracking-tight">In Motion</h2>
                </div>
                <Link to={workspaceRoutes.queue} className="text-[10px] font-bold text-occium-gold hover:text-white uppercase tracking-widest transition-colors">
                  View All
                </Link>
              </div>

              {posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/5 p-8 text-center bg-white/[0.01]">
                  <p className="text-white/20 text-xs tracking-widest uppercase">No active pipeline</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.slice(0, 3).map((post) => (
                    <div key={post._id} className="flex items-center gap-4 group/post cursor-default">
                      <div className={`w-1 h-10 rounded-full transition-colors ${
                        post.status === 'scheduled' ? 'bg-occium-gold' : 'bg-white/10'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium line-clamp-1 group-hover/post:text-occium-gold transition-colors">
                          {post.title || post.description || "Untitled"}
                        </p>
                        <p className="text-white/30 text-[10px] uppercase tracking-wider mt-1">
                          {post.scheduled_at 
                            ? `Release ${formatDistanceToNow(new Date(post.scheduled_at), { addSuffix: true })}` 
                            : 'Draft Status'}
                        </p>
                      </div>
                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        post.platform === 'youtube' ? 'text-red-400 border-red-500/20' : 'text-blue-400 border-blue-500/20'
                      }`}>
                        {post.platform.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            <LinkedInSpotlightSection />
          </div>
        </div>

        <div className="space-y-8">
          <YouTubePulseSection analytics={youtubeAnalytics} loading={analyticsLoading} tokenHealth={tokenHealth} />
        </div>
      </div>

    </div>
  );
};

const ScheduleCard = () => {
  const { posts } = useWorkspace();
  const scheduledPosts = useMemo(() => 
    posts.filter(p => (p.status === 'scheduled' || p.status === 'published') && p.scheduled_at),
    [posts]
  );
  
  const [selectedDay, setSelectedDay] = useState(new Date());

  const dayPosts = useMemo(() => 
    scheduledPosts.filter(p => isSameDay(parseISO(p.scheduled_at), selectedDay)),
    [scheduledPosts, selectedDay]
  );

  const modifiers = {
    hasPost: (date) => scheduledPosts.some(p => isSameDay(parseISO(p.scheduled_at), date)),
    published: (date) => scheduledPosts.some(p => p.status === 'published' && isSameDay(parseISO(p.scheduled_at), date))
  };

  const modifiersStyles = {
    hasPost: {
      color: '#D4AF37',
      fontWeight: 'bold',
    },
    published: {
      color: '#4ade80',
    }
  };

  return (
    <GlassCard delay={0.22} className="relative overflow-hidden !p-0">
      <div className="grid grid-cols-1 md:grid-cols-[1fr,320px]">
        {/* Calendar Side */}
        <div className="p-8 border-b md:border-b-0 md:border-r border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-occium-gold text-[10px] uppercase tracking-[0.3em] font-bold mb-1">Global Calendar</p>
              <h2 className="text-3xl font-light text-white tracking-tight leading-none">Scheduler</h2>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-occium-gold" />
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Planned</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Live</span>
              </div>
            </div>
          </div>
          
          <div className="calendar-shell flex justify-center">
            <DayPicker 
              mode="single"
              selected={selectedDay}
              onSelect={(day) => day && setSelectedDay(day)}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rdp-occium"
              showOutsideDays
            />
          </div>
        </div>

        {/* Selected Day View */}
        <div className="bg-white/[0.01] flex flex-col">
          <div className="p-8 pb-4">
            <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-bold mb-2">Selected Date</p>
            <h3 className="text-xl font-light text-white tracking-tight">
              {format(selectedDay, "MMMM do")}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 max-h-[400px]">
            {dayPosts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-30">
                <Clock3 size={32} className="mb-4" />
                <p className="text-xs uppercase tracking-widest leading-relaxed">No drops programmed for this slot</p>
              </div>
            ) : (
              dayPosts.map((post) => (
                <div key={post._id} className="p-4 rounded-xl bg-white/5 border border-white/5 group hover:border-occium-gold/30 transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-2">
                     <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 ${
                       post.platform === 'youtube' ? 'text-red-400' : 'text-blue-400'
                     }`}>
                       {post.platform}
                     </span>
                     <span className="text-white/30 font-mono text-[10px]">
                       {format(parseISO(post.scheduled_at), "HH:mm")}
                     </span>
                  </div>
                  <p className="text-white text-xs font-medium line-clamp-2 leading-relaxed">
                    {post.title || post.description || "Untitled Release"}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="p-6 mt-auto border-t border-white/5 bg-white/[0.02]">
            <Link 
              to={workspaceRoutes.newPost}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-occium-gold text-black text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-occium-gold/20"
            >
              <PenSquare size={14} /> Program Drop
            </Link>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

const YouTubePulseSection = ({ analytics, loading, tokenHealth }) => {
  if (loading) {
    return (
      <GlassCard className="h-full flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-occium-gold" />
        <p className="text-white/30 text-xs mt-4 uppercase tracking-widest">Tracking pulse...</p>
      </GlassCard>
    );
  }

  if (!analytics) {
    return (
      <GlassCard className="h-full flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/10 mb-6">
          <PlayCircle size={32} />
        </div>
        <h3 className="text-white font-light text-lg mb-2">YouTube Offline</h3>
        <p className="text-white/30 text-xs leading-relaxed max-w-[200px]">
          Connect your channel to unlock real-time performance tracking and audience insights.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-bold mb-1">Network Pulse</p>
          <h2 className="text-2xl font-light text-white tracking-tight">YouTube Analytics</h2>
        </div>
        <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-2 ${
          tokenHealth.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
        }`}>
          <div className={`w-1 h-1 rounded-full ${tokenHealth.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          {tokenHealth.status === 'healthy' ? 'Healthy' : 'Check Access'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <PerformanceMetric icon={TrendingUp} label="Subscribers" value={analytics.subscribers || "N/A"} />
        <PerformanceMetric icon={PlayCircle} label="Total Views" value={formatCompactNumber(analytics.views)} />
      </div>

      <div className="space-y-4">
        <p className="text-white/25 text-[9px] uppercase tracking-[0.2em] font-bold mb-2">Recent Content</p>
        <div className="space-y-3">
          {analytics.recentVideos?.slice(0, 3).map((video, i) => (
            <RecentUploadRow key={i} video={video} />
          ))}
          {!analytics.recentVideos?.length && (
             <div className="p-4 rounded-xl border border-dashed border-white/5 text-center">
               <p className="text-white/20 text-[10px] uppercase tracking-widest">No recent uploads</p>
             </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

const LinkedInSpotlightSection = () => {
  const { linkedinAccounts, posts } = useWorkspace();
  const account = linkedinAccounts[0];

  if (!account) return null;

  const linkedinPosts = posts.filter((p) => p.platform === "linkedin");
  const publishedCount = linkedinPosts.filter((p) => p.status === "published").length;
  const scheduledCount = linkedinPosts.filter((p) => p.status === "scheduled").length;
  const tokenHealth = getAccessTokenHealth(account);

  return (
    <GlassCard delay={0.19}>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-2">LinkedIn</p>
          <h2 className="text-2xl font-light text-white tracking-tight">Connection Status</h2>
        </div>
        <span className={`text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border ${
          tokenHealth.status === "healthy" || tokenHealth.status === "connected"
            ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
            : tokenHealth.status === "expired"
            ? "text-red-400 border-red-500/20 bg-red-500/10"
            : "text-amber-400 border-amber-500/20 bg-amber-500/10"
        }`}>
          {tokenHealth.status === "healthy" || tokenHealth.status === "connected" ? "Token active" : tokenHealth.status === "expired" ? "Token expired" : "Check token"}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-6">
        {account.profile_picture ? (
          <img
            src={account.profile_picture}
            alt=""
            className="w-14 h-14 rounded-2xl object-cover border border-white/10"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center p-3">
             <img src="/branding/occium-mark.webp" alt="" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-white font-medium line-clamp-1">{account.account_name}</p>
          <p className="text-white/35 text-sm mt-1">
            Posting via Render helper. Token stored in browser.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <AnalyticsStat label="Published" value={publishedCount} />
        <AnalyticsStat label="Scheduled" value={scheduledCount} />
      </div>

      <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
        <p className="text-white/35 text-xs uppercase tracking-[0.18em]">Notes</p>
        <div className="rounded-2xl bg-white/5 border border-white/5 p-4 text-xs text-white/40 leading-relaxed space-y-2">
          <p>LinkedIn does not provide a public analytics API for personal profiles. Follower counts, impressions, and engagement data are not available here.</p>
          <p>Counts above reflect posts tracked in this browser session only.</p>
        </div>
      </div>
    </GlassCard>
  );
};

const AnalyticsStat = ({ label, value }) => (
  <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
    <p className="text-white/25 text-[9px] uppercase tracking-[0.2em] font-bold mb-3">{label}</p>
    <p className="text-white text-xl font-light tracking-tight">{value}</p>
  </div>
);

const PerformanceMetric = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-occium-gold shrink-0">
      <Icon size={16} />
    </div>
    <div className="min-w-0">
      <p className="text-white/25 text-[9px] uppercase tracking-[0.2em] font-bold">{label}</p>
      <p className="text-white text-sm font-medium mt-1 truncate">{value}</p>
    </div>
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

const SummaryCard = ({ icon: Icon, label, value, detail, status }) => (
  <GlassCard className="p-6 hover:scale-105 transition-all" delay={0.05}>
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-white/35 text-xs uppercase tracking-[0.2em] mb-3">{label}</p>
        <h2 className={`text-4xl font-light tracking-tight ${status === "danger" ? "text-rose-300" : "text-white"}`}>
          {formatCompactNumber(value)}
        </h2>
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
