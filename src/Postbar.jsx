import React, { useEffect, useState } from "react";
import axios from "axios";
import CreatePostModal from "./CreatePostModal";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5010";

function Postbar() {
  const [posts, setPosts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API}/api/posts`);
      setPosts(res.data);
    } catch (e) {
      console.error("Error fetching posts:", e);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const STATUS_CONFIG = {
    OPEN:            { label: "Open",       dot: "bg-white" },
    ASSIGNED:        { label: "Assigned",   dot: "bg-white/60" },
    PROOF_SUBMITTED: { label: "In Review",  dot: "bg-white/80" },
    COMPLETED:       { label: "Completed",  dot: "bg-white" },
    DISPUTED:        { label: "Disputed",   dot: "bg-white/50" },
    CANCELLED:       { label: "Cancelled",  dot: "bg-white/30" },
  };

  return (
    <div className="w-full space-y-4">
      {/* Create Post Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-black dark:bg-white text-white dark:text-black font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
      >
        📝 Share Professional Experience
      </button>

      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostCreated={fetchPosts}
        userType="freelancer"
      />

      {posts.length > 0 ? (
        posts.map((post) => {
          const sc = STATUS_CONFIG[post.status] || STATUS_CONFIG.OPEN;
          return (
            <div key={post._id}
              className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden transition-all hover:shadow-md dark:hover:shadow-none">

              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-white/8">
                {post.userId?.profilePhoto ? (
                  <img
                    src={`${API}/${post.userId.profilePhoto}`}
                    alt="Profile"
                    className="rounded-full w-10 h-10 object-cover shrink-0"
                  />
                ) : (
                  <div className="rounded-full w-10 h-10 bg-gray-900 dark:bg-white/10 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {post.userType === "client" ? "C" : "F"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {post.userId?.firstName && post.userId?.lastName
                      ? `${post.userId.firstName} ${post.userId.lastName}`
                      : post.userType === "client" ? "Client" : "Freelancer"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-white/30">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border
                  ${post.postType === "job"
                    ? "bg-gray-900 dark:bg-white/10 text-white dark:text-white/70 border-gray-700 dark:border-white/15"
                    : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/50 border-gray-200 dark:border-white/10"
                  }`}>
                  {post.postType === "job" ? "Job" : "Experience"}
                </span>
              </div>

              {/* Body */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">{post.title}</h3>
                  {post.status && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/8 border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-white/60 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                  )}
                </div>

                {post.postType === "job" && post.srtAmount && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8 mb-3">
                    <div>
                      <p className="text-xs text-gray-400 dark:text-white/30">Payment</p>
                      <p className="text-lg font-black text-gray-900 dark:text-white">{post.srtAmount} SRT</p>
                    </div>
                    {post.deadline && (
                      <div className="text-right">
                        <p className="text-xs text-gray-400 dark:text-white/30">Deadline</p>
                        <p className="text-sm font-semibold text-gray-700 dark:text-white/70">
                          {new Date(post.deadline * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-gray-600 dark:text-white/60 text-sm leading-relaxed">{post.content}</p>

                {post.image && (
                  <img
                    src={`${API}/${post.image}`}
                    alt={post.title}
                    className="w-full h-auto mt-4 rounded-xl"
                  />
                )}
              </div>

              {/* Footer */}
              {post.postType === "job" && (
                <div className="px-4 pb-4">
                  {(!post.status || post.status === "OPEN") ? (
                    <button className="w-full py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-all">
                      Apply for this Job
                    </button>
                  ) : (
                    <button disabled className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/30 font-semibold text-sm cursor-not-allowed border border-gray-200 dark:border-white/8">
                      {post.status === "ASSIGNED" ? "Already Assigned" : "Not Available"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="text-center py-16 text-gray-400 dark:text-white/30">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-base font-semibold">No posts yet</p>
          <p className="text-sm mt-1">Be the first to share your experience!</p>
        </div>
      )}
    </div>
  );
}

export default Postbar;
