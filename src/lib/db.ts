import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:snake.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      ip TEXT,
      fast INTEGER NOT NULL DEFAULT 0,
      medium INTEGER NOT NULL DEFAULT 0,
      slow INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.execute("ALTER TABLE leaderboard ADD COLUMN duration INTEGER NOT NULL DEFAULT 0");
  } catch (e) {
    // Column likely already exists
  }
  
  try {
    await db.execute("ALTER TABLE leaderboard ADD COLUMN fast INTEGER NOT NULL DEFAULT 0");
    await db.execute("ALTER TABLE leaderboard ADD COLUMN medium INTEGER NOT NULL DEFAULT 0");
    await db.execute("ALTER TABLE leaderboard ADD COLUMN slow INTEGER NOT NULL DEFAULT 0");
  } catch (e) {
    // Columns likely already exist
  }
}

// Automatically init the DB on load
initDb().catch(console.error);

export default db;
