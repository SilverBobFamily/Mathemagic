'use client';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { fetchReleases, updateReleasePrivacy } from '@/lib/supabase';
import type { Release } from '@/lib/types';

type Status = 'loading' | 'unauthorized' | 'ready';

export default function AdminPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [releases, setReleases] = useState<Release[]>([]);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus('unauthorized'); return; }

      const { data: player } = await supabase
        .from('players')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!player?.is_admin) { setStatus('unauthorized'); return; }

      const r = await fetchReleases(supabase);
      setReleases(r);
      setStatus('ready');
    })();
  }, []);

  async function togglePrivate(release: Release) {
    setSaving(release.id);
    const supabase = createSupabaseBrowserClient();
    try {
      await updateReleasePrivacy(supabase, release.id, !release.private);
      setReleases(prev =>
        prev.map(r => r.id === release.id ? { ...r, private: !r.private } : r)
      );
    } finally {
      setSaving(null);
    }
  }

  if (status === 'loading') return <div style={page}><p style={{ color: '#555' }}>Loading…</p></div>;
  if (status === 'unauthorized') return (
    <div style={page}>
      <h1 style={heading}>Admin</h1>
      <p style={{ color: '#ef5350' }}>You don't have permission to view this page.</p>
    </div>
  );

  return (
    <div style={page}>
      <h1 style={heading}>Admin</h1>

      <section>
        <h2 style={subheading}>Releases</h2>
        <p style={{ color: '#888', fontSize: '0.9em', margin: '0 0 20px' }}>
          Private releases are hidden from players who haven't been granted access.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
          {releases.map(r => (
            <div
              key={r.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#111', border: '1px solid #2a2a2a',
                borderRadius: 10, padding: '12px 16px',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    display: 'inline-block', width: 10, height: 10,
                    borderRadius: '50%', background: r.color_hex, flexShrink: 0,
                  }}
                />
                <span style={{ color: '#eee', fontSize: '0.95em' }}>
                  {r.icon} {r.name}
                </span>
                {r.private && (
                  <span style={{
                    background: '#2a1a00', color: '#ffb74d',
                    border: '1px solid #5a3a00', borderRadius: 4,
                    fontSize: '0.72em', padding: '2px 7px', fontWeight: 700,
                  }}>
                    PRIVATE
                  </span>
                )}
              </span>
              <button
                onClick={() => togglePrivate(r)}
                disabled={saving === r.id}
                style={{
                  background: r.private ? '#1b3a1b' : '#1a1a2e',
                  color: r.private ? '#81c784' : '#90a4ae',
                  border: `1px solid ${r.private ? '#2e7d32' : '#37474f'}`,
                  borderRadius: 6, padding: '5px 14px',
                  fontSize: '0.8em', cursor: saving === r.id ? 'wait' : 'pointer',
                  fontWeight: 600, minWidth: 80,
                }}
              >
                {saving === r.id ? '…' : r.private ? 'Make Public' : 'Make Private'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const page: React.CSSProperties = {
  padding: '32px 28px', maxWidth: 860, margin: '0 auto',
};
const heading: React.CSSProperties = {
  color: '#fff', marginTop: 0, fontFamily: "'Cinzel', serif",
};
const subheading: React.CSSProperties = {
  color: '#ccc', fontSize: '1.05em', marginBottom: 12, fontFamily: "'Cinzel', serif",
};
