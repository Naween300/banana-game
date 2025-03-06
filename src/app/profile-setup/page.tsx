"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import axios from "axios";

export default function ProfileSetup() {
  const { user } = useUser(); // Fetch the logged-in user's data
  const [name, setName] = useState(""); // State to store the user's preferred gaming name
  const [avatar, setAvatar] = useState(""); // State to store the current avatar URL
  const router = useRouter();

  // Fetch a random avatar on mount
  useEffect(() => {
    fetchRandomAvatar();
  }, []);

  // Function to fetch a random avatar
  const fetchRandomAvatar = async () => {
    try {
      const response = await axios.get("https://api.dicebear.com/7.x/pixel-art/svg?seed=" + Math.random());
      const avatarUrl = `data:image/svg+xml;utf8,${encodeURIComponent(response.data)}`;
      setAvatar(avatarUrl);
    } catch (error) {
      console.error("Error fetching avatar:", error);
    }
  };

  // Handle avatar change
  const changeAvatar = () => {
    fetchRandomAvatar();
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!name.trim()) {
      alert("Please enter your name!");
      return;
    }

    // Redirect to lobby page with user details
    router.push(`/lobby?name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-yellow-500 to-orange-500 p-4">
      <h1 className="text-4xl font-bold text-white mb-6">Profile Setup</h1>
      <div className="flex flex-col items-center gap-4">
        {/* Avatar Selection */}
        <div className="relative">
          {avatar ? (
            <img
              src={avatar}
              alt="Selected Avatar"
              className="w-24 h-24 rounded-full border-4 border-white cursor-pointer"
              onClick={changeAvatar}
            />
          ) : (
            <p>Loading Avatar...</p>
          )}
          <p className="text-sm text-white mt-2">Tap to change!</p>
        </div>

        {/* Name Input */}
        <input
          type="text"
          placeholder="Enter Your Gaming Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-full transition-all"
        >
          Join
        </button>
      </div>
    </div>
  );
}
