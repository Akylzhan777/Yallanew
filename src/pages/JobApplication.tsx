import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Send, CheckCircle, DollarSign, Calendar, Zap, Globe, ClipboardCheck } from 'lucide-react';

type FormData = {
  full_name: string;
  phone: string;
  email: string;
  portfolio_link: string;
};

const initialForm: FormData = {
  full_name: '',
  phone: '',
  email: '',
  portfolio_link: '',
};

const CONDITIONS = [
  {
    icon: <DollarSign size={20} color="#f59e0b" />,
    title: 'Оплата',
    text: 'От $1000 в месяц. Сдельно — $20 за один принятый ролик (Reels).',
  },
  {
    icon: <Calendar size={20} color="#f59e0b" />,
    title: 'Выплаты',
    text: 'Зарплата выплачивается строго 15-го числа следующего месяца. Всё, что заработано за март — выплачивается 15 апреля. Выплат внутри текущего месяца нет.',
  },
  {
    icon: <Zap size={20} color="#f59e0b" />,
    title: 'Объем и дедлайны',
    text: 'Высокий темп работы. Минимум 5 готовых видео в день. Дедлайн на выполнение одного заказа — строго 48 часов.',
  },
  {
    icon: <Globe size={20} color="#f59e0b" />,
    title: 'Язык',
    text: 'Обязательное знание английского языка. Исходники и монтаж — как на русском, так и на английском.',
  },
  {
    icon: <ClipboardCheck size={20} color="#f59e0b" />,
    title: 'Отбор',
    text: 'В команду берем только после успешного выполнения тестового задания.',
  },
];

const TELEGRAM_TEST_LINK = 'https://t.me/+T5DiHe9vY_1jY2Q0';

export default function JobApplication() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.phone.trim()) {
      setError('Пожалуйста, заполните имя и телефон.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { error: dbError } = await supabase.from('job_applications').insert([{
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        position: 'Монтажер',
        portfolio_link: form.portfolio_link.trim() || null,
      }]);
      if (dbError) throw dbError;
      setSubmitted(true);
    } catch {
      setError('Что-то пошло не так. Попробуй ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#080a0e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400, animation: 'fadeIn 0.5s ease' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(16,185,129,0.1)',
            border: '2px solid rgba(16,185,129,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <CheckCircle size={36} color="#10b981" />
          </div>
          <h2 style={{ color: '#f1f5f9', fontSize: '1.6rem', fontWeight: 700, margin: '0 0 12px' }}>
            Заявка отправлена!
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.97rem', lineHeight: 1.65, margin: 0 }}>
            Мы получили твою заявку. Команда Yalla Influencers свяжется с тобой для отправки тестового задания.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#080a0e', overflowY: 'auto' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .job-input {
          width: 100%; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09); border-radius: 12px;
          padding: 14px 16px; color: #f1f5f9; font-size: 1rem;
          outline: none; transition: border-color 0.2s, background 0.2s;
          box-sizing: border-box; font-family: inherit; -webkit-appearance: none;
        }
        .job-input::placeholder { color: #334155; }
        .job-input:focus { border-color: rgba(245,158,11,0.45); background: rgba(255,255,255,0.06); }
        .cond-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 16px 18px;
          display: flex; gap: 14px; align-items: flex-start;
          animation: fadeIn 0.45s ease both;
        }
        .submit-btn {
          width: 100%; padding: 16px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none; border-radius: 12px;
          color: #0a0c10; font-size: 1rem; font-weight: 800;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px;
          transition: opacity 0.2s, transform 0.15s;
          letter-spacing: -0.01em;
          -webkit-tap-highlight-color: transparent;
        }
        .submit-btn:active { transform: scale(0.98); opacity: 0.92; }
        .submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        @media (min-width: 480px) {
          .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        }
        @media (max-width: 479px) {
          .two-col { display: flex; flex-direction: column; gap: 14px; }
        }
      `}</style>

      <div style={{ maxWidth: 580, margin: '0 auto', padding: '40px 16px 72px' }}>

        <div style={{ textAlign: 'center', marginBottom: 36, animation: 'fadeIn 0.35s ease' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 999, padding: '5px 14px', marginBottom: 20,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span style={{ color: '#f59e0b', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Удаленная работа</span>
          </div>
          <h1 style={{
            color: '#f1f5f9', fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
            fontWeight: 800, margin: '0 0 10px', lineHeight: 1.15, letterSpacing: '-0.03em',
          }}>
            Ищем видеомонтажеров<br />на удаленку
          </h1>
          <p style={{ color: '#475569', fontSize: '0.97rem', margin: '0 0 4px' }}>
            Reels / Shorts
          </p>
          <p style={{ color: '#334155', fontSize: '0.88rem', margin: 0 }}>
            Yalla Influencers — ведущий продакшен в Дубае
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {CONDITIONS.map((c, i) => (
            <div className="cond-card" key={i} style={{ animationDelay: `${i * 0.07}s` }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {c.icon}
              </div>
              <div>
                <p style={{ color: '#f59e0b', fontSize: '0.78rem', fontWeight: 700, margin: '0 0 4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {c.title}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.91rem', margin: 0, lineHeight: 1.55 }}>
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <a
          href={TELEGRAM_TEST_LINK}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, marginBottom: 20, padding: '18px 20px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.08) 100%)',
            border: '1.5px solid rgba(245,158,11,0.35)',
            borderRadius: 16, textDecoration: 'none',
            animation: 'fadeIn 0.5s ease 0.25s both',
            transition: 'border-color 0.2s, background 0.2s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ClipboardCheck size={22} color="#f59e0b" />
            </div>
            <div>
              <p style={{ color: '#fbbf24', fontSize: '0.78rem', fontWeight: 700, margin: '0 0 3px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Шаг 1 — Тестовое задание
              </p>
              <p style={{ color: '#e2e8f0', fontSize: '0.93rem', fontWeight: 600, margin: 0, lineHeight: 1.35 }}>
                Получить и отправить тестовое задание можно тут
              </p>
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>

        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 18, padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 18,
          animation: 'fadeIn 0.5s ease 0.35s both',
        }}>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              Шаг 2
            </p>
            <h2 style={{ color: '#e2e8f0', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Оставить заявку
            </h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="two-col">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Имя и Фамилия <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="job-input"
                  placeholder="Иван Иванов"
                  value={form.full_name}
                  onChange={e => handleChange('full_name', e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Телефон / Telegram <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="job-input"
                  placeholder="+7 999 000 00 00"
                  type="tel"
                  value={form.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Email
              </label>
              <input
                className="job-input"
                placeholder="you@example.com"
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                autoComplete="email"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Ссылка на портфолио
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="job-input"
                  placeholder="Google Drive, Instagram, YouTube..."
                  value={form.portfolio_link}
                  onChange={e => handleChange('portfolio_link', e.target.value)}
                  style={{ paddingLeft: 42 }}
                />
                <Upload size={15} color="#334155" style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {error && (
              <p style={{
                color: '#f87171', fontSize: '0.87rem', margin: 0,
                padding: '10px 14px', background: 'rgba(239,68,68,0.07)',
                borderRadius: 10, border: '1px solid rgba(239,68,68,0.18)',
              }}>
                {error}
              </p>
            )}

            <button type="submit" className="submit-btn" disabled={submitting}>
              <Send size={17} />
              {submitting ? 'Отправляем...' : 'Я выполнил тест и готов работать'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
