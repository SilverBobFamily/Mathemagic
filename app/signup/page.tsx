'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

function validateUsername(username: string): string | null {
  if (username.length < 3) return 'Username must be at least 3 characters.';
  if (username.length > 20) return 'Username must be 20 characters or fewer.';
  if (!USERNAME_REGEX.test(username)) return 'Username may only contain letters, numbers, and underscores.';
  return null;
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (value.length > 0) {
      setUsernameError(validateUsername(value));
    } else {
      setUsernameError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateUsername(username);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();

    // Step 1: Create auth account
    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError('Signup failed. Please try again.');
      setLoading(false);
      return;
    }

    // Step 2: Insert player record
    const { error: insertError } = await supabase
      .from('players')
      .insert({ id: data.user.id, username });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push('/game');
  };

  const inputStyle = (isDisabled: boolean): React.CSSProperties => ({
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
    opacity: isDisabled ? 0.6 : 1,
  });

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#aaa',
    fontSize: '0.85em',
    marginBottom: 6,
    fontFamily: "'Crimson Text', serif",
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
          Create Account
        </h1>
        <p style={{
          color: '#888',
          fontSize: '0.9em',
          textAlign: 'center',
          margin: '0 0 32px',
          fontFamily: "'Crimson Text', serif",
        }}>
          Begin your journey, Mathemagician
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
              style={inputStyle(loading)}
            />
          </div>

          <div style={{ marginBottom: usernameError ? 6 : 18 }}>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => handleUsernameChange(e.target.value)}
              required
              autoComplete="username"
              disabled={loading}
              style={inputStyle(loading)}
            />
          </div>

          {usernameError && (
            <p style={{
              color: '#ef5350',
              fontSize: '0.85em',
              margin: '0 0 14px',
              fontFamily: "'Crimson Text', serif",
            }}>
              {usernameError}
            </p>
          )}

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading}
              style={inputStyle(loading)}
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
            disabled={loading || !!usernameError}
            style={{
              width: '100%',
              background: (loading || !!usernameError) ? '#111' : '#1a237e',
              color: (loading || !!usernameError) ? '#444' : '#fff',
              border: `2px solid ${(loading || !!usernameError) ? '#333' : '#5c6bc0'}`,
              borderRadius: 10,
              padding: '12px',
              fontSize: '1em',
              fontFamily: "'Cinzel', serif",
              cursor: (loading || !!usernameError) ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          margin: '24px 0 0',
          color: '#666',
          fontSize: '0.88em',
          fontFamily: "'Crimson Text', serif",
        }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#5c6bc0', textDecoration: 'none' }}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
