import React, { useState } from "react";
import axios from "axios";
import { IoCameraOutline } from "react-icons/io5";

function ProfilePhotoUpload({ userId, currentPhoto, onPhotoUpdated }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [preview, setPreview] = useState(currentPhoto);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError("Please select an image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("Image size should be less than 5MB");
            return;
        }

        setError("");
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("profilePhoto", file);

            const response = await axios.post(
                `http://localhost:5010/api/users/${userId}/profile-photo`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            console.log("Profile photo uploaded:", response.data);

            // Update preview
            const photoPath = response.data.user.profilePhoto;
            setPreview(`http://localhost:5010/${photoPath}`);

            // Notify parent component
            if (onPhotoUpdated) {
                onPhotoUpdated(photoPath);
            }
        } catch (error) {
            console.error("Error uploading photo:", error);
            setError(error.response?.data?.message || "Failed to upload photo");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative inline-block">
            <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-gray-200 dark:border-white/20 shadow-lg">
                {preview ? (
                    <img
                        src={preview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-900 dark:bg-white/10 flex items-center justify-center text-white text-4xl font-bold">
                        {userId ? "?" : "U"}
                    </div>
                )}

                {/* Upload overlay */}
                <label
                    htmlFor="profile-photo-input"
                    className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                >
                    <IoCameraOutline className="text-white text-4xl" />
                </label>
            </div>

            <input
                id="profile-photo-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
            />

            {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                    <div className="text-white text-sm">Uploading...</div>
                </div>
            )}

            {error && (
                <div className="mt-2 text-red-500 text-sm text-center">
                    {error}
                </div>
            )}
        </div>
    );
}

export default ProfilePhotoUpload;
