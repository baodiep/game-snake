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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.execute("ALTER TABLE leaderboard ADD COLUMN duration INTEGER NOT NULL DEFAULT 0");
  } catch (e) {
    // Column likely already exists
  }
}

// Automatically init the DB on load
initDb().catch(console.error);

export default db;
