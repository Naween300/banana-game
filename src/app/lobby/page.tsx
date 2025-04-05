"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ClipboardIcon } from "@heroicons/react/24/outline";

type Player = {
  username: string;
  avatar: string;
  ready?: boolean;
};

export default function LobbyPage() {
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [lobbyCode, setLobbyCode] = useState<string>("");
  const [qrCode, setQrCode] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const username = searchParams.get("name") || "New User";
  const avatar = searchParams.get("avatar") || "https://example.com/default-avatar.png";
  const joinCode = searchParams.get("code");

  useEffect(() => {
    // Create WebSocket connection
    const newSocket = new WebSocket("ws://localhost:8080");
    setSocket(newSocket);

    newSocket.onopen = () => {
      console.log("Connected to WebSocket server");
      setIsConnecting(false);
      
      // If we have a code in URL, join that lobby
      if (joinCode) {
        newSocket.send(
          JSON.stringify({
            type: "join_lobby",
            lobbyCode: joinCode,
            username,
            avatar,
          })
        );
      } else {
        // Otherwise create a new lobby
        newSocket.send(
          JSON.stringify({
            type: "create_lobby",
            username,
            avatar,
          })
        );
      }
    };

    newSocket.onmessage = (event) => {
      console.log("Message from server:", event.data);
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "lobby_created":
  setLobbyCode(data.lobbyCode);
  setQrCode(data.qrCode);
  setIsAdmin(true); // Explicitly set to true for lobby creator
  console.log("Set isAdmin to true for lobby creator");
  break;

        
        case "joined_lobby":
          setLobbyCode(data.lobbyCode);
          setIsAdmin(data.isAdmin);
          break;
          
        case "lobby_update":
          setPlayers(data.players);
          setAdminUsername(data.adminUsername);
          break;
          
          case "game_started":
  console.log("Game started with code:", data.lobbyCode);
  router.push(`/game?code=${data.lobbyCode}&name=${encodeURIComponent(username)}&avatar=${encodeURIComponent(avatar)}`);
  break;

          
          
        case "error":
          alert(data.message);
          break;
      }
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionError(true);
      setIsConnecting(false);
    };

    newSocket.onclose = () => {
      console.log("Connection closed");
      if (isConnecting) {
        setConnectionError(true);
      }
      setIsConnecting(false);
    };

    return () => {
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
    };
  }, [username, avatar, router, joinCode]);

  const handleStartGame = () => {
    if (!isAdmin || !socket) return;
    
    socket.send(
      JSON.stringify({
        type: "start_game",
        lobbyCode,
      })
    );
  };

  const copyShareableLink = () => {
    // Create a direct link to join the specific lobby
    const link = `${window.location.origin}/join?code=${lobbyCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  console.log("isAdmin state:", isAdmin);


  // Loading screen while connecting
  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-800 to-black">
        <h1 className="text-4xl font-bold text-white mb-12">Connecting to Game</h1>
        <div className="animate-spin mb-8">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 3L4 14H12L11 21L20 10H12L13 3Z" fill="#FFD700" />
          </svg>
        </div>
        <p className="text-yellow-300 text-xl">Setting up your game...</p>
      </div>
    );
  }

  // Error screen if connection failed
  if (connectionError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-red-800 to-black">
        <h1 className="text-4xl font-bold text-white mb-6">Connection Error</h1>
        <p className="text-white mb-8 text-center max-w-md">
          Unable to connect to the game server. Please check your connection and try again.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-full transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Main lobby content
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-600 to-pink-500 p-4">
      <h1 className="text-4xl font-bold text-white mb-6">Banana Puzzle Game</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Left side: Join options */}
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 shadow-lg">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white">Join Options</h2>
          </div>
          
          {lobbyCode && (
            <>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Scan to join</h3>
                <div className="bg-white p-4 rounded-lg inline-block mx-auto">
                  {qrCode ? (
                    <img src={qrCode} alt="QR Code" className="w-40 h-40" />
                  ) : (
                    <QRCodeSVG value={`${window.location.origin}/join?code=${lobbyCode}`} size={160} />

                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Join by Pin</h3>
                <div className="text-center">
                  <p className="text-gray-200 mb-2">Go to bananapuzzle.app</p>
                  <p className="text-5xl font-bold text-yellow-300">{lobbyCode}</p>
                </div>
              </div>
              
              <button
                onClick={copyShareableLink}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full transition-all flex items-center justify-center"
              >
                <ClipboardIcon className="w-5 h-5 mr-2" />
                {copied ? "Copied!" : "Copy Shareable Link"}
              </button>
            </>
          )}
        </div>
        
        {/* Right side: Players */}
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 shadow-lg">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white">{players.length} / 10 Players</h2>
            <p className="text-gray-200">
              {players.length === 0 
                ? "Waiting for players!" 
                : `Game hosted by ${adminUsername}`}
            </p>
          </div>
          
          {/* Players list */}
          <div className="space-y-2 mb-6">
            {players.length === 0 ? (
              <p className="text-gray-300 text-center">No players in lobby yet</p>
            ) : (
              players.map((player, index) => (
                <div key={index} className="flex items-center gap-4 bg-white/20 p-3 rounded-md">
                  <img src={player.avatar} alt={player.username} className="w-10 h-10 rounded-full" />
                  <p className="text-lg font-bold text-white">{player.username}</p>
                  {player.username === adminUsername && (
                    <span className="ml-auto text-yellow-300">Host</span>
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Start button (only for admin) */}
          {isAdmin && (
            <button
              onClick={handleStartGame}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold rounded-full transition-all"
              disabled={players.length < 1}
            >
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
