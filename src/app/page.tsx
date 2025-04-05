"use client";

import { SignInButton, SignUpButton, useAuth } from '@clerk/nextjs';
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isSignedIn } = useAuth(); // Check if the user is signed in
  const router = useRouter();

  // Redirect to profile-setup if the user is signed in
  useEffect(() => {
    if (isSignedIn) {
      router.push("/profile-setup");
    }
  }, [isSignedIn, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 p-4">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold text-yellow-400 mb-4">Banana Puzzle</h1>
        <p className="text-xl text-gray-300 max-w-2xl">Challenge your mind with fun banana-themed puzzles!</p>
      </div>

      {!isSignedIn ? (
        <div className="flex gap-4">
          <SignInButton mode="modal">
            <button className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-full transition-all">
              Sign In
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <button className="px-8 py-3 bg-transparent hover:bg-white/10 border-2 border-yellow-400 text-yellow-400 font-bold rounded-full transition-all">
              Sign Up
            </button>
          </SignUpButton>
        </div>
      ) : null}
    </div>
  );
}
