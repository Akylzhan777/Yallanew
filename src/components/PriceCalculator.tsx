import { useState } from 'react';
import { useRegion } from '../context/RegionContext';

interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  clientPrice?: number;
  deliveryDays: number;
}

interface PriceCalculatorProps {
  packages: Package[];
  onBook?: (pkg: Package) => void;
}

export default function PriceCalculator({ packages, onBook }: PriceCalculatorProps) {
  const { formatPrice } = useRegion();
  const [selectedId, setSelectedId] = useState(packages[0]?.id ?? '');

  const selected = packages.find(p => p.id === selectedId);
  if (!selected || packages.length === 0) return null;

  const basePrice = selected.clientPrice ?? Math.round(selected.price * 1.2);
  const platformFee = Math.round(basePrice * 0.1);
  const total = basePrice + platformFee;

  return (
    <div style={{
      background: 'rgba(0,196,140,0.05)',
      border: '1px solid rgba(0,196,140,0.2)',
      borderRadius: 16, padding: 20,
    }}>
      <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 14 }}>
        PRICING CALCULATOR
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {packages.map(pkg => {
          const pkgPrice = pkg.clientPrice ?? Math.round(pkg.price * 1.2);
          const isSelected = selectedId === pkg.id;
          return (
            <button
              key={pkg.id}
              onClick={() => setSelectedId(pkg.id)}
              style={{
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                border: isSelected ? '2px solid #00c48c' : '1px solid rgba(255,255,255,0.1)',
                background: isSelected ? 'rgba(0,196,140,0.1)' : 'rgba(255,255,255,0.02)',
                color: '#fff', textAlign: 'left',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all 0.15s',
              }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{pkg.name}</p>
                <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>
                  {pkg.deliveryDays} day{pkg.deliveryDays !== 1 ? 's' : ''} delivery
                </p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#00c48c', margin: 0, flexShrink: 0, marginLeft: 12 }}>
                {formatPrice(pkgPrice)}
              </p>
            </button>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>Creator price:</span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{formatPrice(basePrice)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>Platform fee (10%):</span>
          <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>+{formatPrice(platformFee)}</span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Total:</span>
          <span style={{ color: '#00c48c', fontSize: 18, fontWeight: 800 }}>{formatPrice(total)}</span>
        </div>
      </div>

      <button
        onClick={() => onBook?.(selected)}
        style={{
          width: '100%', marginTop: 16, padding: '12px 0',
          background: '#00c48c', color: '#000', border: 'none',
          borderRadius: 10, fontWeight: 700, fontSize: 14,
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Book Now — {formatPrice(total)}
      </button>
    </div>
  );
}
