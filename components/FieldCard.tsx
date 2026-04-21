// components/FieldCard.tsx
import type { FieldCard as FieldCardType } from '@/lib/types';
import { computeCardValue } from '@/lib/GameEngine';

const MOD_COLORS = {
  item:   { bg: '#2e7d32', color: '#a5d6a7' },
  action: { bg: '#4a148c', color: '#ce93d8' },
  event:  { bg: '#7f0000', color: '#ef9a9a' },
};

const SIZE_WIDTH: Record<'sm' | 'md' | 'lg', number> = { sm: 80, md: 100, lg: 130 };

interface Props {
  fieldCard: FieldCardType;
  onClick: () => void;
  highlighted?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function FieldCard({ fieldCard, onClick, highlighted, size = 'md' }: Props) {
  const { card, modifiers, zeroed } = fieldCard;
  const total = computeCardValue(fieldCard);
  const hasModifiers = modifiers.length > 0 || zeroed;
  const isModified = hasModifiers;
  // Show current computed value in the header; highlight it when it differs from base
  const displayValue = isModified ? total : (card.value ?? 0);
  const valueColor = displayValue < 0 ? '#ef9a9a' : isModified ? '#ffd54f' : '#fff';
  const cardWidth = SIZE_WIDTH[size];

  return (
    <div
      onClick={onClick}
      style={{
        width: cardWidth, borderRadius: 8, overflow: 'hidden',
        border: `3px solid ${highlighted ? '#ffd54f' : '#5c6bc0'}`,
        background: '#1a237e', textAlign: 'center', cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: highlighted ? '0 0 12px rgba(255,213,79,0.6)' : 'none',
        flexShrink: 0,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
    >
      <div style={{ background: '#0d1642', padding: '3px 6px', fontSize: '0.8em', color: '#fff', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: cardWidth - 28 }}>{card.name}</span>
        <span style={{ color: valueColor, fontWeight: isModified ? 900 : 700 }}>{displayValue}</span>
      </div>
      <div style={{ fontSize: size === 'lg' ? '2.8em' : '2.2em', padding: '6px 0' }}>{card.art_emoji}</div>
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
    </div>
  );
}
