'use client';
import { useEffect, useRef, useState } from 'react';
import type { Card, Release } from '@/lib/types';
import CardComponent from './Card';
import { useWindowWidth } from '@/hooks/useWindowWidth';

interface Props {
  cards: Card[];
  initialIndex: number;
  release: Release | null;
  onClose: () => void;
}

const TYPE_GLOW: Record<string, string> = {
  creature: '#5c6bc0',
  item: '#81c784',
  action: '#ce93d8',
  event: '#ef9a9a',
};

export default function CardBrowserModal({ cards, initialIndex, release, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const windowWidth = useWindowWidth();
  const scale = windowWidth < 640 ? 1 : 1.73;
  const card = cards[currentIndex];
  const glowColor = TYPE_GLOW[card.type] ?? '#5c6bc0';
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < cards.length - 1;

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'ArrowLeft') setCurrentIndex(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setCurrentIndex(i => Math.min(cards.length - 1, i + 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cards.length]);

  return (
    <div
      data-testid="card-browser-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40,
      }}
    >
      <button
        aria-label="Previous card"
        onClick={e => { e.stopPropagation(); if (canGoPrev) setCurrentIndex(i => i - 1); }}
        disabled={!canGoPrev}
        style={{
          background: 'none', border: 'none',
          cursor: canGoPrev ? 'pointer' : 'default',
          color: canGoPrev ? '#5c6bc0' : '#333',
          fontSize: '2.5em', padding: '20px', flexShrink: 0,
        }}
      >◀</button>

      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
      >
        <div style={{ boxShadow: `0 0 60px ${glowColor}55, 0 20px 60px rgba(0,0,0,0.8)`, borderRadius: 18 }}>
          <CardComponent
            card={{ ...card, release: release ?? undefined }}
            releaseNumber={release?.number}
            scale={scale}
          />
        </div>
        <div style={{ color: '#999', fontSize: '0.85em', letterSpacing: 1 }}>
          {currentIndex + 1} of {cards.length}
        </div>
      </div>

      <button
        aria-label="Next card"
        onClick={e => { e.stopPropagation(); if (canGoNext) setCurrentIndex(i => i + 1); }}
        disabled={!canGoNext}
        style={{
          background: 'none', border: 'none',
          cursor: canGoNext ? 'pointer' : 'default',
          color: canGoNext ? '#5c6bc0' : '#333',
          fontSize: '2.5em', padding: '20px', flexShrink: 0,
        }}
      >▶</button>
    </div>
  );
}
