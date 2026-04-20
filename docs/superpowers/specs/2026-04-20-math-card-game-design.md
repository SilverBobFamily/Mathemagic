# Math Card Game — Design Spec
**Date:** 2026-04-20

---

## Overview

A collectible math card game in the style of Magic: The Gathering / Pokémon, where players defeat opponents by building the highest point total using creatures, items, actions, and events. Math is the core mechanic — addition, subtraction, multiplication, and division all live on cards.

**Target audience:** All ages / family game (accessible to kids 8+, strategic enough for adults)
**Platform:** Web app (Next.js + TypeScript), with printable card exports planned
**Backend:** Supabase (database + auth)
**Hosting:** Vercel
**Repo:** https://github.com/SilverBobFamily/MathGame.git

---

## Game Rules

### Setup
- Each player builds a deck of 20 cards but only uses 16 per match (4 are set aside before play)
- Each player draws an initial hand of 3 cards
- Remaining 13 cards are drawn one at a time, one per turn

### Turn Structure
- On your turn, draw 1 card (if any remain)
- Play exactly 1 card per turn
- A card may be played on **either** player's side of the field
- After playing, the turn passes to the opponent

### Winning
- The game ends when both players have played all 16 cards
- The player with the **higher total score** wins
- If scores are tied, each player draws and plays 1 bonus card (sudden death)
- Score = sum of all creature values on your side, after all modifiers are applied

---

## Card Types

### Creature
- Has an integer value from **−5 to +10**
- Placed on either player's field
- Stays on the field for the rest of the game
- No rules text — only flavor text and a value
- Negative-value creatures are displayed in red; positive in blue

### Item (Add / Subtract)
- Modifies one creature already on the field
- Values: mostly **±1–3**, a few "big" items at **±5**
- Stays attached to the target creature on the field
- Shows effect text + flavor text

### Action (Multiply / Divide)
- Modifies one creature already on the field
- Operators: **×2, ×5, ×10, ÷2, ÷5, ×(−1), ×(−2)**
- Negative multipliers flip a creature's sign (e.g. a +8 becomes −8, a −3 becomes +6)
- Stays attached to the target creature on the field
- Shows effect text + flavor text

### Event (Major Effect)
- Rare, powerful, game-changing effects
- 3 types, distributed across releases:
  - **Destructive:** Zero Out (set a creature to 0), Banish (remove a creature from the field)
  - **Amplifying:** ×100 a creature, Mirror (copy one creature's value to another)
  - **Chaotic:** Swap (exchange two creatures between sides), Reverse (flip all signs on one side)
- Shows effect text + flavor text

---

## Card Anatomy (Visual)

Each card has (top to bottom):
1. **Name bar** — card name (left), value or operator (right)
2. **Art area** — large emoji placeholder (real illustrations later)
3. **Type line** — card type (left), release theme icon (right)
4. **Text box** — effect text (Items/Actions/Events only) + italic flavor text
5. **Footer** — release number (R1, R2, etc.)

**Color by type:**
- Creature: blue (`#1a237e`)
- Item: green (`#1b5e20`)
- Action: purple (`#4a148c`)
- Event: red (`#7f0000`)

**Clicking any card** (on field or in hand) opens a full-size card view. Field creatures with modifiers show a **Math Breakdown panel** beside the card listing each modifier and the running total.

---

## Releases

Each release contains **30 cards**: 14 Creature · 8 Item · 6 Action · 2 Event

| # | Theme | Icon | Color Palette |
|---|-------|------|---------------|
| 1 | Greek Mythology | 🏛️ | Deep blue / gold |
| 2 | Wild West | 🤠 | Brown / tan / copper |
| 3 | Dinosaurs | 🦕 | Green / earth tones |
| 4 | Outer Space | 🚀 | Dark navy / cyan / silver |
| 5 | Music | 🎵 | Black / neon |
| 6 | Zombies | 🧟 | Sickly green / grey / decay |

**Total cards:** 180 across 6 releases

### Event Distribution (12 total, 2 per release)
| Release | Event 1 | Event 2 |
|---------|---------|---------|
| 1 — Greek Mythology | Zero Out (Destructive) | ×100 (Amplifying) |
| 2 — Wild West | Banish (Destructive) | Swap (Chaotic) |
| 3 — Dinosaurs | Mirror (Amplifying) | Reverse (Chaotic) |
| 4 — Outer Space | Zero Out (Destructive) | Swap (Chaotic) |
| 5 — Music | Mirror (Amplifying) | Banish (Destructive) |
| 6 — Zombies | Reverse (Chaotic) | ×100 (Amplifying) |

---

## Card Database Schema (Supabase)

```sql
-- releases
create table releases (
  id          serial primary key,
  name        text not null,          -- "Greek Mythology"
  icon        text not null,          -- "🏛️"
  number      int not null unique,    -- 1–6
  color_hex   text not null           -- primary theme color
);

-- cards
create table cards (
  id          serial primary key,
  release_id  int references releases(id),
  name        text not null,
  type        text not null check (type in ('creature','item','action','event')),
  value       int,                    -- creatures: integer value
  operator    text,                   -- items/actions: '+3', '×5', etc.
  effect_type text,                   -- events: 'zero_out','banish','mirror','x100','swap','reverse'
  art_emoji   text not null,          -- placeholder art
  art_url     text,                   -- real illustration (null until added)
  flavor_text text not null,
  effect_text text                    -- null for creatures
);
```

---

## Architecture

**Hybrid approach:** Cards and rules live in Supabase. Game state lives in the browser behind a clean `GameEngine` interface — designed so state can move server-side for multiplayer without touching UI code.

```
Next.js App (Vercel)
├── /app
│   ├── page.tsx              — Home / deck select
│   ├── game/page.tsx         — Game board
│   └── cards/page.tsx        — Card browser / collection
├── /lib
│   ├── supabase.ts           — Supabase client
│   ├── GameEngine.ts         — Core game logic (state machine)
│   └── ai.ts                 — AI opponent logic
├── /components
│   ├── Card.tsx              — Full card render
│   ├── FieldCard.tsx         — Compact field card with modifier tags
│   ├── CardModal.tsx         — Click-to-expand with math breakdown
│   └── GameBoard.tsx         — Full board layout
```

### GameEngine Interface
```typescript
interface GameEngine {
  startGame(deck1: Card[], deck2: Card[]): GameState
  playCard(state: GameState, cardId: string, targetSide: 'player' | 'opponent', targetCardId?: string): GameState
  getScore(state: GameState, side: 'player' | 'opponent'): number
  isGameOver(state: GameState): boolean
  getWinner(state: GameState): 'player' | 'opponent' | 'tie'
}
```

### AI Opponent
- Rule-based for v1: prioritizes playing high-value creatures on own side, negative creatures on opponent's side, applies multipliers to highest-value friendly creature
- Designed as a swappable module for future ML-based AI

---

## Game Board UI

- **Opponent zone** (top): their field cards, score, cards remaining
- **Status bar** (middle): round counter, active release theme, turn indicator
- **Player zone**: your field cards, score, cards remaining
- **Hand** (bottom): your current hand, glowing gold when it's your turn
- Clicking any card opens full card view (with math breakdown if on field)
- Clicking outside the card view closes it

---

## Multiplayer Roadmap

1. **v1:** Solo vs AI + local pass-and-play
2. **v2:** Online async multiplayer (Supabase Realtime — `GameEngine` moves to server)
3. **v3:** Ranked matchmaking, card collection, deck building

---

## Printable Cards

- Each card exports as a print-ready PNG/PDF at standard card dimensions (2.5" × 3.5")
- Placeholder art replaced by real illustrations for print version
- Export triggered from card browser UI

---

## Verification

To confirm this design is working end-to-end:
1. Cards load from Supabase and render correctly (all 4 types, all 6 releases)
2. A full 16-turn game can be played vs AI without errors
3. Scores calculate correctly after Items (+/−), Actions (×/÷), and Events
4. Clicking any card on the field or in hand opens the full card view
5. Math breakdown panel shows correct running total for modified creatures
6. Sudden death triggers correctly on a tie
7. Pass-and-play works (turn swaps correctly, hand is hidden between turns)
