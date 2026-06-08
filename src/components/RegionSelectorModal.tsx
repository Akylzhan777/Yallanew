import { useRegion, Region } from '../context/RegionContext';

const regions: { id: Region; name: string; nameLocal: string; flag: string; description: string }[] = [
  { id: 'UAE', name: 'United Arab Emirates', nameLocal: 'الإمارات', flag: '🇦🇪', description: 'Prices in AED, English interface' },
  { id: 'KZ', name: 'Kazakhstan', nameLocal: 'Казахстан', flag: '🇰🇿', description: 'Prices in KZT, Russian interface' },
];

export default function RegionSelectorModal() {
  const { showSelector, setRegion } = useRegion();

  if (!showSelector) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden" style={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Choose Your Region</h2>
          <p className="text-sm" style={{ color: '#64748b' }}>Select your location to see relevant creators and pricing</p>
        </div>

        {/* Region Cards */}
        <div className="px-6 pb-8 space-y-3">
          {regions.map(r => (
            <button
              key={r.id}
              onClick={() => setRegion(r.id)}
              className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(56,189,248,0.4)'; (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.05)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
            >
              <span className="text-4xl leading-none">{r.flag}</span>
              <div className="flex-1">
                <p className="text-white font-semibold text-base">{r.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{r.nameLocal}</p>
                <p className="text-xs mt-1" style={{ color: '#475569' }}>{r.description}</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
