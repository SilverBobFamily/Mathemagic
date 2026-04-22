// components/FieldCard.tsx
import { useEffect, useRef, useState } from 'react';
import type { FieldCard as FieldCardType, Card } from '@/lib/types';
import { computeCardValue } from '@/lib/GameEngine';

const MOD_COLORS = {
  item:   { bg: '#2e7d32', color: '#a5d6a7' },
  action: { bg: '#4a148c', color: '#ce93d8' },
  event:  { bg: '#7f0000', color: '#ef9a9a' },
};

const SIZE_WIDTH: Record<'sm' | 'md' | 'lg', number> = { sm: 85, md: 110, lg: 160 };

interface Props {
  fieldCard: FieldCardType;
  onClick: () => void;
  highlighted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  flashModifier?: { card: Card; oldValue: number; newValue: number } | null;
}

export default function FieldCard({ fieldCard, onClick, highlighted, size = 'md', flashModifier }: Props) {
  const { card, modifiers, zeroed, squared } = fieldCard;
  const total = computeCardValue(fieldCard);
  const hasModifiers = modifiers.length > 0 || zeroed || squared;
  const isModified = hasModifiers;
  const cardWidth = SIZE_WIDTH[size];

  // Animated value counter for modifier flash
  const [animatedValue, setAnimatedValue] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!flashModifier) {
      setAnimatedValue(null);
      setShowFlash(false);
      return;
    }
    setShowFlash(true);
    const { oldValue, newValue } = flashModifier;
    const steps = 14;
    const duration = 800;
    let step = 0;
    setAnimatedValue(oldValue);
    const interval = setInterval(() => {
      step++;
      if (step >= steps) {
        setAnimatedValue(newValue);
        clearInterval(interval);
      } else {
        const t = step / steps;
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        setAnimatedValue(Math.round(oldValue + (newValue - oldValue) * eased));
      }
    }, duration / steps);

    flashTimerRef.current = setTimeout(() => {
      setShowFlash(false);
      setAnimatedValue(null);
    }, 1600);

    return () => {
      clearInterval(interval);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [flashModifier]);

  const displayValue = animatedValue !== null ? animatedValue : (isModified ? total : (card.value ?? 0));
  const valueColor = displayValue < 0 ? '#ef9a9a' : (animatedValue !== null || isModified) ? '#ffd54f' : '#fff';

  return (
    <div
      onClick={onClick}
      style={{
        width: cardWidth, borderRadius: 8, overflow: 'visible',
        border: `3px solid ${highlighted ? '#ffd54f' : showFlash ? '#ce93d8' : '#5c6bc0'}`,
        background: '#1a237e', textAlign: 'center', cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.2s',
        boxShadow: highlighted
          ? '0 0 12px rgba(255,213,79,0.6)'
          : showFlash
          ? '0 0 18px rgba(206,147,216,0.7)'
          : 'none',
        flexShrink: 0,
        position: 'relative',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
    >
      <style>{`
        @keyframes modSlideIn {
          0%   { transform: translateY(-100%) scale(0.8); opacity: 0; }
          60%  { transform: translateY(4px) scale(1.05); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes modFadeOut {
          0%   { opacity: 1; }
          100% { opacity: 0; transform: translateY(-8px); }
        }
      `}</style>

      {/* Modifier flash badge */}
      {showFlash && flashModifier && (
        <div style={{
          position: 'absolute', top: -36, left: 0, right: 0, zIndex: 10,
          background: flashModifier.card.type === 'action' ? '#4a148c' : '#1b5e20',
          color: flashModifier.card.type === 'action' ? '#ce93d8' : '#a5d6a7',
          borderRadius: 6, padding: '3px 6px',
          fontSize: '0.68em', fontWeight: 700,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          animation: 'modSlideIn 0.35s ease-out forwards',
          border: `1px solid ${flashModifier.card.type === 'action' ? '#9c27b0' : '#4caf50'}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}>
          {(flashModifier.card.operator ?? '').replace('÷', '/')} {flashModifier.card.name}
        </div>
      )}

      <div style={{ background: '#0d1642', padding: '3px 6px', fontSize: '0.8em', color: '#fff', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: cardWidth - 28 }}>{card.name}</span>
        <span style={{
          color: valueColor, fontWeight: isModified || animatedValue !== null ? 900 : 700,
          transition: 'color 0.15s',
          fontSize: animatedValue !== null ? '1.1em' : '1em',
        }}>{displayValue}</span>
      </div>
      <div style={{ height: size === 'lg' ? 80 : 56, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {card.art_url
          ? <img src={card.art_url} alt={card.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <span style={{ fontSize: size === 'lg' ? '3.5em' : '2.4em' }}>{card.art_emoji}</span>}
      </div>
      {modifiers.map((mod, i) => {
        const colors = MOD_COLORS[mod.card.type as keyof typeof MOD_COLORS] ?? MOD_COLORS.item;
        return (
          <div key={i} style={{ background: colors.bg, color: colors.color, fontSize: '0.65em', padding: '2px 4px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {(mod.card.operator ?? mod.card.effect_type ?? '').replace('÷', '/')} {mod.card.name}
          </div>
        );
      })}
      {zeroed && (
        <div style={{ background: '#7f0000', color: '#ef9a9a', fontSize: '0.65em', padding: '2px 4px', fontWeight: 700 }}>ZEROED</div>
      )}
      {squared && (
        <div style={{ background: '#c8960c', color: '#fff8e1', fontSize: '0.65em', padding: '2px 4px', fontWeight: 700 }}>SQUARED x²</div>
      )}
    </div>
  );
}
