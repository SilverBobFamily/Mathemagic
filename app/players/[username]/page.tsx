import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from('players')
    .select('username, avatar_url, coins, games_won, games_played')
    .eq('username', username)
    .single();

  if (!profile) notFound();

  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;
  const initials = (profile.username as string).slice(0, 2).toUpperCase();

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: '#1a237e', border: '3px solid #5c6bc0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url as string} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color: '#fff', fontFamily: "'Cinzel', serif", fontSize: '2em', fontWeight: 700 }}>
              {initials}
            </span>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{ color: '#fff', fontFamily: "'Cinzel', serif", fontSize: '1.8em', margin: '0 0 12px' }}>
          {profile.username as string}
        </h1>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#111', border: '1px solid #333', borderRadius: 20, padding: '7px 18px',
        }}>
          <span style={{ fontSize: '1.2em' }}>🪙</span>
          <span style={{ color: '#ffd54f', fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '1.1em' }}>
            {(profile.coins as number).toLocaleString()} coins
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
        background: '#111', border: '1px solid #222', borderRadius: 12, padding: '20px 16px',
      }}>
        {[
          { label: 'Played', value: profile.games_played as number },
          { label: 'Wins', value: profile.games_won as number },
          { label: 'Win Rate', value: `${winRate}%` },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontFamily: "'Cinzel', serif", fontSize: '1.6em', fontWeight: 700 }}>
              {stat.value}
            </div>
            <div style={{ color: '#666', fontSize: '0.78em', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
