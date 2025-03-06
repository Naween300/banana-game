"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const socket = new WebSocket("ws://localhost:8080"); // Connect to WebSocket server

type Player = {
  username: string;
  avatar: string;
};

export default function LobbyPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const searchParams = useSearchParams();
  const username = searchParams.get("name") || "New User";
  const avatar = searchParams.get("avatar") || "https://example.com/default-avatar.png";

  useEffect(() => {
    // Send join message when component mounts
    socket.onopen = () => {
      console.log('Connected to WebSocket server');
      socket.send(
        JSON.stringify({
          type: "join_lobby",
          username,
          avatar,
        })
      );
    };

    // Listen for messages from the server
    socket.onmessage = (event) => {
      console.log('Message from server:', event.data);
      const data = JSON.parse(event.data);

      if (data.type === "update_lobby") {
        setPlayers(data.players); // Update state with the full list of players
      }
    };

    // Handle disconnection
    socket.onclose = () => {
      console.log('Disconnected from WebSocket server');
    };

    // Handle errors
    socket.onerror = (event) => {
      console.log('Error occurred:', event);
    };

    return () => {
      // Do not close the socket here unless necessary
      // socket.close();
    };
  }, [username, avatar]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-yellow-500 to-orange-500 p-4">
      <h1 className="text-xl font-bold text-white mb-6">{players.length} / 10 Players</h1>

      {/* Current User Info */}
      <div className="flex flex-col items-center bg-gradient-to-b from-white to-gray-200 p-6 rounded-lg shadow-md mb-6">
        <img src={avatar} alt="Your Avatar" className="w-24 h-24 rounded-full border-4 border-blue-500 mb-4" />
        <p className="text-xl font-bold text-gray-800">{username}</p>
      </div>

      {/* Players in Lobby */}
      <div className="bg-purple-800 rounded-lg p-4 w-full max-w-md">
        <h2 className="text-xl font-bold text-yellow-300 mb-4 text-center">Players in Lobby</h2>
        {players.length === 0 ? (
          <p className="text-gray-400 text-center">No players in lobby yet</p>
        ) : (
          players.map((player, index) => (
            <div key={index} className="flex items-center gap-4 bg-purple-700 p-3 rounded-md mb-2">
              <img src={player.avatar} alt={player.username} className="w-12 h-12 rounded-full" />
              <p className="text-lg font-bold text-white">{player.username}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
