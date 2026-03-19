import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, tickGame, Direction, isValidDirectionChange } from '@/lib/engine/gameLogic';

export function useGameLoop(initialState: GameState, tickRateMs: number) {
  const [gameState, setGameState] = useState<GameState>(initialState);
  
  const gameStateRef = useRef<GameState>(initialState);
  const directionQueueRef = useRef<Direction[]>([]);
  
  const lastTickTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);

  const setDirection = useCallback((newDirection: Direction) => {
    const lastQueuedDir = directionQueueRef.current.length > 0 
      ? directionQueueRef.current[directionQueueRef.current.length - 1] 
      : gameStateRef.current.direction;
    
    // Prevent 180 turn
    if (isValidDirectionChange(lastQueuedDir, newDirection) && lastQueuedDir !== newDirection) {
      directionQueueRef.current.push(newDirection);
    }
  }, []);

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: true }));
    gameStateRef.current.isPaused = true;
  }, []);

  const resumeGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: false }));
    gameStateRef.current.isPaused = false;
    lastTickTimeRef.current = 0; // Tick immediately on first anim frame
  }, []);

  const resetGame = useCallback((newState: GameState) => {
    setGameState(newState);
    gameStateRef.current = newState;
    directionQueueRef.current = [];
    lastTickTimeRef.current = 0;
  }, []);

  const loop = useCallback((time: number) => {
    if (!lastTickTimeRef.current) {
      lastTickTimeRef.current = time;
    }

    const deltaTime = time - lastTickTimeRef.current;

    if (deltaTime >= tickRateMs) {
      if (!gameStateRef.current.isGameOver && !gameStateRef.current.isPaused) {
        let nextDir = gameStateRef.current.direction;
        if (directionQueueRef.current.length > 0) {
          nextDir = directionQueueRef.current.shift()!;
        }

        const stateToEval = { ...gameStateRef.current, direction: nextDir };
        const nextState = tickGame(stateToEval, tickRateMs);

        gameStateRef.current = nextState;
        setGameState(nextState);
      }
      lastTickTimeRef.current = time;
    }

    requestRef.current = requestAnimationFrame(loop);
  }, [tickRateMs]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  return { gameState, setDirection, resetGame, pauseGame, resumeGame };
}
