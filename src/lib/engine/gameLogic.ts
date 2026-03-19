export type Coordinate = {
  x: number;
  y: number;
};

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export interface GameState {
  snake: Coordinate[];
  food: Coordinate;
  direction: Direction;
  isGameOver: boolean;
  isPaused: boolean;
  score: number;
  totalTime: number; // in ms
  lastFoodSpawnTime: number; // in ms
  stats: {
    fast: number;   // < 3s
    medium: number; // 3-5s
    slow: number;   // > 5s
  };
  gridSize: { width: number; height: number };
}

// Generate food at random position, making sure not to place it ON the snake
export function generateFood(snake: Coordinate[], width: number, height: number): Coordinate {
  let newFood: Coordinate;
  let isOccupied = true;
  while (isOccupied) {
    newFood = {
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height),
    };
    // Ensure food doesn't spawn on the snake
    isOccupied = snake.some((segment) => segment.x === newFood!.x && segment.y === newFood!.y);
  }
  return newFood!;
}

// Utility to check if next direction is 180 turn
export function isValidDirectionChange(current: Direction, next: Direction): boolean {
  if (current === Direction.UP && next === Direction.DOWN) return false;
  if (current === Direction.DOWN && next === Direction.UP) return false;
  if (current === Direction.LEFT && next === Direction.RIGHT) return false;
  if (current === Direction.RIGHT && next === Direction.LEFT) return false;
  return true;
}

export function getNextHeadSquare(currentHead: Coordinate, direction: Direction): Coordinate {
  const nextHead = { ...currentHead };
  switch (direction) {
    case Direction.UP:
      nextHead.y -= 1;
      break;
    case Direction.DOWN:
      nextHead.y += 1;
      break;
    case Direction.LEFT:
      nextHead.x -= 1;
      break;
    case Direction.RIGHT:
      nextHead.x += 1;
      break;
  }
  return nextHead;
}

export function checkCollision(head: Coordinate, snake: Coordinate[], width: number, height: number): boolean {
  // Check Wall
  if (head.x < 0 || head.x >= width || head.y < 0 || head.y >= height) {
    return true;
  }
  // Check self collision. It will not hit the very last tail segment unless it grows.
  for (let i = 0; i < snake.length - 1; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) {
      return true;
    }
  }
  return false;
}

export function tickGame(state: GameState, tickRateMs: number): GameState {
  if (state.isGameOver || state.isPaused) return state;

  const currentHead = state.snake[0];
  const nextHead = getNextHeadSquare(currentHead, state.direction);

  const updatedTotalTime = state.totalTime + tickRateMs;

  if (checkCollision(nextHead, state.snake, state.gridSize.width, state.gridSize.height)) {
    return { ...state, totalTime: updatedTotalTime, isGameOver: true };
  }

  const newSnake = [nextHead, ...state.snake];
  let newFood = state.food;
  let newScore = state.score;
  let nextFoodSpawnTime = state.lastFoodSpawnTime;
  let newStats = { ...state.stats };

  // Check food collision
  if (nextHead.x === state.food.x && nextHead.y === state.food.y) {
    const timeToEatMs = updatedTotalTime - state.lastFoodSpawnTime;
    
    if (timeToEatMs < 3000) {
      newScore += 10;
      newStats.fast += 1;
    } else if (timeToEatMs < 5000) {
      newScore += 7;
      newStats.medium += 1;
    } else {
      newScore += 5;
      newStats.slow += 1;
    }

    // Snake grows, generate new food, reset food timer
    newFood = generateFood(newSnake, state.gridSize.width, state.gridSize.height);
    nextFoodSpawnTime = updatedTotalTime;
  } else {
    // Normal move: remove the old tail
    newSnake.pop();
  }

  return {
    ...state,
    snake: newSnake,
    food: newFood,
    score: newScore,
    totalTime: updatedTotalTime,
    lastFoodSpawnTime: nextFoodSpawnTime,
    stats: newStats,
  };
}
