"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function JoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code"); 
  const { isLoaded } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return; 

    try {
      if (code) {
        
        router.push(`/profile-setup?code=${code}`);
      } else {
       
        router.push("/");
      }
    } catch (error) {
      console.error("Navigation error:", error);
      setError("Failed to join the game. Please try again.");
    }
  }, [isLoaded, code, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-purple-600 to-pink-500">
      <div className="text-white text-center">
        {error ? (
          <>
            <h1 className="text-3xl font-bold mb-4">Error</h1>
            <p className="mb-4">{error}</p>
            <button 
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-white text-purple-600 rounded-lg font-bold hover:bg-gray-100 transition"
            >
              Return Home
            </button>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-4">Joining Game...</h1>
            <p>Please wait while we connect you to the game.</p>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-white rounded-full border-t-transparent"></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
