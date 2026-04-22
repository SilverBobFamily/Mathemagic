# Card Browser Detail View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a click-to-enlarge card detail modal to the Card Browser page, with prev/next navigation through all cards in the selected release.

**Architecture:** New `CardBrowserModal` component owns all modal behavior (overlay, keyboard shortcuts, navigation state); `app/cards/page.tsx` adds `selectedIndex` state and renders the modal. The existing `Card` component renders the enlarged card at scale 1.73 on desktop, scale 1 on mobile — same responsive pattern as the existing `CardModal`.

**Tech Stack:** React 19, TypeScript, Next.js 16 (`'use client'` components), `@testing-library/react` + jest/jsdom, inline styles (no CSS library — follow existing codebase convention).

---

### Task 1: Create `CardBrowserModal` component

**Files:**
- Create: `components/CardBrowserModal.tsx`
- Create: `components/__tests__/CardBrowserModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `components/__tests__/CardBrowserModal.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import CardBrowserModal from '../CardBrowserModal';
import type { Card, Release } from '@/lib/types';

const makeCard = (id: number, name: string): Card => ({
  id, release_id: 1, name, type: 'creature',
  value: 5, operator: null, operator_value: null,
  effect_type: null, art_emoji: '⚡', art_url: null,
  flavor_text: 'Test flavor', effect_text: null,
});

const release: Release = { id: 1, name: 'Test Release', icon: '🏺', number: 1, color_hex: '#5c6bc0' };

const cards = [makeCard(1, 'Alpha'), makeCard(2, 'Beta'), makeCard(3, 'Gamma')];

describe('CardBrowserModal', () => {
  it('renders the card at the initial index', () => {
    render(<CardBrowserModal cards={cards} initialIndex={1} release={release} onClose={() => {}} />);
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows the correct counter', () => {
    render(<CardBrowserModal cards={cards} initialIndex={0} release={release} onClose={() => {}} />);
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
  });

  it('navigates to next card on Next card click', () => {
    render(<CardBrowserModal cards={cards} initialIndex={0} release={release} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText('Next card'));
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
  });

  it('navigates to previous card on Previous card click', () => {
    render(<CardBrowserModal cards={cards} initialIndex={2} release={release} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText('Previous card'));
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
  });

  it('disables Previous card button at first card', () => {
    render(<CardBrowserModal cards={cards} initialIndex={0} release={release} onClose={() => {}} />);
    expect(screen.getByLabelText('Previous card')).toBeDisabled();
  });

  it('disables Next card button at last card', () => {
    render(<CardBrowserModal cards={cards} initialIndex={2} release={release} onClose={() => {}} />);
    expect(screen.getByLabelText('Next card')).toBeDisabled();
  });

  it('calls onClose on Escape key', () => {
    const onClose = jest.fn();
    render(<CardBrowserModal cards={cards} initialIndex={0} release={release} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates with keyboard arrow keys', () => {
    render(<CardBrowserModal cards={cards} initialIndex={0} release={release} onClose={() => {}} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('Beta')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('calls onClose when overlay backdrop is clicked', () => {
    const onClose = jest.fn();
    render(<CardBrowserModal cards={cards} initialIndex={0} release={release} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('card-browser-modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest components/__tests__/CardBrowserModal.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '../CardBrowserModal'"

- [ ] **Step 3: Create `components/CardBrowserModal.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrentIndex(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setCurrentIndex(i => Math.min(cards.length - 1, i + 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cards.length, onClose]);

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
        <div style={{ color: '#555', fontSize: '0.85em', letterSpacing: 1 }}>
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest components/__tests__/CardBrowserModal.test.tsx --no-coverage
```

Expected: PASS — 9 tests passed

- [ ] **Step 5: Commit**

```bash
git add components/CardBrowserModal.tsx components/__tests__/CardBrowserModal.test.tsx
git commit -m "feat: add CardBrowserModal with navigation and keyboard support"
```

---

### Task 2: Wire up the Card Browser page

**Files:**
- Modify: `app/cards/page.tsx`

- [ ] **Step 1: Replace `app/cards/page.tsx` with the updated version**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { fetchReleases, fetchCardsByRelease } from '@/lib/supabase';
import type { Release, Card } from '@/lib/types';
import CardComponent from '@/components/Card';
import CardBrowserModal from '@/components/CardBrowserModal';

export default function CardsPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [selected, setSelected] = useState<Release | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchReleases().then(r => { setReleases(r); setSelected(r[0] ?? null); });
  }, []);

  useEffect(() => {
    if (selected) fetchCardsByRelease(selected.id).then(setCards);
  }, [selected]);

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`
        .card-browser-item { cursor: pointer; transition: transform 0.15s ease; }
        .card-browser-item:hover { transform: scale(1.02); }
      `}</style>
      <h1 style={{ color: '#fff', marginTop: 0, marginBottom: 20 }}>Card Browser</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        {releases.map(r => (
          <button
            key={r.id}
            onClick={() => setSelected(r)}
            style={{
              background: selected?.id === r.id ? r.color_hex : '#111',
              color: '#fff', border: `2px solid ${r.color_hex}`,
              borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
              fontSize: '0.95em', fontWeight: selected?.id === r.id ? 700 : 400,
            }}
          >
            {r.icon} {r.name}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="card-browser-item"
            onClick={() => setSelectedIndex(index)}
          >
            <CardComponent
              card={{ ...card, release: selected ?? undefined }}
              releaseNumber={selected?.number}
            />
          </div>
        ))}
      </div>
      {selectedIndex !== null && (
        <CardBrowserModal
          cards={cards}
          initialIndex={selectedIndex}
          release={selected}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

```bash
npx jest --no-coverage
```

Expected: All existing tests pass plus the 9 new `CardBrowserModal` tests.

- [ ] **Step 3: Commit**

```bash
git add app/cards/page.tsx
git commit -m "feat: open CardBrowserModal on card click in card browser"
```
