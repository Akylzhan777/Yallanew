import { useState } from 'react';

interface PaymentClient {
  id: string;
  name: string;
  amount_paid: number;
  last_payment_date: string | null;
  is_barter: boolean;
}

interface Props {
  clients: PaymentClient[];
  onClientClick: (clientId: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PaymentCalendar({ clients, onClientClick }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const paymentsByDay = new Map<number, PaymentClient[]>();
  for (const c of clients) {
    if (!c.last_payment_date || c.is_barter) continue;
    const d = new Date(c.last_payment_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!paymentsByDay.has(day)) paymentsByDay.set(day, []);
      paymentsByDay.get(day)!.push(c);
    }
  }

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div style={{ padding: '0 0 20px 0' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, gap: 12,
      }}>
        <button
          onClick={prevMonth}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '7px 14px', color: '#94a3b8', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: 600, transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        >
          ←
        </button>
        <span style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.02em' }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '7px 14px', color: '#94a3b8', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: 600, transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        >
          →
        </button>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 2, marginBottom: 2,
      }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{
            textAlign: 'center', color: '#4b5563', fontSize: '0.7rem',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            padding: '6px 0',
          }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 2,
      }}>
        {cells.map((day, idx) => {
          const events = day ? (paymentsByDay.get(day) ?? []) : [];
          const todayCell = day ? isToday(day) : false;
          return (
            <div
              key={idx}
              style={{
                minHeight: 80,
                background: day
                  ? todayCell
                    ? 'rgba(0,196,140,0.07)'
                    : events.length > 0
                    ? 'rgba(59,130,246,0.05)'
                    : '#131929'
                  : 'transparent',
                border: day
                  ? todayCell
                    ? '1px solid rgba(0,196,140,0.35)'
                    : events.length > 0
                    ? '1px solid rgba(59,130,246,0.2)'
                    : '1px solid rgba(255,255,255,0.05)'
                  : '1px solid transparent',
                borderRadius: 8,
                padding: 6,
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              {day && (
                <>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: todayCell ? 800 : 600,
                    color: todayCell ? '#00C48C' : events.length > 0 ? '#93c5fd' : '#4b5563',
                    marginBottom: 4, lineHeight: 1,
                  }}>
                    {day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {events.slice(0, 3).map(c => (
                      <button
                        key={c.id}
                        onClick={() => onClientClick(c.id)}
                        title={`${c.name} — +${c.amount_paid.toLocaleString()} AED`}
                        style={{
                          background: 'rgba(59,130,246,0.15)',
                          border: '1px solid rgba(59,130,246,0.3)',
                          borderRadius: 4, padding: '2px 5px',
                          color: '#93c5fd', fontSize: '0.62rem', fontWeight: 700,
                          cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          maxWidth: '100%', lineHeight: 1.4,
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.28)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}
                      >
                        {c.name.split(' ')[0]} +{c.amount_paid.toLocaleString()}
                      </button>
                    ))}
                    {events.length > 3 && (
                      <span style={{
                        fontSize: '0.6rem', color: '#6b7280', paddingLeft: 4,
                      }}>
                        +{events.length - 3} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {paymentsByDay.size === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px 0', color: '#4b5563',
          fontSize: '0.875rem',
        }}>
          No payments recorded for {MONTH_NAMES[month]} {year}.
        </div>
      )}
    </div>
  );
}
