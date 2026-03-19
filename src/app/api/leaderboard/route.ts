import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const result = await db.execute('SELECT name, score, duration, created_at FROM leaderboard ORDER BY score DESC, duration ASC LIMIT 10');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Leaderboard Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, score, duration } = await req.json();
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

    if (!name || typeof score !== 'number' || typeof duration !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    await db.execute({
      sql: 'INSERT INTO leaderboard (name, score, duration, ip) VALUES (?, ?, ?, ?)',
      args: [name, score, duration, ip]
    });

    return NextResponse.json({ message: 'Score saved!' });
  } catch (error) {
    console.error('Leaderboard Save Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
