# Add Release

Walk through creating a new 30-card release for the Math Card Game and seeding it into Supabase. Each release contains exactly: **14 creatures · 8 items · 6 actions · 2 events**.

---

## Step 1 — Define the release

Ask the user for:
- **Release number** (next sequential number after existing releases)
- **Theme name** (e.g. "Pirates", "Medieval Knights", "Ancient Egypt")
- **Theme icon** (single emoji, e.g. 🏴‍☠️)
- **Primary color hex** (e.g. `#1a237e`) — used in the card browser tab

Confirm these before proceeding.

---

## Step 2 — Choose card naming mode

Present three options:

**A — I'll provide all the names**
> User types a list of 30 card names (or provides them interactively). Claude handles type assignment, values, operators, effect types, flavor text, and effect text.

**B — Pick from a generated list**
> Claude generates a themed list of ~40–50 candidate names, user picks 30. Then Claude assigns types, values, and writes flavor/effect text.

**C — Fully auto-generate**
> Claude creates all 30 card names, assigns types and values, and writes all text. User reviews and approves before seeding.

Ask the user which mode they want, then proceed accordingly.

---

## Step 3 — Generate the 30 cards

Regardless of mode, the final output must conform to these rules:

### Card type distribution (fixed)
- 14 creatures
- 8 items
- 6 actions
- 2 events

### Value / operator rules

**Creatures** — integer value from −5 to +10:
- Mix: ~10 positive, ~1 zero, ~3 negative
- Suggested spread: one at +10, two at +7–9, three at +5–6, four at +3–4, two at +1–2, one at 0, two at −1 to −3, one at −4 to −5

**Items** — add or subtract a fixed integer:
- 6 cards at ±1 to ±3 (mix of + and −)
- 2 cards at ±5 (the "big" items)
- Use `operator` string (e.g. `'+3'`, `'-2'`) and numeric `operator_value`

**Actions** — multiply or divide:
- Must include at least: ×2, ×5, ×10, ÷2, ÷5, ×(−1)
- Optional: ×(−2) may replace ×(−1) in some releases
- Use `operator` string (e.g. `'×2'`, `'÷5'`, `'×(-1)'`) and numeric `operator_value` (e.g. 2, 0.2, -1)

**Events** — reference the release event table from the spec. For releases 7+, choose from:
- Destructive: `zero_out` (set creature to 0), `banish` (remove from field)
- Amplifying: `x100` (×100 a creature), `mirror` (copy value to another)
- Chaotic: `swap` (exchange two creatures), `reverse` (flip all signs on one side)
- Assign one Destructive/Amplifying and one Chaotic/Amplifying per release, matching the game's balance.

### Text rules
- **Flavor text** (all cards): 1–2 sentences, thematic, witty or evocative, no math jargon
- **Effect text** (items/actions/events only): plain English description of the mechanical effect
  - Items: "Add +N to one creature." or "Subtract N from one creature."
  - Actions: "Multiply one creature's value by N." or "Divide one creature's value by N." or "Flip one creature's value to its opposite."
  - Events: specific effect description matching effect_type

---

## Step 4 — Review

Display a formatted summary table of all 30 cards:

```
NAME              | TYPE     | VALUE/OP | EFFECT TYPE | ART EMOJI
------------------|----------|----------|-------------|----------
Cleopatra         | creature | 8        |             | 👑
Scarab Curse      | item     | -3       |             | 🪲
Pyramid Power     | action   | ×5       |             | 🔺
```

Ask the user to review. Make any requested changes before seeding.

---

## Step 5 — Add to seed script

Open `scripts/seed.ts` and append the new release cards. Follow the existing pattern exactly:

```typescript
// Release N — [Theme Name]
const rNCards = [
  // --- CREATURES ---
  { name: 'CardName', type: 'creature', value: 8, art_emoji: '👑',
    flavor_text: 'Flavor text here.' },
  
  // --- ITEMS ---
  { name: 'ItemName', type: 'item', operator: '+3', operator_value: 3,
    art_emoji: '🏺', effect_text: 'Add +3 to one creature.',
    flavor_text: 'Flavor text here.' },
  
  // --- ACTIONS ---
  { name: 'ActionName', type: 'action', operator: '×2', operator_value: 2,
    art_emoji: '⚡', effect_text: 'Multiply one creature\'s value by 2.',
    flavor_text: 'Flavor text here.' },
  
  // --- EVENTS ---
  { name: 'EventName', type: 'event', effect_type: 'banish',
    art_emoji: '💀', effect_text: 'Banish: Remove any one creature from the field.',
    flavor_text: 'Flavor text here.' },
];
```

Also add the new release to the `releases` array at the top of the file:
```typescript
{ number: N, name: '[Theme Name]', icon: '[emoji]', color_hex: '[hex]' },
```

And add it to the seeding loop at the bottom:
```typescript
{ number: N, cards: rNCards },
```

---

## Step 6 — Seed to Supabase

Run the seed script:
```bash
npx tsx scripts/seed.ts
```

Expected output should include:
```
Inserted N cards for Release [N]
```

If the seed script is set up for a full re-seed (INSERT only), you may need to add upsert logic or run the cards insert separately. Check the existing `seed()` function — if it uses `upsert`, re-running is safe. If it uses `insert`, extract just the new release's insert into a separate run.

---

## Step 7 — Verify

1. Open the Supabase Table Editor → cards, filter by the new `release_id`
2. Confirm 30 rows exist with correct types (14/8/6/2 distribution)
3. Open the live app card browser, select the new release tab
4. Confirm all 30 cards render correctly

---

## Step 8 — Generate artwork (optional)

Run `/generate-card-art` to generate Gemini artwork for the new release. Define the artistic style before running — it should be distinct from all existing releases.

---

## Notes

- **IDs**: Supabase auto-assigns card IDs — don't specify them in the seed data.
- **Release number uniqueness**: The releases table has a `unique` constraint on `number`. Upsert uses `onConflict: 'number'`.
- **Cards upsert**: Uses `onConflict: 'release_id,name'` — running twice is safe as long as names are unique within the release.
- **operator_value for division**: Store as the decimal multiplier. ÷2 → 0.5, ÷5 → 0.2. The GameEngine multiplies by this value.
- **art_emoji**: Required field, cannot be null. Choose a thematic emoji as placeholder until real art is generated.
