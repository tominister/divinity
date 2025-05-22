'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';

type GameState = 'idle' | 'countdown' | 'playing' | 'ended';
type Role = 'Goddess' | 'servant';

interface HighScore {
  name: string;
  score: number;
  role: Role;
}

export default function GridGame() {
  const [litSquares, setLitSquares] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [consecutiveClicks, setConsecutiveClicks] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [multiplierAnimation, setMultiplierAnimation] = useState<'increase' | 'reset' | null>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [timeLeft, setTimeLeft] = useState(15);
  const [countdown, setCountdown] = useState(3);
  const [playerName, setPlayerName] = useState('');
  const [candidateName, setCandidateName] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('servant');
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [isReady, setIsReady] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [challengerSolvers, setChallengerSolvers] = useState<string[]>([]);
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle name input validation
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 10);
    setPlayerName(value);
    setIsReady(false); // Reset ready state when name changes
  };

  const handleReady = () => {
    if (playerName) {
      setCandidateName(playerName);
      setIsReady(true);
    }
  };

  // Function to get a random square that isn't in the excluded list
  const getRandomUnlitSquare = (excludedSquares: number[]): number => {
    const availableSquares = [...Array(9)]
      .map((_, i) => i)
      .filter(i => !excludedSquares.includes(i));
    return availableSquares[Math.floor(Math.random() * availableSquares.length)];
  };

  const handleInaccuracy = () => {
    if (gameState === 'playing') {
      setConsecutiveClicks(0);
      setMultiplier(1);
      setMultiplierAnimation('reset');
    }
  };

  // Initialize three random lit squares
  useEffect(() => {
    if (gameState === 'playing') {
      const initialLit: number[] = [];
      while (initialLit.length < 3) {
        const newSquare = getRandomUnlitSquare(initialLit);
        initialLit.push(newSquare);
      }
      setLitSquares(initialLit);
    }
  }, [gameState]);

  // Handle countdown
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    if (gameState === 'countdown' && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (gameState === 'countdown' && countdown === 0) {
      setGameState('playing');
    }
    return () => clearInterval(countdownInterval);
  }, [gameState, countdown]);

  // Handle game timer
  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    if (gameState === 'playing' && timeLeft > 0) {
      timerInterval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (gameState === 'playing' && timeLeft === 0) {
      setGameState('ended');
    }
    return () => clearInterval(timerInterval);
  }, [gameState, timeLeft]);

  // Handle multiplier animation
  useEffect(() => {
    if (multiplierAnimation) {
      const timer = setTimeout(() => {
        setMultiplierAnimation(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [multiplierAnimation]);

  // Handle global click for inaccuracies
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (gameState === 'playing' && gridRef.current && !gridRef.current.contains(event.target as Node)) {
        handleInaccuracy();
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [gameState, handleInaccuracy]);

  const startGame = () => {
    if (!isReady || !candidateName) return; // Don't start if not ready or no candidate name
    setScore(0);
    setConsecutiveClicks(0);
    setMultiplier(1);
    setTimeLeft(15);
    setCountdown(3);
    setGameState('countdown');
  };

  const handleSquareClick = (clickedIndex: number, event: React.MouseEvent) => {
    if (gameState !== 'playing') return;
    
    event.stopPropagation();
    
    if (litSquares.includes(clickedIndex)) {
      const newConsecutiveClicks = consecutiveClicks + 1;
      setConsecutiveClicks(newConsecutiveClicks);
      
      const newMultiplier = Math.floor(newConsecutiveClicks / 3) + 1;
      if (newMultiplier > multiplier) {
        setMultiplier(newMultiplier);
        setMultiplierAnimation('increase');
      }
      
      setScore(prev => prev + newMultiplier);
      
      const newLitSquares = litSquares.filter(square => square !== clickedIndex);
      const newSquare = getRandomUnlitSquare([...newLitSquares, clickedIndex]);
      setLitSquares([...newLitSquares, newSquare]);
    } else {
      handleInaccuracy();
    }
  };

  // Update high scores when game ends
  useEffect(() => {
    if (gameState === 'ended' && candidateName) {
      setHighScores(prev => {
        // Create a map of existing scores by name and role
        const scoreMap = new Map<string, HighScore>();
        
        // Add all existing scores to the map, keeping only the highest score for each name+role
        prev.forEach(score => {
          const key = `${score.name}-${score.role}`;
          const existing = scoreMap.get(key);
          if (!existing || score.score > existing.score) {
            scoreMap.set(key, score);
          }
        });

        // Add or update the current player's score
        const currentKey = `${candidateName}-${role}`;
        const currentScore = { name: candidateName, score, role };
        const existingScore = scoreMap.get(currentKey);
        if (!existingScore || score > existingScore.score) {
          scoreMap.set(currentKey, currentScore);
        }

        // Convert map back to array and separate by role
        const allScores = Array.from(scoreMap.values());
        
        const roleScores = allScores
          .filter(score => score.role === role)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        const otherRoleScores = allScores
          .filter(score => score.role !== role)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        return [...roleScores, ...otherRoleScores];
      });
    }
  }, [gameState, score, candidateName, role]);

  // Handle click outside popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowPopup(false);
      }
    };

    if (showPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopup]);

  const handleAimClick = () => {
    if (isReady && candidateName) {
      setShowPopup(true);
      // Only add to solvers if not already in the list
      if (!challengerSolvers.includes(candidateName)) {
        setChallengerSolvers(prev => [...prev, candidateName]);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-8">
      {/* Game Title */}
      <h1 className="text-5xl font-bold text-black mb-12">
        <span 
          className={`cursor-pointer ${
            isReady && candidateName 
              ? 'cursor-pointer' 
              : 'cursor-not-allowed'
          }`}
          onClick={handleAimClick}
        >
          AIM
        </span>
        {' '}FOR DIVINITY
      </h1>

      {/* Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            ref={popupRef}
            className="bg-white p-8 rounded-lg shadow-xl relative max-w-md w-full mx-4"
          >
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-black">CONGRATS!</h2>
              <p className="text-xl text-black">I see you fellow Decrypter :)</p>
            </div>
          </div>
        </div>
      )}

      {/* Left side - Name and Role selection */}
      <div className="absolute left-8 top-32 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-black">Player Name</label>
          <input
            type="text"
            value={playerName}
            onChange={handleNameChange}
            placeholder="Enter name (max 10 letters)"
            className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500"
            maxLength={10}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-black">Select Role</label>
          <div className="space-y-1">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="Goddess"
                checked={role === 'Goddess'}
                onChange={(e) => {
                  setRole(e.target.value as Role);
                  setIsReady(false);
                }}
                className="form-radio text-blue-500"
              />
              <span className="text-black">Goddess</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="servant"
                checked={role === 'servant'}
                onChange={(e) => {
                  setRole(e.target.value as Role);
                  setIsReady(false);
                }}
                className="form-radio text-blue-500"
              />
              <span className="text-black">servant</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleReady}
          disabled={!playerName}
          className={`w-48 px-4 py-2 rounded-md text-white font-medium transition-colors ${
            !playerName 
              ? 'bg-gray-400 cursor-not-allowed' 
              : isReady 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isReady ? 'Ready!' : 'Ready'}
        </button>

        {/* Rules and Challenges Box */}
        <div className="bg-white p-4 rounded-lg shadow-md w-80 space-y-2">
          <h3 className="text-lg font-bold text-black mb-1">Rules:</h3>
          <ul className="list-disc pl-4 space-y-1.5 text-sm text-black">
            <li>Since Goddesses are inherently above servants, they are placed above regardless of how high a servant scores.</li>
            <li>The multiplier increases by 1 with every 3 lit blocks clicked in a row. This is how many points get added to your score for each lit block clicked.</li>
            <li>If you fail to click a lit block, that is an inaccuracy and will reset the multiplier to 1.</li>
            <li>There may still be things unexplained, but just try the game, develop strategy, and simply have fun.</li>
          </ul>

          <h3 className="text-lg font-bold text-black mt-3 mb-1">Challenges:</h3>
          <ul className="list-disc pl-4 space-y-1.5 text-sm text-black">
            <li>The top servant should beg the top Goddess for a dm. No matter how demonic you are at fps you&apos;re best place compared to her is a personal footrest while she games.</li>
            <li>FOR L: find the secret button by solving this → <span className="font-mono">svefg pyvpx Ernql, gura pyvpx gur grkg gung fnlf NVZ</span></li>
          </ul>
        </div>
      </div>

      {/* Right side - High Scores and Challenger Solvers */}
      <div className="absolute right-8 top-32 space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-md w-64">
          <h3 className="text-lg font-bold text-black mb-2">Goddess High Scores</h3>
          <div className="space-y-1">
            {highScores
              .filter(score => score.role === 'Goddess')
              .slice(0, 3)
              .map((score, index) => (
                <div key={index} className="flex justify-between text-sm text-black">
                  <span>{score.name}</span>
                  <span>{score.score}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md w-64">
          <h3 className="text-lg font-bold text-black mb-2">servant High Scores</h3>
          <div className="space-y-1">
            {highScores
              .filter(score => score.role === 'servant')
              .slice(0, 3)
              .map((score, index) => (
                <div key={index} className="flex justify-between text-sm text-black">
                  <span>{score.name}</span>
                  <span>{score.score}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md w-64">
          <h3 className="text-lg font-bold text-black mb-2">Challenger Solvers</h3>
          <div className="space-y-1">
            {challengerSolvers.map((name, index) => (
              <div key={index} className="text-sm text-black">
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main game content */}
      <div className="flex flex-col items-center">
        {/* Header section with score, multiplier, and time */}
        <div className="w-full max-w-5xl px-16 flex justify-between items-center mb-8">
          <div className="flex items-center gap-4 px-8">
            <span className="text-3xl font-bold text-black">Score:</span>
            <span className="text-3xl font-bold text-black">{score}</span>
          </div>
          
          <div className="flex items-center gap-4 px-8">
            <span className="text-3xl font-bold text-black">Multiplier:</span>
            <div 
              className={`text-3xl font-bold transition-all duration-300 ${
                multiplierAnimation === 'increase' 
                  ? 'text-green-500 scale-110' 
                  : multiplierAnimation === 'reset'
                  ? 'text-red-500 scale-90'
                  : 'text-black'
              }`}
            >
              x{multiplier}
            </div>
          </div>
          
          <div className="flex items-center gap-4 px-8">
            <span className="text-3xl font-bold text-black">Time:</span>
            <span className="text-3xl font-bold text-black">{timeLeft}s</span>
          </div>
        </div>
        <div className="relative">
          <div 
            ref={gridRef}
            className="relative bg-white p-4 rounded-lg shadow-lg"
            onClick={handleInaccuracy}
          >
            <div className="grid grid-cols-3 gap-4">
              {[...Array(9)].map((_, index) => (
                <div
                  key={index}
                  onClick={(e) => handleSquareClick(index, e)}
                  className={`w-32 h-32 rounded-lg transition-all duration-300 cursor-pointer ${
                    litSquares.includes(index)
                      ? 'bg-yellow-400 hover:bg-yellow-500 shadow-lg scale-105'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Overlay for start button and countdown */}
          {(gameState === 'idle' || gameState === 'ended' || gameState === 'countdown') && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-75 rounded-lg">
              <div className="text-center">
                {gameState === 'countdown' ? (
                  <div className="text-8xl font-bold text-gray-800 animate-bounce">
                    {countdown}
                  </div>
                ) : (
                  <button
                    onClick={startGame}
                    disabled={!isReady}
                    className={`px-8 py-4 text-4xl font-bold text-white rounded-lg transition-colors ${
                      !isReady 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {gameState === 'ended' ? 'Play Again' : 'Start Game'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 