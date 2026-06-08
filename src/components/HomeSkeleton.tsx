export default function HomeSkeleton() {
  return (
    <div className="home-root">
      <div className="home-header">
        <div className="home-greeting">
          <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 6, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: 160, height: 22, borderRadius: 8 }} />
        </div>
        <div className="skeleton" style={{ width: 80, height: 18, borderRadius: 8 }} />
      </div>

      <div className="skeleton" style={{ width: '100%', height: 44, borderRadius: 12, marginBottom: 20 }} />

      <div className="skeleton" style={{ width: '100%', height: 140, borderRadius: 20, marginBottom: 20 }} />

      <div className="skeleton" style={{ width: '100%', height: 80, borderRadius: 20, marginBottom: 20 }} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ flex: 1, height: 72, borderRadius: 16 }} />
        ))}
      </div>

      <div className="skeleton" style={{ width: 80, height: 18, borderRadius: 6, marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 16 }} />
            <div className="skeleton" style={{ width: 44, height: 12, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
