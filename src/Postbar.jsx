import React, { useEffect, useState } from "react";
import axios from "axios";
import CreatePostModal from "./CreatePostModal";
import ApplyJobModal from "./components/jobs/ApplyJobModal";

function Postbar() {
  const [posts, setPosts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const fetchPosts = async () => {
    try {
      const response = await axios.get("http://localhost:5010/api/posts");
      setPosts(response.data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePostCreated = () => {
    fetchPosts(); // Refresh posts after creating a new one
  };

  const handleApplyClick = (post) => {
    setSelectedJob(post);
    setIsApplyModalOpen(true);
  };

  const handleApplySuccess = () => {
    fetchPosts(); // Refresh posts after applying
    setIsApplyModalOpen(false);
    setSelectedJob(null);
  };

  const getPostTypeBadge = (postType) => {
    if (postType === 'job') {
      return <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full">Job Opportunity</span>;
    } else {
      return <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full">Experience</span>;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'OPEN': { color: 'bg-green-500', icon: '🟢', text: 'Open' },
      'ASSIGNED': { color: 'bg-yellow-500', icon: '🟡', text: 'Assigned' },
      'PROOF_SUBMITTED': { color: 'bg-blue-500', icon: '🔵', text: 'In Review' },
      'COMPLETED': { color: 'bg-purple-500', icon: '✅', text: 'Completed' },
      'DISPUTED': { color: 'bg-red-500', icon: '⚠️', text: 'Disputed' },
      'CANCELLED': { color: 'bg-gray-500', icon: '❌', text: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig['OPEN'];
    return (
      <span className={`${config.color} text-white text-xs px-3 py-1 rounded-full`}>
        {config.icon} {config.text}
      </span>
    );
  };

  return (
    <div className="postbar w-2/5">
      {/* Create Post Button */}
      <div className="flex gap-3 justify-center items-center mb-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          📝 Share Professional Experience
        </button>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostCreated={handlePostCreated}
        userType="freelancer"
      />

      {/* Apply Job Modal */}
      {selectedJob && (
        <ApplyJobModal
          isOpen={isApplyModalOpen}
          onClose={() => {
            setIsApplyModalOpen(false);
            setSelectedJob(null);
          }}
          job={selectedJob}
          onSuccess={handleApplySuccess}
        />
      )}

      {/* Posts List */}
      {posts.length > 0 ? (
        posts.map((post) => (
          <div key={post._id} className="pb-5 mt-8 rounded-xl shadow-md bg-white">
            <div className="Profile flex gap-4 items-center p-4">
              {/* Profile Photo */}
              {post.userId?.profilePhoto ? (
                <img
                  src={`http://localhost:5010/${post.userId.profilePhoto}`}
                  alt="Profile"
                  className="rounded-full w-12 h-12 object-cover"
                />
              ) : (
                <div className="rounded-full w-12 h-12 bg-purple-400 flex items-center justify-center text-white font-bold">
                  {post.userType === "client" ? "C" : "F"}
                </div>
              )}
              <div className="flex-1">
                <p className="font-bold text-lg">
                  {post.userId?.firstName && post.userId?.lastName
                    ? `${post.userId.firstName} ${post.userId.lastName}`
                    : post.userType === "client" ? "Client" : "Freelancer"}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>
              {/* Post Type Badge */}
              {getPostTypeBadge(post.postType)}
            </div>

            <div className="posts p-5">
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-xl">{post.title}</p>
                {post.status && getStatusBadge(post.status)}
              </div>

              {/* SRT Amount Display for Jobs */}
              {post.postType === 'job' && post.srtAmount && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg mb-3 border-2 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">💰</span>
                      <div>
                        <p className="text-xs text-gray-600">Payment</p>
                        <p className="text-xl font-bold text-purple-700">{post.srtAmount} SRT</p>
                      </div>
                    </div>
                    {post.deadline && (
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Deadline</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {new Date(post.deadline * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-gray-700">{post.content}</p>
              {post.image && (
                <img
                  src={`http://localhost:5010/${post.image}`}
                  alt={post.title}
                  className="w-full h-auto mt-4 rounded-lg"
                />
              )}
            </div>

            <div className="bottom flex justify-around items-center gap-5 px-5">
              {post.postType === 'job' ? (
                (!post.status || post.status === 'OPEN') ? (
                  <button
                    onClick={() => handleApplyClick(post)}
                    className="bg-gradient-to-r from-purple-600 to-purple-500 font-semibold p-3 px-8 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    🚀 Apply for this Job
                  </button>
                ) : (
                  <button
                    disabled
                    className="bg-gray-400 font-semibold p-3 px-8 text-white rounded-xl cursor-not-allowed opacity-60"
                  >
                    {post.status === 'ASSIGNED' ? '✓ Already Assigned' : '✓ Not Available'}
                  </button>
                )
              ) : (
                <button className="bg-purple-500 font-semibold p-3 px-8 text-white rounded-xl hover:bg-purple-700 transition-all ease">
                  View Details
                </button>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-10 text-gray-500">
          <p className="text-lg">No posts available yet</p>
          <p className="text-sm mt-2">Be the first to share your experience!</p>
        </div>
      )}
    </div>
  );
}

export default Postbar;
