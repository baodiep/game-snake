import { useRef, useCallback } from 'react';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.3,
  startTime = 0,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + startTime);

  gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

  osc.start(ctx.currentTime + startTime);
  osc.stop(ctx.currentTime + startTime + duration + 0.01);
}

export function useSoundEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef<boolean>(false);

  const getCtx = useCallback((): AudioContext | null => {
    if (mutedRef.current) return null;
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = getAudioContext();
    }
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playEat = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    playTone(ctx, 660, 0.12, 'sine', 0.25);
    playTone(ctx, 880, 0.08, 'sine', 0.15, 0.08);
  }, [getCtx]);

  const playBonusEat = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    // Ascending chord
    [523, 659, 784, 1047].forEach((freq, i) => {
      playTone(ctx, freq, 0.18, 'sine', 0.2, i * 0.07);
    });
  }, [getCtx]);

  const playLevelUp = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    // Arpeggio
    [330, 440, 550, 660, 880].forEach((freq, i) => {
      playTone(ctx, freq, 0.15, 'triangle', 0.25, i * 0.06);
    });
  }, [getCtx]);

  const playGameOver = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    // Falling descending tones
    [440, 330, 220, 110].forEach((freq, i) => {
      playTone(ctx, freq, 0.3, 'sawtooth', 0.18, i * 0.12);
    });
  }, [getCtx]);

  const playCombo = useCallback((combo: number) => {
    const ctx = getCtx();
    if (!ctx) return;
    const freq = 440 + combo * 80;
    playTone(ctx, freq, 0.1, 'square', 0.2);
    playTone(ctx, freq * 1.25, 0.08, 'square', 0.15, 0.06);
  }, [getCtx]);

  const playPowerUp = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    // Sweep up
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  }, [getCtx]);

  const setMuted = useCallback((val: boolean) => {
    mutedRef.current = val;
  }, []);

  return { playEat, playBonusEat, playLevelUp, playGameOver, playCombo, playPowerUp, setMuted };
}
