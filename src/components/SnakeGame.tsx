'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useSoundEngine } from '@/hooks/useSoundEngine';
import { useParticles } from '@/hooks/useParticles';
import { Direction, GameState, GameEvent, generateFood } from '@/lib/engine/gameLogic';
import {
  Trophy, Play, RotateCcw, User, MapPin, Clock,
  Gamepad2, Loader2, Volume2, VolumeX, Zap, Shield, BookOpen, X,
} from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function generateHash(name: string, score: number, duration: number) {
  const secret = process.env.NEXT_PUBLIC_API_SECRET || 'SNAKE_NEON_SECRET_2026_!@#';
  const data = `${name}-${score}-${duration}-${secret}`;
  const encoder = new TextEncoder();
  const dataParams = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataParams);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---- Rank system ----
function getRank(score: number): { label: string; color: string; bg: string } {
  if (score >= 350) return { label: '💎 Diamond', color: 'text-cyan-300', bg: 'bg-cyan-500/20 border-cyan-400/40' };
  if (score >= 150) return { label: '🥇 Gold',    color: 'text-yellow-300', bg: 'bg-yellow-500/20 border-yellow-400/40' };
  if (score >= 50)  return { label: '🥈 Silver',  color: 'text-slate-300', bg: 'bg-slate-500/20 border-slate-400/40' };
  return               { label: '🥉 Bronze',   color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-400/40' };
}

// ---- Snake color by level ----
function getSnakeColors(level: number) {
  if (level >= 5) return { head: 'bg-red-300 shadow-[0_0_15px_rgba(252,165,165,1)]',   body: 'bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.6)]' };
  if (level >= 4) return { head: 'bg-orange-300 shadow-[0_0_15px_rgba(253,186,116,1)]', body: 'bg-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.6)]' };
  if (level >= 3) return { head: 'bg-yellow-300 shadow-[0_0_15px_rgba(253,224,71,1)]',  body: 'bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.6)]' };
  if (level >= 2) return { head: 'bg-cyan-300 shadow-[0_0_15px_rgba(103,232,249,1)]',   body: 'bg-cyan-500/80 shadow-[0_0_8px_rgba(6,182,212,0.6)]' };
  return               { head: 'bg-blue-300 shadow-[0_0_15px_rgba(147,197,253,1)]',   body: 'bg-blue-400/80 shadow-[0_0_8px_rgba(96,165,250,0.6)]' };
}

// ---- Stats display ----
const StatsDisplay = ({ stats }: { stats: GameState['stats'] }) => (
  <div className="grid grid-cols-3 gap-3 w-full max-w-xs mt-4">
    <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-xl text-center">
      <p className="text-[10px] text-green-400 font-bold uppercase tracking-tighter">{'< 3s'}</p>
      <p className="text-xl font-black text-green-400">{stats.fast}</p>
    </div>
    <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-xl text-center">
      <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-tighter">3 - 5s</p>
      <p className="text-xl font-black text-yellow-400">{stats.medium}</p>
    </div>
    <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-xl text-center">
      <p className="text-[10px] text-red-400 font-bold uppercase tracking-tighter">{'> 5s'}</p>
      <p className="text-xl font-black text-red-400">{stats.slow}</p>
    </div>
  </div>
);

// ---- Achievement toast ----
interface AchievementToast {
  id: number;
  label: string;
}

// ---- Constants ----
const GRID_SIZE = 20;
const BASE_TICK_RATE = 150;

const initialGameState: GameState = {
  snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
  food: { x: 5, y: 5 },
  bonusFood: undefined,
  powerUpItem: undefined,
  activePowerUp: undefined,
  obstacles: [],
  portals: undefined,
  direction: Direction.UP,
  isGameOver: false,
  isPaused: false,
  score: 0,
  totalTime: 0,
  lastFoodSpawnTime: 0,
  lastFoodEatenTime: 0,
  combo: 0,
  maxCombo: 0,
  level: 1,
  foodEatenCount: 0,
  achievements: [],
  stats: { fast: 0, medium: 0, slow: 0 },
  gridSize: { width: GRID_SIZE, height: GRID_SIZE },
  events: [],
};

type Screen = 'START' | 'PLAYING' | 'GAMEOVER' | 'LEADERBOARD';

export default function SnakeGame() {
  const [screen, setScreen] = useState<Screen>('START');
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showDPad, setShowDPad] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [muted, setMuted] = useState(false);
  const [achievementToasts, setAchievementToasts] = useState<AchievementToast[]>([]);
  const [personalBest, setPersonalBest] = useState<number>(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const toastIdRef = useRef(0);
  const lastTapRef = useRef(0);

  const sound = useSoundEngine();
  const { particles, spawnParticles, clearParticles } = useParticles();

  // Load personal best on mount
  useEffect(() => {
    const saved = localStorage.getItem('snake_personal_best');
    if (saved) setPersonalBest(parseInt(saved, 10));
  }, []);

  // Sync mute state to sound engine
  useEffect(() => {
    sound.setMuted(muted);
  }, [muted, sound]);

  // Handle game events (sound, haptic, particles, achievements)
  const handleEvents = useCallback((events: GameEvent[]) => {
    for (const ev of events) {
      switch (ev.type) {
        case 'FOOD_EATEN':
          sound.playEat();
          if (navigator.vibrate) navigator.vibrate(20);
          if (ev.payload?.x !== undefined) spawnParticles(ev.payload.x, ev.payload.y!, '#60a5fa');
          break;
        case 'BONUS_FOOD_EATEN':
          sound.playBonusEat();
          if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
          if (ev.payload?.x !== undefined) spawnParticles(ev.payload.x, ev.payload.y!, '#facc15');
          break;
        case 'LEVEL_UP':
          sound.playLevelUp();
          break;
        case 'COMBO':
          if ((ev.payload?.combo ?? 0) >= 2) sound.playCombo(ev.payload!.combo!);
          break;
        case 'POWER_UP_COLLECTED':
          sound.playPowerUp();
          if (navigator.vibrate) navigator.vibrate([15, 10, 15, 10, 15]);
          break;
        case 'GAME_OVER':
          sound.playGameOver();
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          break;
        case 'ACHIEVEMENT':
          if (ev.payload?.achievement) {
            const id = ++toastIdRef.current;
            setAchievementToasts((prev) => [...prev, { id, label: ev.payload!.achievement! }]);
            setTimeout(() => setAchievementToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
          }
          break;
      }
    }
  }, [sound, spawnParticles]);

  const { gameState, setDirection, resetGame, pauseGame, resumeGame } = useGameLoop(
    initialGameState,
    BASE_TICK_RATE,
    handleEvents,
  );

  const swipeHandlers = useSwipeable({
    onSwipedUp: () => { if (screen === 'PLAYING' && !gameState.isPaused) setDirection(Direction.UP); },
    onSwipedDown: () => { if (screen === 'PLAYING' && !gameState.isPaused) setDirection(Direction.DOWN); },
    onSwipedLeft: () => { if (screen === 'PLAYING' && !gameState.isPaused) setDirection(Direction.LEFT); },
    onSwipedRight: () => { if (screen === 'PLAYING' && !gameState.isPaused) setDirection(Direction.RIGHT); },
    onTap: () => {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        if (screen === 'PLAYING' && countdown === null) {
          if (gameState.isPaused) setCountdown(3);
          else pauseGame();
        }
      }
      lastTapRef.current = now;
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'PLAYING') return;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': setDirection(Direction.UP); break;
        case 'ArrowDown': case 's': case 'S': setDirection(Direction.DOWN); break;
        case 'ArrowLeft': case 'a': case 'A': setDirection(Direction.LEFT); break;
        case 'ArrowRight': case 'd': case 'D': setDirection(Direction.RIGHT); break;
        case ' ':
          e.preventDefault();
          togglePause();
          break;
        case 'm': case 'M': setMuted((v) => !v); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, setDirection, gameState.isPaused, countdown]);

  const togglePause = useCallback(() => {
    if (countdown !== null) return;
    if (gameState.isPaused) setCountdown(3);
    else pauseGame();
  }, [gameState.isPaused, pauseGame, countdown]);

  // Countdown handler
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      resumeGame();
      setCountdown(null);
    }
  }, [countdown, resumeGame]);

  // Handle Game Over
  useEffect(() => {
    if (gameState.isGameOver && screen === 'PLAYING') {
      setScreen('GAMEOVER');
      saveScore();
      // Check personal best
      if (gameState.score > personalBest) {
        setPersonalBest(gameState.score);
        setIsNewRecord(true);
        localStorage.setItem('snake_personal_best', String(gameState.score));
      } else {
        setIsNewRecord(false);
      }
    }
  }, [gameState.isGameOver, screen]);

  const saveScore = async () => {
    if (gameState.score <= 0 || gameState.totalTime <= 10000) return;
    try {
      const hash = await generateHash(playerName || 'Anonymous', gameState.score, gameState.totalTime);
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playerName || 'Anonymous',
          score: gameState.score,
          duration: gameState.totalTime,
          stats: gameState.stats,
          hash,
        }),
      });
    } catch (err) {
      console.error('Failed to save score:', err);
    }
  };

  const fetchLeaderboard = async () => {
    setScreen('LEADERBOARD');
    setIsLoadingData(true);
    try {
      const resp = await fetch('/api/leaderboard');
      const data = await resp.json();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch {
      setLeaderboard([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const startGame = () => {
    if (!playerName.trim()) return;
    clearParticles();
    const freshState = { ...initialGameState, food: generateFood(initialGameState.snake, GRID_SIZE, GRID_SIZE) };
    resetGame(freshState);
    setScreen('PLAYING');
  };

  const restartGame = () => {
    clearParticles();
    const freshState = { ...initialGameState, food: generateFood(initialGameState.snake, GRID_SIZE, GRID_SIZE) };
    resetGame(freshState);
    setScreen('PLAYING');
  };

  // Compute snake colors
  const snakeColors = getSnakeColors(gameState.level);

  // Level progress (0–1)
  const levelProgress = (gameState.foodEatenCount % 5) / 5;

  // Power-up time remaining ratio
  const puRatio = gameState.activePowerUp
    ? Math.max(0, (gameState.activePowerUp.expiresAt - gameState.totalTime) / 6000)
    : 0;

  // Bonus food time remaining ratio
  const bfRatio = gameState.bonusFood
    ? Math.max(0, (gameState.bonusFood.expiresAt - gameState.totalTime) / 5000)
    : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white p-3 sm:p-4 w-full mx-auto">
      {/* Achievement toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {achievementToasts.map((t) => (
          <div
            key={t.id}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 shadow-2xl animate-in slide-in-from-right-4 fade-in duration-300 text-sm font-bold"
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* Container with Glassmorphism */}
      <div className={cn(
        'relative w-full mx-auto bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl md:rounded-3xl p-5 sm:p-6 lg:p-10 shadow-2xl focus-within:ring-2 focus-within:ring-white transition-all duration-300',
        screen === 'PLAYING' ? 'max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-5xl xl:max-w-6xl' : 'max-w-md md:max-w-lg',
      )}>
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 blur-3xl rounded-full" />

        {/* ======================== START SCREEN ======================== */}
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

              {/* D-Pad toggle */}
              <button
                onClick={() => setShowDPad(!showDPad)}
                className={cn(
                  'w-full flex justify-between items-center bg-white/5 border rounded-2xl py-3 px-4 transition-all group mt-2',
                  showDPad ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 hover:border-white/20',
                )}
              >
                <div className="flex items-center gap-3">
                  <Gamepad2 className={cn('w-5 h-5 transition-colors', showDPad ? 'text-blue-400' : 'text-white/40')} />
                  <span className="font-medium text-sm text-white/80">Hiện phím ảo (Nút D-Pad)</span>
                </div>
                <div className={cn('w-10 h-6 flex items-center rounded-full px-1 transition-colors', showDPad ? 'bg-blue-500' : 'bg-white/20')}>
                  <div className={cn('w-4 h-4 rounded-full bg-white transition-transform', showDPad ? 'translate-x-4' : 'translate-x-0')} />
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

            {personalBest > 0 && (
              <div className="text-white/40 text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Kỷ lục của bạn: <span className="font-black text-yellow-400">{personalBest}</span>
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={() => setShowGuide(true)} className="text-white/40 hover:text-white transition-colors flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4" /> Hướng dẫn
              </button>
              <button onClick={fetchLeaderboard} className="text-white/40 hover:text-white transition-colors flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4" /> Bảng xếp hạng
              </button>
            </div>
          </div>
        )}

        {/* ======================== PLAYING SCREEN ======================== */}
        {screen === 'PLAYING' && (
          <div className="flex flex-col lg:flex-row w-full items-center lg:items-start justify-center gap-6 lg:gap-10 xl:gap-16 outline-none select-none">
            {/* Left panel: Controls */}
            <div className="flex flex-col w-full lg:flex-1 max-w-sm lg:max-w-[320px] xl:max-w-[380px] gap-4 order-2 lg:order-1 transition-all duration-300 mx-auto lg:mx-0">

              {/* HUD card */}
              <div className="flex justify-between lg:flex-col lg:gap-4 w-full bg-white/5 p-4 rounded-xl lg:rounded-2xl border border-white/10 backdrop-blur-md">
                {/* Player name */}
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse hidden lg:block" />
                  <User className="w-4 h-4 text-blue-400 lg:hidden" />
                  <span className="font-bold text-base lg:text-lg uppercase tracking-widest truncate">{playerName}</span>
                </div>

                {/* Stats row */}
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

                  {/* Level + progress */}
                  <div className="hidden lg:flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs text-white/40 font-bold uppercase tracking-widest">
                      <span>Cấp {gameState.level}</span>
                      <span>{gameState.foodEatenCount % 5}/5 🍎</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${levelProgress * 100}%`,
                          background: `linear-gradient(90deg, #3b82f6, #a855f7)`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Combo badge */}
                  {gameState.combo >= 2 && (
                    <div className="hidden lg:flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-xl px-3 py-2 animate-in fade-in">
                      <span className="text-orange-400 text-xs font-black uppercase tracking-widest">🔥 Combo x{gameState.combo}</span>
                    </div>
                  )}

                  {/* Power-up indicator */}
                  {gameState.activePowerUp && (
                    <div className={cn(
                      'hidden lg:flex items-center gap-2 rounded-xl px-3 py-2 animate-in fade-in border',
                      gameState.activePowerUp.type === 'SHIELD' ? 'bg-blue-500/20 border-blue-500/30' : 'bg-green-500/20 border-green-500/30',
                    )}>
                      {gameState.activePowerUp.type === 'SHIELD'
                        ? <Shield className="w-4 h-4 text-blue-400" />
                        : <Zap className="w-4 h-4 text-green-400" />
                      }
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', gameState.activePowerUp.type === 'SHIELD' ? 'bg-blue-400' : 'bg-green-400')}
                          style={{ width: `${puRatio * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Pause + DPad + Mute buttons */}
                  <div className="flex gap-2 w-full mt-2 lg:mt-0">
                    <button
                      onClick={togglePause}
                      disabled={countdown !== null}
                      className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl border border-white/10 transition-all flex-1 justify-center items-center flex disabled:opacity-50"
                      title="Tạm dừng"
                    >
                      <span className="hidden lg:block text-xs font-bold mr-2">PAUSE</span>
                      <RotateCcw className={cn('w-4 h-4 text-white/70', gameState.isPaused ? '' : 'animate-[spin_4s_linear_infinite] opacity-50')} />
                    </button>
                    <button
                      onClick={() => setShowDPad(!showDPad)}
                      className={cn(
                        'p-2.5 rounded-xl border shadow-lg transition-all flex-1 justify-center items-center flex',
                        showDPad ? 'bg-blue-500/30 border-blue-500/50 text-blue-300' : 'bg-white/10 hover:bg-white/20 border-white/10 text-white/50',
                      )}
                      title="D-Pad"
                    >
                      <span className="hidden lg:block text-xs font-bold mr-2">D-PAD</span>
                      <Gamepad2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setMuted((v) => !v)}
                      className="p-2.5 rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 transition-all flex-1 justify-center items-center flex"
                      title="Tắt/Bật âm"
                    >
                      {muted ? <VolumeX className="w-4 h-4 text-white/40" /> : <Volume2 className="w-4 h-4 text-white/70" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* D-Pad */}
              {showDPad && (
                <div className="grid grid-cols-3 grid-rows-3 gap-2 w-52 mx-auto touch-none opacity-90 p-2">
                  <div />
                  <button onClick={() => { if (!gameState.isPaused) setDirection(Direction.UP); }} className="w-16 h-16 bg-white/10 hover:bg-white/20 active:bg-blue-500/40 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-xl transition-all active:scale-95 shadow-md">⬆️</button>
                  <div />
                  <button onClick={() => { if (!gameState.isPaused) setDirection(Direction.LEFT); }} className="w-16 h-16 bg-white/10 hover:bg-white/20 active:bg-blue-500/40 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-xl transition-all active:scale-95 shadow-md">⬅️</button>
                  <button onClick={() => { if (!gameState.isPaused) setDirection(Direction.DOWN); }} className="w-16 h-16 bg-white/10 hover:bg-white/20 active:bg-blue-500/40 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-xl transition-all active:scale-95 shadow-md">⬇️</button>
                  <button onClick={() => { if (!gameState.isPaused) setDirection(Direction.RIGHT); }} className="w-16 h-16 bg-white/10 hover:bg-white/20 active:bg-blue-500/40 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-xl transition-all active:scale-95 shadow-md">➡️</button>
                </div>
              )}

              <p className="hidden md:block text-center text-white/30 text-[10px] font-medium uppercase tracking-[0.2em] mt-4">
                Phím mũi tên / WASD để di chuyển<br />
                Space để Tạm dừng · M để Tắt âm
              </p>

              {/* Object Legend */}
              <div className="hidden lg:block bg-white/5 border border-white/10 rounded-xl p-3 mt-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2.5">Chú giải đối tượng</p>
                <div className="space-y-2">
                  {/* Normal food */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                    </div>
                    <span className="text-[11px] text-white/50">Mồi thường <span className="text-white/30">(5–10đ)</span></span>
                  </div>
                  {/* Bonus food */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.9)]" />
                    </div>
                    <span className="text-[11px] text-white/50">Bonus Food <span className="text-yellow-400/70">(x2/x3)</span></span>
                  </div>
                  {/* Shield */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      <div className="w-3.5 h-3.5 bg-blue-500 rounded-md shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    </div>
                    <span className="text-[11px] text-white/50"><Shield className="w-2.5 h-2.5 inline text-blue-400 mr-0.5" />Shield Power-up</span>
                  </div>
                  {/* Slow */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      <div className="w-3.5 h-3.5 bg-green-500 rounded-md shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                    </div>
                    <span className="text-[11px] text-white/50"><Zap className="w-2.5 h-2.5 inline text-green-400 mr-0.5" />Slow Power-up</span>
                  </div>
                  {/* Obstacle */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      <div className="w-3.5 h-3.5 bg-red-900/90 rounded-sm shadow-[0_0_4px_rgba(127,29,29,0.8)]" />
                    </div>
                    <span className="text-[11px] text-white/50">Chướng ngại vật ⚠️</span>
                  </div>
                  {/* Portal */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      <svg viewBox="0 0 16 16" className="w-4 h-4 animate-[spin_2.5s_linear_infinite]" style={{ filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.9))' }}>
                        <circle cx="8" cy="8" r="6.5" fill="rgba(88,28,135,0.4)" />
                        <circle cx="8" cy="8" r="6" fill="none" stroke="rgba(168,85,247,0.7)" strokeWidth="1.5" strokeDasharray="7 3.5" />
                        <circle cx="8" cy="8" r="3.5" fill="none" stroke="rgba(192,132,252,0.85)" strokeWidth="1.5" strokeDasharray="4 2.5" />
                        <circle cx="8" cy="8" r="1.2" fill="rgba(233,213,255,1)" />
                      </svg>
                    </div>
                    <span className="text-[11px] text-white/50">Cổng Teleport <span className="text-purple-400/70">(tự doạt)</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Board */}
            <div
              {...swipeHandlers}
              className={cn(
                'relative transition-all duration-300 touch-none flex-shrink-0 order-1 lg:order-2 w-full lg:flex-1 mx-auto lg:mx-0',
                showDPad
                  ? 'max-w-[280px] sm:max-w-[340px] md:max-w-[400px] lg:max-w-[500px] xl:max-w-[550px]'
                  : 'max-w-[320px] sm:max-w-[400px] md:max-w-md lg:max-w-[500px] xl:max-w-[550px]',
              )}
            >
              {/* Mobile: level bar + combo */}
              <div className="flex lg:hidden gap-2 mb-2 items-center">
                <span className="text-xs text-white/40 font-bold uppercase">Lv.{gameState.level}</span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${levelProgress * 100}%` }} />
                </div>
                {gameState.combo >= 2 && (
                  <span className="text-orange-400 text-xs font-black">🔥x{gameState.combo}</span>
                )}
              </div>

              <div
                className="relative grid gap-px border-[4px] md:border-[6px] border-[#0a0f1d] rounded-xl md:rounded-2xl bg-white/10 border-b-blue-900 border-r-blue-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden w-full"
                style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, aspectRatio: '1/1' }}
              >
                {/* Paused overlay */}
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

                {/* Grid cells */}
                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                  const x = i % GRID_SIZE;
                  const y = Math.floor(i / GRID_SIZE);
                  const isHead = gameState.snake[0].x === x && gameState.snake[0].y === y;
                  const isSnake = !isHead && gameState.snake.some((s) => s.x === x && s.y === y);
                  const isFood = gameState.food.x === x && gameState.food.y === y;
                  const isBonus = gameState.bonusFood?.pos.x === x && gameState.bonusFood?.pos.y === y;
                  const isObstacle = gameState.obstacles.some((o) => o.x === x && o.y === y);
                  const isPowerUp = gameState.powerUpItem?.pos.x === x && gameState.powerUpItem?.pos.y === y;
                  const isPortal1 = gameState.portals?.[0].x === x && gameState.portals?.[0].y === y;
                  const isPortal2 = gameState.portals?.[1].x === x && gameState.portals?.[1].y === y;

                  return (
                    <div
                      key={i}
                      className={cn(
                        'w-full h-full rounded-sm transition-all duration-150 relative',
                        isSnake && snakeColors.body,
                        isHead && cn(snakeColors.head, 'scale-125 z-10 rounded-md'),
                        isFood && 'bg-red-500 animate-[bounce_1s_infinite] rounded-full scale-75 shadow-[0_0_20px_rgba(239,68,68,0.8)]',
                        isBonus && 'bg-yellow-400 animate-[bounce_0.7s_infinite] rounded-full scale-90 shadow-[0_0_20px_rgba(250,204,21,0.9)] z-10',
                        isObstacle && 'bg-red-900/80 rounded-sm shadow-[0_0_6px_rgba(127,29,29,0.6)]',
                        isPowerUp && (gameState.powerUpItem?.type === 'SHIELD'
                          ? 'bg-blue-500 rounded-lg scale-90 shadow-[0_0_14px_rgba(59,130,246,0.8)] animate-[pulse_1.2s_ease-in-out_infinite] z-10'
                          : 'bg-green-500 rounded-lg scale-90 shadow-[0_0_14px_rgba(34,197,94,0.8)] animate-[pulse_1.2s_ease-in-out_infinite] z-10'),
                        (isPortal1 || isPortal2) && 'bg-purple-900/50 rounded-sm shadow-[0_0_18px_rgba(168,85,247,0.8)] z-10',
                      )}
                    >
                      {isBonus && (
                        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-yellow-900 z-20">
                          x{gameState.bonusFood?.multiplier}
                        </div>
                      )}
                      {/* Bonus food countdown ring */}
                      {isBonus && (
                        <svg className="absolute inset-0 w-full h-full z-20" viewBox="0 0 20 20">
                          <circle
                            cx="10" cy="10" r="8"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeDasharray={`${bfRatio * 50.3} 50.3`}
                            strokeLinecap="round"
                            transform="rotate(-90 10 10)"
                            opacity="0.5"
                          />
                        </svg>
                      )}
                      {/* Portal spiral SVG */}
                      {(isPortal1 || isPortal2) && (
                        <svg className="absolute inset-0 w-full h-full z-20 animate-[spin_2s_linear_infinite]" viewBox="0 0 20 20">
                          <circle cx="10" cy="10" r="8.5" fill="rgba(88,28,135,0.35)" />
                          <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(168,85,247,0.7)" strokeWidth="2" strokeDasharray="8 4" strokeLinecap="round" />
                          <circle cx="10" cy="10" r="4.5" fill="none" stroke="rgba(192,132,252,0.85)" strokeWidth="2" strokeDasharray="4.5 2.5" strokeLinecap="round" />
                          <circle cx="10" cy="10" r="1.8" fill="rgba(233,213,255,1)" />
                        </svg>
                      )}
                    </div>
                  );
                })}

                {/* Particle layer */}
                {particles.map((p) => {
                  // Map grid position to percentage within board
                  const pxPct = (p.x / GRID_SIZE) * 100;
                  const pyPct = (p.y / GRID_SIZE) * 100;
                  return (
                    <div
                      key={p.id}
                      className="absolute w-1.5 h-1.5 rounded-full pointer-events-none animate-[ping_0.8s_ease-out_forwards] z-50"
                      style={{
                        left: `calc(${pxPct}% + ${Math.random() * 30 - 15}px)`,
                        top: `calc(${pyPct}% + ${Math.random() * 30 - 15}px)`,
                        background: p.color,
                        boxShadow: `0 0 6px ${p.color}`,
                      }}
                    />
                  );
                })}
              </div>

              <p className="md:hidden text-center text-white/20 text-[10px] mt-2 uppercase tracking-[0.2em]">
                Vuốt màn hình để di chuyển · Chạm đúp để Tạm dừng
              </p>
            </div>
          </div>
        )}

        {/* ======================== GAME OVER SCREEN ======================== */}
        {screen === 'GAMEOVER' && (() => {
          const rank = getRank(gameState.score);
          return (
            <div className="flex flex-col items-center gap-6 py-8 animate-in zoom-in-95 duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
                <h2 className="text-6xl font-black text-white relative">GAME OVER</h2>
              </div>

              {/* Rank badge */}
              <div className={cn('flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-lg font-black', rank.bg, rank.color)}>
                {rank.label}
              </div>

              <div className="text-center">
                <p className="text-white/40 text-lg">Điểm của bạn</p>
                <p className="text-7xl font-black text-blue-400">{gameState.score}</p>
                {isNewRecord && (
                  <div className="mt-2 text-yellow-400 font-black text-sm animate-in fade-in slide-in-from-bottom-2">
                    🏅 Kỷ lục mới! (trước: {personalBest > gameState.score ? personalBest : gameState.score - (gameState.score - personalBest)})
                  </div>
                )}
                {!isNewRecord && personalBest > 0 && (
                  <div className="mt-1 text-white/30 text-sm">Kỷ lục: {personalBest}</div>
                )}
                <div className="flex justify-center mt-2"><StatsDisplay stats={gameState.stats} /></div>
              </div>

              {/* Max combo + Level reached */}
              <div className="flex gap-4 text-sm">
                {gameState.maxCombo >= 2 && (
                  <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl px-3 py-2 text-orange-400 font-black">
                    🔥 Max Combo x{gameState.maxCombo}
                  </div>
                )}
                <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white/50 font-bold">
                  Cấp đạt được: {gameState.level}
                </div>
              </div>

              {/* Achievements earned */}
              {gameState.achievements.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center max-w-xs">
                  {gameState.achievements.map((a) => (
                    <span key={a} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/60 font-medium">{a}</span>
                  ))}
                </div>
              )}

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
          );
        })()}

        {/* ======================== LEADERBOARD SCREEN ======================== */}
        {screen === 'LEADERBOARD' && (
          <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black flex items-center gap-3">
              <Trophy className="text-yellow-500" /> BẢNG XẾP HẠNG
            </h2>
            <div className="w-full bg-white/5 rounded-2xl border border-white/10 overflow-hidden relative min-h-[16rem]">
              <div className="max-h-64 overflow-y-auto w-full">
                {isLoadingData ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-sm font-medium text-white/50 animate-pulse tracking-widest uppercase">Đang tải...</p>
                  </div>
                ) : null}

                {!isLoadingData && leaderboard.length === 0 ? (
                  <p className="p-8 text-center text-white/20">Chưa có ai ghi điểm...</p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-white/5">
                      <tr className="text-xs uppercase tracking-widest text-white/40">
                        <th className="px-4 py-4 font-black">Hạng</th>
                        <th className="px-4 py-4 font-black">Người chơi</th>
                        <th className="px-4 py-4 font-black hidden sm:table-cell">Ngày</th>
                        <th className="px-4 py-4 font-black text-right hidden md:table-cell">Thời gian</th>
                        <th className="px-4 py-4 font-black text-right">Điểm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry, idx) => (
                        <React.Fragment key={idx}>
                          <tr
                            className="cursor-pointer border-t border-white/5 hover:bg-white/5 transition-colors group"
                            onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                          >
                            <td className="px-4 py-4">
                              <span className={cn(
                                'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold',
                                idx === 0 && 'bg-yellow-500 text-black',
                                idx === 1 && 'bg-slate-400 text-black',
                                idx === 2 && 'bg-orange-600 text-white',
                                idx > 2 && 'text-white/40',
                              )}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-medium">{entry.name}</td>
                            <td className="px-4 py-4 text-xs text-white/40 hidden sm:table-cell">
                              {entry.created_at
                                ? new Date((entry.created_at as string).replace(' ', 'T') + (!entry.created_at.includes('Z') ? 'Z' : '')).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })
                                : 'N/A'}
                            </td>
                            <td className="px-4 py-4 text-right font-mono text-white/40 text-xs hidden md:table-cell">{formatTime(entry.duration)}</td>
                            <td className="px-4 py-4 text-right font-black text-blue-400">{entry.score}</td>
                          </tr>
                          {expandedIndex === idx && (
                            <tr className="bg-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                              <td colSpan={5} className="px-4 py-4">
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
                                      <span className="text-[10px] text-yellow-400/70 font-bold uppercase tracking-widest">3-5s</span>
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

      {/* ======================== GUIDE MODAL ======================== */}
      {showGuide && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowGuide(false); }}
        >
          <div className="relative w-full max-w-lg bg-[#0a0f1d]/95 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            {/* Close button */}
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-2xl font-black mb-1 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Hướng dẫn chơi</h2>
            <p className="text-white/30 text-xs mb-5 uppercase tracking-widest font-bold">Snake Neon — v2.0.1</p>

            <div className="space-y-5">

              {/* Controls */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">🕹️ Điều khiển</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['⌨️ Phím mũi tên / WASD', 'Di chuyển rắn'],
                    ['Space', 'Tạm dừng / Tiếp tục'],
                    ['M', 'Tắt / Bật âm thanh'],
                    ['📱 Vuốt màn hình', 'Di chuyển (mobile)'],
                    ['📱 Chạm đúp', 'Tạm dừng (mobile)'],
                  ].map(([key, desc]) => (
                    <div key={key} className="bg-white/5 rounded-xl px-3 py-2 flex flex-col gap-0.5">
                      <span className="text-white font-bold text-xs">{key}</span>
                      <span className="text-white/40 text-[11px]">{desc}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Food types */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">🍎 Các loại mồi</h3>
                <div className="space-y-2">
                  {[
                    ['🔴', 'Mồi thường', 'Ăn để ghi điểm. Tốc độ ăn càng nhanh càng nhiều điểm (5–10đ)'],
                    ['🟡', 'Bonus Food (vàng)', 'Xuất hiện ngẫu nhiên (20%), tồn tại 5 giây. Thưởng x2 hoặc x3 điểm!'],
                    ['🔵', 'Power-up Shield', 'Miễn nhiễm va chạm thân & chướng ngại trong 6 giây'],
                    ['🟢', 'Power-up Slow', 'Giảm tốc độ 50% trong 6 giây — thở phào!'],
                  ].map(([icon, name, desc]) => (
                    <div key={name} className="flex gap-3 bg-white/5 rounded-xl px-3 py-2.5">
                      <span className="text-2xl leading-none mt-0.5">{icon}</span>
                      <div>
                        <p className="text-white font-bold text-xs">{name}</p>
                        <p className="text-white/40 text-[11px] leading-snug mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Level system */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">🚀 Hệ thống cấp độ</h3>
                <div className="bg-white/5 rounded-xl px-3 py-2.5 text-[11px] text-white/60 leading-relaxed space-y-1">
                  <p>• Ăn <b className="text-white">5 mồi</b> để lên 1 cấp độ (Level)</p>
                  <p>• Mỗi cấp, rắn <b className="text-white">tăng tốc</b> thêm 10ms/giây (tối thiểu 80ms)</p>
                  <p>• Màu rắn thay đổi: <span className="text-blue-400">Xanh</span> → <span className="text-cyan-400">Cyan</span> → <span className="text-yellow-400">Vàng</span> → <span className="text-orange-400">Cam</span> → <span className="text-red-400">Đỏ</span></p>
                  <p>• Từ Level 2: xuất hiện <b className="text-red-400">chướng ngại vật</b>; Level chẵn: thêm <b className="text-purple-400">cổng teleport</b></p>
                </div>
              </section>

              {/* Combo */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">🔥 Combo Streak</h3>
                <div className="bg-white/5 rounded-xl px-3 py-2.5 text-[11px] text-white/60 leading-relaxed space-y-1">
                  <p>• Ăn mồi liên tiếp trong vòng <b className="text-white">&lt; 3 giây</b> để xây chuỗi Combo</p>
                  <p>• Mỗi cấp combo cộng thêm <b className="text-orange-400">+2 điểm</b> (tối đa +8 điểm/lần ăn)</p>
                  <p>• Badge 🔥 xuất hiện khi combo ≥ 2</p>
                </div>
              </section>

              {/* Scoring */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">🏆 Điểm & Xếp hạng</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {[
                    ['< 3s', '10 điểm', 'text-green-400'],
                    ['3–5s', '7 điểm', 'text-yellow-400'],
                    ['> 5s', '5 điểm', 'text-red-400'],
                  ].map(([time, pts, color]) => (
                    <div key={time} className="bg-white/5 rounded-xl px-3 py-2 text-center">
                      <p className={`text-[10px] font-black uppercase ${color}`}>{time}</p>
                      <p className="text-white font-bold text-sm">{pts}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    ['🥉', 'Bronze', '< 50'],
                    ['🥈', 'Silver', '50–149'],
                    ['🥇', 'Gold', '150–349'],
                    ['💎', 'Diamond', '350+'],
                  ].map(([icon, name, range]) => (
                    <div key={name} className="bg-white/5 rounded-xl px-2 py-2 text-center">
                      <p className="text-lg">{icon}</p>
                      <p className="text-white text-[10px] font-bold">{name}</p>
                      <p className="text-white/30 text-[9px]">{range}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Obstacles & Portals */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">🧱 Chướng ngại & Cổng Teleport</h3>
                <div className="space-y-2">
                  <div className="bg-red-900/30 border border-red-700/30 rounded-xl px-3 py-2.5 text-[11px] text-white/60">
                    <b className="text-red-400">Chướng ngại vật (đỏ tối)</b> — Xuất hiện từ Level 2, tăng theo cấp (tối đa 6 ô). Va chạm = Game Over!
                  </div>
                  <div className="bg-purple-900/30 border border-purple-700/30 rounded-xl px-3 py-2.5 text-[11px] text-white/60">
                    <b className="text-purple-400">Cổng Teleport (tím)</b> — Xuất hiện ở Level chẵn (2, 4...). Đi vào 1 cổng sẽ xuất hiện ở cổng kia!
                  </div>
                </div>
              </section>

            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-2xl transition-all"
            >
              Đã hiểu, bắt đầu thôi! 🎮
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
