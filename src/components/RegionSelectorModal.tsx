import { useRegion } from '../context/RegionContext';
import { X, ChevronRight } from 'lucide-react';

const regions = [
  {
    id: 'UAE' as const,
    name: 'United Arab Emirates',
    nameLocal: 'الإمارات',
    flag: '🇦🇪',
    description: 'Prices in AED, English interface',
  },
  {
    id: 'KZ' as const,
    name: 'Kazakhstan',
    nameLocal: 'Казахстан',
    flag: '🇰🇿',
    description: 'Prices in KZT, Russian interface',
  },
];

export default function RegionSelectorModal() {
  const { showSelector, setRegion, setShowSelector } = useRegion();

  if (!showSelector) return null;

  return (
    <div
      dir="ltr"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-neutral-900/80 backdrop-blur-2xl"
    >
      <div className="relative flex w-full max-w-[500px] flex-col items-start justify-start gap-10 overflow-hidden rounded-[32px] bg-neutral-900 px-3 pb-3 pt-10">
        {/* Close button */}
        <button
          type="button"
          onClick={() => setShowSelector(false)}
          aria-label="Close"
          className="absolute right-2.5 top-2.5 flex size-6 items-center justify-center opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="size-3.5 text-white" strokeWidth={2.5} />
        </button>

        {/* Header */}
        <div className="flex w-full flex-col items-start justify-start gap-2.5 px-7">
          <h2 className="w-full font-sofia-pro text-3xl font-normal leading-8 text-white">
            Choose Your Region
          </h2>
          <p className="w-full font-sofia-pro text-lg font-light leading-6 text-white">
            Select your location to see relevant creators and pricing
          </p>
        </div>

        {/* Region cards */}
        <div className="flex w-full flex-col items-start justify-start gap-2.5">
          {regions.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRegion(r.id)}
              className="flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-3xl bg-zinc-300/10 p-6 text-left transition-colors hover:bg-zinc-300/20 active:bg-zinc-300/25"
            >
              <div className="flex flex-1 items-start justify-start gap-2.5">
                {/* Flag */}
                <div className="flex size-12 flex-col items-center justify-center gap-2.5 rounded-full bg-white/10">
                  <span className="font-sofia-pro text-2xl font-normal uppercase leading-9 text-white">
                    {r.flag}
                  </span>
                </div>
                {/* Texts */}
                <div className="flex flex-1 flex-col items-start justify-center gap-3">
                  <div className="flex w-full flex-col items-start justify-start">
                    <span className="w-full font-sofia-pro text-2xl font-normal leading-8 text-white">
                      {r.name}
                    </span>
                    <span className="w-full font-sofia-pro text-lg font-light leading-6 text-white">
                      {r.nameLocal}
                    </span>
                  </div>
                  <span className="w-full font-sofia-pro text-sm font-medium leading-4 text-white">
                    {r.description}
                  </span>
                </div>
              </div>
              <ChevronRight className="size-6 flex-shrink-0 text-white" strokeWidth={2} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
