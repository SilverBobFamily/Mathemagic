// components/Card.tsx
import type { Card as CardType } from '@/lib/types';

const TYPE_STYLES: Record<string, {
  border: string; bg: string; nameBg: string; artGrad: string;
  typeBg: string; typeColor: string; textBg: string;
  flavorColor: string; footerBg: string; footerColor: string;
}> = {
  creature: {
    border: '#5c6bc0', bg: '#1a237e', nameBg: '#0d1642',
    artGrad: 'linear-gradient(160deg,#283593,#1a237e)',
    typeBg: '#0d1642', typeColor: '#90caf9',
    textBg: '#0a0e2e', flavorColor: '#7986cb',
    footerBg: '#0d1642', footerColor: '#5c6bc0',
  },
  item: {
    border: '#81c784', bg: '#1b5e20', nameBg: '#0a2e0e',
    artGrad: 'linear-gradient(160deg,#2e7d32,#1b5e20)',
    typeBg: '#0a2e0e', typeColor: '#a5d6a7',
    textBg: '#071a09', flavorColor: '#81c784',
    footerBg: '#0a2e0e', footerColor: '#4caf50',
  },
  action: {
    border: '#ce93d8', bg: '#4a148c', nameBg: '#1a0533',
    artGrad: 'linear-gradient(160deg,#6a1b9a,#4a148c)',
    typeBg: '#1a0533', typeColor: '#ce93d8',
    textBg: '#0f0120', flavorColor: '#ce93d8',
    footerBg: '#1a0533', footerColor: '#ab47bc',
  },
  event: {
    border: '#ef9a9a', bg: '#7f0000', nameBg: '#2e0000',
    artGrad: 'linear-gradient(160deg,#c62828,#7f0000)',
    typeBg: '#2e0000', typeColor: '#ef9a9a',
    textBg: '#1a0000', flavorColor: '#ef9a9a',
    footerBg: '#2e0000', footerColor: '#e53935',
  },
};

interface Props {
  card: CardType;
  releaseNumber?: number;
}

export default function Card({ card, releaseNumber }: Props) {
  const s = TYPE_STYLES[card.type] ?? TYPE_STYLES.creature;
  const displayValue =
    card.type === 'creature' ? String(card.value ?? 0) :
    card.type === 'event' ? 'EVENT' :
    (card.operator ?? '');
  const valueColor = card.type === 'creature' && (card.value ?? 0) < 0 ? '#ef5350' : '#90caf9';

  return (
    <div style={{ width: 220, borderRadius: 14, overflow: 'hidden', border: `6px solid ${s.border}`, background: s.bg, fontFamily: 'serif', flexShrink: 0 }}>
      {/* Name bar */}
      <div style={{ padding: '7px 12px', background: s.nameBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{card.name}</span>
        <span style={{ background: card.type === 'event' ? '#b71c1c' : 'rgba(0,0,0,0.4)', color: valueColor, fontWeight: 900, fontSize: '0.9em', padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
          {displayValue}
        </span>
      </div>
      {/* Art */}
      <div style={{ height: 140, background: s.artGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5.5em', borderTop: `2px solid ${s.border}`, borderBottom: `2px solid ${s.border}` }}>
        {card.art_url
          ? <img src={card.art_url} alt={card.name} style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
          : card.art_emoji}
      </div>
      {/* Type line */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: s.typeBg, fontSize: '0.75em', color: s.typeColor, fontStyle: 'italic', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <span style={{ textTransform: 'capitalize' }}>{card.type}</span>
        <span style={{ fontSize: '1.4em' }}>{card.release?.icon ?? ''}</span>
      </div>
      {/* Text box */}
      <div style={{ padding: '10px 12px', minHeight: 70, background: s.textBg, fontSize: '0.82em' }}>
        {card.effect_text && <p style={{ color: '#ddd', margin: '0 0 8px' }}>{card.effect_text}</p>}
        <p style={{ color: s.flavorColor, fontStyle: 'italic', margin: 0 }}>{card.flavor_text}</p>
      </div>
      {/* Footer */}
      <div style={{ padding: '5px 10px', background: s.footerBg, fontSize: '0.65em', letterSpacing: 1, textAlign: 'right', color: s.footerColor }}>
        {releaseNumber ? `R${releaseNumber}` : ''}
      </div>
    </div>
  );
}
