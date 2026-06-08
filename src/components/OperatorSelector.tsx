// STRICTLY DO NOT MODIFY THIS COMPONENT
import { useEffect, useState } from 'react';
import { supabase, OperatorRow } from '../lib/supabase';

export interface Operator {
  id: string;
  name: string;
  role: string;
  photo: string;
  telegram_id?: string;
}

interface Props {
  onSelect: (operator: Operator) => void;
}

export default function OperatorSelector({ onSelect }: Props) {
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOperators = async () => {
    const { data } = await supabase
      .from('operators')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    setOperators(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOperators();

    const channel = supabase
      .channel('operators-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operators' }, () => {
        fetchOperators();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="ops-page">
      <div className="ops-header">
        <p className="ops-eyebrow">YALLA INFLUENCERS</p>
        <h1 className="ops-title">SELECT YOUR CREW MEMBER</h1>
        <p className="ops-sub">Choose the specialist you'd like to book a session with</p>
      </div>

      {loading ? (
        <div style={{ color: '#8F90A6', fontSize: '0.9rem' }}>Loading crew...</div>
      ) : operators.length === 0 ? (
        <div style={{ color: '#8F90A6', fontSize: '0.9rem' }}>No operators available at the moment.</div>
      ) : (
        <div className="ops-grid">
          {operators.map(op => (
            <button
              key={op.id}
              className="ops-card"
              onClick={() => onSelect({ id: op.id, name: op.name, role: op.role, photo: op.photo, telegram_id: op.telegram_id })}
            >
              <div className="ops-photo-wrap">
                <img src={op.photo} alt={op.name} className="ops-photo" />
                <div className="ops-photo-ring" />
              </div>
              <div className="ops-info">
                <span className="ops-name">{op.name}</span>
                <span className="ops-role">{op.role}</span>
              </div>
              <div className="ops-cta">Book Now →</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
