'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchReleases, fetchCardsByReleaseIds } from '@/lib/supabase';
import { getActiveReleaseIds, setActiveReleaseIds } from '@/lib/releases';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { buildBalancedDecks } from '@/lib/deck';
import { createGame } from '@/lib/GameEngine';
import { DEFAULT_OPTIONS } from '@/lib/options';
import type { Release } from '@/lib/types';

export default function LobbyPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [releases, setReleases] = useState<Release[]>([]);
  const [activeReleaseIds, setActiveIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const [joinId, setJoinId] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
      setAuthChecked(true);
    });

    fetchReleases()
      .then(r => {
        setReleases(r);
        const stored = getActiveReleaseIds();
        setActiveIds(stored ?? r.map(rel => rel.id));
        setLoading(false);
      })
      .catch(() => {
        setLoadError('Failed to load releases.');
        setLoading(false);
      });
  }, []);

  const toggleRelease = useCallback((id: number) => {
    setActiveIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handleCreateGame = useCallback(async () => {
    if (activeReleaseIds.length < 2 || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const pool = await fetchCardsByReleaseIds(activeReleaseIds);
      const { playerDeck, opponentDeck } = buildBalancedDecks(pool, { eventCount: DEFAULT_OPTIONS.eventCount });
      const state = createGame(playerDeck, opponentDeck, false, DEFAULT_OPTIONS, 'player');
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stateJson: state }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Server error ${res.status}`);
      }
      const { id } = await res.json();
      setCreatedGameId(id);
      setCreating(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create game.');
      setCreating(false);
    }
  }, [activeReleaseIds, creating]);

  const handleJoin = useCallback(() => {
    const trimmed = joinId.trim();
    if (!trimmed || joining) return;
    setJoining(true);
    setJoinError(null);
    // Basic UUID format check
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      setJoinError('Invalid game ID. Enter a valid UUID.');
      setJoining(false);
      return;
    }
    window.location.href = `/game/${trimmed}`;
  }, [joinId, joining]);

  if (!authChecked || loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
        Loading...
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef5350' }}>
        {loadError}
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <h1 style={{ color: '#fff', fontFamily: "'Cinzel', serif", margin: 0 }}>Play Online</h1>
        <p style={{ color: '#aaa', margin: 0 }}>Sign in to play online.</p>
        <a
          href="/login"
          style={{
            background: '#1a237e', color: '#fff', border: '2px solid #5c6bc0',
            borderRadius: 8, padding: '10px 28px', fontSize: '1em', textDecoration: 'none',
          }}
        >
          Sign in
        </a>
      </div>
    );
  }

  const tooFew = activeReleaseIds.length < 2;

  return (
    <div style={{
      minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 32, padding: '40px 48px', width: '100%', boxSizing: 'border-box',
    }}>
      <h1 style={{ color: '#fff', fontFamily: "'Cinzel', serif", margin: 0, fontSize: '2em' }}>
        Play Online
      </h1>

      {/* Release picker */}
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ color: '#ccc', fontSize: '0.9em' }}>Active Releases</span>
          <button onClick={() => setActiveIds(releases.map(r => r.id))} style={chipBtn}>All</button>
          <button onClick={() => setActiveIds([])} style={chipBtn}>None</button>
          <button
            onClick={() => setActiveReleaseIds(activeReleaseIds)}
            style={chipBtn}
          >
            Save as Default
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {releases.map(r => (
            <button
              key={r.id}
              onClick={() => toggleRelease(r.id)}
              style={{
                background: activeReleaseIds.includes(r.id) ? r.color_hex : '#111',
                color: '#fff',
                border: `2px solid ${r.color_hex}`,
                borderRadius: 7,
                padding: '6px 13px',
                cursor: 'pointer',
                fontSize: '0.82em',
                fontWeight: activeReleaseIds.includes(r.id) ? 700 : 400,
              }}
            >
              {r.icon} {r.name}
            </button>
          ))}
        </div>
        {tooFew && (
          <p style={{ color: '#ef5350', fontSize: '0.85em', margin: '10px 0 0' }}>
            Select at least 2 releases to create a game.
          </p>
        )}
      </div>

      {/* Create Game */}
      <div style={{
        width: '100%', background: '#0d0d0d', boxSizing: 'border-box' as const,
        border: '1px solid #222', borderRadius: 12, padding: '24px 28px',
      }}>
        <h2 style={{ color: '#fff', fontFamily: "'Cinzel', serif", margin: '0 0 8px', fontSize: '1.2em' }}>
          Create Game
        </h2>
        <p style={{ color: '#888', fontSize: '0.88em', margin: '0 0 16px' }}>
          Start a new game and share the link with your opponent.
        </p>
        {createError && (
          <p style={{ color: '#ef5350', fontSize: '0.85em', margin: '0 0 12px' }}>{createError}</p>
        )}
        <button
          onClick={handleCreateGame}
          disabled={tooFew || creating}
          style={{
            background: tooFew || creating ? '#111' : '#1a237e',
            color: tooFew || creating ? '#444' : '#fff',
            border: `2px solid ${tooFew || creating ? '#333' : '#5c6bc0'}`,
            borderRadius: 8, padding: '11px 32px', fontSize: '1em',
            cursor: tooFew || creating ? 'not-allowed' : 'pointer',
          }}
        >
          {creating ? 'Creating...' : 'Create Game'}
        </button>
      </div>

      {/* Invite overlay — shown after game is created */}
      {createdGameId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 24,
        }}>
          <div style={{
            background: '#111', border: '1px solid #333', borderRadius: 16,
            padding: '36px 32px', maxWidth: 520, width: '100%', boxSizing: 'border-box',
          }}>
            <h2 style={{ color: '#fff', fontFamily: "'Cinzel', serif", margin: '0 0 8px', fontSize: '1.4em' }}>
              Game Created!
            </h2>
            <p style={{ color: '#888', fontSize: '0.88em', margin: '0 0 20px', fontFamily: "'Crimson Text', serif" }}>
              Share this link with your opponent. The game starts when they join.
            </p>
            <div style={{
              background: '#0d0d0d', border: '1px solid #333', borderRadius: 8,
              padding: '10px 14px', color: '#aaa', fontSize: '0.82em',
              wordBreak: 'break-all', marginBottom: 12,
            }}>
              {window.location.origin}/game/{createdGameId}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/game/${createdGameId}`)}
              style={{
                width: '100%', background: '#1a237e', color: '#fff',
                border: '2px solid #5c6bc0', borderRadius: 8,
                padding: '10px', fontSize: '0.95em', cursor: 'pointer',
                marginBottom: 10,
              }}
            >
              Copy Invite Link
            </button>
            <button
              onClick={() => { window.location.href = `/game/${createdGameId}`; }}
              style={{
                width: '100%', background: '#1b5e20', color: '#fff',
                border: '2px solid #81c784', borderRadius: 8,
                padding: '10px', fontSize: '0.95em', cursor: 'pointer',
                marginBottom: 10,
              }}
            >
              Go to Game
            </button>
            <button
              onClick={() => setCreatedGameId(null)}
              style={{
                width: '100%', background: 'none', color: '#666',
                border: '1px solid #333', borderRadius: 8,
                padding: '10px', fontSize: '0.9em', cursor: 'pointer',
              }}
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Join Game */}
      <div style={{
        width: '100%', background: '#0d0d0d', boxSizing: 'border-box' as const,
        border: '1px solid #222', borderRadius: 12, padding: '24px 28px',
      }}>
        <h2 style={{ color: '#fff', fontFamily: "'Cinzel', serif", margin: '0 0 8px', fontSize: '1.2em' }}>
          Join Game
        </h2>
        <p style={{ color: '#888', fontSize: '0.88em', margin: '0 0 16px' }}>
          Enter a game ID shared by your opponent.
        </p>
        {joinError && (
          <p style={{ color: '#ef5350', fontSize: '0.85em', margin: '0 0 12px' }}>{joinError}</p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={joinId}
            onChange={e => setJoinId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="Game ID (UUID)"
            style={{
              flex: 1, background: '#111', color: '#eee', border: '1px solid #333',
              borderRadius: 7, padding: '10px 14px', fontSize: '0.9em',
              outline: 'none', fontFamily: "'Crimson Text', serif",
            }}
          />
          <button
            onClick={handleJoin}
            disabled={!joinId.trim() || joining}
            style={{
              background: !joinId.trim() || joining ? '#111' : '#1b5e20',
              color: !joinId.trim() || joining ? '#444' : '#fff',
              border: `2px solid ${!joinId.trim() || joining ? '#333' : '#81c784'}`,
              borderRadius: 8, padding: '10px 24px', fontSize: '0.95em',
              cursor: !joinId.trim() || joining ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {joining ? '...' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}

const chipBtn: React.CSSProperties = {
  background: '#222', color: '#aaa', border: '1px solid #333',
  borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: '0.8em',
};
