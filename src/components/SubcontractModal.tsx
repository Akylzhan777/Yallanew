import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  X, Search, Users, CheckCircle, ChevronRight, ArrowLeft,
  Instagram, Youtube, Play, Zap, DollarSign,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CatalogCreator {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  category: string;
  creator_type: string;
  followers_count: number;
  engagement_rate: number;
  is_verified: boolean;
  packages: Array<{ id: string; name: string; price: number; deliveryDays: number; description: string }>;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
}

interface Order {
  id: string;
  package_price: number;
  creator_net_amount: number;
  buyer_name: string;
  package_name: string;
  status: string;
}

interface Props {
  order: Order;
  hiringCreatorId: string;  // the creator doing the hiring
  onClose: () => void;
  onSuccess: () => void;
}

// ── Technical specialist categories ──────────────────────────────────────────
const TECH_CATEGORIES = ['editing', 'voiceover', 'motion', 'model', 'ugc', 'photography'];

function fmt(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);
}

// ── SubcontractModal ──────────────────────────────────────────────────────────

export default function SubcontractModal({ order, hiringCreatorId, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'catalog' | 'budget'>('catalog');
  const [creators, setCreators] = useState<CatalogCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selected, setSelected] = useState<CatalogCreator | null>(null);
  const [budget, setBudget] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const maxBudget = Math.floor(order.creator_net_amount);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('creator_profiles')
        .select('id, display_name, username, avatar_url, category, creator_type, followers_count, engagement_rate, is_verified, packages, instagram_url, youtube_url, tiktok_url')
        .eq('is_published', true)
        .eq('is_hidden', false)
        .neq('status', 'banned')
        .neq('id', hiringCreatorId)
        .order('orders_completed', { ascending: false })
        .limit(60);
      setCreators((data ?? []) as CatalogCreator[]);
      setLoading(false);
    })();
  }, [hiringCreatorId]);

  const filtered = creators.filter(c => {
    const matchCat = categoryFilter === 'all' || c.category === categoryFilter || c.creator_type === categoryFilter;
    const matchSearch = !search || c.display_name.toLowerCase().includes(search.toLowerCase()) || (c.username ?? '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleHire = async () => {
    setError('');
    const amount = parseFloat(budget);
    if (!amount || amount <= 0) { setError('Enter a valid budget amount.'); return; }
    if (amount > maxBudget) { setError(`Cannot exceed your net earnings of AED ${maxBudget}.`); return; }
    if (!selected) return;

    setSubmitting(true);
    try {
      // 1. Create subcontract order
      const { data: subOrder, error: soErr } = await supabase
        .from('marketplace_orders')
        .insert({
          creator_id: selected.id,
          buyer_name: `Subcontract from order #${order.id.slice(0, 8)}`,
          buyer_email: '',
          package_name: note.trim() || 'Subcontract work',
          package_price: amount,
          creator_net_amount: amount,        // full amount to subcontractor (no extra commission)
          platform_commission_pct: 0,
          delivery_days: 7,
          status: 'on_hold',
          parent_order_id: order.id,
          subcontract_amount: amount,
          is_subcontract: true,
        })
        .select()
        .maybeSingle();

      if (soErr || !subOrder) throw new Error(soErr?.message ?? 'Failed to create subcontract order');

      // 2. Create transaction for subcontractor
      await supabase.from('creator_transactions').insert({
        creator_id: selected.id,
        order_id: subOrder.id,
        type: 'earning',
        status: 'on_hold',
        amount: amount,
        net_amount: amount,
        commission_amount: 0,
        description: `Subcontract: ${note.trim() || order.package_name}`,
      });

      // 3. Update subcontractor balance_on_hold
      const { data: subProfile } = await supabase
        .from('creator_profiles')
        .select('balance_on_hold')
        .eq('id', selected.id)
        .maybeSingle();

      await supabase.from('creator_profiles').update({
        balance_on_hold: ((subProfile?.balance_on_hold ?? 0) as number) + amount,
      }).eq('id', selected.id);

      // 4. Send in-app notification to subcontractor
      await supabase.from('creator_notifications').insert({
        creator_id: selected.id,
        type: 'subcontract_invite',
        title: 'You have been invited to a project',
        body: `Your budget: AED ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${note.trim() ? ` · ${note.trim()}` : ''}`,
        payload: {
          order_id: subOrder.id,
          parent_order_id: order.id,
          amount,
          note: note.trim(),
        },
      });

      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{ background: '#0d1420', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {step === 'budget' && (
            <button onClick={() => setStep('catalog')} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
              <ArrowLeft size={15} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">
              {step === 'catalog' ? 'Hire a Subcontractor' : `Assign Budget to ${selected?.display_name}`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
              {step === 'catalog'
                ? `Order: ${order.package_name} · Your net: AED ${maxBudget.toLocaleString()}`
                : `From order: ${order.package_name}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Step 1: Catalog ─────────────────────────────────────────────── */}
        {step === 'catalog' && (
          <div className="flex flex-col overflow-hidden flex-1">
            {/* Filters */}
            <div className="px-5 py-3 flex flex-col gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search creators..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#e2e8f0' }} />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                {[
                  { key: 'all',         label: 'All' },
                  { key: 'editing',     label: 'Editing' },
                  { key: 'voiceover',   label: 'Voiceover' },
                  { key: 'motion',      label: 'Motion Graphics' },
                  { key: 'model',       label: 'Model' },
                  { key: 'ugc',         label: 'UGC' },
                  { key: 'photography', label: 'Photography' },
                  { key: 'blogger',     label: 'Blogger' },
                ].map(f => (
                  <button key={f.key} onClick={() => setCategoryFilter(f.key)}
                    className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: categoryFilter === f.key ? 'rgba(0,196,140,0.15)' : 'rgba(255,255,255,0.04)',
                      color: categoryFilter === f.key ? '#00C48C' : '#64748b',
                      border: `1px solid ${categoryFilter === f.key ? 'rgba(0,196,140,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Creator list */}
            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
              {loading && (
                <div className="py-12 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,196,140,0.2)', borderTopColor: '#00C48C' }} />
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="py-12 text-center" style={{ color: '#374151' }}>
                  <Users size={28} className="mx-auto mb-3" style={{ color: '#1e293b' }} />
                  <p>No creators match your filter.</p>
                </div>
              )}
              {filtered.map(c => {
                const pkgs = Array.isArray(c.packages) ? c.packages : [];
                const minPrice = pkgs.length > 0 ? Math.min(...pkgs.map((p: { price: number }) => p.price)) : null;
                return (
                  <button key={c.id} onClick={() => { setSelected(c); setStep('budget'); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,196,140,0.25)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}>
                    {c.avatar_url
                      ? <img src={c.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      : <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(0,196,140,0.15)', color: '#00C48C' }}>{(c.display_name[0] ?? '?').toUpperCase()}</div>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-sm font-medium truncate">{c.display_name}</span>
                        {c.is_verified && <CheckCircle size={12} style={{ color: '#00C48C', flexShrink: 0 }} />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>{c.category}</span>
                        <span className="text-xs" style={{ color: '#374151' }}>{fmt(c.followers_count)} followers</span>
                        {c.instagram_url && <Instagram size={10} style={{ color: '#e1306c' }} />}
                        {c.youtube_url && <Youtube size={10} style={{ color: '#ef4444' }} />}
                        {c.tiktok_url && <Play size={10} style={{ color: '#69c9d0' }} />}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {minPrice !== null && <p className="text-xs font-semibold" style={{ color: '#00C48C' }}>from AED {minPrice}</p>}
                      <ChevronRight size={14} style={{ color: '#374151', marginLeft: 'auto' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Budget ──────────────────────────────────────────────── */}
        {step === 'budget' && selected && (
          <div className="flex flex-col overflow-y-auto flex-1 px-5 py-5 gap-5">
            {/* Selected creator card */}
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.15)' }}>
              {selected.avatar_url
                ? <img src={selected.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                : <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(0,196,140,0.2)', color: '#00C48C' }}>{(selected.display_name[0] ?? '?').toUpperCase()}</div>}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{selected.display_name}</p>
                {selected.username && <p className="text-xs" style={{ color: '#00C48C' }}>/{selected.username}</p>}
              </div>
              {selected.is_verified && <CheckCircle size={16} style={{ color: '#00C48C' }} />}
            </div>

            {/* Budget context */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs mb-1" style={{ color: '#64748b' }}>Order value</p>
                <p className="text-white font-bold">AED {order.package_price.toLocaleString()}</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.15)' }}>
                <p className="text-xs mb-1" style={{ color: '#64748b' }}>Your max budget</p>
                <p className="font-bold" style={{ color: '#00C48C' }}>AED {maxBudget.toLocaleString()}</p>
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: '#64748b' }}>Budget for {selected.display_name} (AED)</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                <input
                  type="number"
                  min={1}
                  max={maxBudget}
                  value={budget}
                  onChange={e => { setBudget(e.target.value); setError(''); }}
                  placeholder={`Max ${maxBudget}`}
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}` }}
                />
              </div>
              {/* Quick fill buttons */}
              <div className="flex gap-2">
                {[25, 50, 75].map(pct => {
                  const val = Math.floor(maxBudget * pct / 100);
                  return (
                    <button key={pct} onClick={() => setBudget(String(val))}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {pct}% · AED {val}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note / scope */}
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: '#64748b' }}>Scope / notes (optional)</label>
              <textarea
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Arabic dubbing for 3-minute video, deadline 5 days..."
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            {/* Split preview */}
            {budget && parseFloat(budget) > 0 && parseFloat(budget) <= maxBudget && (
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold" style={{ color: '#64748b' }}>Payment split preview</p>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#94a3b8' }}>Your net (after subcontract)</span>
                  <span className="text-white font-semibold">AED {(maxBudget - parseFloat(budget)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#94a3b8' }}>{selected.display_name} receives</span>
                  <span className="font-semibold" style={{ color: '#00C48C' }}>AED {parseFloat(budget).toLocaleString()}</span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs" style={{ color: '#374151' }}>
                  <Zap size={10} style={{ color: '#f59e0b' }} />
                  Both amounts stay on_hold until the client accepts the final delivery
                </div>
              </div>
            )}

            {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

            {/* CTA */}
            <button
              onClick={handleHire}
              disabled={submitting || !budget || parseFloat(budget) <= 0}
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: submitting || !budget ? 'rgba(255,255,255,0.04)' : 'rgba(0,196,140,0.15)',
                color: submitting || !budget ? '#374151' : '#00C48C',
                border: `1px solid ${submitting || !budget ? 'rgba(255,255,255,0.06)' : 'rgba(0,196,140,0.3)'}`,
                cursor: submitting || !budget ? 'not-allowed' : 'pointer',
              }}>
              {submitting ? 'Processing…' : `Hire ${selected.display_name} · AED ${budget || '—'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
