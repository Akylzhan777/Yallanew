import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import OrderChat from '../../components/OrderChat';
import { useAuth } from '../../context/AuthContext';

interface EditingOrder {
  id: string;
  order_number: number;
  creator_id: string;
  creator_email: string;
  editor_id: string | null;
  title: string;
  video_type: string;
  source_link: string;
  brief: string;
  deadline: string | null;
  budget: number;
  platform_fee: number;
  editor_payout: number;
  status: string;
  result_link: string;
  preview_link: string;
  created_at: string;
}

interface EditorProfile {
  id: string;
  display_name: string;
  real_name: string;
  available: boolean;
}

const STATUSES = ['open', 'assigned', 'in_progress', 'review', 'revision', 'completed', 'cancelled'];
const STATUS_COLORS: Record<string, string> = {
  pending_payment: '#94a3b8',
  open: '#fbbf24',
  assigned: '#60a5fa',
  in_progress: '#f97316',
  review: '#a78bfa',
  revision: '#fb923c',
  completed: '#00C48C',
  cancelled: '#ef4444',
};

export default function EditingOrdersPanel() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<EditingOrder[]>([]);
  const [editors, setEditors] = useState<EditorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [ordersRes, editorsRes] = await Promise.all([
      supabase.from('editing_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('editing_editor_profiles').select('id, display_name, real_name, available'),
    ]);
    setOrders(ordersRes.data ?? []);
    setEditors(editorsRes.data ?? []);
    setLoading(false);
  };

  const assignEditor = async (orderId: string, editorId: string) => {
    await supabase.from('editing_orders').update({ editor_id: editorId, status: 'assigned' }).eq('id', orderId);
    loadData();
  };

  const releaseToPool = async (orderId: string) => {
    await supabase.from('editing_orders').update({ editor_id: null, status: 'open' }).eq('id', orderId);
    loadData();
  };

  const updateStatus = async (orderId: string, status: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    await supabase.from('editing_orders').update(updates).eq('id', orderId);
    loadData();
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (chatOrderId) {
    return (
      <div className="space-y-4">
        <button onClick={() => setChatOrderId(null)} className="text-xs font-medium" style={{ color: '#60a5fa' }}>
          ← Back to orders
        </button>
        <OrderChat orderId={chatOrderId} senderRole="admin" senderId={user?.id || ''} />
      </div>
    );
  }

  if (loading) return <div className="text-sm py-8 text-center" style={{ color: '#64748b' }}>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Editing Orders</h2>
        <span className="text-xs" style={{ color: '#64748b' }}>{orders.length} total</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
            style={{
              background: filter === s ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filter === s ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: filter === s ? '#60a5fa' : '#64748b',
            }}>
            {s === 'all' ? `All (${orders.length})` : `${s.replace('_', ' ')} (${orders.filter(o => o.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filtered.map(order => {
          const assignedEditor = editors.find(e => e.id === order.editor_id);
          return (
            <div key={order.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="text-sm font-bold text-white">#{order.order_number} — {order.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#475569' }}>
                    {order.video_type} · {order.creator_email || 'Unknown'} · {new Date(order.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg capitalize" style={{ color: STATUS_COLORS[order.status] || '#94a3b8', background: `${STATUS_COLORS[order.status] || '#94a3b8'}15` }}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              <p className="text-xs mb-3 line-clamp-2" style={{ color: '#64748b' }}>{order.brief}</p>

              <div className="flex items-center gap-4 text-xs mb-3" style={{ color: '#475569' }}>
                <span>Budget: {order.budget} AED</span>
                <span>Fee: {order.platform_fee} AED</span>
                <span>Payout: {order.editor_payout} AED</span>
                {order.deadline && <span>DL: {new Date(order.deadline).toLocaleDateString()}</span>}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Assign editor */}
                {(order.status === 'open' || order.status === 'assigned') && (
                  <select
                    value={order.editor_id || ''}
                    onChange={e => e.target.value ? assignEditor(order.id, e.target.value) : releaseToPool(order.id)}
                    className="px-2.5 py-1.5 rounded-lg text-xs bg-transparent outline-none"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', background: '#0f1520' }}>
                    <option value="">Unassigned (Pool)</option>
                    {editors.filter(e => e.available).map(e => (
                      <option key={e.id} value={e.id}>{e.real_name} ({e.display_name})</option>
                    ))}
                  </select>
                )}

                {assignedEditor && (
                  <span className="text-xs font-medium" style={{ color: '#60a5fa' }}>
                    → {assignedEditor.real_name}
                  </span>
                )}

                {/* Status control */}
                {order.status !== 'completed' && order.status !== 'cancelled' && (
                  <select
                    value={order.status}
                    onChange={e => updateStatus(order.id, e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg text-xs bg-transparent outline-none capitalize"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', background: '#0f1520' }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                )}

                <button onClick={() => setChatOrderId(order.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                  Chat
                </button>

                {order.source_link && (
                  <a href={order.source_link} target="_blank" rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ color: '#60a5fa' }}>
                    Source ↗
                  </a>
                )}

                {order.result_link && (
                  <a href={order.result_link} target="_blank" rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ color: '#00C48C' }}>
                    Result ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: '#475569' }}>No orders found</p>
        </div>
      )}
    </div>
  );
}
