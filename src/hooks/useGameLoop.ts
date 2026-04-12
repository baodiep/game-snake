import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, tickGame, Direction, isValidDirectionChange } from '@/lib/engine/gameLogic';

// Tick rate (ms) based on level and active slow power-up
export function computeTickRate(baseTickRate: number, level: number, hasSlow: boolean): number {
  const levelSpeed = Math.max(80, baseTickRate - (level - 1) * 10);
  return hasSlow ? Math.min(levelSpeed * 1.5, baseTickRate) : levelSpeed;
}

export function useGameLoop(
  initialState: GameState,
  baseTickRateMs: number,
  onEvents?: (events: GameState['events']) => void,
) {
  const [gameState, setGameState] = useState<GameState>(initialState);

  const gameStateRef = useRef<GameState>(initialState);
  const directionQueueRef = useRef<Direction[]>([]);

  const lastTickTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);

  const setDirection = useCallback((newDirection: Direction) => {
    const lastQueuedDir =
      directionQueueRef.current.length > 0
        ? directionQueueRef.current[directionQueueRef.current.length - 1]
        : gameStateRef.current.direction;

    if (isValidDirectionChange(lastQueuedDir, newDirection) && lastQueuedDir !== newDirection) {
      directionQueueRef.current.push(newDirection);
    }
  }, []);

  const pauseGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPaused: true }));
    gameStateRef.current.isPaused = true;
  }, []);

  const resumeGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPaused: false }));
    gameStateRef.current.isPaused = false;
    lastTickTimeRef.current = 0;
  }, []);

  const resetGame = useCallback((newState: GameState) => {
    setGameState(newState);
    gameStateRef.current = newState;
    directionQueueRef.current = [];
    lastTickTimeRef.current = 0;
  }, []);

  const onEventsRef = useRef(onEvents);
  useEffect(() => { onEventsRef.current = onEvents; }, [onEvents]);

  const loop = useCallback(
    (time: number) => {
      if (!lastTickTimeRef.current) {
        lastTickTimeRef.current = time;
      }

      const deltaTime = time - lastTickTimeRef.current;
      const currentState = gameStateRef.current;

      const hasSlow = !!(
        currentState.activePowerUp?.type === 'SLOW' &&
        currentState.activePowerUp.expiresAt > currentState.totalTime
      );
      const tickRate = computeTickRate(baseTickRateMs, currentState.level, hasSlow);

      if (deltaTime >= tickRate) {
        if (!currentState.isGameOver && !currentState.isPaused) {
          let nextDir = currentState.direction;
          if (directionQueueRef.current.length > 0) {
            nextDir = directionQueueRef.current.shift()!;
          }

          const stateToEval = { ...currentState, direction: nextDir };
          const nextState = tickGame(stateToEval, tickRate);

          gameStateRef.current = nextState;
          setGameState(nextState);

          // Fire events to consumer
          if (nextState.events.length > 0 && onEventsRef.current) {
            onEventsRef.current(nextState.events);
          }
        }
        lastTickTimeRef.current = time;
      }

      requestRef.current = requestAnimationFrame(loop);
    },
    [baseTickRateMs],
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  return { gameState, setDirection, resetGame, pauseGame, resumeGame };
}
