import type { Metadata } from 'next';
import './globals.css';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import SignOutButton from '@/components/SignOutButton';

export const metadata: Metadata = {
  title: 'Mathemagic',
  description: 'A collectible card game where the math is the magic.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data } = await supabase
      .from('players')
      .select('username')
      .eq('id', user.id)
      .single();
    username = data?.username ?? null;
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: '#0d0d1a', color: '#eee', fontFamily: "'Crimson Text', serif", minHeight: '100vh' }}>
        <nav style={{
          background: '#111', borderBottom: '1px solid #333',
          padding: '10px 24px', display: 'flex', gap: 28, alignItems: 'center',
        }}>
          <a href="/" style={{ textDecoration: 'none', lineHeight: 0 }}>
            <img src="/mathemagic-logo.svg" alt="Mathemagic" style={{ height: 108 }} />
          </a>
          <a href="/game" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.95em' }}>Play</a>
          <a href="/cards" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.95em' }}>Cards</a>
          <a href="/settings" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.95em' }}>Settings</a>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
            {user ? (
              <>
                <span style={{ color: '#ccc', fontSize: '0.95em', fontFamily: "'Crimson Text', serif" }}>
                  {username ?? user.email}
                </span>
                <SignOutButton />
              </>
            ) : (
              <a href="/login" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.95em' }}>Sign in</a>
            )}
          </div>
        </nav>
        <div style={{ fontSize: '0.67em' }}>{children}</div>
      </body>
    </html>
  );
}
