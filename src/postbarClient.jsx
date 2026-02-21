import React, { useEffect, useState } from "react";
import axios from "axios";
import CreatePostModal from "./CreatePostModal";

function PostbarClient() {
  const [posts, setPosts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const getPostTypeBadge = (postType) => {
    if (postType === 'job') {
      return <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full">Job Opportunity</span>;
    } else {
      return <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full">Experience</span>;
    }
  };

  return (
    <div className="postbar w-2/5">
      {/* Create Post Button */}
      <div className="flex gap-3 justify-center items-center mb-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          💼 Post Job Opportunity
        </button>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostCreated={handlePostCreated}
        userType="client"
      />

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
              <p className="font-bold text-xl mb-2">{post.title}</p>
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
              <button className="bg-purple-500 font-semibold p-3 px-8 text-white rounded-xl hover:bg-purple-700 transition-all ease">
                {post.postType === 'job' ? 'Apply' : 'View Details'}
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-10 text-gray-500">
          <p className="text-lg">No posts available yet</p>
          <p className="text-sm mt-2">Be the first to post a job opportunity!</p>
        </div>
      )}
    </div>
  );
}

export default PostbarClient;
