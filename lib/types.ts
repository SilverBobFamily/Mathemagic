export type CardType = 'creature' | 'item' | 'action' | 'event';
export type EventEffect = 'zero_out' | 'banish' | 'mirror' | 'x100' | 'swap' | 'reverse' | 'square' | 'reset' | 'multi_zero' | 'reverse_all';
export type Side = 'player' | 'opponent';
export type GamePhase = 'setup' | 'playing' | 'sudden_death' | 'finished';

export interface Release {
  id: number;
  name: string;
  icon: string;
  number: number;
  color_hex: string;
  private: boolean;
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
  squared?: boolean;   // true if square event was applied (value² as final step)
}

export interface PlayerState {
  deck: Card[];        // cards not yet drawn
  hand: Card[];        // cards in hand (max 1 drawn per turn after initial 3)
  field: FieldCard[];  // creatures on the field
  aside: Card[];       // 4 cards set aside before the game
  playedCount: number; // how many cards have been played (max 16)
}

export interface GameOptions {
  handSize: number;
  guaranteedEvent: boolean;
  maxPlays: number;
  eventCount: number;
  firstPlayer: 'coinFlip' | 'player' | 'opponent';
  setAsideCount: number;
  aiDifficulty: 'easy' | 'medium' | 'hard';
}

export interface GameState {
  phase: GamePhase;
  turn: Side;
  firstTurn: Side;     // who went first — round increments when we return to them
  round: number;       // increments after both players have taken a turn
  player: PlayerState;
  opponent: PlayerState;
  winner: Side | 'tie' | null;
  pendingCard: Card | null;
  learningMode: boolean;
  options: GameOptions;
}
