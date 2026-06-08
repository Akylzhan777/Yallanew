import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Tariff {
  id: string;
  name: string;
  price: string;
  price_sub: string;
  badge: string;
  is_featured: boolean;
  features: string[];
  sort_order: number;
}

export const FALLBACK_TARIFFS: Tariff[] = [
  {
    id: '1', name: 'Lite', price: 'от 500 AED', price_sub: 'за съёмку', badge: '', is_featured: false, sort_order: 1,
    features: ['2 часа съёмки', 'Монтаж 2 Reels', 'Подбор локации', 'Базовая цветокоррекция'],
  },
  {
    id: '2', name: 'Pro', price: 'от 1 200 AED', price_sub: 'за съёмку', badge: 'Most Popular', is_featured: true, sort_order: 2,
    features: ['4 часа съёмки', 'Монтаж 5 Reels', 'Подбор локации', 'Профессиональный монтаж', 'Сценарий и идеи', 'Приоритетная поддержка'],
  },
  {
    id: '3', name: 'Diamond', price: 'от 2 500 AED', price_sub: 'за съёмку', badge: '', is_featured: false, sort_order: 3,
    features: ['Полный съёмочный день', 'Монтаж до 10 Reels', 'Подбор локации', 'Кинематографический монтаж', 'Стратегия контента', 'Персональный менеджер', 'Drone + Studio included'],
  },
];

interface Props {
  onSelect: (tariff: Tariff) => void;
}

export default function TariffsSection({ onSelect }: Props) {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);

  useEffect(() => {
    supabase
      .from('tariffs')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setTariffs(
            data.map((r: Tariff) => ({
              ...r,
              features: Array.isArray(r.features) ? r.features : [],
            }))
          );
        } else {
          setTariffs(FALLBACK_TARIFFS);
        }
      });
  }, []);

  const displayTariffs = tariffs.length > 0 ? tariffs : FALLBACK_TARIFFS;

  return (
    <section className="tariffs-section" id="tariffs">
      <div className="tariffs-header">
        <div className="lp2-section-label">Тарифы</div>
        <h2 className="lp2-section-h2">Выберите свой формат</h2>
        <p className="lp2-section-sub">Гибкие пакеты под любые цели — от первых Reels до полноценного личного бренда.</p>
      </div>

      {/* Mobile: horizontal scroll carousel | Desktop: 3-col grid */}
      <div className="
        flex flex-row overflow-x-auto gap-4 snap-x snap-mandatory px-6 pb-8 pt-3
        [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
        md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pt-5 md:pb-0
        md:max-w-[1080px] md:mx-auto
      ">
        {displayTariffs.map(tariff => (
          <div
            key={tariff.id}
            className={`
              flex-shrink-0 w-[85vw] snap-center
              md:w-auto md:flex-shrink md:snap-align-none
              tariff-card${tariff.is_featured ? ' tariff-card-featured' : ''}
            `}
          >
            {tariff.badge && (
              <div className="tariff-badge">{tariff.badge}</div>
            )}
            <div className="tariff-name">{tariff.name}</div>
            <div className="tariff-price-block">
              <span className="tariff-price">{tariff.price}</span>
              {tariff.price_sub && <span className="tariff-price-sub">{tariff.price_sub}</span>}
            </div>
            <div className="tariff-divider" />
            <ul className="tariff-features">
              {tariff.features.map((f, i) => (
                <li key={i} className="tariff-feature">
                  <span className="tariff-check">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`tariff-btn${tariff.is_featured ? ' tariff-btn-featured' : ''}`}
              onClick={() => onSelect(tariff)}
            >
              Выбрать
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
