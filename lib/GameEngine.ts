import type { FieldCard } from './types';

export function computeCardValue(fc: FieldCard): number {
  if (fc.zeroed) return 0;

  let value = fc.card.value ?? 0;

  // Items add/subtract (applied first)
  for (const mod of fc.modifiers) {
    if (mod.card.type === 'item') {
      value += mod.card.operator_value ?? 0;
    }
  }

  // Actions multiply, events with operator_value act as multipliers
  for (const mod of fc.modifiers) {
    if (mod.card.type === 'action') {
      value *= mod.card.operator_value ?? 1;
    } else if (mod.card.type === 'event' && mod.card.operator_value !== null) {
      value *= mod.card.operator_value;
    }
  }

  return value;
}

export function computeScore(field: FieldCard[]): number {
  return field.reduce((sum, fc) => sum + computeCardValue(fc), 0);
}
