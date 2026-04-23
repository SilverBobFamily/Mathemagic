# Release Selection & Balanced Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players select which releases are active (persisted to localStorage, overridable per game), and ensure each player's starting deck always contains exactly 10 creatures, 5 items, 4 actions, and 1 event.

**Architecture:** Add two new pure modules (`lib/releases.ts` for localStorage, `lib/deck.ts` for deck building), extend `lib/supabase.ts` with a filtered-fetch function, create a `/settings` page, and refactor `app/game/page.tsx` to fetch cards at game-start using active releases instead of all cards up front.

**Tech Stack:** Next.js (app router, `'use client'` pages), Supabase JS client, localStorage, Jest + jsdom for tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/releases.ts` | Create | localStorage get/set for active release IDs |
| `lib/deck.ts` | Create | `buildBalancedDecks` — splits card pool into two typed decks |
| `lib/__tests__/releases.test.ts` | Create | Unit tests for localStorage helpers |
| `lib/__tests__/deck.test.ts` | Create | Unit tests for `buildBalancedDecks` |
| `lib/supabase.ts` | Modify | Add `fetchCardsByReleaseIds(ids)` |
| `app/settings/page.tsx` | Create | Settings page — release toggles, save to localStorage |
| `app/layout.tsx` | Modify | Add "Settings" link to nav |
| `app/game/page.tsx` | Modify | Fetch releases on load, show toggles, async startGame with balanced decks |

---

## Task 1: `lib/releases.ts` — localStorage helpers

**Files:**
- Create: `lib/releases.ts`
- Create: `lib/__tests__/releases.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/releases.test.ts`:

```typescript
import { getActiveReleaseIds, setActiveReleaseIds } from '../releases';

describe('getActiveReleaseIds', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when nothing is stored', () => {
    expect(getActiveReleaseIds()).toBeNull();
  });

  it('returns stored ids after setActiveReleaseIds', () => {
    setActiveReleaseIds([1, 3, 7]);
    expect(getActiveReleaseIds()).toEqual([1, 3, 7]);
  });

  it('returns null when storage contains invalid JSON', () => {
    localStorage.setItem('activeReleases', 'not-json');
    expect(getActiveReleaseIds()).toBeNull();
  });

  it('returns null when storage contains a non-array', () => {
    localStorage.setItem('activeReleases', JSON.stringify({ ids: [1, 2] }));
    expect(getActiveReleaseIds()).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd "/Users/josh/Desktop/Projects/Math Game"
npx jest lib/__tests__/releases.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../releases'`

- [ ] **Step 3: Implement `lib/releases.ts`**

```typescript
const STORAGE_KEY = 'activeReleases';

export function getActiveReleaseIds(): number[] | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(x => typeof x === 'number')) return parsed;
  } catch {}
  return null;
}

export function setActiveReleaseIds(ids: number[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest lib/__tests__/releases.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/releases.ts lib/__tests__/releases.test.ts
git commit -m "feat: add localStorage helpers for active release IDs"
```

---

## Task 2: `lib/deck.ts` — balanced deck builder

**Files:**
- Create: `lib/deck.ts`
- Create: `lib/__tests__/deck.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/deck.test.ts`:

```typescript
import { buildBalancedDecks } from '../deck';
import type { Card } from '../types';

let nextId = 1;
beforeEach(() => { nextId = 1; });

function makeCard(type: Card['type']): Card {
  return {
    id: nextId++, release_id: 1, name: `${type}-${nextId}`, type,
    value: type === 'creature' ? 5 : null,
    operator: type === 'item' || type === 'action' ? '+1' : null,
    operator_value: type === 'item' || type === 'action' ? 1 : null,
    effect_type: type === 'event' ? 'zero_out' : null,
    art_emoji: '⚡', art_url: null, flavor_text: '', effect_text: null,
  };
}

function makePool(creatures: number, items: number, actions: number, events: number): Card[] {
  return [
    ...Array.from({ length: creatures }, () => makeCard('creature')),
    ...Array.from({ length: items }, () => makeCard('item')),
    ...Array.from({ length: actions }, () => makeCard('action')),
    ...Array.from({ length: events }, () => makeCard('event')),
  ];
}

describe('buildBalancedDecks', () => {
  it('returns two decks each with 10 creatures, 5 items, 4 actions, 1 event', () => {
    const pool = makePool(28, 16, 12, 4);
    const { playerDeck, opponentDeck } = buildBalancedDecks(pool);

    expect(playerDeck.filter(c => c.type === 'creature')).toHaveLength(10);
    expect(playerDeck.filter(c => c.type === 'item')).toHaveLength(5);
    expect(playerDeck.filter(c => c.type === 'action')).toHaveLength(4);
    expect(playerDeck.filter(c => c.type === 'event')).toHaveLength(1);

    expect(opponentDeck.filter(c => c.type === 'creature')).toHaveLength(10);
    expect(opponentDeck.filter(c => c.type === 'item')).toHaveLength(5);
    expect(opponentDeck.filter(c => c.type === 'action')).toHaveLength(4);
    expect(opponentDeck.filter(c => c.type === 'event')).toHaveLength(1);
  });

  it('gives each player entirely distinct cards', () => {
    const pool = makePool(28, 16, 12, 4);
    const { playerDeck, opponentDeck } = buildBalancedDecks(pool);
    const playerIds = new Set(playerDeck.map(c => c.id));
    const shared = opponentDeck.filter(c => playerIds.has(c.id));
    expect(shared).toHaveLength(0);
  });

  it('throws when not enough creatures (1 release = 14, need 20)', () => {
    const pool = makePool(14, 16, 12, 4);
    expect(() => buildBalancedDecks(pool)).toThrow('Not enough creature cards');
  });

  it('throws when not enough items', () => {
    const pool = makePool(28, 8, 12, 4);
    expect(() => buildBalancedDecks(pool)).toThrow('Not enough item cards');
  });

  it('throws when not enough actions', () => {
    const pool = makePool(28, 16, 6, 4);
    expect(() => buildBalancedDecks(pool)).toThrow('Not enough action cards');
  });

  it('throws when not enough events', () => {
    const pool = makePool(28, 16, 12, 1);
    expect(() => buildBalancedDecks(pool)).toThrow('Not enough event cards');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest lib/__tests__/deck.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../deck'`

- [ ] **Step 3: Implement `lib/deck.ts`**

```typescript
import type { Card } from './types';

const DECK_COUNTS = { creature: 10, item: 5, action: 4, event: 1 } as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildBalancedDecks(pool: Card[]): { playerDeck: Card[]; opponentDeck: Card[] } {
  const byType = {
    creature: shuffle(pool.filter(c => c.type === 'creature')),
    item: shuffle(pool.filter(c => c.type === 'item')),
    action: shuffle(pool.filter(c => c.type === 'action')),
    event: shuffle(pool.filter(c => c.type === 'event')),
  };

  for (const [type, count] of Object.entries(DECK_COUNTS) as [keyof typeof DECK_COUNTS, number][]) {
    if (byType[type].length < count * 2) {
      throw new Error(`Not enough ${type} cards: need ${count * 2}, have ${byType[type].length}. Select more releases.`);
    }
  }

  return {
    playerDeck: [
      ...byType.creature.slice(0, 10),
      ...byType.item.slice(0, 5),
      ...byType.action.slice(0, 4),
      ...byType.event.slice(0, 1),
    ],
    opponentDeck: [
      ...byType.creature.slice(10, 20),
      ...byType.item.slice(5, 10),
      ...byType.action.slice(4, 8),
      ...byType.event.slice(1, 2),
    ],
  };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest lib/__tests__/deck.test.ts --no-coverage
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/deck.ts lib/__tests__/deck.test.ts
git commit -m "feat: add buildBalancedDecks for typed deck construction"
```

---

## Task 3: `lib/supabase.ts` — filtered card fetch

**Files:**
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Add `fetchCardsByReleaseIds` to `lib/supabase.ts`**

Add after the existing `fetchCardsByRelease` function:

```typescript
export async function fetchCardsByReleaseIds(ids: number[]): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*, release:releases(*)')
    .in('release_id', ids)
    .order('release_id')
    .order('type')
    .order('name');
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Run all tests to confirm nothing broke**

```bash
npx jest --no-coverage
```

Expected: all existing tests still PASS

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add fetchCardsByReleaseIds to supabase helpers"
```

---

## Task 4: `app/settings/page.tsx` — Settings page

**Files:**
- Create: `app/settings/page.tsx`

- [ ] **Step 1: Create the Settings page**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { fetchReleases } from '@/lib/supabase';
import { getActiveReleaseIds, setActiveReleaseIds } from '@/lib/releases';
import type { Release } from '@/lib/types';

export default function SettingsPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [activeIds, setActiveIds] = useState<number[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchReleases().then(r => {
      setReleases(r);
      const stored = getActiveReleaseIds();
      setActiveIds(stored ?? r.map(rel => rel.id));
    });
  }, []);

  const toggle = (id: number) => {
    setSaved(false);
    setActiveIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const save = () => {
    setActiveReleaseIds(activeIds);
    setSaved(true);
  };

  const tooFew = activeIds.length < 2;

  return (
    <div style={{ padding: '32px 28px', maxWidth: 860, margin: '0 auto' }}>
      <h1 style={{ color: '#fff', marginTop: 0, fontFamily: "'Cinzel', serif" }}>Settings</h1>

      <h2 style={{ color: '#ccc', fontSize: '1.05em', marginBottom: 12, fontFamily: "'Cinzel', serif" }}>
        Active Releases
      </h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => { setSaved(false); setActiveIds(releases.map(r => r.id)); }}
          style={{ background: '#222', color: '#aaa', border: '1px solid #444', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: '0.85em' }}
        >
          Select All
        </button>
        <button
          onClick={() => { setSaved(false); setActiveIds([]); }}
          style={{ background: '#222', color: '#aaa', border: '1px solid #444', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: '0.85em' }}
        >
          Clear All
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {releases.map(r => (
          <button
            key={r.id}
            onClick={() => toggle(r.id)}
            style={{
              background: activeIds.includes(r.id) ? r.color_hex : '#111',
              color: '#fff',
              border: `2px solid ${r.color_hex}`,
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '0.9em',
              fontWeight: activeIds.includes(r.id) ? 700 : 400,
            }}
          >
            {r.icon} {r.name}
          </button>
        ))}
      </div>

      {tooFew && (
        <p style={{ color: '#ef5350', fontSize: '0.9em', margin: '0 0 16px' }}>
          Select at least 2 releases to play.
        </p>
      )}

      <button
        onClick={save}
        disabled={tooFew}
        style={{
          background: tooFew ? '#1a1a1a' : '#1a237e',
          color: tooFew ? '#444' : '#fff',
          border: `2px solid ${tooFew ? '#333' : '#5c6bc0'}`,
          borderRadius: 10,
          padding: '12px 28px',
          fontSize: '1em',
          cursor: tooFew ? 'not-allowed' : 'pointer',
        }}
      >
        Save as Default
      </button>

      {saved && (
        <span style={{ marginLeft: 16, color: '#81c784', fontSize: '0.9em' }}>Saved!</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat: add Settings page with release toggles"
```

---

## Task 5: `app/layout.tsx` — add Settings nav link

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add the Settings link to the nav**

In `app/layout.tsx`, find the nav element and add a Settings link after the "Cards" link:

Replace:
```tsx
          <a href="/cards" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.95em' }}>Cards</a>
```

With:
```tsx
          <a href="/cards" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.95em' }}>Cards</a>
          <a href="/settings" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.95em' }}>Settings</a>
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add Settings link to nav"
```

---

## Task 6: `app/game/page.tsx` — wire release selection and balanced decks

**Files:**
- Modify: `app/game/page.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
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
            👥 Pass & Play
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
```

- [ ] **Step 2: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/game/page.tsx
git commit -m "feat: release selection and balanced deck building in game setup"
```

---

## Task 7: Smoke test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Check Settings page**

Open `http://localhost:3000/settings`. Verify:
- All releases show as active (colored) on first visit
- Clicking a release toggles it off/on
- "Clear All" deactivates all releases and shows the warning
- "Save as Default" is disabled when fewer than 2 are selected
- Selecting 2+ releases enables the Save button and clicking it shows "Saved!"

- [ ] **Step 3: Check game setup screen**

Open `http://localhost:3000/game`. Verify:
- Release tiles appear above the mode buttons, pre-filled from saved defaults
- Toggle a few releases on/off — the mode buttons dim when fewer than 2 are selected
- "Save as Default" updates localStorage (verify by navigating away and back)
- Click "vs AI" — game starts and the decks are balanced (you can inspect the aside + hand in the console or just play a game)

- [ ] **Step 4: Verify deck balance in browser console**

Open the browser console on the game page. After clicking vs AI, add a temporary `console.log` in `buildBalancedDecks` to count types — or just play a game and observe that the hand/aside ratio looks right (should see creatures dominating, 1 event per side).

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```
