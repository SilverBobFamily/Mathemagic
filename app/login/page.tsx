'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.push('/game');
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <div style={{
        background: '#111',
        border: '1px solid #333',
        borderRadius: 14,
        padding: '40px 44px',
        width: '100%',
        maxWidth: 420,
      }}>
        <h1 style={{
          color: '#fff',
          fontFamily: "'Cinzel', serif",
          fontSize: '1.8em',
          margin: '0 0 8px',
          textAlign: 'center',
        }}>
          Sign In
        </h1>
        <p style={{
          color: '#888',
          fontSize: '0.9em',
          textAlign: 'center',
          margin: '0 0 32px',
          fontFamily: "'Crimson Text', serif",
        }}>
          Welcome back, Mathemagician
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display: 'block',
              color: '#aaa',
              fontSize: '0.85em',
              marginBottom: 6,
              fontFamily: "'Crimson Text', serif",
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
              style={{
                width: '100%',
                background: '#0d0d1a',
                border: '1px solid #333',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#eee',
                fontSize: '1em',
                fontFamily: "'Crimson Text', serif",
                outline: 'none',
                boxSizing: 'border-box',
                opacity: loading ? 0.6 : 1,
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              color: '#aaa',
              fontSize: '0.85em',
              marginBottom: 6,
              fontFamily: "'Crimson Text', serif",
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
              style={{
                width: '100%',
                background: '#0d0d1a',
                border: '1px solid #333',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#eee',
                fontSize: '1em',
                fontFamily: "'Crimson Text', serif",
                outline: 'none',
                boxSizing: 'border-box',
                opacity: loading ? 0.6 : 1,
              }}
            />
          </div>

          {error && (
            <p style={{
              color: '#ef5350',
              fontSize: '0.88em',
              margin: '0 0 18px',
              fontFamily: "'Crimson Text', serif",
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#111' : '#1a237e',
              color: loading ? '#444' : '#fff',
              border: `2px solid ${loading ? '#333' : '#5c6bc0'}`,
              borderRadius: 10,
              padding: '12px',
              fontSize: '1em',
              fontFamily: "'Cinzel', serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          margin: '24px 0 0',
          color: '#666',
          fontSize: '0.88em',
          fontFamily: "'Crimson Text', serif",
        }}>
          Don&apos;t have an account?{' '}
          <a href="/signup" style={{ color: '#5c6bc0', textDecoration: 'none' }}>
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
