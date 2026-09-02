export default function DashboardLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>
        <div className="skeleton" style={{ height: '96px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ height: '36px', width: '45%', borderRadius: '8px' }} />
        <div className="skeleton" style={{ height: '150px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ height: '150px', borderRadius: '12px' }} />
      </div>
    </div>
  );
}