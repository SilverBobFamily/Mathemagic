// app/profile/page.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { getProfile, uploadAvatar, type PlayerProfile } from '@/lib/profile';

function Avatar({
  url, initials, size, uploading,
}: { url: string | null; initials: string; size: number; uploading: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#1a237e', border: '3px solid #5c6bc0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative', flexShrink: 0,
    }}>
      {url ? (
        <img src={url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ color: '#fff', fontFamily: "'Cinzel', serif", fontSize: size * 0.28, fontWeight: 700 }}>
          {initials}
        </span>
      )}
      {uploading && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '0.75em',
        }}>
          Uploading…
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return; }
      setUserId(user.id);
      try {
        const p = await getProfile(user.id);
        setProfile(p);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image must be under 2 MB.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadAvatar(userId, file);
      setProfile(prev => prev ? { ...prev, avatar_url: url } : prev);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
        Loading…
      </div>
    );
  }
  if (!profile) return null;

  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;
  const initials = profile.username.slice(0, 2).toUpperCase();

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 24px' }}>
      {/* Avatar upload */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{ cursor: uploading ? 'wait' : 'pointer' }}
          title="Click to change avatar"
        >
          <Avatar url={profile.avatar_url} initials={initials} size={100} uploading={uploading} />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => !uploading && fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            marginTop: 10, background: 'none', color: '#5c6bc0',
            border: 'none', cursor: uploading ? 'wait' : 'pointer',
            fontSize: '0.85em', padding: 0,
          }}
        >
          {uploading ? 'Uploading…' : 'Change avatar'}
        </button>
        {uploadError && (
          <p style={{ color: '#ef5350', fontSize: '0.8em', margin: '6px 0 0' }}>{uploadError}</p>
        )}
      </div>

      {/* Username & coins */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{ color: '#fff', fontFamily: "'Cinzel', serif", fontSize: '1.8em', margin: '0 0 12px' }}>
          {profile.username}
        </h1>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#111', border: '1px solid #333', borderRadius: 20, padding: '7px 18px',
        }}>
          <span style={{ fontSize: '1.2em' }}>🪙</span>
          <span style={{ color: '#ffd54f', fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '1.1em' }}>
            {profile.coins.toLocaleString()} coins
          </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
        background: '#111', border: '1px solid #222', borderRadius: 12, padding: '20px 16px',
      }}>
        {[
          { label: 'Played', value: profile.games_played },
          { label: 'Wins', value: profile.games_won },
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
