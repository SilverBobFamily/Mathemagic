import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Math Card Game',
  description: 'A collectible math card game where the math is the magic.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0d0d1a', color: '#eee', fontFamily: 'sans-serif', minHeight: '100vh' }}>
        <nav style={{
          background: '#111', borderBottom: '1px solid #333',
          padding: '10px 24px', display: 'flex', gap: 28, alignItems: 'center',
        }}>
          <a href="/" style={{ color: '#ffd54f', fontWeight: 700, textDecoration: 'none', fontSize: '1.1em' }}>⚡ Math Card Game</a>
          <a href="/game" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.95em' }}>Play</a>
          <a href="/cards" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.95em' }}>Cards</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
