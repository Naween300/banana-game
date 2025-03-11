"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchBananaPuzzle } from "@/services/bananaApi";

type Player = {
  username: string;
  avatar: string;
  points?: number;
  rank?: number;
};

type PuzzleData = {
  question: string;
  solution: number;
};

export default function GamePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [myUserId, setMyUserId] = useState<string>(""); // Added to store the player's userId
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const username = searchParams.get("name") || "Player";
  const avatar = searchParams.get("avatar") || "https://example.com/default-avatar.png";
  const lobbyCode = searchParams.get("code");

  // Add redirect if lobby code is missing
  useEffect(() => {
    if (!lobbyCode || !username || !avatar) {
      alert("Missing required parameters! Redirecting to home...");
      router.push("/");
    }
  }, [lobbyCode, username, avatar, router]);

  const generateOptions = (solution: number): number[] => {
    const options = [solution];
    while (options.length < 4) {
      const randomOption = Math.floor(Math.random() * 10);
      if (!options.includes(randomOption)) {
        options.push(randomOption);
      }
    }
    return options.sort(() => Math.random() - 0.5);
  };

  const [options, setOptions] = useState<number[]>([]);
  const loadPuzzle = async () => {
    setLoading(true);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setTimeLeft(15);
    
    try {
      const data = await fetchBananaPuzzle();
      setPuzzle(data);
      setOptions(generateOptions(data.solution));
    } catch (error) {
      console.error("Failed to load puzzle:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: number) => {
    if (selectedAnswer !== null || timeLeft <= 0 || !puzzle || !lobbyCode) return;
    
    setSelectedAnswer(answer);
    const correct = answer === puzzle.solution;
    setIsCorrect(correct);
    
    if (correct) {
      const points = Math.max(5, timeLeft) * 10;
      const newScore = score + points;
      setScore(newScore);
      
      if (socket && socket.readyState === WebSocket.OPEN && myUserId) {
        socket.send(JSON.stringify({
          type: "update_points",
          userId: myUserId, // Use stored userId instead of username
          lobbyCode,
          points: points
        }));
        console.log(`Sent score update with userId: ${myUserId}, points: ${points}`);
      } else {
        console.warn("Cannot send score update: WebSocket not connected or userId not set");
      }
    }
    
    setTimeout(() => {
      setRound(prev => prev + 1);
      loadPuzzle();
    }, 2000);
  };

  // Initialize WebSocket with reconnection logic
  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimer: NodeJS.Timeout | null = null;
    
    function connectWebSocket() {
      setConnectionStatus('connecting');
      console.log("Connecting to WebSocket server...");
      
      const newSocket = new WebSocket("ws://localhost:8080");
      setSocket(newSocket);
    
      newSocket.onopen = () => {
        console.log("WebSocket connection established");
        setConnectionStatus('connected');
        reconnectAttempts = 0;
        
        // Join the game
        if (lobbyCode) {
          newSocket.send(JSON.stringify({
            type: "join_game",
            lobbyCode,
            username,
            avatar
          }));
          console.log(`Sent join_game message for lobby ${lobbyCode}`);
        }
      };
    
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received message:", data);
          
          if (data.type === "joined_game") {
            // Store the userId assigned by the server
            setMyUserId(data.userId);
            console.log(`Received userId from server: ${data.userId}`);
          } else if (data.type === "leaderboard_update") {
            console.log("Updating leaderboard with:", data.leaderboard || []);
            setPlayers(data.leaderboard || []);
          } else if (data.type === "error") {
            console.error("Server error:", data.message);
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      };
      
      newSocket.onclose = (event) => {
        console.log("WebSocket connection closed:", event);
        setConnectionStatus('disconnected');
        
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
          
          // Exponential backoff for reconnection attempts
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
          reconnectTimer = setTimeout(connectWebSocket, delay);
        } else {
          console.error("Max reconnection attempts reached");
        }
      };
      
      newSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    }
    
    connectWebSocket();
    
    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [lobbyCode, username, avatar]);

  // Load initial puzzle
  useEffect(() => {
    loadPuzzle();
  }, []);

  // Timer effect
  useEffect(() => {
    if (loading || selectedAnswer !== null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setSelectedAnswer(-1);
          setTimeout(() => {
            setRound(prev => prev + 1);
            loadPuzzle();
          }, 2000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, selectedAnswer, timeLeft]);
  return (
    <div className="flex min-h-screen">
      {/* Main Game Section */}
      <div className="flex-grow bg-gradient-to-b from-yellow-500 to-orange-500 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold text-white">Banana Puzzle Game</h1>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-lg rounded-full px-4 py-2">
                <span className="text-white font-bold">Round: {round}</span>
              </div>
              <div className="bg-white/20 backdrop-blur-lg rounded-full px-4 py-2">
                <span className="text-white font-bold">Score: {score}</span>
              </div>
              <div className={`rounded-full h-12 w-12 flex items-center justify-center font-bold text-xl ${
                timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-white/20 backdrop-blur-lg'
              }`}>
                {timeLeft}
              </div>
              
              {/* Connection status indicator */}
              <div className={`h-3 w-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`} title={`Status: ${connectionStatus}`} />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="animate-spin mb-4">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 3L4 14H12L11 21L20 10H12L13 3Z" fill="#FFD700" />
                </svg>
              </div>
              <p className="text-white text-xl">Loading puzzle...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xl overflow-hidden">
              <div className="p-4 bg-purple-800 text-white text-center font-bold text-xl">
                Solve the Banana Puzzle
              </div>
              
              {puzzle && (
                <div className="p-6">
                  <div className="mb-6 flex justify-center">
                    <img 
                      src={puzzle.question} 
                      alt="Banana Puzzle" 
                      className="max-w-full rounded-lg border-4 border-yellow-400"
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(option)}
                        disabled={selectedAnswer !== null}
                        className={`p-6 text-2xl font-bold rounded-xl transition-all ${
                          selectedAnswer === null
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transform hover:scale-105'
                            : selectedAnswer === option
                              ? isCorrect
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                              : option === puzzle?.solution && selectedAnswer !== null
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  
                  {selectedAnswer !== null && puzzle && (
                    <div className={`mt-6 p-4 rounded-lg text-center text-white font-bold ${
                      isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {isCorrect 
                        ? `Correct! +${Math.max(5, timeLeft) * 10} points` 
                        : selectedAnswer === -1 
                          ? `Time's up! The correct answer was ${puzzle.solution}`
                          : `Wrong! The correct answer was ${puzzle.solution}`
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Sidebar */}
      <div className="w-96 bg-white/20 backdrop-blur-lg p-6 border-l border-white/30">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <span>🏆</span> Live Leaderboard
        </h2>
        
        {players.length === 0 ? (
          <div className="text-white text-center p-4 bg-white/10 rounded-xl">
            {connectionStatus === 'connected' 
              ? "Waiting for players to join..." 
              : "Connecting to game server..."}
          </div>
        ) : (
          <div className="space-y-4">
            {players.map((player, index) => (
              <div 
                key={player.username || index}
                className={`flex items-center p-4 rounded-xl transition-all duration-300 ${
                  player.username === username
                    ? 'bg-purple-600/30 backdrop-blur-md shadow-lg border-2 border-purple-400'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center flex-1 gap-4">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 font-bold">
                    {player.rank || index + 1}
                  </div>

                  <img
                    src={player.avatar}
                    alt={player.username}
                    className="w-10 h-10 rounded-full border-2 border-yellow-400"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold truncate">{player.username}</span>
                      <span className="font-mono">{player.points || 0} pts</span>
                    </div>
                    
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                        style={{ 
                          width: `${Math.min((player.points || 0) / (players[0]?.points || 1) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
