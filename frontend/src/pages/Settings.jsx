import React, { useCallback, useEffect, useState } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import {
  Key,
  Save,
  Eye,
  EyeOff,
  ShieldCheck,
  Server,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Trash2,
  Download,
  Loader2,
  Youtube,
  Linkedin,
  Sparkles,
  Globe,
  User,
  Plug,
  XCircle,
  ChevronRight,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { appEnv } from "../config/env";
import { getLocalHelperStatus } from "../lib/localApp";

/* ─────────────────────────────────────────────
   Local-storage keys for persisted settings
───────────────────────────────────────────── */
const SETTINGS_KEY = "occium.settings.v1";
const TASKS_KEY = "occium.tasks.v1";

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeSettings(next) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

export function readTasks() {
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function writeTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  window.dispatchEvent(new CustomEvent("occium:taskschange", { detail: tasks }));
}

export function upsertTask(task) {
  const tasks = readTasks();
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx >= 0) {
    tasks[idx] = { ...tasks[idx], ...task };
  } else {
    tasks.unshift(task);
  }
  writeTasks(tasks);
  return tasks;
}

export function createTask({ id, title, sourceUrl, accountName, kind = "single" }) {
  return upsertTask({
    id,
    title,
    sourceUrl,
    accountName,
    kind,
    status: "queued",
    progress: 0,
    startedAt: null,
    completedAt: null,
    errorMessage: null,
    videoId: null,
    videoUrl: null,
  });
}

export function updateTaskStatus(id, patch) {
  return upsertTask({ id, ...patch });
}

/* ─────────────────────────────────────────────
   Tab navigation
───────────────────────────────────────────── */
const TABS = [
  { id: "overview", label: "Overview", icon: Globe },
  { id: "api_keys", label: "API Keys", icon: Key },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "helper", label: "Render Engine", icon: Server },
  { id: "tasks", label: "Download Tasks", icon: Download },
];

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
const Settings = () => {
  const { user } = useAuth();
  const { helperStatus, helperLoading, helperCheckedAt, refreshHelperStatus, accounts } =
    useWorkspace();

  const [activeTab, setActiveTab] = useState("overview");
  const [settings, setSettings] = useState(readSettings);
  const [showKeys, setShowKeys] = useState({});
  const [tasks, setTasks] = useState(readTasks);

  /* Sync tasks from storage events */
  useEffect(() => {
    const sync = () => setTasks(readTasks());
    window.addEventListener("occium:taskschange", sync);
    return () => window.removeEventListener("occium:taskschange", sync);
  }, []);

  const saveSettings = useCallback(
    (patch) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      writeSettings(next);
      toast.success("Settings saved");
    },
    [settings]
  );

  const toggleKey = (key) =>
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));

  const clearTasks = () => {
    writeTasks([]);
    setTasks([]);
    toast.success("Task history cleared");
  };

  const removeTask = (id) => {
    const next = tasks.filter((t) => t.id !== id);
    writeTasks(next);
    setTasks(next);
  };

  /* Helper URL live-test */
  const [testingHelper, setTestingHelper] = useState(false);
  const testHelperUrl = async () => {
    setTestingHelper(true);
    try {
      const res = await getLocalHelperStatus();
      if (res.available) {
        toast.success(`Helper reachable — yt-dlp ${res.ytDlp?.version || "unknown"}`);
      } else {
        toast.error("Helper is offline or not reachable");
      }
    } catch {
      toast.error("Could not reach helper");
    } finally {
      setTestingHelper(false);
    }
  };

  /* ── computed ── */
  const youtubeAccounts = accounts.filter((a) => a.platform === "youtube");
  const linkedinAccounts = accounts.filter((a) => a.platform === "linkedin");

  const taskCounts = tasks.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-5xl font-light text-white mb-2 tracking-tight">Settings</h1>
        <p className="text-white/40 font-light">
          Configure your workspace, API references, and Render-backed pipeline.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar nav */}
        <nav className="lg:w-52 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === id
                  ? "bg-white text-black"
                  : "text-white/50 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon size={16} />
              {label}
              {id === "tasks" && tasks.length > 0 && (
                <span
                  className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${
                    activeTab === id ? "bg-black/20 text-black" : "bg-white/15 text-white"
                  }`}
                >
                  {tasks.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === "overview" && (
                <OverviewTab
                  user={user}
                  youtubeAccounts={youtubeAccounts}
                  linkedinAccounts={linkedinAccounts}
                  helperStatus={helperStatus}
                  taskCounts={taskCounts}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === "api_keys" && (
                <ApiKeysTab
                  showKeys={showKeys}
                  toggleKey={toggleKey}
                />
              )}

              {activeTab === "integrations" && (
                <IntegrationsTab
                  youtubeAccounts={youtubeAccounts}
                  linkedinAccounts={linkedinAccounts}
                  settings={settings}
                  onSave={saveSettings}
                />
              )}

              {activeTab === "helper" && (
                <HelperTab
                  helperStatus={helperStatus}
                  helperLoading={helperLoading}
                  helperCheckedAt={helperCheckedAt}
                  refreshHelperStatus={refreshHelperStatus}
                  testingHelper={testingHelper}
                  testHelperUrl={testHelperUrl}
                />
              )}

              {activeTab === "tasks" && (
                <TasksTab
                  tasks={tasks}
                  onClear={clearTasks}
                  onRemove={removeTask}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   Overview Tab
═══════════════════════════════════════════ */
const OverviewTab = ({
  user,
  youtubeAccounts,
  linkedinAccounts,
  helperStatus,
  taskCounts,
  setActiveTab,
}) => (
  <div className="space-y-6">
    {/* Identity card */}
    <GlassCard>
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 shrink-0">
          {user?.profile_picture ? (
            <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/40">
              <User size={28} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-medium text-white truncate">{user?.name || "Local User"}</h2>
          <p className="text-white/40 text-sm truncate">{user?.email || "local@occium.app"}</p>
          <p className="text-white/25 text-xs mt-1">
            Auth: {user?.auth_provider === "google" ? "Google OAuth" : "Local session"}
          </p>
        </div>
      </div>
    </GlassCard>

    {/* Status grid */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        {
          label: "YouTube Channels",
          value: youtubeAccounts.length,
          icon: Youtube,
          color: "text-red-400",
          action: "integrations",
        },
        {
          label: "LinkedIn Accounts",
          value: linkedinAccounts.length,
          icon: Linkedin,
          color: "text-blue-400",
          action: "integrations",
        },
        {
          label: "Helper Status",
          value: helperStatus.available ? "Online" : "Offline",
          icon: Server,
          color: helperStatus.available ? "text-emerald-400" : "text-amber-400",
          action: "helper",
        },
        {
          label: "Active Tasks",
          value: (taskCounts.running || 0) + (taskCounts.queued || 0),
          icon: Download,
          color: "text-occium-gold",
          action: "tasks",
        },
      ].map(({ label, value, icon: Icon, color, action }) => (
        <button
          key={label}
          onClick={() => setActiveTab(action)}
          className="text-left p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group"
        >
          <Icon size={20} className={`${color} mb-3`} />
          <div className="text-2xl font-light text-white">{value}</div>
          <div className="text-white/40 text-xs mt-1">{label}</div>
          <ChevronRight
            size={14}
            className="text-white/20 group-hover:text-white/50 transition-colors mt-2"
          />
        </button>
      ))}
    </div>

    {/* Pipeline diagram  */}
    <GlassCard>
      <h3 className="text-white font-medium mb-4 flex items-center gap-2">
        <Globe size={16} className="text-occium-gold" /> $0 Pipeline Architecture
      </h3>
      <div className="space-y-3">
        {[
          {
            step: "1",
            title: "Connect YouTube via Google OAuth",
            desc: "Popup flow — no server token storage. Token lives in browser localStorage.",
            status: youtubeAccounts.length > 0 ? "done" : "pending",
          },
          {
            step: "2",
            title: "Paste source URL → local Python helper fetches metadata",
            desc: "yt-dlp scrapes title, thumbnail, duration. No API key consumed.",
            status: helperStatus.available ? "done" : "pending",
          },
          {
            step: "3",
            title: "Download + upload via Google Data API v3",
            desc: "Helper downloads mp4 locally, re-uploads to your channel with your OAuth token. Zero extra cost.",
            status: "info",
          },
          {
            step: "4",
            title: "Schedule via YouTube's publishAt field",
            desc: "Pick a date — YouTube holds and publishes it. No cron, no server, no cost.",
            status: "info",
          },
        ].map(({ step, title, desc, status }) => (
          <div key={step} className="flex gap-4">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                status === "done"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : status === "pending"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {status === "done" ? "✓" : step}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{title}</p>
              <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>

    {/* Danger zone */}
    <GlassCard>
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
        <h4 className="text-red-400 font-medium mb-2">Danger Zone</h4>
        <button
          onClick={() => {
            if (window.confirm("Clear ALL local data (accounts, posts, settings)? This cannot be undone.")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="text-white/60 hover:text-red-400 text-sm transition-colors flex items-center gap-2"
        >
          <Trash2 size={14} /> Reset Workspace
        </button>
      </div>
    </GlassCard>
  </div>
);

/* ═══════════════════════════════════════════
   API Keys Tab
═══════════════════════════════════════════ */
const ApiKeysTab = ({ showKeys, toggleKey }) => {
  const envStatus = {
    googleClientId: Boolean(appEnv.googleClientId),
    youtubeApiKey: Boolean(appEnv.youtubeApiKey),
    linkedinClientId: Boolean(appEnv.linkedinClientId),
    helperUrl: Boolean(appEnv.localHelperUrl),
  };

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex items-start gap-4 p-4 rounded-xl border border-amber-400/20 bg-amber-500/5 mb-6">
          <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-100 text-sm font-medium">Environment-Driven Configuration</p>
            <p className="text-white/50 text-xs mt-1 leading-relaxed">
              API keys and OAuth credentials are set as environment variables during deployment.
              Frontend keys are set in Vercel (build-time), and backend secrets (client secrets) are set in Render (runtime).
              Keys shown below reflect what was baked into this build.
            </p>
          </div>
        </div>

        <SectionHeader
          icon={ShieldCheck}
          title="Vercel Environment (Frontend)"
          subtitle="These values are read-only and set via Vercel environment variables at build time."
        />

        <div className="space-y-5">
          <ApiKeyInput
            label="Google OAuth Client ID"
            name="googleClientId"
            value={appEnv.googleClientId || ""}
            show={showKeys.googleClientId}
            onToggle={() => toggleKey("googleClientId")}
            readOnly
            hint="REACT_APP_GOOGLE_CLIENT_ID — Used for the YouTube connect popup."
            configured={envStatus.googleClientId}
          />
          <ApiKeyInput
            label="YouTube Data API v3 Key"
            name="youtubeApiKey"
            value={appEnv.youtubeApiKey || ""}
            show={showKeys.youtubeApiKey}
            onToggle={() => toggleKey("youtubeApiKey")}
            readOnly
            hint="REACT_APP_YOUTUBE_API_KEY — Metadata fallback for view counts, thumbnails. Uploads use OAuth token directly."
            configured={envStatus.youtubeApiKey}
          />
          <ApiKeyInput
            label="LinkedIn Client ID"
            name="linkedinClientId"
            value={appEnv.linkedinClientId || ""}
            show={showKeys.linkedinClientId}
            onToggle={() => toggleKey("linkedinClientId")}
            readOnly
            hint="REACT_APP_LINKEDIN_CLIENT_ID — Used to initiate LinkedIn OAuth flow from the frontend."
            configured={envStatus.linkedinClientId}
          />
          <ApiKeyInput
            label="Helper URL"
            name="helperUrl"
            value={appEnv.localHelperUrl || ""}
            show={true}
            onToggle={() => {}}
            readOnly
            hint="REACT_APP_LOCAL_HELPER_URL — Render helper endpoint for uploads, token exchange, and LinkedIn posting."
            configured={envStatus.helperUrl}
          />
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader
          icon={Server}
          title="Render Environment (Backend)"
          subtitle="These secrets live on the Render helper and cannot be viewed from the frontend."
        />
        <div className="space-y-4">
          {[
            { label: "GOOGLE_CLIENT_ID", desc: "Google OAuth client ID (must match Vercel value)" },
            { label: "GOOGLE_CLIENT_SECRET", desc: "Google OAuth client secret for token exchange" },
            { label: "LINKEDIN_CLIENT_ID", desc: "LinkedIn app client ID (must match Vercel value)" },
            { label: "LINKEDIN_CLIENT_SECRET", desc: "LinkedIn app client secret for token exchange" },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-start gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <Key size={14} className="text-white/20 mt-0.5 shrink-0" />
              <div>
                <code className="text-white/70 text-xs font-mono">{label}</code>
                <p className="text-white/35 text-xs mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-white/25 text-xs mt-4 leading-relaxed">
          Set these in your Render service dashboard under Environment. They are never exposed to the browser.
        </p>
      </GlassCard>
    </div>
  );
};

/* ═══════════════════════════════════════════
   Integrations Tab
═══════════════════════════════════════════ */
const IntegrationsTab = ({ youtubeAccounts, linkedinAccounts, settings }) => {
  const integrations = [
    {
      id: "youtube",
      name: "YouTube",
      icon: Youtube,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      description:
        "Upload, schedule, and manage videos. Uses Google OAuth — no API key needed for uploads.",
      accounts: youtubeAccounts,
      setupSteps: [
        "Create a Google Cloud project at console.cloud.google.com",
        "Enable YouTube Data API v3",
        "Create OAuth 2.0 credentials (Web application type)",
        "Add your domain to Authorized JavaScript Origins",
        "Set REACT_APP_GOOGLE_CLIENT_ID in your .env file",
      ],
      cost: "$0 — Uploads use your OAuth token directly",
      status: youtubeAccounts.length > 0 ? "connected" : "disconnected",
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: Linkedin,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      description:
        "Post text and image content to LinkedIn. Requires a LinkedIn Developer App and OAuth flow.",
      accounts: linkedinAccounts,
      setupSteps: [
        "Go to developer.linkedin.com and create an app",
        "Default setup: add 'Sign In with LinkedIn' and 'Share on LinkedIn'",
        "If your app is OIDC-based instead, set REACT_APP_LINKEDIN_OAUTH_MODE=oidc in Vercel",
        "Set REACT_APP_LINKEDIN_CLIENT_ID in Vercel",
        "Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in Render",
        "Connect your live profile from the Accounts page",
      ],
      cost: "$0 — LinkedIn API is free for personal use (rate limits apply)",
      status: linkedinAccounts.length > 0 ? "connected" : "disconnected",
    },
    {
      id: "gemini",
      name: "Google Gemini",
      icon: Sparkles,
      color: "text-occium-gold",
      bgColor: "bg-occium-gold/10",
      borderColor: "border-occium-gold/20",
      description:
        "Powers AI Studio ghostwriting and thumbnail prompt generation. Gemini Flash is extremely cheap — effectively $0 for personal use.",
      accounts: [],
      setupSteps: [
        "Go to aistudio.google.com",
        "Generate an API key (free, no credit card needed initially)",
        "Paste key into API Keys tab under Gemini API Key",
        "AI Studio will use this for real LLM generation instead of templates",
      ],
      cost: `${settings.geminiApiKey ? "✓ Key configured" : "Key not set — using static templates"}`,
      status: settings.geminiApiKey ? "connected" : "disconnected",
    },
  ];

  return (
    <div className="space-y-5">
      {integrations.map((integration) => (
        <IntegrationCard key={integration.id} integration={integration} />
      ))}

      {/* Roadmap */}
      <GlassCard>
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Clock size={16} className="text-white/40" /> Future Integrations (Roadmap)
        </h3>
        <div className="space-y-2">
          {[
            { name: "Twitter / X", note: "Requires API v2 Basic tier ($100/mo) — not $0" },
            { name: "Instagram", note: "Requires Meta Business account — complex approval process" },
            { name: "Notion / Google Docs", note: "Content calendar sync — planned, free" },
            { name: "RSS feed scheduler", note: "Auto-pull from YouTube RSS, no API key needed" },
          ].map(({ name, note }) => (
            <div
              key={name}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
            >
              <Clock size={14} className="text-white/20 mt-0.5 shrink-0" />
              <div>
                <span className="text-white/60 text-sm font-medium">{name}</span>
                <span className="text-white/30 text-xs block mt-0.5">{note}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

const IntegrationCard = ({ integration }) => {
  const [expanded, setExpanded] = useState(false);
  const { icon: Icon, color, bgColor, borderColor } = integration;
  const isConnected = integration.status === "connected";

  return (
    <GlassCard>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${bgColor} border ${borderColor} shrink-0`}>
          <Icon size={22} className={color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-white font-medium">{integration.name}</h3>
              <p className="text-white/40 text-sm mt-0.5">{integration.description}</p>
            </div>
            <StatusBadge connected={isConnected} />
          </div>

          {integration.accounts.length > 0 && (
            <div className="mt-3 space-y-2">
              {integration.accounts.map((acc) => (
                <div
                  key={acc._id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10"
                >
                  {acc.profile_picture ? (
                    <img
                      src={acc.profile_picture}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                      <Icon size={14} className={color} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{acc.account_name}</p>
                    <p className="text-white/30 text-xs">
                      {acc.connection_mode === "google" ? "Google OAuth" : acc.connection_mode}
                      {acc.channel_id ? ` · ${acc.channel_id}` : ""}
                    </p>
                  </div>
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <p className="text-white/25 text-xs">{integration.cost}</p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-white/40 hover:text-white text-xs flex items-center gap-1 transition-colors"
            >
              Setup guide
              <ChevronRight
                size={12}
                className={`transition-transform ${expanded ? "rotate-90" : ""}`}
              />
            </button>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 rounded-xl bg-black/30 border border-white/10 space-y-2">
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-3">
                    Setup Steps
                  </p>
                  {integration.setupSteps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-white/20 text-xs w-5 text-right shrink-0">
                        {i + 1}.
                      </span>
                      <p className="text-white/60 text-sm">{step}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </GlassCard>
  );
};

/* ═══════════════════════════════════════════
   Local Helper Tab
═══════════════════════════════════════════ */
const HelperTab = ({
  helperStatus,
  helperLoading,
  helperCheckedAt,
  refreshHelperStatus,
  testingHelper,
  testHelperUrl,
}) => (
  <div className="space-y-6">
    <GlassCard>
      <SectionHeader icon={Server} title="Render Helper" subtitle="Cloud engine for yt-dlp inspection, YouTube uploads, LinkedIn posting, and LinkedIn scheduling." />

      {/* Status */}
      <div
        className={`flex items-start gap-4 p-4 rounded-xl border ${
          helperStatus.available
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-amber-400/20 bg-amber-500/5"
        }`}
      >
        {helperStatus.available ? (
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className="text-white font-medium text-sm">
            {helperStatus.available ? "Render engine is online" : "Render engine is offline"}
          </p>
          {helperStatus.available && helperStatus.ytDlp && (
            <p className="text-white/50 text-xs mt-1">
              yt-dlp {helperStatus.ytDlp.version} · Python {helperStatus.pythonVersion}
            </p>
          )}
          {helperCheckedAt && (
            <p className="text-white/25 text-xs mt-1">
              Last checked: {new Date(helperCheckedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={refreshHelperStatus}
          disabled={helperLoading}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <RefreshCw size={14} className={`text-white ${helperLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

    </GlassCard>

    <GlassCard>
      <h3 className="text-white font-medium mb-4 flex items-center gap-2">
        <Terminal size={16} className="text-white/40" /> Deployment Contract
      </h3>
      <div className="space-y-3">
        <div className="p-3 bg-black/40 rounded-xl border border-white/10">
          <p className="text-white/40 text-xs mb-1 uppercase tracking-wide">Vercel</p>
          <code className="text-white text-sm font-mono">REACT_APP_LOCAL_HELPER_URL={appEnv.localHelperUrl}</code>
        </div>
        <div className="p-3 bg-black/40 rounded-xl border border-white/10">
          <p className="text-white/40 text-xs mb-1 uppercase tracking-wide">Render</p>
          <code className="text-white/80 text-xs font-mono block leading-relaxed">
            LINKEDIN_CLIENT_ID=&lt;linkedin client id&gt;<br />
            LINKEDIN_CLIENT_SECRET=&lt;linkedin client secret&gt;
          </code>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <p className="text-white/50 text-xs uppercase tracking-widest mb-3">Helper API Endpoints</p>
        {[
          { method: "GET", path: "/health", desc: "Status check — returns yt-dlp version" },
          { method: "POST", path: "/api/youtube/source", desc: "Inspect any video, playlist or channel URL" },
          { method: "POST", path: "/api/youtube/metadata", desc: "Single video metadata extraction" },
          { method: "POST", path: "/api/youtube/upload", desc: "Download via yt-dlp → upload to YouTube" },
        ].map(({ method, path, desc }) => (
          <div key={path} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <span
              className={`text-xs font-bold font-mono shrink-0 mt-0.5 ${
                method === "GET" ? "text-emerald-400" : "text-blue-400"
              }`}
            >
              {method}
            </span>
            <div>
              <code className="text-white/80 text-xs font-mono">{path}</code>
              <p className="text-white/35 text-xs mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  </div>
);

/* ═══════════════════════════════════════════
   Download Tasks Tab
═══════════════════════════════════════════ */
const TasksTab = ({ tasks, onClear, onRemove }) => {
  const grouped = {
    running: tasks.filter((t) => t.status === "running"),
    queued: tasks.filter((t) => t.status === "queued"),
    completed: tasks.filter((t) => t.status === "completed"),
    failed: tasks.filter((t) => t.status === "failed"),
  };

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <SectionHeader
            icon={Download}
            title="Download & Upload Tasks"
            subtitle="Active and completed video import jobs initiated from the Composer."
          />
          {tasks.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-2 text-white/40 hover:text-red-400 text-sm transition-colors shrink-0"
            >
              <Trash2 size={14} /> Clear all
            </button>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-16 text-white/20">
            <Download size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No tasks yet. Start an import from the Composer.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Running first */}
            {[...grouped.running, ...grouped.queued, ...grouped.failed, ...grouped.completed].map(
              (task) => (
                <TaskRow key={task.id} task={task} onRemove={onRemove} />
              )
            )}
          </div>
        )}
      </GlassCard>

      {/* Stats */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Running", count: grouped.running.length, color: "text-blue-400" },
            { label: "Queued", count: grouped.queued.length, color: "text-amber-400" },
            { label: "Completed", count: grouped.completed.length, color: "text-emerald-400" },
            { label: "Failed", count: grouped.failed.length, color: "text-red-400" },
          ].map(({ label, count, color }) => (
            <div
              key={label}
              className="p-4 rounded-xl bg-white/5 border border-white/10 text-center"
            >
              <div className={`text-2xl font-light ${color}`}>{count}</div>
              <div className="text-white/40 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TaskRow = ({ task, onRemove }) => {
  const statusMeta = {
    queued: { icon: Clock, color: "text-amber-400", label: "Queued" },
    running: { icon: Loader2, color: "text-blue-400", label: "Uploading..." },
    completed: { icon: CheckCircle2, color: "text-emerald-400", label: "Done" },
    failed: { icon: XCircle, color: "text-red-400", label: "Failed" },
  }[task.status] || { icon: Clock, color: "text-white/40", label: task.status };

  const { icon: StatusIcon, color, label } = statusMeta;

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
        task.status === "running"
          ? "border-blue-400/20 bg-blue-500/5"
          : task.status === "failed"
          ? "border-red-400/15 bg-red-500/5"
          : task.status === "completed"
          ? "border-emerald-400/15 bg-emerald-500/5"
          : "border-white/10 bg-white/5"
      }`}
    >
      <StatusIcon
        size={18}
        className={`${color} shrink-0 mt-0.5 ${task.status === "running" ? "animate-spin" : ""}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{task.title}</p>
        <div className="flex flex-wrap gap-3 mt-1">
          <span className={`text-xs font-medium ${color}`}>{label}</span>
          {task.accountName && (
            <span className="text-white/30 text-xs">→ {task.accountName}</span>
          )}
          {task.kind === "bulk" && (
            <span className="text-white/30 text-xs">Bulk import</span>
          )}
        </div>

        {task.status === "running" && (
          <div className="mt-3 space-y-1">
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${task.progress || 10}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="text-white/30 text-xs">{task.progress || 0}% complete</p>
          </div>
        )}

        {task.status === "completed" && task.videoUrl && (
          <a
            href={task.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-occium-gold text-xs mt-1 inline-flex items-center gap-1 hover:underline"
          >
            View on YouTube <ChevronRight size={10} />
          </a>
        )}

        {task.status === "failed" && task.errorMessage && (
          <p className="text-red-400/60 text-xs mt-1 truncate">{task.errorMessage}</p>
        )}

        {task.completedAt && (
          <p className="text-white/20 text-xs mt-1">
            {new Date(task.completedAt).toLocaleString()}
          </p>
        )}
      </div>

      {(task.status === "completed" || task.status === "failed") && (
        <button
          onClick={() => onRemove(task.id)}
          className="text-white/20 hover:text-white/60 transition-colors shrink-0 mt-0.5"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Shared sub-components
───────────────────────────────────────────── */
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
    <div className="p-3 bg-occium-gold/20 rounded-xl text-occium-gold shrink-0">
      <Icon size={20} />
    </div>
    <div>
      <h2 className="text-lg font-medium text-white">{title}</h2>
      {subtitle && <p className="text-white/50 text-sm mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const StatusBadge = ({ connected }) => (
  <span
    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border shrink-0 ${
      connected
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
        : "border-white/10 bg-white/5 text-white/40"
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-white/30"}`} />
    {connected ? "Connected" : "Not set up"}
  </span>
);

const ApiKeyInput = ({
  label,
  name,
  value,
  onChange,
  show,
  onToggle,
  placeholder = "••••••••••••",
  hint,
  readOnly,
  configured,
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-white/60 text-xs font-medium uppercase tracking-wide">{label}</label>
      {configured !== undefined && (
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          configured
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-white/5 text-white/30 border border-white/10"
        }`}>
          {configured ? "Set" : "Not set"}
        </span>
      )}
    </div>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
        <Key size={16} />
      </div>
      <input
        type={show ? "text" : "password"}
        name={name}
        value={value || (configured === false ? "" : "")}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full glass-input rounded-xl pl-11 pr-12 py-3.5 font-mono text-sm ${
          readOnly ? "opacity-50 cursor-not-allowed" : ""
        }`}
        placeholder={configured === false ? "(not configured)" : placeholder}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
    {hint && <p className="text-white/30 text-xs leading-relaxed">{hint}</p>}
  </div>
);

export default Settings;
