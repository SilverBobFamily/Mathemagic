export default function Home() {
  return (
    <main style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 40 }}>
      <h1 style={{ fontSize: '3em', color: '#fff', margin: 0 }}>⚡ Mathemagic</h1>
      <p style={{ color: '#aaa', fontSize: '1.15em', textAlign: 'center', maxWidth: 500, lineHeight: 1.6 }}>
        A collectible card game where the math is the magic. Build your score with creatures, items, actions, and events — then outwit your opponent.
      </p>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <a href="/game" style={{ background: '#1a237e', color: '#fff', border: '2px solid #5c6bc0', borderRadius: 10, padding: '12px 28px', fontSize: '1em', textDecoration: 'none' }}>
          ⚔ Play Now
        </a>
        <a href="/cards" style={{ background: '#111', color: '#aaa', border: '2px solid #333', borderRadius: 10, padding: '12px 28px', fontSize: '1em', textDecoration: 'none' }}>
          Browse Cards
        </a>
      </div>
    </main>
  );
}
