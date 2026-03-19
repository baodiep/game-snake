'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useGameLoop } from '@/hooks/useGameLoop';
import { Direction, GameState, generateFood } from '@/lib/engine/gameLogic';
import { Trophy, Play, RotateCcw, User, MapPin, Clock, Grip, Gamepad2 } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';

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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showDPad, setShowDPad] = useState(false);
  const lastTapRef = React.useRef(0);

  const { gameState, setDirection, resetGame, pauseGame, resumeGame } = useGameLoop(initialGameState, INITIAL_TICK_RATE);

  const swipeHandlers = useSwipeable({
    onSwipedUp: () => { if (screen === 'PLAYING' && !gameState.isPaused) setDirection(Direction.UP); },
    onSwipedDown: () => { if (screen === 'PLAYING' && !gameState.isPaused) setDirection(Direction.DOWN); },
    onSwipedLeft: () => { if (screen === 'PLAYING' && !gameState.isPaused) setDirection(Direction.LEFT); },
    onSwipedRight: () => { if (screen === 'PLAYING' && !gameState.isPaused) setDirection(Direction.RIGHT); },
    onTap: () => {
      const now = Date.now();
      if (now - lastTapRef.current < 300) { 
        if (screen === 'PLAYING') {
          // Ignore toggles during countdown
          if (countdown === null) {
            if (gameState.isPaused) setCountdown(3);
            else pauseGame();
          }
        }
      }
      lastTapRef.current = now;
    },
    preventScrollOnSwipe: true,
    trackMouse: false
  });

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
    if (gameState.score <= 0 || gameState.totalTime <= 10000) return;
    
    try {
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            name: playerName || 'Anonymous', 
            score: gameState.score,
            duration: gameState.totalTime,
            stats: gameState.stats
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
      <div className={cn("relative w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 lg:p-10 shadow-2xl focus-within:ring-2 focus-within:ring-white transition-all duration-300", screen === 'PLAYING' ? "max-w-2xl lg:max-w-4xl" : "max-w-lg")}>
        
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

              {/* D-Pad Pre-Toggle */}
              <button 
                onClick={() => setShowDPad(!showDPad)}
                className={cn(
                  "w-full flex justify-between items-center bg-white/5 border rounded-2xl py-3 px-4 transition-all group mt-2",
                  showDPad ? "border-blue-500/50 bg-blue-500/10" : "border-white/10 hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <Gamepad2 className={cn("w-5 h-5 transition-colors", showDPad ? "text-blue-400" : "text-white/40")} />
                  <span className="font-medium text-sm text-white/80">Hiện phím ảo (Nút D-Pad)</span>
                </div>
                <div className={cn("w-10 h-6 flex items-center rounded-full px-1 transition-colors", showDPad ? "bg-blue-500" : "bg-white/20")}>
                  <div className={cn("w-4 h-4 rounded-full bg-white transition-transform", showDPad ? "translate-x-4" : "translate-x-0")} />
                </div>
              </button>

              <button
                onClick={startGame}
                disabled={!playerName.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2 group mt-4 lg:mt-6"
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
          <div className="flex flex-col lg:flex-row w-full items-center justify-center gap-6 lg:gap-8 outline-none select-none">
            {/* Control Panel (Header & D-Pad) */}
            <div className="flex flex-col w-full max-w-sm gap-4 order-2 lg:order-1 transition-all duration-300">
              <div className="flex justify-between lg:flex-col lg:gap-4 w-full bg-white/5 p-4 rounded-xl lg:rounded-2xl border border-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse hidden lg:block" />
                      <User className="w-4 h-4 text-blue-400 lg:hidden" />
                      <span className="font-bold text-base lg:text-lg uppercase tracking-widest truncate">{playerName}</span>
                  </div>
                  <div className="flex gap-2 lg:flex-col lg:w-full">
                    <div className="flex gap-2">
                      <div className="bg-black/20 px-3 py-2 rounded-xl flex items-center justify-center gap-2 flex-1 border border-white/5">
                          <Clock className="w-4 h-4 text-blue-300" />
                          <span className="font-bold text-sm tabular-nums">{formatTime(gameState.totalTime)}</span>
                      </div>
                      <div className="bg-black/20 px-3 py-2 rounded-xl flex items-center justify-center gap-2 flex-1 border border-white/5">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span className="font-bold text-sm">{gameState.score}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full mt-2 lg:mt-0">
                      <button 
                        onClick={togglePause}
                        disabled={countdown !== null}
                        className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl border border-white/10 transition-all flex-1 justify-center items-center flex disabled:opacity-50"
                        title="Tạm dừng / Tiếp tục"
                      >
                        <span className="hidden lg:block text-xs font-bold mr-2">PAUSE</span>
                        <RotateCcw className={cn("w-4 h-4 text-white/70", gameState.isPaused ? "" : "animate-[spin_4s_linear_infinite] opacity-50")} />
                      </button>
                      <button 
                        onClick={() => setShowDPad(!showDPad)}
                        className={cn(
                          "p-2.5 rounded-xl border shadow-lg transition-all flex-1 justify-center items-center flex",
                          showDPad ? "bg-blue-500/30 border-blue-500/50 text-blue-300" : "bg-white/10 hover:bg-white/20 border-white/10 text-white/50"
                        )}
                        title="Bật / Tắt phím ảo D-Pad"
                      >
                        <span className="hidden lg:block text-xs font-bold mr-2">D-PAD</span>
                        <Gamepad2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
              </div>

              {/* D-Pad Layout */}
              {showDPad && (
                <div className="grid grid-cols-3 grid-rows-3 gap-2 w-52 mx-auto touch-none opacity-90 p-2">
                  <div />
                  <button onClick={() => { if (!gameState.isPaused) setDirection(Direction.UP) }} className="w-16 h-16 bg-white/10 hover:bg-white/20 active:bg-blue-500/40 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-xl transition-all active:scale-95 shadow-md">⬆️</button>
                  <div />
                  <button onClick={() => { if (!gameState.isPaused) setDirection(Direction.LEFT) }} className="w-16 h-16 bg-white/10 hover:bg-white/20 active:bg-blue-500/40 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-xl transition-all active:scale-95 shadow-md">⬅️</button>
                  <button onClick={() => { if (!gameState.isPaused) setDirection(Direction.DOWN) }} className="w-16 h-16 bg-white/10 hover:bg-white/20 active:bg-blue-500/40 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-xl transition-all active:scale-95 shadow-md">⬇️</button>
                  <button onClick={() => { if (!gameState.isPaused) setDirection(Direction.RIGHT) }} className="w-16 h-16 bg-white/10 hover:bg-white/20 active:bg-blue-500/40 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-xl transition-all active:scale-95 shadow-md">➡️</button>
                </div>
              )}

              <p className="hidden md:block text-center text-white/30 text-[10px] font-medium uppercase tracking-[0.2em] mt-4">
                Sử dụng phím mũi tên hoặc <br /> <b>Vuốt màn hình</b> để di chuyển <br /> Chạm đúp (hoặc Phím Space) để Tạm dừng
              </p>
            </div>

            {/* Game Board */}
            <div 
              {...swipeHandlers}
              className={cn(
                "relative transition-all duration-300 touch-none flex-shrink-0 order-1 lg:order-2 w-full",
                showDPad ? "max-w-xs sm:max-w-sm lg:max-w-md" : "max-w-md sm:max-w-lg lg:max-w-xl"
              )}
            >
              <div 
                className="relative grid gap-px border-[6px] border-[#0a0f1d] rounded-2xl bg-white/10 border-b-blue-900 border-r-blue-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
                style={{ 
                  gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                  width: '100%',
                  aspectRatio: '1/1'
                }}
              >
                {/* Paused Overlay */}
                {(gameState.isPaused || countdown !== null) && (
                  <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="border-4 border-white/20 p-8 rounded-full w-56 h-56 flex flex-col items-center justify-center gap-2 shadow-[0_0_50px_rgba(59,130,246,0.3)] bg-blue-600/10">
                      {countdown !== null ? (
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                            {countdown === 0 ? 'GO!' : countdown}
                          </span>
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">Chuẩn bị...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-center">
                          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mb-1">
                             <Play className="w-5 h-5 fill-white text-white" />
                          </div>
                          <h3 className="text-2xl font-black tracking-tighter text-white drop-shadow-md">ĐÃ TẠM DỪNG</h3>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Chạm / Space để tiếp tục</p>
                          <div className="scale-75 origin-top mt-1"><StatsDisplay stats={gameState.stats} /></div>
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
                        "w-full h-full rounded-sm transition-all duration-150",
                        isSnake && !isHead && "bg-blue-400/80 shadow-[0_0_8px_rgba(96,165,250,0.6)]",
                        isHead && "bg-blue-300 scale-125 z-10 shadow-[0_0_15px_rgba(147,197,253,1)] rounded-md",
                        isFood && "bg-red-500 animate-[bounce_1s_infinite] rounded-full scale-75 shadow-[0_0_20px_rgba(239,68,68,0.8)]"
                      )}
                    />
                  );
                })}
              </div>
            </div>
            
            <p className="md:hidden text-center text-white/20 text-[10px] mt-2 uppercase tracking-[0.2em]">
              Vuốt màn hình để di chuyển<br/>Chạm đúp để Tạm dừng
            </p>
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
                                    <React.Fragment key={idx}>
                                        <tr 
                                            className="cursor-pointer border-t border-white/5 hover:bg-white/5 transition-colors group"
                                            onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                                        >
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
                                        {expandedIndex === idx && (
                                            <tr className="bg-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <td colSpan={4} className="px-6 py-4">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm bg-black/20 p-4 rounded-xl">
                                                        <div className="flex items-center gap-2 text-xs font-mono text-white/50 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                                            <MapPin className="w-3 h-3 text-blue-400" /> IP: {entry.ip || 'Local/Unknown'}
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="text-[10px] text-green-400/70 font-bold uppercase tracking-widest">&lt; 3s</span>
                                                                <span className="font-black text-green-400">{entry.fast || 0}</span>
                                                            </div>
                                                            <div className="w-px bg-white/10" />
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="text-[10px] text-yellow-400/70 font-bold uppercase tracking-widest">3 - 5s</span>
                                                                <span className="font-black text-yellow-400">{entry.medium || 0}</span>
                                                            </div>
                                                            <div className="w-px bg-white/10" />
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="text-[10px] text-red-400/70 font-bold uppercase tracking-widest">&gt; 5s</span>
                                                                <span className="font-black text-red-400">{entry.slow || 0}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
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
