"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function SignUpGuestPage() {
  const searchParams = useSearchParams();
  const encodedRedirect = searchParams.get("redirect") || "";
  const code = searchParams.get("code");
  
  // Simplify the redirect handling
  let finalRedirectUrl = encodedRedirect 
    ? decodeURIComponent(encodedRedirect)
    : "/";
    
  // Make sure the code parameter is included
  if (code && !finalRedirectUrl.includes('code=')) {
    finalRedirectUrl += (finalRedirectUrl.includes('?') ? '&' : '?') + `code=${code}`;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-purple-600 to-pink-500">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-6">Join the Game</h1>
        <p className="text-white mb-6">Sign in or sign up to join the game.</p>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <SignIn 
            path="/sign-up-guest" 
            routing="path" 
            fallbackRedirectUrl={finalRedirectUrl}
            // Add this to override the env variable
            forceRedirectUrl={finalRedirectUrl}
            appearance={{
              elements: {
                rootBox: "mx-auto w-full min-h-[300px]",
                card: "w-full",
                formButtonPrimary: "bg-purple-600 hover:bg-purple-700"
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
