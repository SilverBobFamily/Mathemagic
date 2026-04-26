'use client';
import { useState, useCallback, useRef } from 'react';
import type { GameState, Card, FieldCard as FieldCardType, Side } from '@/lib/types';
import {
  computeScore, computeCardValue,
  playCreature, playModifier, playEvent,
  endTurn, passTurn, isGameOver, getWinner,
} from '@/lib/GameEngine';
import CardModal from './CardModal';
import LearningModePrompt from './LearningModePrompt';
import GameOverScreen from './GameOverScreen';
import EventAnnouncement from './EventAnnouncement';
import HandoffScreen from './HandoffScreen';
import { useWindowWidth } from '@/hooks/useWindowWidth';

// ── Design tokens ─────────────────────────────────────────────────────
const P = {
  surface:    '#0e0e18',
  surfaceLow: '#141420',
  container:  '#1a1a28',
  high:       '#22223a',
  highest:    '#2e2e48',
  primary:    '#ffd54f',
  primaryDim: '#ebc23e',
  text:       '#e3e0f8',
  textMuted:  '#9994b8',
  ghost:      'rgba(255,255,255,0.06)',
};

const TYPE = {
  creature: { halo: 'rgba(69,79,195,0.3)',  ring: 'rgba(92,107,192,0.45)',  label: '#9da8ff', bg: 'rgba(26,35,126,0.45)'  },
  item:     { halo: 'rgba(27,94,32,0.3)',    ring: 'rgba(102,187,106,0.45)', label: '#a5d6a7', bg: 'rgba(27,94,32,0.45)'   },
  action:   { halo: 'rgba(106,27,154,0.3)', ring: 'rgba(186,104,200,0.45)', label: '#ce93d8', bg: 'rgba(74,20,140,0.45)'  },
  event:    { halo: 'rgba(183,28,28,0.3)',  ring: 'rgba(229,115,115,0.45)', label: '#ef9a9a', bg: 'rgba(127,0,0,0.45)'   },
};

const SERIF = "'Noto Serif', 'Crimson Text', serif";
const MONO  = "'Space Grotesk', 'SF Mono', monospace";

// ── Equation chain with per-card emoji ────────────────────────────────
function EquationChain({ fc, flipped }: { fc: FieldCardType; flipped?: boolean }) {
  const total = computeCardValue(fc);
  const hasModifiers = fc.modifiers.length > 0 || fc.zeroed || fc.squared;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
      padding: '5px 10px',
      background: 'rgba(0,0,0,0.4)',
      fontFamily: MONO, fontSize: '0.72em',
      borderTop: `1px solid ${P.ghost}`,
      justifyContent: flipped ? 'flex-end' : 'flex-start',
    }}>
      {/* Creature chip */}
      <span style={{
        background: TYPE.creature.bg, border: `1px solid ${TYPE.creature.ring}`,
        borderRadius: 4, padding: '1px 6px', color: TYPE.creature.label,
        display: 'inline-flex', alignItems: 'center', gap: 3,
      }}>
        <span>{fc.card.art_emoji}</span>
        <span style={{ fontWeight: 700 }}>{fc.card.value ?? 0}</span>
      </span>

      {fc.modifiers.map((mod, i) => {
        const t   = TYPE[mod.card.type as keyof typeof TYPE] ?? TYPE.item;
        const op  = mod.card.operator ?? '';
        const val = mod.card.operator_value ?? '';
        return (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <span style={{ color: '#444', fontSize: '0.9em' }}>·</span>
            <span style={{
              background: t.bg, border: `1px solid ${t.ring}`,
              borderRadius: 4, padding: '1px 6px', color: t.label,
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              <span>{mod.card.art_emoji}</span>
              <span style={{ fontWeight: 700 }}>{op}{val}</span>
            </span>
          </span>
        );
      })}

      {fc.zeroed  && <span style={{ background: TYPE.event.bg, border: `1px solid ${TYPE.event.ring}`, borderRadius: 4, padding: '1px 6px', color: '#ef9a9a' }}>→ 0</span>}
      {fc.squared && <span style={{ background: 'rgba(200,150,12,0.3)', border: '1px solid rgba(255,213,79,0.3)', borderRadius: 4, padding: '1px 6px', color: '#fff8e1' }}>x²</span>}

      {hasModifiers && (
        <>
          <span style={{ color: '#444' }}>=</span>
          <span style={{
            color: P.primary, fontWeight: 700, fontSize: '1.1em',
            textShadow: '0 0 10px rgba(255,213,79,0.7)',
          }}>{total}</span>
        </>
      )}
    </div>
  );
}

// ── Field card ────────────────────────────────────────────────────────
function FieldCardV2({ fc, onClick, highlighted, isFirstTarget, flashCard }: {
  fc: FieldCardType;
  onClick: () => void;
  highlighted?: boolean;
  isFirstTarget?: boolean;
  flashCard?: Card | null;
}) {
  const hasModifiers = fc.modifiers.length > 0 || fc.zeroed || fc.squared;
  const glow = highlighted
    ? `0 0 0 2px ${P.primary}, 0 0 24px rgba(255,213,79,0.45)`
    : isFirstTarget
    ? '0 0 0 2px #ce93d8, 0 0 20px rgba(206,147,216,0.4)'
    : '0 0 0 1px rgba(92,107,192,0.3), 0 0 16px rgba(69,79,195,0.2)';

  return (
    <div
      onClick={onClick}
      style={{
        width: 170, borderRadius: 10, overflow: 'hidden',
        background: P.container,
        boxShadow: glow,
        cursor: 'pointer', flexShrink: 0,
        transition: 'transform 0.15s, box-shadow 0.2s',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
    >
      {/* Name */}
      <div style={{
        padding: '6px 8px 2px',
        fontFamily: SERIF, fontSize: '0.72em', fontWeight: 700,
        color: P.text, letterSpacing: 0.3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {fc.card.name}
      </div>

      {/* Flavor text */}
      {fc.card.flavor_text && (
        <div style={{
          padding: '0 8px 4px',
          fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.62em',
          color: P.textMuted, lineHeight: 1.3,
          overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
        }}>
          {fc.card.flavor_text}
        </div>
      )}

      {/* Art */}
      <div style={{
        flex: 1, minHeight: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '3.4em', position: 'relative',
        background: `radial-gradient(circle at center, rgba(69,79,195,0.18) 0%, transparent 70%)`,
      }}>
        {fc.card.art_url
          ? <img src={fc.card.art_url} alt={fc.card.name}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : fc.card.art_emoji}
      </div>

      {/* Base value */}
      <div style={{
        padding: '4px 8px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.3)',
        fontFamily: MONO, fontSize: '0.68em', color: P.textMuted,
      }}>
        <span>Base</span>
        <span style={{ color: P.text, fontWeight: 700 }}>{fc.card.value ?? 0}</span>
      </div>

      {/* Equation chain */}
      {hasModifiers && <EquationChain fc={fc} />}

      {/* Flash badge */}
      {flashCard && (
        <div style={{
          position: 'absolute', top: -34, left: 0, right: 0, textAlign: 'center',
          background: TYPE[flashCard.type as keyof typeof TYPE]?.bg ?? P.high,
          color: TYPE[flashCard.type as keyof typeof TYPE]?.label ?? P.text,
          fontSize: '0.62em', fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          pointerEvents: 'none', fontFamily: MONO,
        }}>
          {flashCard.art_emoji} {flashCard.operator}{flashCard.operator_value !== undefined ? flashCard.operator_value : ''} {flashCard.name}
        </div>
      )}
    </div>
  );
}

// ── Hand card ─────────────────────────────────────────────────────────
function HandCardV2({ card, selected, isMyTurn, onDragStart, onDragEnd, onClick }: {
  card: Card; selected: boolean; isMyTurn: boolean;
  onDragStart: () => void; onDragEnd: () => void; onClick: () => void;
}) {
  const t = TYPE[card.type as keyof typeof TYPE] ?? TYPE.creature;
  const glow = selected
    ? `0 0 0 2px ${P.primary}, 0 0 28px rgba(255,213,79,0.5)`
    : `0 0 0 1px ${t.ring}, 0 0 14px ${t.halo}`;

  const valueLabel = card.type === 'event'
    ? (card.effect_type ?? 'EVT').replace('_', ' ').toUpperCase()
    : card.value !== undefined ? String(card.value)
    : `${card.operator ?? ''}${card.operator_value ?? ''}`;

  return (
    <div
      draggable={isMyTurn}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        width: 120, borderRadius: 10, overflow: 'hidden',
        background: P.container,
        boxShadow: glow,
        cursor: isMyTurn ? 'grab' : 'pointer',
        flexShrink: 0, userSelect: 'none',
        transition: 'transform 0.12s, box-shadow 0.2s',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-8px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
    >
      {/* Art */}
      <div style={{
        height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2.6em', position: 'relative',
        background: `radial-gradient(circle at center, ${t.halo} 0%, transparent 70%)`,
      }}>
        {card.art_url
          ? <img src={card.art_url} alt={card.name}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : card.art_emoji}
      </div>

      {/* Name */}
      <div style={{
        padding: '4px 6px 2px',
        fontFamily: SERIF, fontSize: '0.65em', color: P.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {card.name}
      </div>

      {/* Value + type */}
      <div style={{
        padding: '2px 6px 6px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          fontFamily: MONO, fontSize: '0.7em', letterSpacing: 1,
          color: t.label, textTransform: 'uppercase',
        }}>
          {card.type === 'creature' ? 'Val' : card.type}
        </span>
        <span style={{
          fontFamily: MONO, fontWeight: 700, fontSize: '0.85em',
          color: selected ? P.primary : t.label,
          textShadow: selected ? '0 0 8px rgba(255,213,79,0.6)' : 'none',
        }}>
          {valueLabel}
        </span>
      </div>
    </div>
  );
}

// ── Score display ─────────────────────────────────────────────────────
function ScoreDisplay({ label, score, color, align }: {
  label: string; score: number; color: string; align: 'left' | 'right';
}) {
  return (
    <div style={{ textAlign: align, lineHeight: 1 }}>
      <div style={{
        fontFamily: MONO, fontSize: '0.6em', letterSpacing: 3,
        color: P.textMuted, textTransform: 'uppercase', marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: MONO, fontWeight: 700, fontSize: '1.6em',
        color, textShadow: `0 0 20px ${color}80`,
      }}>
        {score}
      </div>
    </div>
  );
}

// ── Props + flash type ────────────────────────────────────────────────
interface Props {
  state: GameState;
  onStateChange: (s: GameState) => void;
  mode: 'ai' | 'pass-and-play';
  onNewGame: () => void;
  aiEventAnnouncement?: { card: Card; playedBy: 'opponent' } | null;
  onAiEventDismissed?: () => void;
}

interface ModifierFlash { creatureId: number; card: Card; oldValue: number; newValue: number; }

// ── Main board ────────────────────────────────────────────────────────
export default function GameBoardV2({ state, onStateChange, mode, onNewGame, aiEventAnnouncement, onAiEventDismissed }: Props) {
  const [modalData,       setModalData]       = useState<{ fieldCard?: FieldCardType; handCard?: Card } | null>(null);
  const [selectedCard,    setSelectedCard]    = useState<Card | null>(null);
  const [firstEventTarget,setFirstEventTarget]= useState<{ creatureId: number; side: Side } | null>(null);
  const [learningCheck,   setLearningCheck]   = useState<{ fieldCard: FieldCardType; modifierCard: Card; onConfirm: () => void } | null>(null);
  const [draggedCard,     setDraggedCard]     = useState<Card | null>(null);
  const [eventAnnounce,   setEventAnnounce]   = useState<{ card: Card; applyFn: () => void } | null>(null);
  const [modifierFlash,   setModifierFlash]   = useState<ModifierFlash | null>(null);
  const modFlashTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggedCardRef = useRef<Card | null>(null);
  const dropJustFired  = useRef(false);

  const windowWidth = useWindowWidth();
  const [showHandoff, setShowHandoff] = useState(mode === 'pass-and-play');
  const [handoffNext, setHandoffNext] = useState<GameState | null>(null);

  const flipped      = mode === 'pass-and-play' && state.turn === 'opponent';
  const topSide: Side    = flipped ? 'player'   : 'opponent';
  const bottomSide: Side = flipped ? 'opponent' : 'player';
  const activeSide: Side = mode === 'pass-and-play' ? state.turn : 'player';
  const isMyTurn     = mode === 'pass-and-play' ? true : state.turn === 'player';
  const gameOver     = isGameOver(state);
  const winner       = gameOver ? getWinner(state) : null;

  const endTurnInMode = useCallback((next: GameState) => {
    if (mode === 'pass-and-play') { setHandoffNext(next); setShowHandoff(true); }
    else onStateChange(next);
  }, [mode, onStateChange]);

  const dismissHandoff = useCallback(() => {
    const next = handoffNext;
    setHandoffNext(null); setShowHandoff(false);
    if (next) onStateChange(next);
  }, [handoffNext, onStateChange]);

  const clearSelection = useCallback(() => {
    setSelectedCard(null); setFirstEventTarget(null); setModalData(null); setLearningCheck(null);
  }, []);

  const playAndEndTurn = useCallback((next: GameState) => {
    clearSelection();
    endTurnInMode(endTurn(next));
  }, [endTurnInMode, clearSelection]);

  const playModifierWithFlash = useCallback((cur: GameState, cardId: number, creatureId: number, side: Side) => {
    const targetFc = cur[side].field.find(fc => fc.card.id === creatureId);
    const modCard  = cur[cur.turn].hand.find(c => c.id === cardId);
    const oldValue = targetFc ? computeCardValue(targetFc) : 0;
    const next     = playModifier(cur, cardId, creatureId, side);
    const newFc    = next[side].field.find(fc => fc.card.id === creatureId);
    if (modCard && targetFc) {
      if (modFlashTimer.current) clearTimeout(modFlashTimer.current);
      setModifierFlash({ creatureId, card: modCard, oldValue, newValue: newFc ? computeCardValue(newFc) : 0 });
      modFlashTimer.current = setTimeout(() => setModifierFlash(null), 1700);
    }
    clearSelection();
    endTurnInMode(endTurn(next));
  }, [endTurnInMode, clearSelection]);

  const handleHandCardClick = useCallback((card: Card) => {
    if (gameOver) return;
    setModalData({ handCard: card });
  }, [gameOver]);

  const handlePlayFromModal = useCallback((card: Card) => {
    setModalData(null); setSelectedCard(card); setFirstEventTarget(null);
  }, []);

  const handleDragStart = useCallback((card: Card) => {
    draggedCardRef.current = card; setDraggedCard(card); setSelectedCard(card);
  }, []);

  const handleDragEnd = useCallback(() => {
    draggedCardRef.current = null; setDraggedCard(null);
  }, []);

  const handleDropOnZone = useCallback((side: Side) => {
    const card = draggedCardRef.current ?? selectedCard;
    if (!card || card.type !== 'creature') return;
    dropJustFired.current = true;
    requestAnimationFrame(() => { dropJustFired.current = false; });
    draggedCardRef.current = null; setDraggedCard(null);
    playAndEndTurn(playCreature(state, card.id, side));
  }, [selectedCard, state, playAndEndTurn]);

  const handleFieldZoneClick = useCallback((side: Side) => {
    if (dropJustFired.current) return;
    if (gameOver || !selectedCard || selectedCard.type !== 'creature') return;
    playAndEndTurn(playCreature(state, selectedCard.id, side));
  }, [gameOver, selectedCard, state, playAndEndTurn]);

  const handleFieldCardClick = useCallback((fc: FieldCardType, side: Side) => {
    if (gameOver) { setModalData({ fieldCard: fc }); return; }
    if (!selectedCard) { setModalData({ fieldCard: fc }); return; }
    if (!isMyTurn) { setSelectedCard(null); setFirstEventTarget(null); setModalData({ fieldCard: fc }); return; }

    if (selectedCard.type === 'item' || selectedCard.type === 'action') {
      const doPlay = () => playModifierWithFlash(state, selectedCard.id, fc.card.id, side);
      if (state.learningMode) { setModalData(null); setLearningCheck({ fieldCard: fc, modifierCard: selectedCard, onConfirm: doPlay }); return; }
      doPlay(); return;
    }

    if (selectedCard.type === 'event') {
      const effect = selectedCard.effect_type;
      if (effect === 'swap' || effect === 'mirror') {
        if (!firstEventTarget) { setFirstEventTarget({ creatureId: fc.card.id, side }); return; }
        const doPlay = () => {
          const next = playEvent(state, selectedCard.id, firstEventTarget.creatureId, firstEventTarget.side, fc.card.id, side);
          setEventAnnounce({ card: selectedCard, applyFn: () => playAndEndTurn(next) });
          clearSelection();
        };
        if (state.learningMode && effect === 'mirror') { setLearningCheck({ fieldCard: fc, modifierCard: selectedCard, onConfirm: doPlay }); return; }
        doPlay(); return;
      }
      const doPlay = () => {
        const next = playEvent(state, selectedCard.id, fc.card.id, side);
        setEventAnnounce({ card: selectedCard, applyFn: () => playAndEndTurn(next) });
        clearSelection();
      };
      if (state.learningMode && (effect === 'x100' || effect === 'reverse' || effect === 'square')) {
        const cur = state[side].field.find(f => f.card.id === fc.card.id);
        const syntheticMod: Card = { ...selectedCard, operator_value: effect === 'x100' ? 100 : effect === 'square' ? (cur ? computeCardValue(cur) : 0) : -1, type: 'action' };
        setLearningCheck({ fieldCard: fc, modifierCard: syntheticMod, onConfirm: doPlay }); return;
      }
      doPlay(); return;
    }
  }, [gameOver, isMyTurn, selectedCard, firstEventTarget, state, playAndEndTurn, playModifierWithFlash, clearSelection]);

  const handleDropOnFieldCard = useCallback((fc: FieldCardType, side: Side) => {
    const card = draggedCardRef.current;
    if (!card) return;
    dropJustFired.current = true;
    requestAnimationFrame(() => { dropJustFired.current = false; });
    draggedCardRef.current = null; setDraggedCard(null); setSelectedCard(null);
    if (card.type === 'item' || card.type === 'action') {
      const doPlay = () => playModifierWithFlash(state, card.id, fc.card.id, side);
      if (state.learningMode) setLearningCheck({ fieldCard: fc, modifierCard: card, onConfirm: doPlay });
      else doPlay();
    } else if (card.type === 'event') {
      setSelectedCard(card);
    }
  }, [state, playModifierWithFlash]);

  const isCreatureSelected = selectedCard?.type === 'creature';
  const isTargeting        = !!selectedCard && selectedCard.type !== 'creature';

  const instructionText = !selectedCard ? null
    : isCreatureSelected ? 'Click a zone to place creature'
    : selectedCard.type === 'event' && (selectedCard.effect_type === 'swap' || selectedCard.effect_type === 'mirror') && !firstEventTarget ? 'Click first target'
    : selectedCard.type === 'event' && firstEventTarget ? 'Click second target'
    : 'Click a creature to apply';

  const showEventModal = eventAnnounce || (aiEventAnnouncement ?? null);
  const eventCard      = eventAnnounce?.card ?? aiEventAnnouncement?.card ?? null;
  const eventPlayedBy  = eventAnnounce ? 'player' : 'opponent';
  const dismissEvent   = () => {
    if (eventAnnounce) { const fn = eventAnnounce.applyFn; setEventAnnounce(null); fn(); }
    else onAiEventDismissed?.();
  };

  const zoneStyle: React.CSSProperties = {
    minHeight: 180, padding: '12px 16px',
    display: 'flex', gap: 16, flexWrap: 'wrap',
    borderRadius: 8,
    border: isCreatureSelected ? `2px dashed rgba(255,213,79,0.5)` : '2px solid transparent',
    cursor: isCreatureSelected ? 'pointer' : 'default',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      background: P.surface, borderRadius: 14, overflow: 'hidden',
      fontFamily: SERIF, color: P.text,
      boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
      fontSize: '1.5em',
    }}>

      {/* ── Adversary zone ── */}
      <div style={{
        background: `radial-gradient(ellipse at 50% 0%, rgba(127,0,0,0.18) 0%, transparent 60%), ${P.surfaceLow}`,
        padding: '18px 20px 14px',
        borderBottom: `1px solid ${P.ghost}`,
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <span style={{
            fontFamily: MONO, fontSize: '0.65em', letterSpacing: 3,
            color: '#7a3a3a', textTransform: 'uppercase', paddingTop: 6,
          }}>
            {state[topSide].deck.length} cards left
          </span>
          <ScoreDisplay
            label="Player 2"
            score={computeScore(state[topSide].field)}
            color="#ef5350"
            align="right"
          />
        </div>

        {/* Field */}
        <div
          onClick={() => handleFieldZoneClick(topSide)}
          onDragOver={e => { if (isCreatureSelected || draggedCard?.type === 'creature') e.preventDefault(); }}
          onDrop={() => handleDropOnZone(topSide)}
          style={zoneStyle}
        >
          {state[topSide].field.map(fc => (
            <div key={fc.card.id}
              onDragOver={e => { if (isTargeting || (draggedCard && draggedCard.type !== 'creature')) e.preventDefault(); }}
              onDrop={() => handleDropOnFieldCard(fc, topSide)}
            >
              <FieldCardV2
                fc={fc}
                onClick={() => handleFieldCardClick(fc, topSide)}
                highlighted={isTargeting || !!firstEventTarget}
                isFirstTarget={firstEventTarget?.creatureId === fc.card.id && firstEventTarget?.side === topSide}
                flashCard={modifierFlash?.creatureId === fc.card.id ? modifierFlash.card : null}
              />
            </div>
          ))}
          {state[topSide].field.length === 0 && isCreatureSelected && (
            <span style={{ color: '#333', alignSelf: 'center', fontStyle: 'italic', fontSize: '0.82em' }}>
              Place creature here
            </span>
          )}
        </div>
      </div>

      {/* ── Status strip ── */}
      <div style={{
        background: P.container,
        padding: '7px 20px',
        borderBottom: `1px solid ${P.ghost}`,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
        fontSize: '0.75em', fontFamily: MONO,
      }}>
        <span style={{ color: P.textMuted, letterSpacing: 2 }}>
          ROUND {state.round}
        </span>
        <span style={{ color: '#444' }}>·</span>
        <span style={{
          color: isMyTurn ? '#a5d6a7' : '#ef9a9a',
          fontWeight: 600, letterSpacing: 1,
        }}>
          {isMyTurn ? 'YOUR TURN' : "PLAYER 2'S TURN"}
        </span>
        {instructionText && (
          <>
            <span style={{ color: '#444' }}>·</span>
            <span style={{ color: P.primary }}>{instructionText}</span>
          </>
        )}
        {selectedCard && isMyTurn && (
          <button
            onClick={() => { setSelectedCard(null); setFirstEventTarget(null); }}
            style={{
              marginLeft: 8,
              background: 'rgba(127,0,0,0.25)', color: '#ef9a9a',
              border: '1px solid rgba(239,154,154,0.25)', borderRadius: 5,
              padding: '2px 10px', cursor: 'pointer', fontFamily: MONO, fontSize: '0.9em',
            }}
          >Cancel</button>
        )}
      </div>

      {/* ── Player 1 zone ── */}
      <div style={{
        background: `radial-gradient(ellipse at 50% 100%, rgba(27,94,32,0.18) 0%, transparent 60%), ${P.surfaceLow}`,
        padding: '14px 20px 18px',
        borderBottom: `1px solid ${P.ghost}`,
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <span style={{
            fontFamily: MONO, fontSize: '0.65em', letterSpacing: 3,
            color: '#3a6b3a', textTransform: 'uppercase', paddingTop: 6,
          }}>
            {state[bottomSide].deck.length} cards left
          </span>
          <ScoreDisplay
            label="Player 1"
            score={computeScore(state[bottomSide].field)}
            color={P.primary}
            align="right"
          />
        </div>

        {/* Field */}
        <div
          onClick={() => handleFieldZoneClick(bottomSide)}
          onDragOver={e => { if (isCreatureSelected || draggedCard?.type === 'creature') e.preventDefault(); }}
          onDrop={() => handleDropOnZone(bottomSide)}
          style={zoneStyle}
        >
          {state[bottomSide].field.map(fc => (
            <div key={fc.card.id}
              onDragOver={e => { if (isTargeting || (draggedCard && draggedCard.type !== 'creature')) e.preventDefault(); }}
              onDrop={() => handleDropOnFieldCard(fc, bottomSide)}
            >
              <FieldCardV2
                fc={fc}
                onClick={() => handleFieldCardClick(fc, bottomSide)}
                highlighted={isTargeting || !!firstEventTarget}
                isFirstTarget={firstEventTarget?.creatureId === fc.card.id && firstEventTarget?.side === bottomSide}
                flashCard={modifierFlash?.creatureId === fc.card.id ? modifierFlash.card : null}
              />
            </div>
          ))}
          {state[bottomSide].field.length === 0 && isCreatureSelected && (
            <span style={{ color: '#333', alignSelf: 'center', fontStyle: 'italic', fontSize: '0.82em' }}>
              Place creature here
            </span>
          )}
        </div>

        {/* Footer row */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 14 }}>
          {isMyTurn && !gameOver && (
            <button
              onClick={() => { setSelectedCard(null); setFirstEventTarget(null); endTurnInMode(passTurn(state)); }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: P.textMuted,
                border: `1px solid ${P.ghost}`,
                borderRadius: 8, padding: '7px 20px',
                cursor: 'pointer', fontFamily: MONO, fontSize: '0.75em',
                letterSpacing: 1,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = P.text; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = P.textMuted; }}
            >
              Pass Turn →
            </button>
          )}
        </div>
      </div>

      {/* ── Hand ── */}
      <div style={{ background: P.container, padding: '14px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: '0.6em', letterSpacing: 3, color: '#444', textTransform: 'uppercase' }}>
            {isMyTurn ? 'Your Hand' : 'Waiting…'}
          </span>
          <button
            onClick={() => onStateChange({ ...state, learningMode: !state.learningMode })}
            style={{
              background: state.learningMode ? 'rgba(27,94,32,0.3)' : 'transparent',
              color: state.learningMode ? '#a5d6a7' : '#444',
              border: `1px solid ${state.learningMode ? 'rgba(102,187,106,0.3)' : P.ghost}`,
              borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
              fontFamily: MONO, fontSize: '0.65em', letterSpacing: 1,
            }}
          >
            🧮 Learning {state.learningMode ? 'ON' : 'OFF'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {state[activeSide].hand.map(card => (
            <HandCardV2
              key={card.id}
              card={card}
              selected={selectedCard?.id === card.id}
              isMyTurn={isMyTurn}
              onDragStart={() => handleDragStart(card)}
              onDragEnd={handleDragEnd}
              onClick={() => handleHandCardClick(card)}
            />
          ))}
        </div>
      </div>

      {/* ── Overlays ── */}
      {modalData && (
        <CardModal
          fieldCard={modalData.fieldCard}
          handCard={modalData.handCard}
          releaseNumber={modalData.fieldCard?.card.release?.number ?? modalData.handCard?.release?.number}
          onClose={() => setModalData(null)}
          onPlay={modalData.handCard && isMyTurn ? () => handlePlayFromModal(modalData.handCard!) : undefined}
        />
      )}
      {learningCheck && (
        <LearningModePrompt
          fieldCard={learningCheck.fieldCard}
          modifierCard={learningCheck.modifierCard}
          onCorrect={learningCheck.onConfirm}
          onDismiss={() => setLearningCheck(null)}
        />
      )}
      {gameOver && winner && (
        <GameOverScreen
          winner={winner}
          playerScore={computeScore(state.player.field)}
          opponentScore={computeScore(state.opponent.field)}
          onNewGame={onNewGame}
        />
      )}
      {showEventModal && eventCard && (
        <EventAnnouncement card={eventCard} playedBy={eventPlayedBy as 'player' | 'opponent'} onDismiss={dismissEvent} />
      )}
      {showHandoff && mode === 'pass-and-play' && !gameOver && (
        <HandoffScreen
          playerName={(handoffNext ?? state).turn === 'player' ? 'Player 1' : 'Player 2'}
          onReady={dismissHandoff}
        />
      )}
    </div>
  );
}
