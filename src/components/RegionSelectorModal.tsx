import { useRegion } from '../context/RegionContext';
import { Globe } from 'lucide-react';

const regions = [
  {
    id: 'UAE' as const,
    name: 'United Arab Emirates',
    nameLocal: 'الإمارات',
    flag: '🇦🇪',
    description: 'Prices in AED, English interface',
    colors: { bg: 'rgba(56,189,248,0.03)', border: 'rgba(56,189,248,0.2)', hover: 'rgba(56,189,248,0.08)', arrow: '#38bdf8' },
  },
  {
    id: 'KZ' as const,
    name: 'Kazakhstan',
    nameLocal: 'Казахстан',
    flag: '🇰🇿',
    description: 'Prices in KZT, Russian interface',
    colors: { bg: 'rgba(168,85,247,0.03)', border: 'rgba(168,85,247,0.2)', hover: 'rgba(168,85,247,0.08)', arrow: '#a855f7' },
  },
];

export default function RegionSelectorModal() {
  const { showSelector, setRegion } = useRegion();

  if (!showSelector) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
      >
        <div className="px-8 pt-8 pb-4 text-center">
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            <Globe size={24} color="#38bdf8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Where are you from?</h2>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Select your location to see relevant creators and pricing
          </p>
        </div>

        <div className="px-6 py-6 space-y-3">
          {regions.map(r => (
            <button
              key={r.id}
              onClick={() => setRegion(r.id)}
              className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: r.colors.bg, border: `1.5px solid ${r.colors.border}`, cursor: 'pointer' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = r.colors.border.replace('0.2', '0.5');
                (e.currentTarget as HTMLElement).style.background = r.colors.hover;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = r.colors.border;
                (e.currentTarget as HTMLElement).style.background = r.colors.bg;
              }}
            >
              <span className="text-4xl leading-none flex-shrink-0">{r.flag}</span>
              <div className="flex-1">
                <p className="text-white font-semibold text-base">{r.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{r.nameLocal}</p>
                <p className="text-xs mt-1" style={{ color: '#475569' }}>💵 {r.description}</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={r.colors.arrow} strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>

        <div
          className="px-6 py-4 text-center text-xs"
          style={{ color: '#64748b', background: 'rgba(15,23,42,0.5)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          You can change this later in settings
        </div>
      </div>
    </div>
  );
}
