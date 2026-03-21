import React, { useEffect, useState } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { useAuth } from "../context/AuthContext";
import { DayPicker } from "react-day-picker";
import { format, isSameDay, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Clock, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { deletePost, getPosts } from "../lib/localApp";

const Queue = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (user) {
      setPosts(getPosts(user.id));
    }
  }, [user]);

  const scheduledPosts = posts.filter((post) => post.status === "scheduled" && post.scheduled_at);
  const selectedDatePosts = scheduledPosts.filter((post) => isSameDay(parseISO(post.scheduled_at), selectedDate));

  const modifiers = {
    hasPost: (date) => scheduledPosts.some((post) => isSameDay(parseISO(post.scheduled_at), date)),
  };

  const modifiersStyles = {
    hasPost: {
      fontWeight: "bold",
      textDecoration: "underline",
      color: "#D4AF37",
    },
  };

  const removePost = async (id) => {
    if (!window.confirm("Are you sure?")) {
      return;
    }

    try {
      deletePost(id);
      setPosts((currentPosts) => currentPosts.filter((post) => post._id !== id));
      toast.success("Post deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-8 h-full">
      <h1 className="text-4xl font-medium text-white flex items-center gap-3">
        <CalendarIcon className="text-occium-gold" /> Queue
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
        <div className="lg:col-span-1">
          <GlassCard className="h-full">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="text-white mx-auto"
              footer={<p className="text-center text-white/40 text-sm mt-4">Select a date to view scheduled content</p>}
            />
          </GlassCard>
        </div>

        <div className="lg:col-span-2">
          <GlassCard className="h-full min-h-[500px]">
            <h3 className="text-xl font-medium text-white mb-6">
              Scheduled for {format(selectedDate, "MMMM d, yyyy")}
            </h3>

            <div className="space-y-4">
              {selectedDatePosts.length === 0 ? (
                <div className="text-center py-20 text-white/30">
                  <Clock size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No posts scheduled for this day.</p>
                  <a href="/new" className="text-occium-gold hover:underline mt-2 inline-block">
                    Schedule one now
                  </a>
                </div>
              ) : (
                selectedDatePosts.map((post) => (
                  <div
                    key={post._id}
                    className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-start justify-between group hover:bg-white/10 transition-colors"
                  >
                    <div className="flex gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xs uppercase
                          ${post.platform === "youtube" ? "bg-red-600/20 text-red-500" : "bg-blue-600/20 text-blue-500"}`}
                      >
                        {post.platform.slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-white font-medium line-clamp-1">{post.title || post.description}</h4>
                        <div className="flex items-center gap-3 text-white/40 text-sm mt-1">
                          <span>{format(parseISO(post.scheduled_at), "h:mm a")}</span>
                          <span>&bull;</span>
                          <span className="capitalize">{post.platform}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => removePost(post._id)}
                        className="p-2 hover:bg-red-500/20 rounded-full text-white/60 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Queue;
