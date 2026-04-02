import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

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
    const { name, score, duration, stats, hash } = await req.json();
    const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

    if (!name || typeof score !== 'number' || typeof duration !== 'number' || !stats || !hash) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // HMAC Signing Check (Method 2)
    const secret = process.env.NEXT_PUBLIC_API_SECRET || "SNAKE_NEON_SECRET_2026_!@#";
    const expectedHash = crypto.createHash('sha256').update(`${name}-${score}-${duration}-${secret}`).digest('hex');

    if (hash !== expectedHash) {
      return NextResponse.json({ error: 'Hack detected: Invalid signature.' }, { status: 403 });
    }

    // Sanity Check (Method 1)
    // Max score is 10 points per food. To get 1 food requires at least 1 tick (150ms).
    // Minimum time required = (score / 10) * 150 = score * 15
    const minimumPossibleDuration = score * 15;
    if (duration < minimumPossibleDuration) {
      return NextResponse.json({ error: 'Hack detected: Impossible score for the given duration.' }, { status: 403 });
    }

    // Also check if score matches stats exactly
    const calculatedScore = (stats.fast || 0) * 10 + (stats.medium || 0) * 7 + (stats.slow || 0) * 5;
    if (score !== calculatedScore) {
      return NextResponse.json({ error: 'Hack detected: Score mismatch with stats.' }, { status: 403 });
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
