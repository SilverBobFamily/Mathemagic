'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchReleases, fetchCardsByReleaseIds } from '@/lib/supabase';
import { getActiveReleaseIds, setActiveReleaseIds } from '@/lib/releases';
import { buildBalancedDecks } from '@/lib/deck';
import { createGame, endTurn, passTurn, isGameOver, playCreature, playModifier, playEvent } from '@/lib/GameEngine';
import { chooseAiMove } from '@/lib/ai';
import GameBoard from '@/components/GameBoard';
import type { Release, Card, GameState } from '@/lib/types';

type Mode = 'ai' | 'pass-and-play';

export default function GamePage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [activeReleaseIds, setActiveIds] = useState<number[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const [mode, setMode] = useState<Mode>('ai');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [learningMode, setLearningMode] = useState(false);
  const [aiEventPending, setAiEventPending] = useState<{ card: Card; nextState: GameState } | null>(null);

  useEffect(() => {
    fetchReleases().then(r => {
      setReleases(r);
      const stored = getActiveReleaseIds();
      setActiveIds(stored ?? r.map(rel => rel.id));
      setLoading(false);
    });
  }, []);

  const toggleRelease = useCallback((id: number) => {
    setActiveIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const saveAsDefault = useCallback(() => {
    setActiveReleaseIds(activeReleaseIds);
  }, [activeReleaseIds]);

  const startGame = useCallback(async (m: Mode) => {
    if (activeReleaseIds.length < 2 || starting) return;
    setStarting(true);
    try {
      const pool = await fetchCardsByReleaseIds(activeReleaseIds);
      const { playerDeck, opponentDeck } = buildBalancedDecks(pool);
      setMode(m);
      setState(createGame(playerDeck, opponentDeck, learningMode));
    } finally {
      setStarting(false);
    }
  }, [activeReleaseIds, learningMode, starting]);

  // AI auto-play — paused while an event announcement is pending
  useEffect(() => {
    if (!state || mode !== 'ai' || state.turn !== 'opponent' || isGameOver(state) || aiEventPending) return;
    const timer = setTimeout(() => {
      const move = chooseAiMove(state);
      if (!move) { setState(s => s && passTurn(s)); return; }
      const card = state.opponent.hand.find(c => c.id === move.cardId);
      if (!card) { setState(s => s && passTurn(s)); return; }
      let next: typeof state | null = null;
      if (card.type === 'creature') {
        next = playCreature(state, move.cardId, move.targetSide);
      } else if (card.type === 'item' || card.type === 'action') {
        if (move.targetCreatureId !== undefined) {
          next = playModifier(state, move.cardId, move.targetCreatureId, move.targetSide);
        }
      } else if (card.type === 'event' && move.targetCreatureId !== undefined) {
        next = playEvent(
          state, move.cardId,
          move.targetCreatureId, move.targetSide,
          move.secondTargetId, move.secondTargetSide
        );
        if (next) {
          setAiEventPending({ card, nextState: endTurn(next) });
          return;
        }
      }
      setState(next ? endTurn(next) : passTurn(state));
    }, 900);
    return () => clearTimeout(timer);
  }, [state, mode, aiEventPending]);

  const handleAiEventDismissed = useCallback(() => {
    if (!aiEventPending) return;
    setState(aiEventPending.nextState);
    setAiEventPending(null);
  }, [aiEventPending]);

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
        Loading...
      </div>
    );
  }

  const tooFew = activeReleaseIds.length < 2;

  if (!state) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 24px' }}>
        <h1 style={{ color: '#fff', fontSize: '2em', margin: 0, fontFamily: "'Cinzel', serif" }}>Choose Game Mode</h1>

        <div style={{ width: '100%', maxWidth: 760 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ color: '#ccc', fontSize: '0.9em' }}>Active Releases</span>
            <button
              onClick={() => setActiveIds(releases.map(r => r.id))}
              style={{ background: '#222', color: '#aaa', border: '1px solid #333', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: '0.8em' }}
            >
              All
            </button>
            <button
              onClick={() => setActiveIds([])}
              style={{ background: '#222', color: '#aaa', border: '1px solid #333', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: '0.8em' }}
            >
              None
            </button>
            <button
              onClick={saveAsDefault}
              style={{ background: '#222', color: '#aaa', border: '1px solid #333', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: '0.8em' }}
            >
              Save as Default
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {releases.map(r => (
              <button
                key={r.id}
                onClick={() => toggleRelease(r.id)}
                style={{
                  background: activeReleaseIds.includes(r.id) ? r.color_hex : '#111',
                  color: '#fff',
                  border: `2px solid ${r.color_hex}`,
                  borderRadius: 7,
                  padding: '6px 13px',
                  cursor: 'pointer',
                  fontSize: '0.82em',
                  fontWeight: activeReleaseIds.includes(r.id) ? 700 : 400,
                }}
              >
                {r.icon} {r.name}
              </button>
            ))}
          </div>
          {tooFew && (
            <p style={{ color: '#ef5350', fontSize: '0.85em', margin: '10px 0 0' }}>
              Select at least 2 releases to play.
            </p>
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: '#aaa', fontSize: '0.95em' }}>
          <input
            type="checkbox"
            checked={learningMode}
            onChange={e => setLearningMode(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
          🧮 Learning Mode (answer math questions when playing modifiers)
        </label>

        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={() => startGame('ai')}
            disabled={tooFew || starting}
            style={{
              background: tooFew || starting ? '#111' : '#1a237e',
              color: tooFew || starting ? '#444' : '#fff',
              border: `2px solid ${tooFew || starting ? '#333' : '#5c6bc0'}`,
              borderRadius: 10, padding: '14px 32px', fontSize: '1.1em',
              cursor: tooFew || starting ? 'not-allowed' : 'pointer',
            }}
          >
            {starting ? '...' : '⚔ vs AI'}
          </button>
          <button
            onClick={() => startGame('pass-and-play')}
            disabled={tooFew || starting}
            style={{
              background: tooFew || starting ? '#111' : '#1b5e20',
              color: tooFew || starting ? '#444' : '#fff',
              border: `2px solid ${tooFew || starting ? '#333' : '#81c784'}`,
              borderRadius: 10, padding: '14px 32px', fontSize: '1.1em',
              cursor: tooFew || starting ? 'not-allowed' : 'pointer',
            }}
          >
            {starting ? '...' : '👥 Pass & Play'}
          </button>
        </div>

        <button
          onClick={() => setState(null)}
          style={{ background: 'none', color: '#555', border: 'none', cursor: 'pointer', fontSize: '0.9em', marginTop: 8 }}
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#555', fontSize: '0.85em' }}>
          Mode: {mode === 'ai' ? '⚔ vs AI' : '👥 Pass & Play'}
        </span>
        <button
          onClick={() => setState(null)}
          style={{ background: '#111', color: '#888', border: '1px solid #333', borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: '0.85em' }}
        >
          ← New Game
        </button>
      </div>
      <GameBoard
        state={state}
        onStateChange={setState}
        mode={mode}
        onNewGame={() => setState(null)}
        aiEventAnnouncement={aiEventPending ? { card: aiEventPending.card, playedBy: 'opponent' } : null}
        onAiEventDismissed={handleAiEventDismissed}
      />
    </div>
  );
}
