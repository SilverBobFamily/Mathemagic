'use client';
import { useEffect, useState } from 'react';
import { fetchReleases } from '@/lib/supabase';
import { getActiveReleaseIds, setActiveReleaseIds } from '@/lib/releases';
import type { Release } from '@/lib/types';

export default function SettingsPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [activeIds, setActiveIds] = useState<number[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchReleases().then(r => {
      setReleases(r);
      const stored = getActiveReleaseIds();
      setActiveIds(stored ?? r.map(rel => rel.id));
    });
  }, []);

  const toggle = (id: number) => {
    setSaved(false);
    setActiveIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const save = () => {
    setActiveReleaseIds(activeIds);
    setSaved(true);
  };

  const tooFew = activeIds.length < 2;

  return (
    <div style={{ padding: '32px 28px', maxWidth: 860, margin: '0 auto' }}>
      <h1 style={{ color: '#fff', marginTop: 0, fontFamily: "'Cinzel', serif" }}>Settings</h1>

      <h2 style={{ color: '#ccc', fontSize: '1.05em', marginBottom: 12, fontFamily: "'Cinzel', serif" }}>
        Active Releases
      </h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => { setSaved(false); setActiveIds(releases.map(r => r.id)); }}
          style={{ background: '#222', color: '#aaa', border: '1px solid #444', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: '0.85em' }}
        >
          Select All
        </button>
        <button
          onClick={() => { setSaved(false); setActiveIds([]); }}
          style={{ background: '#222', color: '#aaa', border: '1px solid #444', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: '0.85em' }}
        >
          Clear All
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {releases.map(r => (
          <button
            key={r.id}
            onClick={() => toggle(r.id)}
            style={{
              background: activeIds.includes(r.id) ? r.color_hex : '#111',
              color: '#fff',
              border: `2px solid ${r.color_hex}`,
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '0.9em',
              fontWeight: activeIds.includes(r.id) ? 700 : 400,
            }}
          >
            {r.icon} {r.name}
          </button>
        ))}
      </div>

      {tooFew && (
        <p style={{ color: '#ef5350', fontSize: '0.9em', margin: '0 0 16px' }}>
          Select at least 2 releases to play.
        </p>
      )}

      <button
        onClick={save}
        disabled={tooFew}
        style={{
          background: tooFew ? '#1a1a1a' : '#1a237e',
          color: tooFew ? '#444' : '#fff',
          border: `2px solid ${tooFew ? '#333' : '#5c6bc0'}`,
          borderRadius: 10,
          padding: '12px 28px',
          fontSize: '1em',
          cursor: tooFew ? 'not-allowed' : 'pointer',
        }}
      >
        Save as Default
      </button>

      {saved && (
        <span style={{ marginLeft: 16, color: '#81c784', fontSize: '0.9em' }}>Saved!</span>
      )}
    </div>
  );
}
