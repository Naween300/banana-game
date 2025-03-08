"use client";

import { useEffect, useState } from "react";

type Player = {
  username: string;
  avatar: string;
  points?: number;
};

export default function GamePage() {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "update_lobby") {
          // Type guard to ensure data.players is an array
          if (Array.isArray(data.players)) {
            const formattedPlayers = (data.players as Player[]).map(player => ({
              username: player.username || "Unknown",
              avatar: player.avatar || "https://example.com/default-avatar.png",
              points: typeof player.points === 'number' ? player.points : 0
            }));
            setPlayers(formattedPlayers);
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Main Game Section */}
      <div className="flex-grow bg-gradient-to-b from-yellow-500 to-orange-500 p-8">
        <h1 className="text-4xl font-bold text-white mb-6">Banana Puzzle Game</h1>
        <p className="text-gray-200">Game content will go here.</p>
      </div>

      {/* Leaderboard Section */}
      <div className="w-1/3 bg-white p-6 shadow-lg">
        <h2 className="text-xl font-bold text-purple-800 mb-4">Leaderboard</h2>
        {players.map((player, index) => (
          <div key={`${player.username}-${index}`} className="flex items-center gap-4 mb-4">
            <img 
              src={player.avatar} 
              alt={player.username} 
              className="w-12 h-12 rounded-full border"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://example.com/default-avatar.png";
              }}
            />
            <div>
              <p className="font-bold">{player.username}</p>
              <p>Points: {player.points ?? 0}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
