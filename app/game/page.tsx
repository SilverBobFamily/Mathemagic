'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchReleases, fetchCardsByReleaseIds } from '@/lib/supabase';
import { getActiveReleaseIds, setActiveReleaseIds } from '@/lib/releases';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { loadPreferencesFromDb, savePreferencesToDb } from '@/lib/preferences';
import { buildBalancedDecks } from '@/lib/deck';
import { createGame, endTurn, passTurn, isGameOver, playCreature, playModifier, playEvent } from '@/lib/GameEngine';
import { chooseAiMove } from '@/lib/ai';
import { getGameOptions, setGameOptions } from '@/lib/options';
import GameBoard from '@/components/GameBoard';
import type { Release, Card, GameState, GameOptions, Side } from '@/lib/types';

type Mode = 'ai' | 'pass-and-play';
type CoinFlipStage = 'calling' | 'flipping' | 'result';

interface PendingCoinFlip {
  playerDeck: Card[];
  opponentDeck: Card[];
  mode: Mode;
  stage: CoinFlipStage;
  call?: 'heads' | 'tails';
  result?: 'heads' | 'tails';
  winner?: Side;
}

// ── Small UI helpers ────────────────────────────────────────────────

function SegControl<T extends string | number>({
  label, options, labels, value, onChange, disabled,
}: {
  label: string;
  options: T[];
  labels?: string[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ color: disabled ? '#555' : '#aaa', fontSize: '0.82em', width: 148, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', gap: 3 }}>
        {options.map((opt, i) => {
          const active = value === opt;
          return (
            <button
              key={String(opt)}
              onClick={() => !disabled && onChange(opt)}
              disabled={disabled}
              style={{
                background: active ? '#5c6bc0' : '#111',
                color: disabled ? '#444' : active ? '#fff' : '#777',
                border: `1px solid ${active ? '#5c6bc0' : '#2a2a2a'}`,
                borderRadius: 5,
                padding: '4px 11px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '0.8em',
                fontWeight: active ? 700 : 400,
              }}
            >
              {labels?.[i] ?? String(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ color: '#aaa', fontSize: '0.82em', width: 148, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          style={{ background: '#111', color: value <= min ? '#333' : '#aaa', border: '1px solid #2a2a2a', borderRadius: 5, width: 28, height: 28, cursor: value <= min ? 'not-allowed' : 'pointer', fontSize: '1em' }}
        >−</button>
        <span style={{ color: '#fff', fontSize: '0.85em', width: 28, textAlign: 'center' }}>{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          style={{ background: '#111', color: value >= max ? '#333' : '#aaa', border: '1px solid #2a2a2a', borderRadius: 5, width: 28, height: 28, cursor: value >= max ? 'not-allowed' : 'pointer', fontSize: '1em' }}
        >+</button>
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange, disabled }: {
  label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <span style={{ color: disabled ? '#555' : '#aaa', fontSize: '0.82em', width: 148, flexShrink: 0 }}>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={e => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        style={{ width: 16, height: 16, cursor: disabled ? 'not-allowed' : 'pointer', accentColor: '#5c6bc0' }}
      />
    </label>
  );
}

// ── Coin Flip Modal ────────────────────────────────────────────────

function CoinFlipModal({ flip, onCall, onStart }: {
  flip: PendingCoinFlip;
  onCall: (call: 'heads' | 'tails') => void;
  onStart: () => void;
}) {
  const coin = flip.stage === 'result'
    ? (flip.result === 'heads' ? '🪙' : '🔵')
    : '🪙';

  const winner = flip.winner === 'player' ? 'You go first!' : 'Opponent goes first!';
  const correct = flip.call === flip.result;

  return (
    <>
      <style>{`
        @keyframes coinSpin {
          0%   { transform: rotateY(0deg) scale(1); }
          40%  { transform: rotateY(720deg) scale(1.3); }
          100% { transform: rotateY(1440deg) scale(1); }
        }
        .coin-spinning { animation: coinSpin 1.1s ease-out forwards; }
      `}</style>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}>
        <div style={{
          background: '#1a1a1a', border: '1px solid #333', borderRadius: 16,
          padding: '40px 48px', textAlign: 'center', maxWidth: 340,
        }}>
          {flip.stage === 'calling' && (
            <>
              <div style={{ fontSize: '3.5em', marginBottom: 16 }}>🪙</div>
              <h2 style={{ color: '#fff', fontFamily: "'Cinzel', serif", margin: '0 0 8px' }}>Call it!</h2>
              <p style={{ color: '#888', fontSize: '0.85em', margin: '0 0 24px' }}>Winner goes first</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => onCall('heads')} style={callBtn}>Heads</button>
                <button onClick={() => onCall('tails')} style={callBtn}>Tails</button>
              </div>
            </>
          )}
          {flip.stage === 'flipping' && (
            <>
              <div className="coin-spinning" style={{ fontSize: '3.5em', marginBottom: 16 }}>{coin}</div>
              <p style={{ color: '#888', fontSize: '0.9em' }}>Flipping…</p>
            </>
          )}
          {flip.stage === 'result' && (
            <>
              <div style={{ fontSize: '3.5em', marginBottom: 16 }}>{coin}</div>
              <h2 style={{ color: '#fff', fontFamily: "'Cinzel', serif", margin: '0 0 6px', textTransform: 'capitalize' }}>
                {flip.result}!
              </h2>
              <p style={{ color: correct ? '#81c784' : '#ef5350', fontSize: '0.9em', margin: '0 0 4px' }}>
                {correct ? 'Nice call!' : 'Wrong call!'}
              </p>
              <p style={{ color: '#ccc', fontSize: '1em', margin: '0 0 24px' }}>{winner}</p>
              <button onClick={onStart} style={startBtn}>Let&apos;s go →</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const callBtn: React.CSSProperties = {
  background: '#1a237e', color: '#fff', border: '2px solid #5c6bc0',
  borderRadius: 8, padding: '10px 28px', fontSize: '1em', cursor: 'pointer',
};
const startBtn: React.CSSProperties = {
  background: '#1b5e20', color: '#fff', border: '2px solid #81c784',
  borderRadius: 8, padding: '10px 32px', fontSize: '1em', cursor: 'pointer',
};

// ── Main Page ──────────────────────────────────────────────────────

export default function GamePage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [activeReleaseIds, setActiveIds] = useState<number[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const [mode, setMode] = useState<Mode>('ai');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [learningMode, setLearningMode] = useState(false);
  const [aiEventPending, setAiEventPending] = useState<{ card: Card; nextState: GameState } | null>(null);
  const [options, setOptionsState] = useState<GameOptions | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [coinFlip, setCoinFlip] = useState<PendingCoinFlip | null>(null);

  useEffect(() => {
    fetchReleases().then(async r => {
      setReleases(r);
      setOptionsState(getGameOptions());

      const supabase = createSupabaseBrowserClient();
      const dbPrefs = await loadPreferencesFromDb(supabase);

      if (dbPrefs) {
        // Logged in — use DB preferences
        const localIds = getActiveReleaseIds();
        if (dbPrefs.activeReleaseIds !== null) {
          setActiveIds(dbPrefs.activeReleaseIds);
        } else {
          // No DB prefs yet — seed from localStorage and persist silently
          const idsToUse = localIds ?? r.map(rel => rel.id);
          setActiveIds(idsToUse);
          await savePreferencesToDb(supabase, { activeReleaseIds: idsToUse, learningMode: false });
        }
        setLearningMode(dbPrefs.learningMode);
      } else {
        // Logged out — use localStorage
        const stored = getActiveReleaseIds();
        setActiveIds(stored ?? r.map(rel => rel.id));
      }

      setLoading(false);
    });
  }, []);

  const updateOption = useCallback(<K extends keyof GameOptions>(key: K, value: GameOptions[K]) => {
    setOptionsState(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      setGameOptions(next);
      return next;
    });
  }, []);

  const toggleRelease = useCallback((id: number) => {
    setActiveIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const saveAsDefault = useCallback(async () => {
    setActiveReleaseIds(activeReleaseIds); // always update localStorage
    const supabase = createSupabaseBrowserClient();
    await savePreferencesToDb(supabase, { activeReleaseIds, learningMode });
  }, [activeReleaseIds, learningMode]);

  const startGame = useCallback(async (m: Mode) => {
    if (!options || activeReleaseIds.length < 2 || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const pool = await fetchCardsByReleaseIds(activeReleaseIds);
      const { playerDeck, opponentDeck } = buildBalancedDecks(pool, { eventCount: options.eventCount });
      setMode(m);
      if (options.firstPlayer === 'coinFlip') {
        setCoinFlip({ playerDeck, opponentDeck, mode: m, stage: 'calling' });
        setStarting(false);
      } else {
        const firstPlayerOverride: Side = options.firstPlayer === 'player' ? 'player' : 'opponent';
        setState(createGame(playerDeck, opponentDeck, learningMode, options, firstPlayerOverride));
        setStarting(false);
      }
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Failed to start game.');
      setStarting(false);
    }
  }, [activeReleaseIds, learningMode, options, starting]);

  const handleCoinCall = useCallback((call: 'heads' | 'tails') => {
    setCoinFlip(prev => prev ? { ...prev, stage: 'flipping', call } : prev);
    setTimeout(() => {
      const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
      const winner: Side = result === 'heads' ? 'player' : 'opponent';
      setCoinFlip(prev => prev ? { ...prev, stage: 'result', result, winner } : prev);
    }, 1200);
  }, []);

  const handleCoinStart = useCallback(() => {
    if (!coinFlip?.winner || !options) return;
    setState(createGame(coinFlip.playerDeck, coinFlip.opponentDeck, learningMode, options, coinFlip.winner));
    setCoinFlip(null);
  }, [coinFlip, learningMode, options]);

  // AI auto-play — paused while an event announcement is pending
  useEffect(() => {
    if (!state || mode !== 'ai' || state.turn !== 'opponent' || isGameOver(state) || aiEventPending) return;
    const timer = setTimeout(() => {
      const difficulty = state.options?.aiDifficulty ?? 'medium';
      const move = chooseAiMove(state, difficulty);
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

  if (loading || !options) {
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

        {/* Release selection */}
        <div style={{ width: '100%', maxWidth: 760 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ color: '#ccc', fontSize: '0.9em' }}>Active Releases</span>
            <button onClick={() => setActiveIds(releases.map(r => r.id))} style={chipBtn}>All</button>
            <button onClick={() => setActiveIds([])} style={chipBtn}>None</button>
            <button onClick={saveAsDefault} style={chipBtn}>Save as Default</button>
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
          {startError && (
            <p style={{ color: '#ef5350', fontSize: '0.85em', margin: '10px 0 0' }}>
              {startError}
            </p>
          )}
        </div>

        {/* Game Options accordion */}
        <div style={{ width: '100%', maxWidth: 760 }}>
          <button
            onClick={() => setOptionsOpen(o => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#888', fontSize: '0.85em', padding: '4px 0',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: '0.75em' }}>{optionsOpen ? '▲' : '▼'}</span>
            Game Options
          </button>
          {optionsOpen && (
            <div style={{
              marginTop: 10, padding: '16px 20px',
              background: '#0d0d0d', border: '1px solid #222', borderRadius: 10,
            }}>
              <SegControl
                label="Hand Size"
                options={[3, 4, 5, 6] as number[]}
                value={options.handSize}
                onChange={v => updateOption('handSize', v)}
              />
              <SegControl
                label="Aside Cards"
                options={[1, 2, 3, 4, 5] as number[]}
                value={options.setAsideCount}
                onChange={v => updateOption('setAsideCount', v)}
              />
              <SegControl
                label="Event Cards"
                options={[0, 1, 2] as number[]}
                value={options.eventCount}
                onChange={v => updateOption('eventCount', v)}
              />
              <Stepper
                label="Max Plays"
                value={options.maxPlays}
                min={12}
                max={30}
                onChange={v => updateOption('maxPlays', v)}
              />
              <ToggleRow
                label="Guaranteed Event"
                value={options.guaranteedEvent}
                onChange={v => updateOption('guaranteedEvent', v)}
                disabled={options.eventCount === 0}
              />
              <SegControl
                label="First Player"
                options={['coinFlip', 'player', 'opponent'] as GameOptions['firstPlayer'][]}
                labels={['Coin Flip', 'Player 1', 'Player 2']}
                value={options.firstPlayer}
                onChange={v => updateOption('firstPlayer', v)}
              />
              <SegControl
                label="AI Difficulty"
                options={['easy', 'medium', 'hard'] as GameOptions['aiDifficulty'][]}
                labels={['Easy', 'Medium', 'Hard']}
                value={options.aiDifficulty}
                onChange={v => updateOption('aiDifficulty', v)}
              />
            </div>
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

        {coinFlip && (
          <CoinFlipModal flip={coinFlip} onCall={handleCoinCall} onStart={handleCoinStart} />
        )}
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

const chipBtn: React.CSSProperties = {
  background: '#222', color: '#aaa', border: '1px solid #333',
  borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: '0.8em',
};
