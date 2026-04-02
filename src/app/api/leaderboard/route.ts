import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const result = await db.execute('SELECT id, name, score, duration, ip, fast, medium, slow, created_at FROM leaderboard ORDER BY score DESC, duration ASC LIMIT 10');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Leaderboard Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, score, duration, stats } = await req.json();
    const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

    if (!name || typeof score !== 'number' || typeof duration !== 'number' || !stats) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    if (score <= 0 || duration <= 10000) {
      return NextResponse.json({ message: 'Score not saved due to requirements.' });
    }

    const existing = await db.execute({
      sql: 'SELECT id, score FROM leaderboard WHERE name = ? AND ip = ? LIMIT 1',
      args: [name, ip]
    });

    if (existing.rows && existing.rows.length > 0) {
      const currentScore = existing.rows[0].score as number;
      if (score > currentScore) {
        await db.execute({
          sql: 'UPDATE leaderboard SET score = ?, duration = ?, fast = ?, medium = ?, slow = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: [score, duration, stats.fast || 0, stats.medium || 0, stats.slow || 0, existing.rows[0].id]
        });
      }
    } else {
      await db.execute({
        sql: 'INSERT INTO leaderboard (name, score, duration, ip, fast, medium, slow) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [name, score, duration, ip, stats.fast || 0, stats.medium || 0, stats.slow || 0]
      });
    }

    return NextResponse.json({ message: 'Score saved!' });
  } catch (error) {
    console.error('Leaderboard Save Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
