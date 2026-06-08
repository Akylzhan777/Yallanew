import { useState, useEffect } from 'react';
import { Plus, Clock, Check, X, ExternalLink, MessageSquare, Film } from 'lucide-react';
import { supabase } from '../lib/supabase';
import OrderChat from './OrderChat';

interface EditingOrder {
  id: string;
  order_number: number;
  title: string;
  video_type: string;
  source_link: string;
  brief: string;
  deadline: string | null;
  budget: number;
  status: string;
  result_link: string;
  preview_link: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment: { label: 'Pending Payment', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  open: { label: 'Open', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  assigned: { label: 'Assigned', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  in_progress: { label: 'In Progress', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  review: { label: 'Under Review', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  revision: { label: 'Revision', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  completed: { label: 'Completed', color: '#00C48C', bg: 'rgba(0,196,140,0.1)' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const VIDEO_TYPES = ['Reels', 'Commercial', 'YouTube', 'TikTok', 'Podcast', 'Other'];

export default function OutsourceEditingPanel({ creatorId, email }: { creatorId: string; email?: string }) {
  const [orders, setOrders] = useState<EditingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [videoType, setVideoType] = useState('Reels');
  const [sourceLink, setSourceLink] = useState('');
  const [brief, setBrief] = useState('');
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState(300);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    const { data } = await supabase
      .from('editing_orders')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });
    setOrders(data ?? []);
    setLoading(false);
  };

  const submitOrder = async () => {
    if (!title || !sourceLink || !brief) return;
    setSubmitting(true);

    const platformFee = Math.round(budget * 0.30);
    const editorPayout = budget - platformFee;

    // Create order first
    const { data: order, error } = await supabase
      .from('editing_orders')
      .insert({
        creator_id: creatorId,
        creator_email: email || '',
        title,
        video_type: videoType,
        source_link: sourceLink,
        brief,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        budget,
        platform_fee: platformFee,
        editor_payout: editorPayout,
        status: 'pending_payment',
      })
      .select('id')
      .maybeSingle();

    if (error || !order) { setSubmitting(false); return; }

    // Initiate payment
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/editing-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ order_id: order.id, title, budget, email }),
    });
    const data = await res.json();
    if (data.url) { window.location.href = data.url; return; }

    setSubmitting(false);
    setShowForm(false);
    loadOrders();
  };

  const acceptDelivery = async (orderId: string) => {
    await supabase.from('editing_orders').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', orderId);
    loadOrders();
  };

  const requestRevision = async (orderId: string) => {
    await supabase.from('editing_orders').update({ status: 'revision' }).eq('id', orderId);
    loadOrders();
  };

  if (chatOrderId) {
    const order = orders.find(o => o.id === chatOrderId);
    return (
      <div className="space-y-4">
        <button onClick={() => setChatOrderId(null)} className="flex items-center gap-2 text-xs font-medium" style={{ color: '#64748b' }}>
          <X size={14} /> Back to Orders
        </button>
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-sm font-bold text-white">Order #{order?.order_number} — {order?.title}</div>
          <div className="text-xs mt-0.5" style={{ color: '#475569' }}>Chat with your editor</div>
        </div>
        <OrderChat orderId={chatOrderId} senderRole="creator" senderId={creatorId} />
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-center py-12" style={{ color: '#64748b' }}>Loading orders...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Outsource Editing</h3>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Order professional video editing from vetted editors</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
          style={{ background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)', color: '#fff', border: '1px solid rgba(0,196,140,0.3)' }}>
          <Plus size={14} /> New Order
        </button>
      </div>

      {/* New order form */}
      {showForm && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">Create Editing Order</h4>
            <button onClick={() => setShowForm(false)}><X size={16} style={{ color: '#64748b' }} /></button>
          </div>

          <div className="grid gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Project Name</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Restaurant Promo Reels"
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Video Type</label>
                <select value={videoType} onChange={e => setVideoType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#0f1520' }}>
                  {VIDEO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Budget (AED)</label>
                <input type="number" value={budget} onChange={e => setBudget(+e.target.value)} min={100} step={50}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Source Link (Google Drive / Frame.io)</label>
              <input value={sourceLink} onChange={e => setSourceLink(e.target.value)} placeholder="https://drive.google.com/..."
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Brief (style, music, references)</label>
              <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={3} placeholder="Describe the style, music, transitions you want..."
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent text-white outline-none resize-none" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Deadline (optional)</label>
              <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ background: 'rgba(0,196,140,0.05)', border: '1px solid rgba(0,196,140,0.15)' }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: '#64748b' }}>You pay</span>
              <span className="font-bold" style={{ color: '#00C48C' }}>{budget} AED</span>
            </div>
            <div className="text-[10px] mt-1" style={{ color: '#475569' }}>Held in escrow until you approve the final video</div>
          </div>

          <button onClick={submitOrder} disabled={submitting || !title || !sourceLink || !brief}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)', color: '#fff', border: '1px solid rgba(0,196,140,0.3)' }}>
            {submitting ? 'Creating...' : 'Pay & Submit Order'}
          </button>
        </div>
      )}

      {/* Orders list */}
      {orders.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <Film size={32} style={{ color: '#1e293b', margin: '0 auto 12px' }} />
          <p className="text-sm font-medium" style={{ color: '#475569' }}>No editing orders yet</p>
          <p className="text-xs mt-1" style={{ color: '#334155' }}>Create your first order to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const s = STATUS_MAP[order.status] || STATUS_MAP.open;
            return (
              <div key={order.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{order.title}</div>
                    <div className="text-xs" style={{ color: '#475569' }}>Order #{order.order_number} · {order.video_type}</div>
                  </div>
                  <span className="flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs mb-3" style={{ color: '#475569' }}>
                  <span>{order.budget} AED</span>
                  {order.deadline && (
                    <span className="flex items-center gap-1"><Clock size={11} />{new Date(order.deadline).toLocaleDateString()}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setChatOrderId(order.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                    <MessageSquare size={12} /> Chat
                  </button>

                  {order.status === 'review' && order.preview_link && (
                    <>
                      <a href={order.preview_link} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}>
                        <ExternalLink size={12} /> Preview
                      </a>
                      <button onClick={() => acceptDelivery(order.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(0,196,140,0.1)', border: '1px solid rgba(0,196,140,0.2)', color: '#00C48C' }}>
                        <Check size={12} /> Accept
                      </button>
                      <button onClick={() => requestRevision(order.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                        Revision
                      </button>
                    </>
                  )}

                  {order.status === 'completed' && order.result_link && (
                    <a href={order.result_link} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(0,196,140,0.1)', border: '1px solid rgba(0,196,140,0.2)', color: '#00C48C' }}>
                      <ExternalLink size={12} /> Download Final
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
