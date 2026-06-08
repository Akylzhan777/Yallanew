import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, Search } from 'lucide-react';

interface WithdrawalRequest {
  id: string;
  creator_id: string;
  amount: number;
  status: string;
  bank_account_name: string | null;
  bank_name: string | null;
  bank_iban: string | null;
  created_at: string;
  creator_name?: string;
}

export default function PayoutsPanel() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { loadRequests(); }, []);

  async function loadRequests() {
    setLoading(true);
    const { data } = await supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      const creatorIds = [...new Set(data.map(r => r.creator_id))];
      const { data: profiles } = await supabase.from('creator_profiles').select('id, display_name').in('id', creatorIds);
      const nameMap = new Map((profiles ?? []).map(p => [p.id, p.display_name]));
      setRequests(data.map(r => ({ ...r, creator_name: nameMap.get(r.creator_id) ?? 'Unknown' })));
    } else {
      setRequests([]);
    }
    setLoading(false);
  }

  async function handleApprove(req: WithdrawalRequest) {
    setProcessing(req.id);
    await supabase.from('withdrawal_requests').update({ status: 'completed' }).eq('id', req.id);
    await loadRequests();
    setProcessing(null);
  }

  async function handleReject(req: WithdrawalRequest) {
    setProcessing(req.id);
    await supabase.from('withdrawal_requests').update({ status: 'rejected' }).eq('id', req.id);
    // Return balance to creator
    const { data: profile } = await supabase.from('creator_profiles').select('wallet_balance').eq('id', req.creator_id).maybeSingle();
    if (profile) {
      await supabase.from('creator_profiles').update({ wallet_balance: (Number(profile.wallet_balance) || 0) + req.amount }).eq('id', req.creator_id);
    }
    await loadRequests();
    setProcessing(null);
  }

  const filtered = requests.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search && !(r.creator_name ?? '').toLowerCase().includes(search.toLowerCase()) && !(r.bank_account_name ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingTotal = requests.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
  const completedTotal = requests.filter(r => r.status === 'completed').reduce((s, r) => s + r.amount, 0);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="admin-spinner" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: requests.filter(r => r.status === 'pending').length, amount: pendingTotal, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
          { label: 'Completed', value: requests.filter(r => r.status === 'completed').length, amount: completedTotal, color: '#00C48C', bg: 'rgba(0,196,140,0.08)' },
          { label: 'Total', value: requests.length, amount: requests.reduce((s, r) => s + r.amount, 0), color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
        ].map(s => (
          <div key={s.label} className="admin-card" style={{ background: s.bg, border: `1px solid ${s.color}22` }}>
            <div className="text-xs font-medium" style={{ color: s.color }}>{s.label}</div>
            <div className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>{s.amount.toLocaleString()} AED</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={14} className="text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm text-white outline-none w-40 placeholder:text-gray-600" />
        </div>
        <div className="flex gap-1">
          {(['all', 'pending', 'completed', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{
              background: filter === f ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.03)',
              color: filter === f ? '#60a5fa' : '#6b7280',
              border: `1px solid ${filter === f ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">No withdrawal requests found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(req => (
            <div key={req.id} className="admin-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-white">{req.creator_name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                    background: req.status === 'completed' ? 'rgba(0,196,140,0.15)' : req.status === 'rejected' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)',
                    color: req.status === 'completed' ? '#00C48C' : req.status === 'rejected' ? '#f87171' : '#fbbf24'
                  }}>{req.status}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="font-bold text-white">{req.amount.toLocaleString()} AED</span>
                  <span>{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
                {(req.bank_account_name || req.bank_iban) && (
                  <div className="mt-2 p-2.5 rounded-lg text-xs space-y-0.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {req.bank_account_name && <div><span className="text-gray-500">Account:</span> <span className="text-white font-medium">{req.bank_account_name}</span></div>}
                    {req.bank_name && <div><span className="text-gray-500">Bank:</span> <span className="text-white font-medium">{req.bank_name}</span></div>}
                    {req.bank_iban && <div><span className="text-gray-500">IBAN:</span> <span className="text-white font-mono font-medium">{req.bank_iban}</span></div>}
                  </div>
                )}
              </div>
              {req.status === 'pending' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button disabled={processing === req.id} onClick={() => handleApprove(req)} className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50" style={{ background: 'rgba(0,196,140,0.12)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.3)' }}>
                    <Check size={12} /> Paid
                  </button>
                  <button disabled={processing === req.id} onClick={() => handleReject(req)} className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                    <X size={12} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
