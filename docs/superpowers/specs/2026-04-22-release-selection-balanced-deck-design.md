# Release Selection & Balanced Deck Design

**Date:** 2026-04-22

## Overview

Two related features:
1. Let players choose which releases are active (with persistent defaults and per-game overrides)
2. Ensure each player's starting deck has a fixed, balanced type composition

---

## Feature 1: Release Selection

### Settings Page (`/settings`)

- Grid of all release tiles, styled like the card browser's colored release buttons, each toggleable on/off
- "Select All" and "Clear All" shortcuts
- Saves selection to `localStorage` under key `activeReleases` (array of release IDs)
- Default on first visit: all releases active
- Shows a warning and disables the Save button if fewer than 2 releases are selected: *"Select at least 2 releases to play"*
- Link to Settings accessible from the home page nav

### Game Setup Screen (`/game`)

- Reads `activeReleases` from localStorage on load
- Renders the same release tiles above the mode buttons, pre-filled from saved defaults
- Changes on this screen apply only to the current game — not automatically persisted
- "Save as default" button explicitly persists the current selection back to localStorage
- If fewer than 2 releases are selected, mode buttons ("vs AI", "Pass & Play") are disabled with the same warning

---

## Feature 2: Balanced Starting Deck

### Deck Composition (per player)

| Type     | Count |
|----------|-------|
| Creatures | 10   |
| Items     | 5    |
| Actions   | 4    |
| Events    | 1    |
| **Total** | **20** |

### Deck Building Logic (in `app/game/page.tsx`)

1. Filter full card pool to cards whose `release_id` is in `activeReleases`
2. Split filtered pool into four typed arrays, shuffle each independently
3. Player gets: `creatures[0..9]`, `items[0..4]`, `actions[0..3]`, `events[0]`
4. Opponent gets: `creatures[10..19]`, `items[5..9]`, `actions[4..7]`, `events[1]`
5. If any typed pool is too small (shouldn't happen with 2+ releases selected), surface a clear error rather than silently dealing an unbalanced deck
6. `makePlayerState` in `GameEngine.ts` handles hand setup (guarantee a creature in opening hand) — no changes needed there

### Minimum Release Constraint

With 1 release: 14 creatures available, but 20 are needed (10 per player) → insufficient. 2 releases provide 28 creatures, 16 items, 12 actions, 4 events — sufficient for both players. This is why fewer than 2 active releases blocks game start.

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `app/settings/page.tsx` | New — Settings page with release toggles |
| `app/page.tsx` | Add nav link to `/settings` |
| `app/game/page.tsx` | Read `activeReleases` from localStorage; show release toggles; balanced deck building |
| `lib/supabase.ts` | No changes needed (cards already fetched with `release_id`) |
| `lib/GameEngine.ts` | No changes needed |
