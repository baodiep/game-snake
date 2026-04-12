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

export type GameEventType =
  | 'FOOD_EATEN'
  | 'BONUS_FOOD_EATEN'
  | 'BONUS_FOOD_EXPIRED'
  | 'GAME_OVER'
  | 'LEVEL_UP'
  | 'COMBO'
  | 'POWER_UP_COLLECTED'
  | 'ACHIEVEMENT';

export interface GameEvent {
  type: GameEventType;
  payload?: { combo?: number; level?: number; achievement?: string; multiplier?: number; x?: number; y?: number };
}

export type PowerUpType = 'SHIELD' | 'SLOW';

export interface BonusFood {
  pos: Coordinate;
  expiresAt: number; // totalTime ms
  multiplier: number; // 2 or 3
}

export interface PowerUpItem {
  pos: Coordinate;
  type: PowerUpType;
}

export interface ActivePowerUp {
  type: PowerUpType;
  expiresAt: number;
}

export interface GameState {
  snake: Coordinate[];
  food: Coordinate;
  bonusFood?: BonusFood;
  powerUpItem?: PowerUpItem;
  activePowerUp?: ActivePowerUp;
  obstacles: Coordinate[];
  portals?: [Coordinate, Coordinate];
  direction: Direction;
  isGameOver: boolean;
  isPaused: boolean;
  score: number;
  totalTime: number;
  lastFoodSpawnTime: number;
  lastFoodEatenTime: number;
  combo: number;
  maxCombo: number;
  level: number;
  foodEatenCount: number; // total food eaten this game
  achievements: string[];
  stats: {
    fast: number;
    medium: number;
    slow: number;
  };
  gridSize: { width: number; height: number };
  events: GameEvent[]; // cleared every tick by consumer
}

// Generate food at random position avoiding obstacles, snake, portals
export function generateFood(
  snake: Coordinate[],
  width: number,
  height: number,
  excluded: Coordinate[] = []
): Coordinate {
  let newFood: Coordinate;
  let isOccupied = true;
  const allExcluded = [...snake, ...excluded];
  while (isOccupied) {
    newFood = {
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height),
    };
    isOccupied = allExcluded.some((s) => s.x === newFood!.x && s.y === newFood!.y);
  }
  return newFood!;
}

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
    case Direction.UP:    nextHead.y -= 1; break;
    case Direction.DOWN:  nextHead.y += 1; break;
    case Direction.LEFT:  nextHead.x -= 1; break;
    case Direction.RIGHT: nextHead.x += 1; break;
  }
  return nextHead;
}

export function checkCollision(
  head: Coordinate,
  snake: Coordinate[],
  width: number,
  height: number,
  obstacles: Coordinate[],
  hasShield: boolean
): boolean {
  // Wall collision
  if (head.x < 0 || head.x >= width || head.y < 0 || head.y >= height) return true;
  // Self collision (skip with shield)
  if (!hasShield) {
    for (let i = 0; i < snake.length - 1; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) return true;
    }
  }
  // Obstacle collision (skip with shield)
  if (!hasShield) {
    for (const obs of obstacles) {
      if (obs.x === head.x && obs.y === head.y) return true;
    }
  }
  return false;
}

function applyPortal(pos: Coordinate, portals?: [Coordinate, Coordinate]): Coordinate {
  if (!portals) return pos;
  const [p1, p2] = portals;
  if (p1.x === pos.x && p1.y === pos.y) return { ...p2 };
  if (p2.x === pos.x && p2.y === pos.y) return { ...p1 };
  return pos;
}

function generateObstacles(
  snake: Coordinate[],
  food: Coordinate,
  width: number,
  height: number,
  count: number
): Coordinate[] {
  const obstacles: Coordinate[] = [];
  const excluded = [...snake, food];
  for (let i = 0; i < count; i++) {
    const obs = generateFood(snake, width, height, [...excluded, ...obstacles]);
    obstacles.push(obs);
  }
  return obstacles;
}

function generatePortals(
  snake: Coordinate[],
  food: Coordinate,
  obstacles: Coordinate[],
  width: number,
  height: number
): [Coordinate, Coordinate] {
  const p1 = generateFood(snake, width, height, [food, ...obstacles]);
  const p2 = generateFood(snake, width, height, [food, ...obstacles, p1]);
  return [p1, p2];
}

const ACHIEVEMENTS: { id: string; label: string; check: (s: GameState) => boolean }[] = [
  { id: 'first_blood',  label: '🩸 First Blood',       check: (s) => s.foodEatenCount === 1 },
  { id: 'snack_time',   label: '🍎 Snack Time (5)',     check: (s) => s.foodEatenCount === 5 },
  { id: 'well_fed',     label: '🍕 Well Fed (10)',      check: (s) => s.foodEatenCount === 10 },
  { id: 'gluttony',     label: '🐷 Gluttony (25)',      check: (s) => s.foodEatenCount === 25 },
  { id: 'speed_demon',  label: '⚡ Speed Demon',        check: (s) => s.stats.fast >= 5 },
  { id: 'combo_3',      label: '🔥 Combo x3',           check: (s) => s.combo >= 3 },
  { id: 'combo_5',      label: '💥 Combo x5',           check: (s) => s.combo >= 5 },
  { id: 'level_3',      label: '🚀 Level 3 Reached',   check: (s) => s.level >= 3 },
  { id: 'level_5',      label: '👑 Level 5 Reached',   check: (s) => s.level >= 5 },
];

const FOOD_PER_LEVEL = 5;
const BONUS_FOOD_DURATION_MS = 5000;
const POWER_UP_DURATION_MS = 6000;
const BONUS_FOOD_SPAWN_CHANCE = 0.2; // 20% per food spawn
const POWER_UP_SPAWN_CHANCE = 0.1;   // 10% per food spawn

export function tickGame(state: GameState, tickRateMs: number): GameState {
  if (state.isGameOver || state.isPaused) return state;

  const events: GameEvent[] = [];
  const currentHead = state.snake[0];
  let nextHead = getNextHeadSquare(currentHead, state.direction);

  const updatedTotalTime = state.totalTime + tickRateMs;

  // Shield status
  const hasShield = !!(state.activePowerUp?.type === 'SHIELD' && state.activePowerUp.expiresAt > updatedTotalTime);
  const hasSlow = !!(state.activePowerUp?.type === 'SLOW' && state.activePowerUp.expiresAt > updatedTotalTime);

  // --- PORTAL TELEPORT ---
  nextHead = applyPortal(nextHead, state.portals);

  // --- COLLISION CHECK ---
  if (checkCollision(nextHead, state.snake, state.gridSize.width, state.gridSize.height, state.obstacles, hasShield)) {
    events.push({ type: 'GAME_OVER' });
    return { ...state, totalTime: updatedTotalTime, isGameOver: true, events };
  }

  const newSnake = [nextHead, ...state.snake];
  let newFood = state.food;
  let newScore = state.score;
  let nextFoodSpawnTime = state.lastFoodSpawnTime;
  let newStats = { ...state.stats };
  let newCombo = state.combo;
  let newMaxCombo = state.maxCombo;
  let newFoodEatenCount = state.foodEatenCount;
  let newLevel = state.level;
  let newAchievements = [...state.achievements];
  let newBonusFood = state.bonusFood;
  let newPowerUpItem = state.powerUpItem;
  let newActivePowerUp = state.activePowerUp;
  let newObstacles = state.obstacles;
  let newPortals = state.portals;
  let newLastFoodEatenTime = state.lastFoodEatenTime;
  let _ = hasSlow; // consumed for future use (slow affects tick rate externally)

  // --- EXPIRE BONUS FOOD ---
  if (newBonusFood && newBonusFood.expiresAt <= updatedTotalTime) {
    newBonusFood = undefined;
    events.push({ type: 'BONUS_FOOD_EXPIRED' });
  }

  // --- EXPIRE POWER UP ---
  if (newActivePowerUp && newActivePowerUp.expiresAt <= updatedTotalTime) {
    newActivePowerUp = undefined;
  }

  // --- EAT NORMAL FOOD ---
  if (nextHead.x === state.food.x && nextHead.y === state.food.y) {
    const timeToEatMs = updatedTotalTime - state.lastFoodSpawnTime;
    let baseScore: number;

    if (timeToEatMs < 3000) {
      baseScore = 10;
      newStats = { ...newStats, fast: newStats.fast + 1 };
      // Combo logic: eaten fast enough?
      newCombo += 1;
    } else if (timeToEatMs < 5000) {
      baseScore = 7;
      newStats = { ...newStats, medium: newStats.medium + 1 };
      newCombo = 1;
    } else {
      baseScore = 5;
      newStats = { ...newStats, slow: newStats.slow + 1 };
      newCombo = 1;
    }

    // Combo multiplier (max x5 bonus)
    const comboBonus = Math.min(newCombo - 1, 4);
    newScore += baseScore + comboBonus * 2;
    if (newCombo > newMaxCombo) newMaxCombo = newCombo;
    if (newCombo >= 2) events.push({ type: 'COMBO', payload: { combo: newCombo, x: nextHead.x, y: nextHead.y } });

    newFoodEatenCount += 1;
    newLastFoodEatenTime = updatedTotalTime;

    // Level up every FOOD_PER_LEVEL foods
    const newLevelCandidate = Math.floor(newFoodEatenCount / FOOD_PER_LEVEL) + 1;
    if (newLevelCandidate > newLevel) {
      newLevel = newLevelCandidate;
      events.push({ type: 'LEVEL_UP', payload: { level: newLevel } });
      // Spawn 1 extra obstacle per level (max 6)
      const obstacleCount = Math.min(newLevel - 1, 6);
      newObstacles = generateObstacles(newSnake, newFood, state.gridSize.width, state.gridSize.height, obstacleCount);
      // Every 2 levels, regenerate portals
      if (newLevel % 2 === 0) {
        newPortals = generatePortals(newSnake, newFood, newObstacles, state.gridSize.width, state.gridSize.height);
      }
    }

    // Generate new food
    newFood = generateFood(newSnake, state.gridSize.width, state.gridSize.height, [...newObstacles, ...(newPortals ?? [])]);
    nextFoodSpawnTime = updatedTotalTime;

    events.push({ type: 'FOOD_EATEN', payload: { x: nextHead.x, y: nextHead.y } });

    // Possibly spawn bonus food
    if (!newBonusFood && Math.random() < BONUS_FOOD_SPAWN_CHANCE) {
      const bonusPos = generateFood(newSnake, state.gridSize.width, state.gridSize.height, [newFood, ...newObstacles]);
      newBonusFood = {
        pos: bonusPos,
        expiresAt: updatedTotalTime + BONUS_FOOD_DURATION_MS,
        multiplier: Math.random() < 0.3 ? 3 : 2,
      };
    }

    // Possibly spawn power-up item
    if (!newPowerUpItem && Math.random() < POWER_UP_SPAWN_CHANCE) {
      const puPos = generateFood(newSnake, state.gridSize.width, state.gridSize.height, [newFood, ...newObstacles]);
      newPowerUpItem = {
        pos: puPos,
        type: Math.random() < 0.5 ? 'SHIELD' : 'SLOW',
      };
    }

  } else {
    // Normal move: remove the old tail
    newSnake.pop();
  }

  // --- EAT BONUS FOOD ---
  if (newBonusFood && nextHead.x === newBonusFood.pos.x && nextHead.y === newBonusFood.pos.y) {
    const bonus = newBonusFood.multiplier * 10;
    newScore += bonus;
    events.push({ type: 'BONUS_FOOD_EATEN', payload: { multiplier: newBonusFood.multiplier, x: nextHead.x, y: nextHead.y } });
    newBonusFood = undefined;
  }

  // --- COLLECT POWER-UP ---
  if (newPowerUpItem && nextHead.x === newPowerUpItem.pos.x && nextHead.y === newPowerUpItem.pos.y) {
    newActivePowerUp = { type: newPowerUpItem.type, expiresAt: updatedTotalTime + POWER_UP_DURATION_MS };
    events.push({ type: 'POWER_UP_COLLECTED', payload: {} });
    newPowerUpItem = undefined;
  }

  // --- CHECK ACHIEVEMENTS ---
  const nextStateForAchievement = {
    ...state,
    foodEatenCount: newFoodEatenCount,
    stats: newStats,
    combo: newCombo,
    level: newLevel,
    achievements: newAchievements,
  };
  for (const ach of ACHIEVEMENTS) {
    if (!newAchievements.includes(ach.id) && ach.check(nextStateForAchievement)) {
      newAchievements = [...newAchievements, ach.id];
      events.push({ type: 'ACHIEVEMENT', payload: { achievement: ach.label } });
    }
  }

  return {
    ...state,
    snake: newSnake,
    food: newFood,
    bonusFood: newBonusFood,
    powerUpItem: newPowerUpItem,
    activePowerUp: newActivePowerUp,
    obstacles: newObstacles,
    portals: newPortals,
    score: newScore,
    totalTime: updatedTotalTime,
    lastFoodSpawnTime: nextFoodSpawnTime,
    lastFoodEatenTime: newLastFoodEatenTime,
    combo: newCombo,
    maxCombo: newMaxCombo,
    level: newLevel,
    foodEatenCount: newFoodEatenCount,
    achievements: newAchievements,
    stats: newStats,
    events,
  };
}
