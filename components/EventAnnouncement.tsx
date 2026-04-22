'use client';
import { useEffect, useState } from 'react';
import type { Card } from '@/lib/types';
import CardComponent from './Card';
import { useWindowWidth } from '@/hooks/useWindowWidth';

interface Props {
  card: Card;
  playedBy: 'player' | 'opponent';
  onDismiss: () => void;
}

const EFFECT_LABELS: Record<string, string> = {
  zero_out: 'Zero Out — reduces a creature to 0',
  banish:   'Banish — removes a creature from the field',
  x100:     '×100 — multiplies a creature\'s value by 100',
  mirror:   'Mirror — copies one creature\'s value onto another',
  swap:     'Swap — exchanges two creatures between fields',
  reverse:  'Reverse — flips every creature\'s sign on a field',
  square:       'x² — squares a creature\'s current value',
  reset:        'Reset — restores a creature to its original base value',
  multi_zero:   'Family Brawl — zeroes out every creature on one side',
  reverse_all:  'Reverse All — flips the signs of every creature on one side',
};

export default function EventAnnouncement({ card, playedBy, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') onDismiss(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDismiss]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onDismiss(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: isMobile ? 16 : 24,
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.92)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        padding: 24,
      }}
    >
      <style>{`
        @keyframes eventGlow {
          0%   { text-shadow: 0 0 8px rgba(239,154,154,0.4); }
          100% { text-shadow: 0 0 28px rgba(239,154,154,1), 0 0 56px rgba(239,154,154,0.5); }
        }
        @keyframes cardDrop {
          0%   { transform: translateY(-40px) scale(0.85); opacity: 0; }
          60%  { transform: translateY(6px) scale(1.02); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes pulseBorder {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,154,154,0); }
          50%       { box-shadow: 0 0 0 10px rgba(239,154,154,0.25); }
        }
      `}</style>

      <div style={{
        color: '#ef9a9a',
        fontFamily: "'Cinzel', serif",
        fontSize: isMobile ? '1.1em' : '1.5em',
        fontWeight: 700,
        letterSpacing: 4,
        textTransform: 'uppercase',
        animation: 'eventGlow 0.7s ease-in-out infinite alternate',
        textAlign: 'center',
      }}>
        ⚡ {playedBy === 'opponent' ? 'Opponent plays an' : 'You played an'} Event Card ⚡
      </div>

      <div style={{ animation: 'cardDrop 0.45s ease-out forwards' }}>
        <div style={{ animation: 'pulseBorder 1.4s ease-in-out infinite', borderRadius: 20 }}>
          <CardComponent card={card} scale={isMobile ? 1 : 1.5} releaseNumber={card.release?.number} />
        </div>
      </div>

      {card.effect_type && (
        <div style={{
          color: '#ef9a9a',
          fontFamily: "'Crimson Text', serif",
          fontSize: isMobile ? '0.95em' : '1.1em',
          fontStyle: 'italic',
          textAlign: 'center',
          maxWidth: 380,
          opacity: 0.9,
        }}>
          {EFFECT_LABELS[card.effect_type] ?? card.effect_text ?? ''}
        </div>
      )}

      <button
        onClick={onDismiss}
        style={{
          background: '#7f0000',
          color: '#fff',
          border: '2px solid #ef9a9a',
          borderRadius: 8,
          padding: isMobile ? '10px 28px' : '13px 40px',
          fontSize: isMobile ? '1em' : '1.15em',
          cursor: 'pointer',
          fontFamily: "'Cinzel', serif",
          fontWeight: 700,
          letterSpacing: 1,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#b71c1c'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#7f0000'; }}
      >
        Dismiss
      </button>
    </div>
  );
}
