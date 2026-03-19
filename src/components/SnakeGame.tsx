'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useGameLoop } from '@/hooks/useGameLoop';
import { Direction, GameState, generateFood } from '@/lib/engine/gameLogic';
import { Trophy, Play, RotateCcw, User, MapPin, Clock } from 'lucide-react';

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const StatsDisplay = ({ stats }: { stats: GameState['stats'] }) => (
  <div className="grid grid-cols-3 gap-3 w-full max-w-xs mt-4">
    <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-xl text-center">
      <p className="text-[10px] text-green-400 font-bold uppercase tracking-tighter">{"< 3s"}</p>
      <p className="text-xl font-black text-green-400">{stats.fast}</p>
    </div>
    <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-xl text-center">
      <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-tighter">3 - 5s</p>
      <p className="text-xl font-black text-yellow-400">{stats.medium}</p>
    </div>
    <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-xl text-center">
      <p className="text-[10px] text-red-400 font-bold uppercase tracking-tighter">{"> 5s"}</p>
      <p className="text-xl font-black text-red-400">{stats.slow}</p>
    </div>
  </div>
);
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const GRID_SIZE = 20;
const INITIAL_TICK_RATE = 150;

const initialGameState: GameState = {
  snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
  food: { x: 5, y: 5 },
  direction: Direction.UP,
  isGameOver: false,
  isPaused: false,
  score: 0,
  totalTime: 0,
  lastFoodSpawnTime: 0,
  stats: {
    fast: 0,
    medium: 0,
    slow: 0,
  },
  gridSize: { width: GRID_SIZE, height: GRID_SIZE },
};

type Screen = 'START' | 'PLAYING' | 'GAMEOVER' | 'LEADERBOARD';

export default function SnakeGame() {
  const [screen, setScreen] = useState<Screen>('START');
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  const { gameState, setDirection, resetGame, pauseGame, resumeGame } = useGameLoop(initialGameState, INITIAL_TICK_RATE);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'PLAYING') return;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setDirection(Direction.UP);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setDirection(Direction.DOWN);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setDirection(Direction.LEFT);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setDirection(Direction.RIGHT);
          break;
        case ' ': // Space key
          e.preventDefault(); // Prevent page scroll
          togglePause();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, setDirection, gameState.isPaused, countdown]); // Added countdown to deps

  const togglePause = useCallback(() => {
    if (countdown !== null) return; // Ignore toggles during countdown

    if (gameState.isPaused) {
      // Start countdown to resume
      setCountdown(3);
    } else {
      // Pause immediately
      pauseGame();
    }
  }, [gameState.isPaused, pauseGame, countdown]);

  // Countdown handler
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished
      resumeGame();
      setCountdown(null);
    }
  }, [countdown, resumeGame]);

  // Handle Game Over
  useEffect(() => {
    if (gameState.isGameOver && screen === 'PLAYING') {
      setScreen('GAMEOVER');
      saveScore();
    }
  }, [gameState.isGameOver, screen]);

  const saveScore = async () => {
    try {
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            name: playerName || 'Anonymous', 
            score: gameState.score,
            duration: gameState.totalTime
        }),
      });
    } catch (err) {
      console.error('Failed to save score:', err);
    }
  };

  const fetchLeaderboard = async () => {
    setScreen('LEADERBOARD');
    try {
      const resp = await fetch('/api/leaderboard');
      const data = await resp.json();
      if (Array.isArray(data)) {
        setLeaderboard(data);
      } else {
        setLeaderboard([]);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setLeaderboard([]);
    }
  };

  const startGame = () => {
    if (!playerName.trim()) return;
    const freshState = {
      ...initialGameState,
      food: generateFood(initialGameState.snake, GRID_SIZE, GRID_SIZE),
    };
    resetGame(freshState);
    setScreen('PLAYING');
  };

  const restartGame = () => {
    const freshState = {
      ...initialGameState,
      food: generateFood(initialGameState.snake, GRID_SIZE, GRID_SIZE),
    };
    resetGame(freshState);
    setScreen('PLAYING');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white p-4">
      {/* Container with Glassmorphism */}
      <div className="relative w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl overflow-hidden focus-within:ring-2 focus-within:ring-white">
        
        {/* Decorative elements */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 blur-3xl rounded-full" />

        {/* Start Screen */}
        {screen === 'START' && (
          <div className="flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">SNAKE NEON</h1>
            <div className="w-full space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Nhập tên của bạn..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-medium placeholder:text-white/20"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && startGame()}
                />
              </div>
              <button
                onClick={startGame}
                disabled={!playerName.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2 group"
              >
                <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                BẮT ĐẦU CHƠI
              </button>
            </div>
            <button 
                onClick={fetchLeaderboard}
                className="text-white/40 hover:text-white transition-colors flex items-center gap-2 text-sm"
            >
                <Trophy className="w-4 h-4" /> Bảng xếp hạng
            </button>
          </div>
        )}

        {/* Playing Screen */}
        {screen === 'PLAYING' && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex justify-between w-full mb-2">
                <div className="bg-white/5 px-4 py-2 rounded-xl flex items-center gap-3">
                    <User className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-sm">{playerName}</span>
                </div>
                <div className="flex gap-2">
                  <div className="bg-white/5 px-4 py-2 rounded-xl flex items-center gap-3">
                      <Clock className="w-4 h-4 text-blue-300" />
                      <span className="font-bold text-sm tabular-nums">{formatTime(gameState.totalTime)}</span>
                  </div>
                  <div className="bg-white/5 px-4 py-2 rounded-xl flex items-center gap-3">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="font-bold text-sm">{gameState.score}</span>
                  </div>
                  <button 
                    onClick={togglePause}
                    className="bg-white/5 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    {gameState.isPaused ? <Play className="w-4 h-4 text-green-400" /> : <div className="w-4 h-4 flex gap-1 items-center"><div className="w-1 h-3 bg-white" /><div className="w-1 h-3 bg-white" /></div>}
                  </button>
                </div>
            </div>

            {/* Grid */}
            <div 
              className="relative grid gap-px border-4 border-white/10 rounded-xl bg-white/5"
              style={{ 
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                width: '100%',
                aspectRatio: '1/1'
              }}
            >
              {/* Paused Overlay */}
              {(gameState.isPaused || countdown !== null) && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md rounded-xl animate-in fade-in duration-300">
                  <div className="border-4 border-white/20 p-12 rounded-full w-64 h-64 flex flex-col items-center justify-center gap-2 shadow-[0_0_50px_rgba(59,130,246,0.3)] bg-blue-600/10">
                    {countdown !== null ? (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-8xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                          {countdown === 0 ? 'GO!' : countdown}
                        </span>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-2">Chuẩn bị...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-2">
                           <Play className="w-6 h-6 fill-white text-white" />
                        </div>
                        <h3 className="text-3xl font-black tracking-tighter text-white">ĐÃ TẠM DỪNG</h3>
                        <p className="text-sm text-white/50 uppercase tracking-[0.2em] font-medium">Nhấn Space để tiếp tục</p>
                        <StatsDisplay stats={gameState.stats} />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                const x = i % GRID_SIZE;
                const y = Math.floor(i / GRID_SIZE);
                const isSnake = gameState.snake.some(s => s.x === x && s.y === y);
                const isHead = gameState.snake[0].x === x && gameState.snake[0].y === y;
                const isFood = gameState.food.x === x && gameState.food.y === y;

                return (
                  <div 
                    key={i} 
                    className={cn(
                      "w-full h-full rounded-[2px] transition-all duration-150",
                      isSnake && !isHead && "bg-blue-400/60 shadow-[0_0_8px_rgba(96,165,250,0.5)]",
                      isHead && "bg-blue-300 scale-110 z-10 shadow-[0_0_12px_rgba(147,197,253,0.8)]",
                      isFood && "bg-red-400 animate-pulse rounded-full scale-75 shadow-[0_0_15px_rgba(248,113,113,0.6)]"
                    )}
                  />
                );
              })}
            </div>
            
            <p className="text-white/20 text-xs mt-2 uppercase tracking-widest">Sử dụng phím mũi tên hoặc WASD để di chuyển</p>
          </div>
        )}

        {/* Game Over Screen */}
        {screen === 'GAMEOVER' && (
          <div className="flex flex-col items-center gap-8 py-8 animate-in zoom-in-95 duration-500">
            <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
                <h2 className="text-6xl font-black text-white relative">GAME OVER</h2>
            </div>
            <div className="text-center">
              <p className="text-white/40 text-lg">Điểm của bạn</p>
              <p className="text-7xl font-black text-blue-400">{gameState.score}</p>
              <div className="flex justify-center mt-2">
                 <StatsDisplay stats={gameState.stats} />
              </div>
            </div>
            <div className="w-full space-y-3">
              <button
                onClick={restartGame}
                className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
              >
                <RotateCcw className="w-5 h-5" /> CHƠI LẠI
              </button>
              <button
                onClick={fetchLeaderboard}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 border border-white/10 transition-colors"
              >
                <Trophy className="w-5 h-5 text-yellow-500" /> XEM BẢNG XẾP HẠNG
              </button>
            </div>
          </div>
        )}

        {/* Leaderboard Screen */}
        {screen === 'LEADERBOARD' && (
          <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black flex items-center gap-3">
                <Trophy className="text-yellow-500" /> BẢNG XẾP HẠNG
            </h2>
            <div className="w-full bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <div className="max-h-64 overflow-y-auto w-full">
                    {leaderboard.length === 0 ? (
                        <p className="p-8 text-center text-white/20">Chưa có ai ghi điểm...</p>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr className="text-xs uppercase tracking-widest text-white/40">
                                    <th className="px-6 py-4 font-black">Hạng</th>
                                    <th className="px-6 py-4 font-black">Người chơi</th>
                                    <th className="px-6 py-4 font-black text-right">Thời gian</th>
                                    <th className="px-6 py-4 font-black text-right">Điểm</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((entry, idx) => (
                                    <tr key={idx} className="border-t border-white/5 hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                                                idx === 0 && "bg-yellow-500 text-black",
                                                idx === 1 && "bg-slate-400 text-black",
                                                idx === 2 && "bg-orange-600 text-white",
                                                idx > 2 && "text-white/40"
                                            )}>
                                                {idx + 1}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium">{entry.name}</td>
                                        <td className="px-6 py-4 text-right font-mono text-white/40 text-xs">{formatTime(entry.duration)}</td>
                                        <td className="px-6 py-4 text-right font-black text-blue-400">{entry.score}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            <button
              onClick={() => setScreen('START')}
              className="text-white/40 hover:text-white underline underline-offset-4 text-sm font-medium transition-colors"
            >
              Quay lại màn hình chính
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
