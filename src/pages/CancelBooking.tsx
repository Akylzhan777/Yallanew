import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface BookingDetails {
  id: string;
  client_name: string;
  date: string;
  start_time: string;
  end_time: string;
  whatsapp: string;
}

const RU_MONTHS: Record<string, string> = {
  '01': 'января', '02': 'февраля', '03': 'марта', '04': 'апреля',
  '05': 'мая', '06': 'июня', '07': 'июля', '08': 'августа',
  '09': 'сентября', '10': 'октября', '11': 'ноября', '12': 'декабря',
};

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  const en = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const ruDay = parseInt(d);
  const ruMonth = RU_MONTHS[m] ?? m;
  const year = dateStr.split('-')[0];
  return `${en} / ${ruDay} ${ruMonth} ${year}`;
}

function formatTime(t: string): string {
  return t ? t.substring(0, 5) : '—';
}

type Stage = 'loading' | 'confirm' | 'cancelling' | 'success' | 'error' | 'not_found';

export default function CancelBooking() {
  const bookingId = window.location.pathname.split('/cancel/')[1]?.replace(/\/$/, '');
  const [stage, setStage] = useState<Stage>('loading');
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!bookingId) { setStage('not_found'); return; }
    supabase
      .from('booking_events')
      .select('id, client_name, date, start_time, end_time, whatsapp')
      .eq('id', bookingId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { setErrorMsg(error.message); setStage('error'); return; }
        if (!data) { setStage('not_found'); return; }
        setBooking(data);
        setStage('confirm');
      });
  }, [bookingId]);

  async function handleCancel() {
    if (!bookingId) return;
    setStage('cancelling');
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-booking`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ booking_id: bookingId }),
        }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.reason || json.error || 'Unknown error');
      setStage('success');
    } catch (e) {
      setErrorMsg(String(e));
      setStage('error');
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0F1115',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'inherit',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: '36px 28px',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        textAlign: 'center',
      }}>

        {/* Logo mark */}
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 24px rgba(14,165,233,0.3)',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>

        {stage === 'loading' && (
          <>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Loading booking details...</p>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
              <Spinner />
            </div>
          </>
        )}

        {stage === 'not_found' && (
          <>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 700, marginBottom: 12 }}>
              Booking Not Found
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
              This booking link is invalid or the booking has already been cancelled.<br /><br />
              Эта ссылка недействительна или бронирование уже было отменено.
            </p>
          </>
        )}

        {stage === 'confirm' && booking && (
          <>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>
              Cancel Your Booking
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 28 }}>
              Отмена бронирования
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16,
              padding: '20px 18px',
              marginBottom: 28,
              textAlign: 'left',
            }}>
              <DetailRow icon="person" label={booking.client_name || '—'} />
              <DetailRow icon="calendar" label={formatDate(booking.date)} />
              <DetailRow icon="clock" label={`${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`} />
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: 28 }}>
              Are you sure you want to cancel your shoot on this date? This action cannot be undone and the slot will be released.
              <br /><br />
              <span style={{ color: '#64748b', fontSize: '0.82rem' }}>
                Вы уверены, что хотите отменить съемку? Это действие необратимо — слот будет освобожден.
              </span>
            </p>

            <button
              onClick={handleCancel}
              style={{
                width: '100%',
                padding: '14px 0',
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.01em',
                boxShadow: '0 4px 20px rgba(220,38,38,0.35)',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Confirm Cancellation
            </button>
            <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: 10 }}>
              Подтвердить отмену
            </p>
          </>
        )}

        {stage === 'cancelling' && (
          <>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: 20 }}>
              Cancelling your booking...
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Spinner />
            </div>
          </>
        )}

        {stage === 'success' && (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(34,197,94,0.12)',
              border: '1.5px solid rgba(34,197,94,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 700, marginBottom: 12 }}>
              Booking Cancelled
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.7 }}>
              Your booking has been successfully cancelled. The slot is now available for others.
              <br /><br />
              <span style={{ color: '#64748b', fontSize: '0.82rem' }}>
                Ваше бронирование успешно отменено. Слот снова доступен.
              </span>
            </p>
          </>
        )}

        {stage === 'error' && (
          <>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.15rem', fontWeight: 700, marginBottom: 12 }}>
              Something went wrong
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 16 }}>
              {errorMsg || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              onClick={() => setStage('confirm')}
              style={{
                padding: '10px 24px',
                background: 'rgba(255,255,255,0.07)',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label }: { icon: 'person' | 'calendar' | 'clock'; label: string }) {
  const icons = {
    person: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: '#0ea5e9', flexShrink: 0 }}>{icons[icon]}</span>
      <span style={{ color: '#e2e8f0', fontSize: '0.88rem', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 32, height: 32,
      border: '3px solid rgba(255,255,255,0.08)',
      borderTop: '3px solid #0ea5e9',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}
