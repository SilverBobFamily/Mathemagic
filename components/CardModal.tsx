// components/CardModal.tsx
'use client';
import { useEffect } from 'react';
import type { FieldCard as FieldCardType, Card } from '@/lib/types';
import { computeCardValue } from '@/lib/GameEngine';
import CardComponent from './Card';

interface Props {
  fieldCard?: FieldCardType;
  handCard?: Card;
  releaseNumber?: number;
  onClose: () => void;
  onPlay?: () => void;
}

export default function CardModal({ fieldCard, handCard, releaseNumber, onClose, onPlay }: Props) {
  const card = fieldCard?.card ?? handCard!;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <CardComponent card={card} releaseNumber={releaseNumber} />
        {onPlay && (
          <button
            onClick={onPlay}
            style={{
              background: '#1a237e', color: '#fff', border: '2px solid #5c6bc0',
              borderRadius: 8, padding: '10px 24px', fontSize: '1em',
              cursor: 'pointer', fontFamily: "'Cinzel', serif", fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            ▶ Play This Card
          </button>
        )}
      </div>

      {fieldCard && (
        <div style={{ background: '#12122a', border: '2px solid #2a2a5a', borderRadius: 12, padding: '16px 20px', minWidth: 200, maxWidth: 260 }}>
          <h4 style={{ margin: '0 0 12px', color: '#90caf9', fontSize: '0.85em', letterSpacing: 1, textTransform: 'uppercase' }}>Math Breakdown</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e1e3a', fontSize: '0.9em' }}>
            <span style={{ color: '#888' }}>Base value</span>
            <span style={{ color: '#fff', fontFamily: 'monospace' }}>{fieldCard.card.value}</span>
          </div>
          {fieldCard.modifiers.map((mod, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e1e3a', fontSize: '0.9em' }}>
              <span style={{ color: '#888', fontSize: '0.9em' }}>
                {mod.card.type === 'item' ? '+' : '×'} {mod.card.name}
              </span>
              <span style={{ color: '#fff', fontFamily: 'monospace', background: mod.card.type === 'item' ? '#2e7d32' : '#4a148c', padding: '1px 8px', borderRadius: 4, fontSize: '0.9em' }}>
                {(mod.card.operator ?? String(mod.card.operator_value ?? mod.card.effect_type ?? '')).replace('÷', '/')}
              </span>
            </div>
          ))}
          {fieldCard.zeroed && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e1e3a', fontSize: '0.9em' }}>
              <span style={{ color: '#ef9a9a' }}>Zero Out applied</span>
              <span style={{ color: '#ef9a9a', fontFamily: 'monospace' }}>→ 0</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 700, fontSize: '1.1em', color: '#ffd54f', borderTop: '2px solid #2a2a5a', marginTop: 4 }}>
            <span>Current total</span>
            <span style={{ fontFamily: 'monospace' }}>{computeCardValue(fieldCard)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
