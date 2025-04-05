"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import axios from "axios";

export default function ProfileSetup() {
  const { user } = useUser(); // Fetch the logged-in user's data
  const [name, setName] = useState(user?.firstName || ""); // State to store the user's preferred gaming name
  const [avatar, setAvatar] = useState(""); // State to store the current avatar URL
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const lobbyCode = searchParams.get("code");

  // Fetch a random avatar on mount
  useEffect(() => {
    fetchRandomAvatar();
  }, []);

  // Function to fetch a random avatar
  const fetchRandomAvatar = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("https://api.dicebear.com/7.x/pixel-art/svg?seed=" + Math.random());
      const avatarUrl = `data:image/svg+xml;utf8,${encodeURIComponent(response.data)}`;
      setAvatar(avatarUrl);
    } catch (error) {
      console.error("Error fetching avatar:", error);
      // Provide a fallback avatar in case of error
      setAvatar("https://api.dicebear.com/7.x/pixel-art/svg");
    } finally {
      setIsLoading(false);
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

    // Construct the URL with all necessary parameters
    let redirectUrl = `/lobby?name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`;
    
    // Add code parameter if it exists to ensure user joins the correct lobby
    if (lobbyCode) {
      redirectUrl += `&code=${lobbyCode}`;
    }
    
    router.push(redirectUrl);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-yellow-500 to-orange-500 p-4">
      <h1 className="text-4xl font-bold text-white mb-6">Profile Setup</h1>
      
      {/* Show lobby code info if joining an existing game */}
      {lobbyCode && (
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4 mb-6">
          <p className="text-white text-center">Joining game with code: <span className="font-bold">{lobbyCode}</span></p>
        </div>
      )}
      
      <div className="flex flex-col items-center gap-4 bg-white/20 backdrop-blur-lg rounded-xl p-8 w-full max-w-md">
        {/* Avatar Selection */}
        <div className="relative">
          {isLoading ? (
            <div className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center bg-gray-200">
              <div className="animate-spin w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <img
              src={avatar}
              alt="Selected Avatar"
              className="w-24 h-24 rounded-full border-4 border-white cursor-pointer"
              onClick={changeAvatar}
            />
          )}
          <p className="text-sm text-white mt-2 text-center">Tap to change!</p>
        </div>

        {/* Name Input */}
        <input
          type="text"
          placeholder="Enter Your Gaming Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-center"
        />

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-full transition-all"
          disabled={isLoading}
        >
          {lobbyCode ? "Join Game" : "Create Game"}
        </button>
      </div>
    </div>
  );
}
