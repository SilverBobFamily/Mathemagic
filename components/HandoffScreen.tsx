interface Props {
  playerName: string;
  onReady: () => void;
}

export default function HandoffScreen({ playerName, onReady }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 24,
      }}
    >
      <div style={{ color: '#555', fontSize: '0.9em', letterSpacing: 3, textTransform: 'uppercase' }}>
        Pass the device
      </div>
      <div style={{ color: '#fff', fontSize: '2.5em', fontFamily: "'Cinzel', serif", fontWeight: 700 }}>
        {playerName}&rsquo;s Turn
      </div>
      <button
        onClick={onReady}
        style={{
          marginTop: 16,
          background: '#1a237e',
          color: '#fff',
          border: '2px solid #5c6bc0',
          borderRadius: 10,
          padding: '14px 40px',
          fontSize: '1.1em',
          cursor: 'pointer',
          fontFamily: "'Cinzel', serif",
        }}
      >
        I&rsquo;m Ready →
      </button>
    </div>
  );
}
