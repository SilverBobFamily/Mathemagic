'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { FieldCard as FieldCardType, Card } from '@/lib/types';
import { computeCardValue, computeExpectedValue } from '@/lib/GameEngine';

interface Props {
  fieldCard: FieldCardType;       // the creature being modified
  modifierCard: Card;             // the card being played on it
  onCorrect: () => void;          // called when player gets it right
  onDismiss: () => void;          // called when player cancels
}

export default function LearningModePrompt({ fieldCard, modifierCard, onCorrect, onDismiss }: Props) {
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const expected = computeExpectedValue(fieldCard, modifierCard);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDismiss]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const answer = parseFloat(input.trim());
    if (answer === expected) {
      onCorrect();
    } else {
      setWrong(true);
      setInput('');
      inputRef.current?.focus();
    }
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1a1a2e', border: '2px solid #5c6bc0',
        borderRadius: 16, padding: '28px 32px', maxWidth: 380, width: '90%',
        fontFamily: 'sans-serif',
      }}>
        <div style={{ fontSize: '1.6em', textAlign: 'center', marginBottom: 8 }}>🧮</div>
        <h2 style={{ color: '#ffd54f', margin: '0 0 6px', fontSize: '1.1em', textAlign: 'center' }}>
          Learning Mode
        </h2>
        <p style={{ color: '#aaa', fontSize: '0.9em', textAlign: 'center', margin: '0 0 20px' }}>
          What is the new value of <strong style={{ color: '#fff' }}>{fieldCard.card.name}</strong>?
        </p>

        {/* Math breakdown */}
        <div style={{ background: '#0d0d1a', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: '0.9em' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #222' }}>
            <span style={{ color: '#888' }}>Current value</span>
            <span style={{ color: '#fff', fontFamily: 'monospace' }}>{computeCardValue(fieldCard)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
            <span style={{ color: '#888' }}>
              {modifierCard.type === 'item' ? 'Add' : 'Multiply by'} ({modifierCard.name})
            </span>
            <span style={{ color: modifierCard.type === 'item' ? '#a5d6a7' : '#ce93d8', fontFamily: 'monospace' }}>
              {(modifierCard.operator ?? String(modifierCard.operator_value ?? '')).replace('÷', '/')}
            </span>
          </div>
        </div>

        {wrong && (
          <div style={{ background: '#2a0a0a', border: '1px solid #7f0000', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85em' }}>
            <div style={{ color: '#ef9a9a', fontWeight: 700, marginBottom: 4 }}>Not quite! Here&apos;s how it works:</div>
            <div style={{ color: '#ccc' }}>
              Current value: <strong>{computeCardValue(fieldCard)}</strong>
              {modifierCard.type === 'item' && (
                <span> {(modifierCard.operator_value ?? 0) >= 0 ? '+' : ''}{modifierCard.operator_value} = <strong style={{ color: '#ffd54f' }}>{expected}</strong></span>
              )}
              {modifierCard.type === 'action' && (
                <span> × {modifierCard.operator_value} = <strong style={{ color: '#ffd54f' }}>{expected}</strong></span>
              )}
              {modifierCard.type === 'event' && (
                <span> × {modifierCard.operator_value} = <strong style={{ color: '#ffd54f' }}>{expected}</strong></span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="number"
            step="any"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Enter your answer..."
            style={{
              width: '100%', padding: '10px 14px', fontSize: '1.1em',
              background: '#0d0d1a', border: `2px solid ${wrong ? '#c62828' : '#2a2a5a'}`,
              borderRadius: 8, color: '#fff', outline: 'none',
              boxSizing: 'border-box', marginBottom: 12,
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%', padding: '10px', fontSize: '1em',
              background: '#1a237e', color: '#fff', border: '2px solid #5c6bc0',
              borderRadius: 8, cursor: 'pointer', fontWeight: 700,
            }}
          >
            Check Answer →
          </button>
        </form>
        <button
          onClick={onDismiss}
          style={{ marginTop: 10, width: '100%', padding: '7px', fontSize: '0.85em', background: 'transparent', color: '#555', border: '1px solid #333', borderRadius: 8, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}
