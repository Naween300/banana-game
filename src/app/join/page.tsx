"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function JoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code"); // Extract the game code from the URL
  const { isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return; // Wait for Clerk to load

    if (code) {
      // Skip authentication for guest users with a code
      // Proceed directly to profile setup with the game code
      router.push(`/profile-setup?code=${code}`);
    } else {
      // If no game code is provided, redirect to home
      router.push("/");
    }
  }, [isLoaded, code, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-purple-600 to-pink-500">
      <div className="text-white text-center">
        <h1 className="text-3xl font-bold mb-4">Joining Game...</h1>
        <p>Please wait while we connect you to the game.</p>
      </div>
    </div>
  );
}
