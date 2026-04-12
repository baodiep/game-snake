import { useState, useCallback, useRef } from 'react';

export interface Particle {
  id: number;
  x: number; // grid x
  y: number; // grid y
  color: string;
  createdAt: number;
}

const PARTICLE_TTL_MS = 800;
let _id = 0;

export function useParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spawnParticles = useCallback((x: number, y: number, color: string) => {
    const now = Date.now();
    const newParticles: Particle[] = Array.from({ length: 6 }, () => ({
      id: _id++,
      x,
      y,
      color,
      createdAt: now,
    }));

    setParticles((prev) => [...prev, ...newParticles]);

    // Schedule cleanup
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const cutoff = Date.now() - PARTICLE_TTL_MS;
      setParticles((prev) => prev.filter((p) => p.createdAt >= cutoff));
    }, PARTICLE_TTL_MS + 50);
  }, []);

  const clearParticles = useCallback(() => setParticles([]), []);

  return { particles, spawnParticles, clearParticles };
}
