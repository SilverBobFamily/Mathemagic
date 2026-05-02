import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWinner, computeScore } from '@/lib/GameEngine';
import type { GameState } from '@/lib/types';

type GameRow = {
  id: string;
  player1_id: string;
  player2_id: string | null;
  status: string;
  state_json: GameState;
  created_at: string;
  player1: { username: string }[] | null;
  player2: { username: string }[] | null;
};

export default async function GamesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('games')
    .select(`
      id, player1_id, player2_id, status, state_json, created_at,
      player1:players!games_player1_id_fkey(username),
      player2:players!games_player2_id_fkey(username)
    `)
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(50);

  const games = (data ?? []) as GameRow[];

  return (
    <div style={{ maxWidth: 700, margin: '48px auto', padding: '0 24px' }}>
      <h1 style={{ color: '#fff', fontFamily: "'Cinzel', serif", fontSize: '1.8em', margin: '0 0 28px' }}>
        My Games
      </h1>

      {games.length === 0 ? (
        <p style={{ color: '#666', fontFamily: "'Crimson Text', serif" }}>
          No games yet.{' '}
          <a href="/lobby" style={{ color: '#5c6bc0', textDecoration: 'none' }}>Play online</a>
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {games.map(game => {
            const isPlayer1 = game.player1_id === user.id;
            const mySide = isPlayer1 ? 'player' : 'opponent';
            const theirSide = isPlayer1 ? 'opponent' : 'player';
            const opponentRow = isPlayer1 ? game.player2 : game.player1;
            const opponentName = opponentRow?.[0]?.username ?? (game.status === 'waiting' ? null : 'Unknown');

            let badge: { label: string; color: string; bg: string };
            let scoreStr = '';
            let linkHref: string | null = null;

            if (game.status === 'finished') {
              const winner = getWinner(game.state_json);
              const myScore = computeScore(game.state_json[mySide].field);
              const theirScore = computeScore(game.state_json[theirSide].field);
              scoreStr = `${myScore}–${theirScore}`;
              if (winner === 'tie') {
                badge = { label: 'Tie', color: '#aaa', bg: '#1a1a1a' };
              } else if (winner === mySide) {
                badge = { label: 'Won', color: '#81c784', bg: '#0d1f0d' };
              } else {
                badge = { label: 'Lost', color: '#ef5350', bg: '#1f0d0d' };
              }
            } else if (game.status === 'active') {
              badge = { label: 'In Progress', color: '#5c6bc0', bg: '#0d0f1f' };
              linkHref = `/game/${game.id}`;
            } else {
              // waiting
              badge = { label: 'Waiting', color: '#ffd54f', bg: '#1f1a0d' };
              linkHref = `/game/${game.id}`;
            }

            const date = new Date(game.created_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric',
            });

            return (
              <div
                key={game.id}
                style={{
                  background: '#111', border: '1px solid #222', borderRadius: 10,
                  padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: '#555', fontSize: '0.82em' }}>vs. </span>
                  <span style={{ color: '#ddd', fontWeight: 600 }}>
                    {opponentName ?? <span style={{ color: '#555', fontStyle: 'italic' }}>Waiting for opponent</span>}
                  </span>
                  {scoreStr && (
                    <span style={{ color: '#555', fontSize: '0.82em', marginLeft: 10 }}>
                      {scoreStr}
                    </span>
                  )}
                </div>
                <span style={{
                  background: badge.bg, color: badge.color,
                  border: `1px solid ${badge.color}44`,
                  borderRadius: 6, padding: '3px 10px', fontSize: '0.78em', fontWeight: 600,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {badge.label}
                </span>
                <span style={{ color: '#444', fontSize: '0.78em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {date}
                </span>
                {linkHref && (
                  <a
                    href={linkHref}
                    style={{
                      background: '#1a237e', color: '#fff', border: '1px solid #5c6bc0',
                      borderRadius: 6, padding: '5px 14px', fontSize: '0.82em',
                      textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    Continue →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
