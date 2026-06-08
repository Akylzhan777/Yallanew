import { Lock, ShoppingBag, X } from 'lucide-react';

interface ActiveClientModalProps {
  onClose: () => void;
  onGoToShop: () => void;
}

export default function ActiveClientModal({ onClose, onGoToShop }: ActiveClientModalProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#18181b',
          borderRadius: '24px 24px 0 0',
          padding: '32px 24px 40px',
          width: '100%',
          maxWidth: 480,
          position: 'relative',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          animation: 'slideUpIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: '#27272a', border: 'none', borderRadius: '50%',
            width: 32, height: 32, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#71717a',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(29,78,216,0.35)',
            position: 'relative',
          }}>
            <span style={{ fontSize: '2rem' }}>🎬</span>
            <div style={{
              position: 'absolute', bottom: -6, right: -6,
              width: 26, height: 26, borderRadius: '50%',
              background: '#18181b', border: '2px solid #27272a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={12} color="#f59e0b" />
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <h2 style={{
            fontSize: '1.25rem', fontWeight: 700, color: '#f4f4f5',
            margin: '0 0 8px', letterSpacing: '-0.01em',
          }}>
            Бронь съемки
          </h2>
          <p style={{
            fontSize: '0.95rem', color: '#a1a1aa', lineHeight: 1.6,
            margin: 0, padding: '0 8px',
          }}>
            Бронь съемки доступна только для активных клиентов
          </p>
        </div>

        <div style={{
          margin: '20px 0',
          background: '#27272a',
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          border: '1px solid #3f3f46',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#1d4ed815', border: '1px solid #1d4ed833',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '1.1rem' }}>⭐</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#71717a', margin: 0, lineHeight: 1.5 }}>
            Активный клиент — это тот, у кого есть действующий пакет съемок с положительным балансом видео.
          </p>
        </div>

        <button
          onClick={() => { onClose(); onGoToShop(); }}
          style={{
            width: '100%', padding: '15px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
            border: 'none', borderRadius: 14, cursor: 'pointer',
            color: '#fff', fontSize: '1rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(29,78,216,0.4)',
            letterSpacing: '0.01em',
          }}
        >
          <ShoppingBag size={18} />
          Стать клиентом
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '13px',
            background: 'transparent', border: '1px solid #3f3f46',
            borderRadius: 14, cursor: 'pointer', color: '#71717a',
            fontSize: '0.9rem', fontWeight: 500, marginTop: 10,
          }}
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
