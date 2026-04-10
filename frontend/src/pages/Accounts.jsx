import React, { useState } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { Check, Plus, Trash2, Youtube, Linkedin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAccount } from "../lib/localApp";

const OCCIUM_MARK_SRC = "/branding/occium-mark.webp";

const Accounts = () => {
  const { connectYouTubeAccount, connectLinkedInAccount } = useAuth();
  const { accounts } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);

  const connectLinkedIn = async () => {
    try {
      setIsLoading(true);
      await connectLinkedInAccount();
      toast.success("LinkedIn account linked successfully!");
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to connect LinkedIn");
    } finally {
      setIsLoading(false);
    }
  };

  const connectYouTube = async () => {
    try {
      setIsLoading(true);
      await connectYouTubeAccount();
      toast.success("YouTube channel linked successfully!");
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Could not connect YouTube");
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectAccount = async (id) => {
    if (!window.confirm("Disconnect this account from local engine?")) {
      return;
    }
    try {
      deleteAccount(id);
      toast.success("Account removed");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove account");
    }
  };

  const youtubeAccounts = accounts.filter((account) => account.platform === "youtube");
  const linkedinAccounts = accounts.filter((account) => account.platform === "linkedin");

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-light text-white mb-2 tracking-tight">Connections</h1>
          <p className="text-white/40 font-light">Manage your social accounts connected via the Occium Local Node.</p>
        </div>
        {isLoading && <Loader2 className="animate-spin text-occium-gold" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <GlassCard className="relative group overflow-visible">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Youtube size={120} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-red-600 rounded-2xl text-white shadow-lg shadow-red-900/20">
                <Youtube size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-medium text-white">YouTube</h3>
                <p className="text-white/40">Active YouTube Node</p>
              </div>
            </div>

            <div className="space-y-4 min-h-[120px]">
              {youtubeAccounts.map((account) => (
                <div
                  key={account._id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors group/item"
                >
                  <div className="flex items-center gap-4">
                    {account.profile_picture ? (
                      <img src={account.profile_picture} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                        <img src={OCCIUM_MARK_SRC} alt="" className="w-6 h-6 object-contain opacity-90" />
                      </div>
                    )}
                    <div>
                      <div className="text-white font-medium">{account.account_name}</div>
                      <div className="text-white/30 text-xs flex items-center gap-1">
                        <Check size={10} className="text-occium-gold" /> Managed by Local Node
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => disconnectAccount(account._id)}
                    className="p-2 text-white/20 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors opacity-0 group-hover/item:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              {youtubeAccounts.length === 0 && (
                <div className="p-4 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center py-10 bg-white/[0.01]">
                  <p className="text-white/30 text-xs uppercase tracking-widest mb-6 leading-relaxed">No YouTube placeholders yet</p>
                  <button
                    onClick={connectYouTube}
                    className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-xl shadow-white/5"
                  >
                    <Plus size={18} /> Link Channel
                  </button>
                </div>
              )}
              {youtubeAccounts.length > 0 && (
                <button
                  onClick={connectYouTube}
                  className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-white py-2 transition-colors text-sm border-t border-white/5 pt-4 mt-2"
                >
                  <Plus size={14} /> Add Another Channel
                </button>
              )}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="relative group overflow-visible">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Linkedin size={120} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-900/20">
                <Linkedin size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-medium text-white">LinkedIn</h3>
                <p className="text-white/40">Active LinkedIn Node</p>
              </div>
            </div>

            <div className="space-y-4 min-h-[120px]">
              {linkedinAccounts.map((account) => (
                <div
                  key={account._id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors group/item"
                >
                  <div className="flex items-center gap-4">
                    {account.profile_picture ? (
                      <img src={account.profile_picture} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                        <img src={OCCIUM_MARK_SRC} alt="" className="w-6 h-6 object-contain opacity-90" />
                      </div>
                    )}
                    <div>
                      <div className="text-white font-medium">{account.account_name}</div>
                      <div className="text-white/30 text-xs flex items-center gap-1">
                        <Check size={10} className="text-occium-gold" /> Managed by Local Node
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => disconnectAccount(account._id)}
                    className="p-2 text-white/20 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors opacity-0 group-hover/item:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              {linkedinAccounts.length === 0 && (
                <div className="p-4 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center py-8">
                  <p className="text-white/30 text-sm mb-6">No LinkedIn placeholders yet</p>
                  <button
                    onClick={connectLinkedIn}
                    className="flex items-center justify-center gap-3 bg-occium-gold text-black px-6 py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition-all shadow-xl shadow-occium-gold/10"
                  >
                    <Plus size={18} /> Link Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Accounts;
