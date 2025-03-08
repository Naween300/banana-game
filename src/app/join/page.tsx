// src/app/join/page.tsx
"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function JoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");

  // In join/page.tsx
useEffect(() => {
    if (code) {
      router.push(`/profile-setup?code=${code}`);
    } else {
      router.push("/");
    }
  }, [code, router]);
  

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-purple-600 to-pink-500">
      <div className="text-white text-center">
        <h1 className="text-3xl font-bold mb-4">Joining Game...</h1>
        <p>Please wait while we connect you to the game.</p>
      </div>
    </div>
  );
}
