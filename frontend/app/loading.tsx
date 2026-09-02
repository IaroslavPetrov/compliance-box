export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#2A2A2A" strokeWidth="2" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 12 12"
              to="360 12 12"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
        <p style={{ margin: 0, color: '#A0A0A0', fontSize: '0.95rem' }}>
          Compliance<span style={{ color: '#FF6B35' }}>Box</span>
        </p>
      </div>
    </div>
  );
}