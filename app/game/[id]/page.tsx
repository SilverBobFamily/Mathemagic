'use client';

import { use, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import GameBoard from '@/components/GameBoard';
import type { GameState, Side } from '@/lib/types';

type GameRow = {
  id: string;
  player1_id: string;
  player2_id: string | null;
  state_json: GameState;
  active_side: string;
  status: string;
};

export default function OnlineGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [game, setGame] = useState<GameRow | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [mySide, setMySide] = useState<Side | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Sign in to play online.');
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: gameData, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !gameData) {
        setError('Game not found.');
        setLoading(false);
        return;
      }

      const row = gameData as GameRow;
      setGame(row);
      setGameState(row.state_json as GameState);

      if (row.player1_id === user.id) {
        setMySide('player');
      } else if (row.player2_id === user.id) {
        setMySide('opponent');
      }
      // else mySide stays null (spectator / potential joiner)

      channel = supabase
        .channel(`game:${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'games',
            filter: `id=eq.${id}`,
          },
          (payload) => {
            const updated = payload.new as GameRow;
            setGame(updated);
            setGameState(updated.state_json as GameState);
          }
        )
        .subscribe();

      setLoading(false);
    }

    init();

    return () => {
      if (channel) {
        const supabaseClient = createSupabaseBrowserClient();
        supabaseClient.removeChannel(channel);
      }
    };
  }, [id]);

  const handleJoin = async () => {
    if (!userId || !game || joining) return;
    setJoining(true);
    const supabase = createSupabaseBrowserClient();
    const { error: joinError } = await supabase
      .from('games')
      .update({ player2_id: userId, status: 'active' })
      .eq('id', id)
      .eq('status', 'waiting');
    if (!joinError) {
      setMySide('opponent');
      setGame(prev => prev ? { ...prev, player2_id: userId, status: 'active' } : prev);
    }
    setJoining(false);
  };

  const handleStateChange = async (nextState: GameState) => {
    setSubmitting(true);
    const res = await fetch(`/api/games/${id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'setState', stateJson: nextState }),
    });
    if (res.ok) {
      const data = await res.json();
      setGameState(data.state);
    }
    setSubmitting(false);
  };

  const handleNewGame = () => {
    window.location.href = '/lobby';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '80vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#aaa',
      }}>
        Loading game…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '80vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#ef5350',
      }}>
        {error}
      </div>
    );
  }

  // Waiting for opponent to join
  if (mySide === null && game && game.status === 'waiting') {
    const isPlayer1 = game.player1_id === userId;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    return (
      <div style={{
        minHeight: '80vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20,
        padding: '40px 24px',
      }}>
        <h1 style={{ color: '#fff', fontFamily: "'Cinzel', serif", margin: 0 }}>
          {isPlayer1 ? 'Waiting for Opponent' : 'Join Game'}
        </h1>
        {isPlayer1 ? (
          <>
            <p style={{ color: '#888', margin: 0 }}>Share this link with your opponent:</p>
            <div style={{
              background: '#111', border: '1px solid #333', borderRadius: 8,
              padding: '10px 16px', color: '#aaa', fontSize: '0.85em',
              wordBreak: 'break-all', maxWidth: 560, textAlign: 'center',
            }}>
              {shareUrl}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              style={{
                background: '#1a237e', color: '#fff', border: '2px solid #5c6bc0',
                borderRadius: 8, padding: '8px 24px', fontSize: '0.95em', cursor: 'pointer',
              }}
            >
              Copy Link
            </button>
          </>
        ) : (
          <>
            <p style={{ color: '#888', margin: 0 }}>You have been invited to this game.</p>
            <button
              onClick={handleJoin}
              disabled={joining}
              style={{
                background: joining ? '#111' : '#1b5e20',
                color: joining ? '#444' : '#fff',
                border: `2px solid ${joining ? '#333' : '#81c784'}`,
                borderRadius: 8, padding: '11px 32px', fontSize: '1em',
                cursor: joining ? 'not-allowed' : 'pointer',
              }}
            >
              {joining ? 'Joining…' : 'Join Game'}
            </button>
          </>
        )}
      </div>
    );
  }

  if (gameState !== null) {
    return (
      <div style={{ padding: '16px 24px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: '#555', fontSize: '0.85em' }}>Mode: 🌐 Online</span>
          <button
            onClick={handleNewGame}
            style={{
              background: '#111', color: '#888', border: '1px solid #333',
              borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: '0.85em',
            }}
          >
            ← Lobby
          </button>
        </div>
        <div style={{ opacity: submitting ? 0.7 : 1, pointerEvents: submitting ? 'none' : 'auto' }}>
          <GameBoard
            state={gameState}
            onStateChange={handleStateChange}
            mode="online"
            mySide={mySide ?? 'player'}
            onNewGame={handleNewGame}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '80vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#aaa',
    }}>
      Something went wrong.
    </div>
  );
}
