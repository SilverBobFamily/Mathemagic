/**
 * Playtesting simulation — runs N complete games and reports any anomalies.
 * Usage: npx tsx scripts/playtest.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import {
  createGame, playCreature, playModifier, playEvent,
  endTurn, passTurn, isGameOver, getWinner, computeScore, computeCardValue,
} from '../lib/GameEngine';
import type { Card, GameState, Side } from '../lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Bug counters ───────────────────────────────────────────────────────────
let gamesPlayed = 0;
const bugs: string[] = [];

function bug(msg: string) {
  bugs.push(msg);
  console.error('  BUG:', msg);
}

// ── Simulate the AI's move (mirrors lib/ai.ts logic) ──────────────────────
function simulateAiMove(state: GameState): GameState {
  const hand = state.opponent.hand;
  if (hand.length === 0) return passTurn(state);

  const creatures = hand.filter(c => c.type === 'creature');
  const actions   = hand.filter(c => c.type === 'action');
  const items     = hand.filter(c => c.type === 'item');
  const events    = hand.filter(c => c.type === 'event');

  const ownField  = state.opponent.field;
  const oppField  = state.player.field;
  const bestOwn   = ownField.length ? [...ownField].sort((a, b) => computeCardValue(b) - computeCardValue(a))[0] : null;
  const bestOpp   = oppField.length ? [...oppField].sort((a, b) => computeCardValue(b) - computeCardValue(a))[0] : null;

  if (creatures.length) {
    const c = [...creatures].sort((a, b) => Math.abs(b.value ?? 0) - Math.abs(a.value ?? 0))[0];
    return endTurn(playCreature(state, c.id, (c.value ?? 0) < 0 ? 'player' : 'opponent'));
  }
  if (actions.length && bestOwn)
    return endTurn(playModifier(state, actions[0].id, bestOwn.card.id, 'opponent'));
  if (items.filter(i => (i.operator_value ?? 0) > 0).length && bestOwn)
    return endTurn(playModifier(state, items.filter(i => (i.operator_value ?? 0) > 0)[0].id, bestOwn.card.id, 'opponent'));
  if (items.filter(i => (i.operator_value ?? 0) < 0).length && bestOpp)
    return endTurn(playModifier(state, items.filter(i => (i.operator_value ?? 0) < 0)[0].id, bestOpp.card.id, 'player'));
  if (events.length) {
    const ev = events[0];
    if ((ev.effect_type === 'zero_out' || ev.effect_type === 'banish') && bestOpp)
      return endTurn(playEvent(state, ev.id, bestOpp.card.id, 'player'));
    if (ev.effect_type === 'x100' && bestOwn)
      return endTurn(playEvent(state, ev.id, bestOwn.card.id, 'opponent'));
    if (ev.effect_type === 'reverse' && bestOpp)
      return endTurn(playEvent(state, ev.id, bestOpp.card.id, 'player'));
    if (ev.effect_type === 'mirror' && bestOwn && bestOpp)
      return endTurn(playEvent(state, ev.id, bestOwn.card.id, 'opponent', bestOpp.card.id, 'player'));
    if (ev.effect_type === 'swap' && ownField.length && bestOpp) {
      const worstOwn = [...ownField].sort((a, b) => computeCardValue(a) - computeCardValue(b))[0];
      return endTurn(playEvent(state, ev.id, worstOwn.card.id, 'opponent', bestOpp.card.id, 'player'));
    }
  }
  return passTurn(state);
}

// ── Simulate the player's move (greedy: best creature, else best modifier) ─
function simulatePlayerMove(state: GameState): GameState {
  const hand = state.player.hand;
  const creatures = hand.filter(c => c.type === 'creature');
  const actions   = hand.filter(c => c.type === 'action');
  const items     = hand.filter(c => c.type === 'item');
  const events    = hand.filter(c => c.type === 'event');

  const ownField  = state.player.field;
  const oppField  = state.opponent.field;
  const bestOwn   = ownField.length ? [...ownField].sort((a, b) => computeCardValue(b) - computeCardValue(a))[0] : null;
  const bestOpp   = oppField.length ? [...oppField].sort((a, b) => computeCardValue(b) - computeCardValue(a))[0] : null;

  if (creatures.length) {
    const c = [...creatures].sort((a, b) => Math.abs(b.value ?? 0) - Math.abs(a.value ?? 0))[0];
    return endTurn(playCreature(state, c.id, (c.value ?? 0) < 0 ? 'opponent' : 'player'));
  }
  if (actions.length && bestOwn)
    return endTurn(playModifier(state, actions[0].id, bestOwn.card.id, 'player'));
  if (items.filter(i => (i.operator_value ?? 0) > 0).length && bestOwn)
    return endTurn(playModifier(state, items.filter(i => (i.operator_value ?? 0) > 0)[0].id, bestOwn.card.id, 'player'));
  if (items.filter(i => (i.operator_value ?? 0) < 0).length && bestOpp)
    return endTurn(playModifier(state, items.filter(i => (i.operator_value ?? 0) < 0)[0].id, bestOpp.card.id, 'opponent'));
  if (events.length) {
    const ev = events[0];
    if ((ev.effect_type === 'zero_out' || ev.effect_type === 'banish') && bestOpp)
      return endTurn(playEvent(state, ev.id, bestOpp.card.id, 'opponent'));
    if (ev.effect_type === 'x100' && bestOwn)
      return endTurn(playEvent(state, ev.id, bestOwn.card.id, 'player'));
    if (ev.effect_type === 'reverse' && bestOpp)
      return endTurn(playEvent(state, ev.id, bestOpp.card.id, 'opponent'));
    if (ev.effect_type === 'mirror' && bestOwn && bestOpp)
      return endTurn(playEvent(state, ev.id, bestOwn.card.id, 'player', bestOpp.card.id, 'opponent'));
    if (ev.effect_type === 'swap' && ownField.length && bestOpp) {
      const worstOwn = [...ownField].sort((a, b) => computeCardValue(a) - computeCardValue(b))[0];
      return endTurn(playEvent(state, ev.id, worstOwn.card.id, 'player', bestOpp.card.id, 'opponent'));
    }
  }
  return passTurn(state);
}

function checkInvariants(state: GameState, label: string) {
  // Scores should be finite numbers
  const ps = computeScore(state.player.field);
  const os = computeScore(state.opponent.field);
  if (!isFinite(ps)) bug(`${label}: player score is ${ps}`);
  if (!isFinite(os)) bug(`${label}: opponent score is ${os}`);

  // playedCount should never exceed 17 (16 + 1 tolerance for rounding)
  if (state.player.playedCount > 17) bug(`${label}: player playedCount=${state.player.playedCount} > 16`);
  if (state.opponent.playedCount > 17) bug(`${label}: opponent playedCount=${state.opponent.playedCount} > 16`);

  // All field cards should have valid base values
  for (const fc of state.player.field) {
    if (fc.card.value === null) bug(`${label}: player field card "${fc.card.name}" has null value`);
    if (!isFinite(computeCardValue(fc))) bug(`${label}: player field card "${fc.card.name}" has non-finite computed value`);
  }
  for (const fc of state.opponent.field) {
    if (fc.card.value === null) bug(`${label}: opponent field card "${fc.card.name}" has null value`);
    if (!isFinite(computeCardValue(fc))) bug(`${label}: opponent field card "${fc.card.name}" has non-finite computed value`);
  }

  // No card should appear in both hands, any field, and the deck
  const allIds = [
    ...state.player.hand, ...state.player.deck, ...state.player.aside,
    ...state.player.field.map(fc => fc.card),
    ...state.opponent.hand, ...state.opponent.deck, ...state.opponent.aside,
    ...state.opponent.field.map(fc => fc.card),
  ].map(c => c.id);
  const seen = new Set<number>();
  for (const id of allIds) {
    if (seen.has(id)) bug(`${label}: card id=${id} appears more than once across all zones`);
    seen.add(id);
  }
}

async function runGame(allCards: Card[], gameNum: number): Promise<void> {
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);
  const playerDeck   = shuffled.slice(0, 20);
  const opponentDeck = shuffled.slice(20, 40);

  let state = createGame(playerDeck, opponentDeck);
  checkInvariants(state, `game ${gameNum} start`);

  // Verify opening hands each have a creature
  if (!state.player.hand.some(c => c.type === 'creature'))
    bug(`game ${gameNum}: player opening hand has no creature`);
  if (!state.opponent.hand.some(c => c.type === 'creature'))
    bug(`game ${gameNum}: opponent opening hand has no creature`);

  let turns = 0;
  const MAX_TURNS = 80; // safety limit

  while (!isGameOver(state) && turns < MAX_TURNS) {
    const prevState = state;
    if (state.turn === 'player') {
      state = simulatePlayerMove(state);
    } else {
      state = simulateAiMove(state);
    }
    turns++;

    // Detect stale state (turn didn't advance)
    if (state.turn === prevState.turn && state.round === prevState.round) {
      bug(`game ${gameNum} turn ${turns}: state did not advance — possible infinite loop`);
      break;
    }

    checkInvariants(state, `game ${gameNum} turn ${turns}`);
  }

  if (turns >= MAX_TURNS) {
    bug(`game ${gameNum}: hit ${MAX_TURNS}-turn limit — game never ended. player playedCount=${state.player.playedCount} opponent=${state.opponent.playedCount}`);
  }

  const winner = getWinner(state);
  const ps = computeScore(state.player.field);
  const os = computeScore(state.opponent.field);
  if (gamesPlayed < 3) {
    console.log(`  game ${gameNum}: ${turns} turns, winner=${winner}, scores: player=${ps} opponent=${os}`);
  }
}

async function main() {
  console.log('Fetching cards from Supabase...');
  const { data: cards, error } = await supabase
    .from('cards')
    .select('*, release:releases(*)')
    .order('id');
  if (error || !cards) { console.error(error); process.exit(1); }
  console.log(`Loaded ${cards.length} cards. Running simulations...\n`);

  const N = 50;
  for (let i = 1; i <= N; i++) {
    process.stdout.write(`\rGame ${i}/${N}...`);
    await runGame(cards as Card[], i);
    gamesPlayed++;
  }

  console.log(`\n\nDone. ${N} games simulated.\n`);
  if (bugs.length === 0) {
    console.log('✓ No bugs detected.');
  } else {
    const unique = [...new Set(bugs)];
    console.log(`✗ ${bugs.length} bug occurrences (${unique.length} unique):\n`);
    for (const b of unique) console.log('  •', b);
  }
}

main().catch(console.error);
