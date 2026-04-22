# Card Browser Detail View

**Date:** 2026-04-22
**Status:** Approved

## Overview

Add a click-to-enlarge card detail view to the Card Browser page. Clicking any card opens a full-screen lightbox showing the card at ~1.73× scale with prev/next navigation to flip through all cards in the selected release without closing the modal.

## Component

**New file:** `components/CardBrowserModal.tsx`

```ts
interface Props {
  cards: Card[];
  initialIndex: number;
  release: Release | null;
  onClose: () => void;
}
```

Internal state: `currentIndex: number`, initialized from `initialIndex`.

No React portal needed — no z-index conflicts in the card browser context.

## Changes to `app/cards/page.tsx`

- Add state: `selectedIndex: number | null` (null = modal closed)
- Each `CardComponent` in the grid gets `onClick={() => setSelectedIndex(index)}` and `cursor: pointer` + subtle hover scale (`transform: scale(1.02)`)
- Render `<CardBrowserModal>` when `selectedIndex !== null`, passing `cards`, `selectedIndex`, `selected` (release), and `onClose={() => setSelectedIndex(null)}`

## Modal Layout

Fixed overlay: `position: fixed`, `inset: 0`, `z-index: 100`, `background: rgba(0,0,0,0.92)`.

Centered flexbox row: `◀ [card] ▶`

- `◀` / `▶` are large clickable characters with `stopPropagation` (so they don't trigger backdrop close)
- Arrows are dimmed and non-interactive at index 0 (◀) and last index (▶) — no wraparound
- Card rendered via existing `<Card>` component at `scale={1.73}` (~380px wide) on screens ≥ 640px; falls back to `scale={1}` (220px) on smaller screens — same pattern as the existing `CardModal`
- Card gets a matching type-color `box-shadow` glow
- "X of Y" counter centered below the card

## Interactions

| Action | Result |
|--------|--------|
| Click backdrop | Close modal |
| Escape key | Close modal |
| ← / → arrow keys | Navigate prev/next |
| Click ◀ / ▶ | Navigate prev/next |
| Click card area | No-op (stopPropagation) |

## Out of Scope

- Mobile-specific layout changes (existing responsive behavior of the Card component handles scaling)
- A "play" button or math breakdown (this is a browser view, not a game view)
- Sharing or linking to a specific card
