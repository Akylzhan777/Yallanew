import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CreditPackage } from './PackagesEditor';

interface PaymentModalProps {
  onClose: () => void;
}

export default function PaymentModal({ onClose }: PaymentModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [loadingPkgs, setLoadingPkgs] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await supabase.from('credit_packages').select('*').order('sort_order');
      if (data) setPackages(data);
      setLoadingPkgs(false);
    };
    fetchPackages();
  }, []);

  const selectedPkg = packages.find(p => p.id === selected) ?? null;

  const handleBuy = async () => {
    if (!user || !profile || !selectedPkg) return;
    setBuying(true);
    const validityDays = selectedPkg.validity_days ?? 30;
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + validityDays);
    const { error } = await supabase
      .from('profiles')
      .update({
        balance: profile.balance + selectedPkg.credits_value,
        credits_expire_at: expireAt.toISOString(),
      })
      .eq('id', user.id);
    if (!error) {
      await refreshProfile();
      try {
        const { data: tgData, error: tgError } = await supabase.functions.invoke('telegram-notify', {
          body: {
            event_type: 'purchase',
            client_name: profile.name ? `${profile.name} ${profile.surname}`.trim() : user.email,
            amount: `${selectedPkg.price.toLocaleString('ru-RU')} ${selectedPkg.currency}`,
            details: selectedPkg.title,
          },
        });
        if (tgError) {
          alert(`Telegram function error: ${tgError.message}`);
        } else if (tgData?.telegram_error) {
          alert(`Telegram API error: ${JSON.stringify(tgData.telegram_error)}`);
        }
      } catch (tgEx) {
        alert(`Telegram invoke exception: ${String(tgEx)}`);
      }
      onClose();
    }
    setBuying(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ padding: '28px 24px 24px' }} onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800 }}>Пополнить баланс</h2>
        <p style={{ color: '#8F90A6', margin: '0 0 20px', fontSize: '0.88rem' }}>Выберите пакет видео</p>

        {loadingPkgs ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <div className="admin-spinner" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {packages.map(pkg => {
              const isSelected = selected === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelected(pkg.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 18px',
                    background: isSelected ? 'rgba(0,196,140,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${isSelected ? '#00C48C' : 'rgba(255,255,255,0.10)'}`,
                    borderRadius: 14,
                    cursor: 'pointer',
                    transition: 'border-color 0.18s, background 0.18s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? '#00C48C' : 'rgba(255,255,255,0.25)'}`,
                      background: isSelected ? '#00C48C' : 'transparent',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.18s',
                    }}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="#0F1115" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.97rem', color: '#fff' }}>{pkg.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#8F90A6', marginTop: 2 }}>
                        {pkg.subtitle}{pkg.subtitle && ' · '}{pkg.validity_days ?? 30} дн.
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#00C48C', whiteSpace: 'nowrap' }}>
                    {pkg.price.toLocaleString('ru-RU')} {pkg.currency}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={handleBuy}
          disabled={selected === null || buying || loadingPkgs}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '14px',
            background: selected !== null ? '#00C48C' : 'rgba(255,255,255,0.08)',
            color: selected !== null ? '#0F1115' : '#8F90A6',
            border: 'none',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: '0.97rem',
            cursor: selected !== null ? 'pointer' : 'not-allowed',
            transition: 'all 0.18s',
          }}
        >
          {buying
            ? 'Обработка...'
            : selectedPkg
              ? `Купить — ${selectedPkg.price.toLocaleString('ru-RU')} ${selectedPkg.currency}`
              : 'Выберите пакет'
          }
        </button>
      </div>
    </div>
  );
}
