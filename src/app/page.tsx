"use client";

import { SignInButton, SignUpButton, useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const { isSignedIn } = useAuth();
  const { user } = useUser(); // Get current user details
  const [lobbyUsers, setLobbyUsers] = useState<string[]>([]); // State for lobby users

  // Simulate fetching all logged-in users (replace this with actual API call if needed)
  useEffect(() => {
    if (isSignedIn && user) {
      setLobbyUsers((prev) => [...new Set([...prev, user.firstName || "Player"])]);
    }
  }, [isSignedIn, user]);

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
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-xl text-yellow-300 font-bold">Lobby</h2>
            <ul className="text-gray-300">
              {lobbyUsers.map((name, index) => (
                <li key={index} className="my-2">
                  {name}
                </li>
              ))}
            </ul>
          </div>

          <Link href="/game">
            <button className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-full transition-all">
              Start Game
            </button>
          </Link>
        </>
      )}
    </div>
  );
}
