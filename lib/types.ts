export type CardType = 'creature' | 'item' | 'action' | 'event';
export type EventEffect = 'zero_out' | 'banish' | 'mirror' | 'x100' | 'swap' | 'reverse';
export type Side = 'player' | 'opponent';
export type GamePhase = 'setup' | 'playing' | 'sudden_death' | 'finished';

export interface Release {
  id: number;
  name: string;
  icon: string;
  number: number;
  color_hex: string;
}

export interface Card {
  id: number;
  release_id: number;
  release?: Release;
  name: string;
  type: CardType;
  value: number | null;           // creatures: integer (-5 to +10)
  operator: string | null;        // items: '+3'/'-2'; actions: '×5'/'÷2'/'×(-1)'
  operator_value: number | null;  // numeric form: +3 → 3, ×5 → 5, ÷2 → 0.5, ×(-1) → -1
  effect_type: EventEffect | null;
  art_emoji: string;
  art_url: string | null;
  flavor_text: string;
  effect_text: string | null;
}

export interface Modifier {
  card: Card;         // the item/action/event card that was played
}

export interface FieldCard {
  card: Card;          // the creature card
  modifiers: Modifier[];
  zeroed: boolean;     // true if zero_out event was applied
}

export interface PlayerState {
  deck: Card[];        // cards not yet drawn
  hand: Card[];        // cards in hand (max 1 drawn per turn after initial 3)
  field: FieldCard[];  // creatures on the field
  aside: Card[];       // 4 cards set aside before the game
  playedCount: number; // how many cards have been played (max 16)
}

export interface GameState {
  phase: GamePhase;
  turn: Side;
  round: number;       // 1–16, plus bonus rounds in sudden death
  player: PlayerState;
  opponent: PlayerState;
  winner: Side | 'tie' | null;
  pendingCard: Card | null;       // card selected from hand, waiting for target
}
