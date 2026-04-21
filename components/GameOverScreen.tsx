'use client';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Side } from '@/lib/types';
import confetti from 'canvas-confetti';

interface Props {
  winner: Side | 'tie';
  playerScore: number;
  opponentScore: number;
  onNewGame: () => void;
}

const EFFECTS = [
  // Classic burst
  () => {
    confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });
  },
  // Two cannons from sides
  () => {
    confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0, y: 0.65 } });
    confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.65 } });
  },
  // Fireworks
  () => {
    const fire = (ratio: number, opts: confetti.Options) =>
      confetti({ ...opts, origin: { y: 0.7 }, zIndex: 9999 });
    fire(0.25, { spread: 26, startVelocity: 55, particleCount: 40 });
    fire(0.2,  { spread: 60, particleCount: 32 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, particleCount: 50 });
    fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, particleCount: 16 });
    fire(0.2,  { spread: 120, startVelocity: 45, particleCount: 32 });
  },
  // Star shower
  () => {
    confetti({
      particleCount: 120, spread: 360, startVelocity: 20, gravity: 0.5,
      ticks: 200, shapes: ['star'], scalar: 1.4,
      colors: ['#ffd54f', '#fff', '#ce93d8', '#90caf9'],
    });
  },
  // School pride (game colors)
  () => {
    const colors = ['#5c6bc0', '#ffd54f', '#a5d6a7', '#ef9a9a'];
    confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 }, colors });
  },
];

export default function GameOverScreen({ winner, playerScore, opponentScore, onNewGame }: Props) {
  useEffect(() => {
    const effect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
    effect();
  }, []);

  const isWin  = winner === 'player';
  const isLoss = winner === 'opponent';

  const headline = isWin ? '🎉 You Win!' : isLoss ? '💀 Opponent Wins' : '🤝 It\'s a Tie!';
  const color    = isWin ? '#a5d6a7'    : isLoss ? '#ef9a9a'           : '#ffd54f';
  const bg       = isWin ? '#0a2e0a'    : isLoss ? '#2e0a0a'           : '#2a2a0a';

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Cinzel', serif",
    }}>
      <div style={{
        background: bg, border: `3px solid ${color}`,
        borderRadius: 20, padding: '40px 56px',
        textAlign: 'center', minWidth: 320,
        boxShadow: `0 0 60px ${color}44`,
      }}>
        <div style={{ fontSize: '3.5em', marginBottom: 8, fontFamily: 'sans-serif' }}>
          {isWin ? '🏆' : isLoss ? '💀' : '🤝'}
        </div>
        <h1 style={{ color, fontSize: '2em', margin: '0 0 20px', letterSpacing: 2 }}>
          {headline}
        </h1>

        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#a5d6a7', fontSize: '0.75em', letterSpacing: 1, marginBottom: 4 }}>YOU</div>
            <div style={{ color: '#fff', fontSize: '2.4em', fontWeight: 700 }}>{playerScore}</div>
          </div>
          <div style={{ color: '#444', fontSize: '2em', alignSelf: 'center' }}>vs</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ef9a9a', fontSize: '0.75em', letterSpacing: 1, marginBottom: 4 }}>OPPONENT</div>
            <div style={{ color: '#fff', fontSize: '2.4em', fontWeight: 700 }}>{opponentScore}</div>
          </div>
        </div>

        <button
          onClick={onNewGame}
          style={{
            background: color, color: '#000', border: 'none',
            borderRadius: 10, padding: '12px 36px',
            fontSize: '1em', fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Cinzel', serif", letterSpacing: 1,
          }}
        >
          Play Again
        </button>
      </div>
    </div>,
    document.body
  );
}
