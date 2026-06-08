import { useState, useEffect } from 'react';
import { ShoppingCart, X, Plus, Minus, Filter, Camera, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  description: string;
  image_url: string;
  day_rate: number;
}

interface CartItem {
  item: EquipmentItem;
  days: number;
}

const CATEGORIES = ['All', 'Cameras', 'Lenses', 'Lighting', 'Stabilization', 'Audio'];
const PLATFORM_FEE_RATE = 0.20;

export default function EquipmentRental({ creatorId, email }: { creatorId: string; email?: string }) {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    supabase
      .from('equipment_items')
      .select('id, name, category, description, image_url, day_rate')
      .eq('available', true)
      .order('sort_order')
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, []);

  const filtered = category === 'All' ? items : items.filter(i => i.category === category);

  const addToCart = (item: EquipmentItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, days: c.days + 1 } : c);
      return [...prev, { item, days: 1 }];
    });
  };

  const updateDays = (itemId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.item.id !== itemId) return c;
      const newDays = c.days + delta;
      return newDays > 0 ? { ...c, days: newDays } : c;
    }).filter(c => c.days > 0));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.item.day_rate * c.days, 0);
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE);
  const total = subtotal + platformFee;
  const cartCount = cart.reduce((sum, c) => sum + c.days, 0);

  const checkout = async () => {
    if (cart.length === 0) return;
    setCheckingOut(true);
    setCheckoutError('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      if (!supabaseUrl || !anonKey) {
        setCheckoutError('Payment configuration is missing. Please contact support.');
        setCheckingOut(false);
        return;
      }
      const res = await fetch(`${supabaseUrl}/functions/v1/equipment-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({
          creator_id: creatorId,
          email,
          items: cart.map(c => ({ item_id: c.item.id, name: c.item.name, day_rate: c.item.day_rate, days: c.days, subtotal: c.item.day_rate * c.days })),
          subtotal,
          platform_fee: platformFee,
          total,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || `Checkout failed (${res.status}). Please try again.`);
        setCheckingOut(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError('Failed to create payment session. Please try again.');
    } catch (err) {
      setCheckoutError(err instanceof Error ? `Checkout error: ${err.message}` : 'An unexpected error occurred. Please try again.');
    }
    setCheckingOut(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm" style={{ color: '#64748b' }}>Loading equipment...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Rent Equipment</h3>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Professional gear delivered to your shoot location</p>
        </div>
        <button
          onClick={() => setShowCart(true)}
          className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: cart.length > 0 ? 'linear-gradient(135deg, #0e7c4a, #0a5c38)' : 'rgba(255,255,255,0.04)', border: `1px solid ${cart.length > 0 ? 'rgba(0,196,140,0.3)' : 'rgba(255,255,255,0.08)'}`, color: cart.length > 0 ? '#fff' : '#64748b' }}
        >
          <ShoppingCart size={16} />
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: '#00C48C', color: '#000' }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
            style={{
              background: category === cat ? 'rgba(0,196,140,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${category === cat ? 'rgba(0,196,140,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: category === cat ? '#00C48C' : '#64748b',
            }}>
            {cat === 'All' && <Filter size={11} className="inline mr-1.5" style={{ verticalAlign: '-1px' }} />}
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map(item => {
          const inCart = cart.find(c => c.item.id === item.id);
          return (
            <div key={item.id} className="rounded-2xl overflow-hidden group transition-all" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
              {/* Image */}
              <div className="relative h-36 overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <img src={item.image_url} alt={item.name}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-105 transition-transform duration-500"
                  loading="lazy" />
                <div className="absolute top-2.5 left-2.5">
                  <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(0,0,0,0.7)', color: '#94a3b8', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {item.category}
                  </span>
                </div>
                {inCart && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#00C48C' }}>
                    <span className="text-[10px] font-bold text-black">{inCart.days}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h4 className="text-sm font-bold text-white mb-0.5">{item.name}</h4>
                <p className="text-xs mb-3 line-clamp-2" style={{ color: '#475569' }}>{item.description}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-base font-bold" style={{ color: '#00C48C' }}>{item.day_rate}</span>
                    <span className="text-xs ml-1" style={{ color: '#475569' }}>AED / day</span>
                  </div>
                  <button onClick={() => addToCart(item)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                    style={{ background: inCart ? 'rgba(0,196,140,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${inCart ? 'rgba(0,196,140,0.3)' : 'rgba(255,255,255,0.1)'}`, color: inCart ? '#00C48C' : '#94a3b8' }}>
                    <Plus size={12} />
                    {inCart ? 'Add Day' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Camera size={32} style={{ color: '#1e293b', margin: '0 auto 12px' }} />
          <p className="text-sm" style={{ color: '#475569' }}>No equipment in this category yet</p>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={() => setShowCart(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md mx-auto rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
            style={{ background: '#0f1520', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}>

            {/* Cart header */}
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5">
                <ShoppingCart size={18} style={{ color: '#00C48C' }} />
                <span className="text-base font-bold text-white">Your Cart</span>
                {cart.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(0,196,140,0.12)', color: '#00C48C' }}>
                    {cart.length} item{cart.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <X size={16} style={{ color: '#64748b' }} />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart size={32} style={{ color: '#1e293b', margin: '0 auto 12px' }} />
                  <p className="text-sm" style={{ color: '#475569' }}>Your cart is empty</p>
                  <p className="text-xs mt-1" style={{ color: '#334155' }}>Add equipment to get started</p>
                </div>
              ) : (
                cart.map(c => (
                  <div key={c.item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <img src={c.item.image_url} alt={c.item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{c.item.name}</div>
                      <div className="text-xs" style={{ color: '#475569' }}>{c.item.day_rate} AED/day</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => updateDays(c.item.id, -1)}
                        className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Minus size={11} style={{ color: '#94a3b8' }} />
                      </button>
                      <span className="text-xs font-bold text-white w-6 text-center">{c.days}d</span>
                      <button onClick={() => updateDays(c.item.id, 1)}
                        className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Plus size={11} style={{ color: '#94a3b8' }} />
                      </button>
                    </div>
                    <div className="text-right flex-shrink-0 w-16">
                      <div className="text-sm font-bold text-white">{c.item.day_rate * c.days}</div>
                      <div className="text-[10px]" style={{ color: '#475569' }}>AED</div>
                    </div>
                    <button onClick={() => removeFromCart(c.item.id)} className="ml-1 flex-shrink-0">
                      <X size={13} style={{ color: '#475569' }} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Cart footer */}
            {cart.length > 0 && (
              <div className="p-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#64748b' }}>Subtotal</span>
                    <span className="font-medium text-white">{subtotal} AED</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#64748b' }}>Service fee (20%)</span>
                    <span className="font-medium text-white">{platformFee} AED</span>
                  </div>
                  <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-white">Total</span>
                    <span className="text-lg font-bold" style={{ color: '#00C48C' }}>{total} AED</span>
                  </div>
                </div>
                <button onClick={checkout} disabled={checkingOut}
                  className="w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #0e7c4a 0%, #0a5c38 100%)', color: '#fff', border: '1px solid rgba(0,196,140,0.3)', boxShadow: '0 4px 20px rgba(0,196,140,0.15)' }}>
                  {checkingOut ? 'Processing...' : `Checkout — ${total} AED`}
                </button>
                {checkoutError && (
                  <div className="mt-2 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                    {checkoutError}
                  </div>
                )}
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <Zap size={11} style={{ color: '#475569' }} />
                  <span className="text-[10px]" style={{ color: '#475569' }}>Secure payment via Stripe</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating cart button (mobile) */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-6 left-4 right-4 z-50 sm:hidden">
          <button onClick={() => setShowCart(true)}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #0e7c4a 0%, #0a5c38 100%)', boxShadow: '0 8px 32px rgba(0,196,140,0.25)', border: '1px solid rgba(0,196,140,0.3)' }}>
            <div className="flex items-center gap-2.5">
              <ShoppingCart size={16} className="text-white" />
              <span className="text-sm font-bold text-white">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
            </div>
            <span className="text-sm font-bold text-white">{total} AED</span>
          </button>
        </div>
      )}
    </div>
  );
}
