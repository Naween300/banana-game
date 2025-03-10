"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchBananaPuzzle } from "@/services/bananaApi";

type Player = {
  username: string;
  avatar: string;
  points?: number;
};

type PuzzleData = {
  question: "https://marcconrad.com/uob/banana/api.php";
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
  const searchParams = useSearchParams();
  const username = searchParams.get("name") || "Player";
  const lobbyCode = searchParams.get("code");

  // Generate 4 options with one being the correct answer
  const generateOptions = (solution: number): number[] => {
    const options = [solution];
    while (options.length < 4) {
      const randomOption = Math.floor(Math.random() * 10);
      if (!options.includes(randomOption)) {
        options.push(randomOption);
      }
    }
    return options.sort(() => Math.random() - 0.5); // Shuffle options
  };

  const [options, setOptions] = useState<number[]>([]);

  // Load a new puzzle
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

  // Handle answer selection
  const handleAnswerSelect = (answer: number) => {
    if (selectedAnswer !== null || timeLeft <= 0 || !puzzle) return;
    
    setSelectedAnswer(answer);
    const correct = answer === puzzle.solution;
    setIsCorrect(correct);
    
    if (correct) {
      // Calculate points based on time left (faster = more points)
      const points = Math.max(5, timeLeft) * 10;
      setScore(prevScore => prevScore + points);
      
      // Send score update to server
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "update_points",
          username,
          lobbyCode,
          points: score + points
        }));
      }
    }
    
    // Load next puzzle after delay
    setTimeout(() => {
      setRound(prevRound => prevRound + 1);
      loadPuzzle();
    }, 2000);
  };

  // WebSocket connection
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const newSocket = new WebSocket("ws://localhost:8080");
    setSocket(newSocket);

    newSocket.onopen = () => {
      console.log("Connected to game server");
    };

    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "leaderboard_update" || data.type === "update_lobby") {
          if (Array.isArray(data.players)) {
            const formattedPlayers = data.players.map((player: Player) => ({
              username: player.username || "Unknown",
              avatar: player.avatar || "https://example.com/default-avatar.png",
              points: typeof player.points === 'number' ? player.points : 0
            }));
            
            // Sort players by points (highest first)
            formattedPlayers.sort((a: Player, b: Player) => (b.points || 0) - (a.points || 0));

            setPlayers(formattedPlayers);
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    };

    return () => {
      if (newSocket) newSocket.close();
    };
  }, []);

  // Load initial puzzle
  useEffect(() => {
    loadPuzzle();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (loading || selectedAnswer !== null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setSelectedAnswer(-1); // Timeout
          
          // Load next puzzle after delay
          setTimeout(() => {
            setRound(prevRound => prevRound + 1);
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
                          ? `Time's up! The correct answer was ${puzzle?.solution ?? 'unknown'}`
                          : `Wrong! The correct answer was ${puzzle?.solution ?? 'unknown'}`
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      
    </div>
  );
}
