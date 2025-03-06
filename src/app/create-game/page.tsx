"use client";

import { useRouter } from "next/navigation";

export default function CreateGame() {
  const router = useRouter();

  const handleIndividualGame = () => {
    // Redirect to the individual game page
    router.push("/game");
  };

  const handleCreateRoom = () => {
    // Redirect to the Profile Setup page
    router.push("/profile-setup");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-yellow-500 to-orange-500 p-4">
      <h1 className="text-4xl font-bold text-white mb-6">Create Game</h1>
      <p className="text-lg text-gray-200 mb-8">Choose how you want to play:</p>

      <div className="flex flex-col gap-4">
        {/* Button for individual game */}
        <button
          onClick={handleIndividualGame}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full transition-all"
        >
          Start Individual Game
        </button>

        {/* Button for creating a game room */}
        <button
          onClick={handleCreateRoom}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-all"
        >
          Create Game Room
        </button>
      </div>
    </div>
  );
}
