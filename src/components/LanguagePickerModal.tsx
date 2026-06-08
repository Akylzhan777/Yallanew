import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'yalla_lang';

const LANGUAGES = [
  { code: 'en', label: 'English',  native: 'English',  flag: '🇬🇧' },
  { code: 'ru', label: 'Russian',  native: 'Русский',  flag: '🇷🇺' },
  { code: 'ar', label: 'Arabic',   native: 'العربية',  flag: '🇦🇪' },
];

export function hasChosenLanguage(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

interface Props {
  onClose: () => void;
  redirectTo?: string;
  title?: string;
  subtitle?: string;
}

export default function LanguagePickerModal({ onClose, redirectTo, title, subtitle }: Props) {
  const { i18n, t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function choose(code: string) {
    if (selected) return;
    setSelected(code);
    i18n.changeLanguage(code);
    localStorage.setItem(STORAGE_KEY, code);
    const isRtl = code === 'ar';
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', code);
    if (!redirectTo) {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', code);
      window.history.replaceState(null, '', url.toString());
    }
    setVisible(false);
    setTimeout(() => {
      if (redirectTo) {
        const sep = redirectTo.includes('?') ? '&' : '?';
        window.location.href = `${redirectTo}${sep}lang=${code}`;
        return;
      }
      onClose();
    }, 300);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        background: 'rgba(6, 8, 14, 0.78)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(160deg, rgba(32,35,48,0.98) 0%, rgba(20,22,32,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 28,
          padding: '40px 28px 36px',
          width: '100%',
          maxWidth: 360,
          boxShadow: '0 40px 100px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(16px)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1)',
        }}
      >
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(0,196,140,0.18), rgba(0,196,140,0.06))',
          border: '1px solid rgba(0,196,140,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '1.8rem',
          boxShadow: '0 8px 24px rgba(0,196,140,0.12)',
        }}>
          🌐
        </div>

        <div style={{
          textAlign: 'center',
          marginBottom: 28,
        }}>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#f9fafb',
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}>
            {title ?? t('langPicker.title', 'Select your language')}
          </div>
          <div style={{
            fontSize: '0.83rem',
            color: '#6b7280',
            lineHeight: 1.55,
          }}>
            {subtitle ?? t('langPicker.subtitle', 'Choose your preferred language to get started')}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {LANGUAGES.map((lang) => {
            const isActive = selected === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => choose(lang.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '15px 18px',
                  borderRadius: 16,
                  background: isActive
                    ? 'rgba(0,196,140,0.14)'
                    : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${isActive ? 'rgba(0,196,140,0.6)' : 'rgba(255,255,255,0.07)'}`,
                  color: isActive ? '#00C48C' : '#e5e7eb',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: selected ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.16s ease',
                  textAlign: 'left',
                  width: '100%',
                  outline: 'none',
                  boxShadow: isActive ? '0 0 0 1px rgba(0,196,140,0.2)' : 'none',
                }}
              >
                <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>
                  {lang.flag}
                </span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{lang.native}</span>
                  <span style={{ fontSize: '0.72rem', color: isActive ? 'rgba(0,196,140,0.7)' : '#4b5563', fontWeight: 400 }}>
                    {lang.label}
                  </span>
                </div>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `2px solid ${isActive ? '#00C48C' : 'rgba(255,255,255,0.15)'}`,
                  background: isActive ? '#00C48C' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.16s ease',
                }}>
                  {isActive && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{
          marginTop: 20,
          textAlign: 'center',
          fontSize: '0.72rem',
          color: '#374151',
        }}>
          {t('langPicker.changeLater', 'You can change this later in settings')}
        </div>
      </div>
    </div>
  );
}
