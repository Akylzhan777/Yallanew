import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, X } from 'lucide-react';

const LANGS = [
  { code: 'en', native: 'English',  label: 'English',  flag: '🇬🇧', dir: 'ltr' as const },
  { code: 'ar', native: 'العربية',  label: 'Arabic',   flag: '🇦🇪', dir: 'rtl' as const },
  { code: 'ru', native: 'Русский',  label: 'Russian',  flag: '🇷🇺', dir: 'ltr' as const },
];

interface Props {
  onClose: () => void;
}

export default function JoinLanguageSelector({ onClose }: Props) {
  const { i18n, t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const select = async (code: string) => {
    if (chosen) return;
    setChosen(code);
    await i18n.changeLanguage(code);
    localStorage.setItem('yalla_lang', code);
    document.documentElement.setAttribute('dir', code === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', code);
    setTimeout(() => {
      window.location.href = `/creator-login?mode=register&lang=${code}`;
    }, 220);
  };

  const closeWithFade = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      onClick={closeWithFade}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
        background: 'rgba(6, 8, 14, 0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg, rgba(32,35,48,0.98) 0%, rgba(20,22,32,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 28,
          padding: '36px 28px 30px',
          width: '100%', maxWidth: 380,
          boxShadow: '0 40px 100px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(16px)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1)',
          position: 'relative',
        }}
      >
        <button
          onClick={closeWithFade}
          aria-label="Close"
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#94a3b8', cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>

        <div style={{
          width: 60, height: 60, borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(0,196,140,0.2), rgba(0,196,140,0.06))',
          border: '1px solid rgba(0,196,140,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '1.7rem',
          boxShadow: '0 8px 24px rgba(0,196,140,0.14)',
        }}>
          🌐
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            fontSize: '1.3rem', fontWeight: 800, color: '#f9fafb',
            letterSpacing: '-0.02em', marginBottom: 6,
          }}>
            {t('joinLang.title', 'Choose your language')}
          </div>
          <div style={{ fontSize: '0.83rem', color: '#6b7280', lineHeight: 1.55 }}>
            {t('joinLang.subtitle', 'Select your preferred language to continue with creator registration.')}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {LANGS.map(l => {
            const isChosen = chosen === l.code;
            return (
              <button
                key={l.code}
                onClick={() => select(l.code)}
                disabled={!!chosen}
                dir={l.dir}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px',
                  borderRadius: 16,
                  background: isChosen ? 'rgba(0,196,140,0.16)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${isChosen ? 'rgba(0,196,140,0.6)' : 'rgba(255,255,255,0.07)'}`,
                  color: '#e5e7eb',
                  fontSize: '0.95rem', fontWeight: 600,
                  cursor: chosen ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.16s ease',
                  textAlign: l.dir === 'rtl' ? 'right' : 'left',
                  width: '100%', outline: 'none',
                }}
                onMouseEnter={e => { if (!chosen) { e.currentTarget.style.background = 'rgba(0,196,140,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'; } }}
                onMouseLeave={e => { if (!chosen || !isChosen) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; } }}
              >
                <span style={{ fontSize: '1.6rem', lineHeight: 1, flexShrink: 0 }}>{l.flag}</span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: isChosen ? '#00C48C' : '#fff' }}>{l.native}</span>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 400 }}>{l.label}</span>
                </div>
                <ChevronRight size={16} style={{ color: isChosen ? '#00C48C' : '#475569', flexShrink: 0, transform: l.dir === 'rtl' ? 'rotate(180deg)' : 'none' }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
