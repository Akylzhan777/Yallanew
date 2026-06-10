import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Users, TrendingUp, Play, Instagram, Youtube, MapPin, ChevronRight, Check, Clock, Shield, Lock, Zap, CreditCard, X, Smartphone, Info, Share2, ExternalLink, ArrowLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { safeSetItem } from '../utils/safeStorage';

// Anonymous client for public reads — never carries a user session,
// so creator_profiles queries are never blocked by auth token refresh or RLS role evaluation.
const publicSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
import { CreatorPackage } from '../context/CreatorAuthContext';
import { formatPriceForRegion, REGION_CONFIG, Region } from '../context/RegionContext';
import { applyCreatorSeo, resetDefaultSeo } from '../lib/seo';

interface PublicProfile {
  id: string;
  display_name: string;
  handle: string | null;
  username: string;
  bio: string;
  creator_type: string;
  category: string;
  location: string;
  languages: string[];
  avatar_url: string | null;
  cover_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  followers_count: number;
  avg_views: number;
  engagement_rate: number;
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_hidden: boolean;
  is_published?: boolean;
  status: string;
  packages: CreatorPackage[];
  equipment_list: string | null;
  model_height: string | null;
  model_weight: string | null;
  model_age: string | null;
  model_nationality: string | null;
  model_hourly_rate: number | null;
  model_min_hours: number | null;
  model_shoot_types: string | null;
  model_restrictions: string | null;
  portfolio_urls: string[] | null;
  portfolio_items: Array<{ url: string; type?: 'image' | 'video'; title?: string; clientName?: string; description?: string }> | null;
  model_bust: string | null;
  region: string | null;
  model_waist: string | null;
  model_hips: string | null;
  model_shoe_size: string | null;
  model_clothing_size: string | null;
  model_hair_color: string | null;
  model_eye_color: string | null;
  model_skills: string | null;
  model_features: string | null;
  video_comp_url: string | null;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

type CPPayMethod = 'card' | 'tabby' | 'tamara' | 'kaspi';

/* ═══════════════════════════════════════════════════════════════════
   CHECKOUT MODAL (preserved from original)
   ═══════════════════════════════════════════════════════════════════ */
function CheckoutModal({ profile, pkg, onClose }: { profile: PublicProfile; pkg: CreatorPackage; onClose: () => void }) {
  const { t } = useTranslation();
  const creatorRegion = ((profile.region as Region) ?? 'UAE');
  const creatorCurrency = REGION_CONFIG[creatorRegion].currency;
  const formatPrice = (amount: number) => formatPriceForRegion(amount, creatorRegion);
  const isKzCheckout = creatorRegion === 'KZ';
  const isModel = profile.creator_type === 'model';
  const clientPrice = pkg.clientPrice ?? Math.round(pkg.price * 1.2);
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', company: '', brief: '' });
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState('');
  const [step, setStep] = useState<'form' | 'bnpl_redirect' | 'success'>('form');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<CPPayMethod>('card');
  const [bnplUrl, setBnplUrl] = useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<{ id: string; email: string; name: string; company: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const u = data.session.user;
        try {
          const { data: cp } = await supabase.from('client_profiles').select('display_name, company_name').eq('user_id', u.id).maybeSingle();
          const name = cp?.display_name || u.user_metadata?.display_name || u.email?.split('@')[0] || '';
          const company = cp?.company_name || '';
          setLoggedInUser({ id: u.id, email: u.email || '', name, company });
          setForm(f => ({ ...f, name, email: u.email || '', company }));
        } catch {
          // Creator/admin users don't have client_profiles; pre-fill from auth metadata only
          const name = u.user_metadata?.display_name || u.email?.split('@')[0] || '';
          setForm(f => ({ ...f, name, email: u.email || '' }));
        }
      }
    }).catch(() => {});
  }, []);

  const createOrderRecord = async (status: 'on_hold' | 'pending', _extraFields?: Record<string, string>): Promise<{ data: Record<string, unknown> | null; error: string | null }> => {
    const commission = Math.round(clientPrice * 0.15);
    const net = clientPrice - commission;
    const { data: order, error: insertErr } = await supabase.from('marketplace_orders').insert({
      creator_id: profile.id,
      buyer_name: form.name,
      buyer_email: form.email,
      buyer_company: form.company || null,
      campaign_brief: form.brief || null,
      package_id: pkg.id,
      package_name: pkg.name,
      package_price: clientPrice,
      creator_net_amount: net,
      status,
      payment_method: payMethod,
      region: creatorRegion,
      ...(loggedInUser ? { client_user_id: loggedInUser.id } : {}),
    }).select().maybeSingle();
    if (insertErr) {
      console.error('[checkout] order insert error:', insertErr);
      return { data: null, error: insertErr.message };
    }
    if (order && status === 'on_hold') {
      await supabase.from('creator_transactions').insert({
        creator_id: profile.id,
        order_id: order.id,
        type: 'order_payment',
        status: 'on_hold',
        amount: clientPrice,
        net_amount: net,
        platform_fee: commission,
        description: `Order from ${form.name} — ${pkg.name} (on hold)`,
      });
      await supabase.rpc('upsert_creator_wallet_on_hold', {
        p_creator_id: profile.id,
        p_currency: 'KZT',
        p_amount: net,
      });
    }
    return { data: order, error: null };
  };

  const handlePay = async () => {
    if (!form.name || !form.email) return;
    if ((payMethod === 'tabby' || payMethod === 'tamara') && !form.whatsapp) return;
    setProcessing(true);
    setPayError('');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    if (!supabaseUrl || !anonKey) {
      setPayError('Payment configuration is missing. Please contact support.');
      setProcessing(false);
      return;
    }

    try {
      if (payMethod === 'card' || payMethod === 'kaspi') {
        const result = await createOrderRecord('pending');
        if (result.error || !result.data) {
          console.error('Checkout Error:', result.error);
          setPayError(result.error || 'Unknown error occurred');
          setProcessing(false);
          return;
        }
        const order = result.data as { id: string };
        setOrderId(order.id);

        const res = await fetch(`${supabaseUrl}/functions/v1/marketplace-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}` },
          body: JSON.stringify({
            order_id: order.id,
            amount: clientPrice,
            package_name: pkg.name,
            creator_name: profile.display_name,
            buyer_email: form.email,
            buyer_name: form.name,
            region: creatorRegion,
          }),
        });

        if (!res.ok) {
          let errMsg = `Payment failed (${res.status}). Please try again.`;
          try { const d = await res.json(); if (d.error) errMsg = d.error; } catch {}
          console.error('Checkout Error:', errMsg);
          setPayError(errMsg);
          setProcessing(false);
          return;
        }

        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setPayError('Failed to create checkout session. Please try again.');
        setProcessing(false);
        return;
      }

      // BNPL flow
      const result = await createOrderRecord('pending');
      if (result.error || !result.data) {
        console.error('Checkout Error:', result.error);
        setPayError(result.error || 'Unknown error occurred');
        setProcessing(false);
        return;
      }
      const order = result.data as { id: string };
      setOrderId(order.id);

      const res = await fetch(`${supabaseUrl}/functions/v1/bnpl-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify({
          provider: payMethod,
          amount: clientPrice,
          currency: creatorCurrency,
          buyer_name: form.name,
          buyer_email: form.email,
          buyer_phone: form.whatsapp,
          order_id: order.id,
          package_name: pkg.name,
        }),
      });

      if (!res.ok) {
        let errMsg = `Payment failed (${res.status}). Please try again.`;
        try { const d = await res.json(); if (d.error) errMsg = d.error; } catch {}
        setPayError(errMsg);
        setProcessing(false);
        return;
      }

      const data = await res.json();
      if (data.checkout_url) {
        setBnplUrl(data.checkout_url);
        await supabase.from('marketplace_orders').update({ payment_session_id: data.session_id ?? null, payment_session_url: data.checkout_url }).eq('id', order.id);
        setStep('bnpl_redirect');
      } else {
        setPayError('Failed to create payment session. Please try again.');
      }
    } catch (err) {
      console.error('Checkout Error:', err);
      setPayError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    }
    setProcessing(false);
  };

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors";
  const inputStyle = { background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' };
  const fg = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'; };
  const bl = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; };

  const isBnpl = payMethod === 'tabby' || payMethod === 'tamara';
  const isKaspi = payMethod === 'kaspi';

  if (step === 'bnpl_redirect') {
    const providerName = payMethod === 'tabby' ? 'Tabby' : 'Tamara';
    const providerColor = payMethod === 'tabby' ? '#3DBBAC' : '#BC8BF0';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} />
        <div className="relative rounded-2xl p-8 text-center w-full max-w-sm" style={{ background: '#131929', border: `1px solid ${providerColor}40` }} onClick={e => e.stopPropagation()}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: `${providerColor}18`, border: `2px solid ${providerColor}60` }}>
            <Smartphone size={36} style={{ color: providerColor }} />
          </div>
          <div className="text-2xl font-bold text-white mb-2">{t('marketplace.checkout.bnplRedirecting', { provider: providerName })}</div>
          <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
            {payMethod === 'tabby'
              ? 'You will be redirected to Tabby to verify your identity and approve your 4-instalment plan.'
              : 'You will be redirected to Tamara to verify your identity and approve your 3-instalment plan.'}
          </p>
          <div className="rounded-xl p-4 mb-6 text-left" style={{ background: `${providerColor}0d`, border: `1px solid ${providerColor}30` }}>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: '#64748b' }}>{t('marketplace.success.amountHeld')}</span>
              <span className="font-bold text-white">{formatPrice(clientPrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: '#64748b' }}>
                {payMethod === 'tabby'
                  ? t('marketplace.checkout.bnplInstallments4', { amount: Math.ceil(clientPrice / 4).toLocaleString(), currency: creatorCurrency })
                  : t('marketplace.checkout.bnplInstallments3', { amount: Math.ceil(clientPrice / 3).toLocaleString(), currency: creatorCurrency })}
              </span>
              <span className="font-semibold" style={{ color: providerColor }}>{t('marketplace.checkout.bnplInterestFree')}</span>
            </div>
          </div>
          {bnplUrl ? (
            <a href={bnplUrl} target="_blank" rel="noopener noreferrer"
              className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 mb-3 hover:brightness-110 transition-all"
              style={{ background: providerColor, color: '#fff', display: 'flex', textDecoration: 'none' }}>
              {t('marketplace.checkout.bnplContinue', { provider: providerName })} <ChevronRight size={16} />
            </a>
          ) : (
            <div className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 mb-3" style={{ background: `${providerColor}30`, color: providerColor }}>
              <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              {t('marketplace.checkout.processing')}
            </div>
          )}
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
            {t('booking.cancel')}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} />
        <div className="relative rounded-2xl p-8 text-center w-full max-w-sm" style={{ background: '#131929', border: '1px solid rgba(0,196,140,0.3)' }} onClick={e => e.stopPropagation()}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(0,196,140,0.15)', border: '2px solid rgba(0,196,140,0.4)' }}>
            <Shield size={36} style={{ color: '#00C48C' }} />
          </div>
          <div className="text-2xl font-bold text-white mb-2">{t('marketplace.success.title')}</div>
          <div className="text-sm mb-5" style={{ color: '#94a3b8' }}>
            {t('marketplace.success.desc')} <span className="text-white font-semibold">{t('marketplace.success.descAccent')}</span>.
          </div>
          <div className="rounded-xl p-4 mb-4 text-left" style={{ background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Lock size={11} style={{ color: '#00C48C' }} />
              <span className="text-xs font-bold" style={{ color: '#00C48C' }}>{t('marketplace.success.statusLabel')}</span>
            </div>
            <div className="flex justify-between text-sm mb-1.5">
              <span style={{ color: '#64748b' }}>{t('marketplace.success.package')}</span>
              <span className="text-white font-medium">{pkg.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: '#64748b' }}>{t('marketplace.success.amountHeld')}</span>
              <span className="font-bold text-white">{formatPrice(clientPrice)}</span>
            </div>
          </div>
          {orderId && (
            <div className="rounded-lg px-3 py-2 mb-4 text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ color: '#475569' }}>{t('marketplace.success.orderId')} </span>
              <span className="font-mono text-white">#{orderId.slice(0, 8).toUpperCase()}</span>
            </div>
          )}
          <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}>
            {t('marketplace.success.gotIt')}
          </button>
        </div>
      </div>
    );
  }

  const canSubmit = !processing && form.name && form.email && (isBnpl ? !!form.whatsapp : true);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} />
      <div className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl" style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '95dvh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-white text-lg">{t('marketplace.checkout.title')}</span>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}><X size={15} /></button>
          </div>
          <div className="flex items-center gap-3">
            <img src={profile.avatar_url ?? 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=80'} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-white truncate">{profile.display_name} — {pkg.name}</div>
              <div className="flex items-center gap-1 text-xs" style={{ color: '#475569' }}><Clock size={10} />{isModel ? t('packages.hours_display', { hours: pkg.deliveryDays }) : t('marketplace.checkout.dayDelivery', { days: pkg.deliveryDays })}</div>
            </div>
            <div className="font-bold text-xl text-white flex-shrink-0">{formatPrice(clientPrice)}</div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {([
              { icon: <Shield size={13} />, labelKey: 'marketplace.checkout.securePayment' },
              { icon: <Lock size={13} />, labelKey: 'marketplace.escrow.badge' },
              { icon: <Zap size={13} />, labelKey: 'marketplace.checkout.instantConfirm' },
            ] as { icon: React.ReactNode; labelKey: string }[]).map(b => (
              <div key={b.labelKey} className="flex flex-col items-center gap-1 rounded-lg py-2 px-1 text-center" style={{ background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.15)' }}>
                <span style={{ color: '#00C48C' }}>{b.icon}</span>
                <span className="leading-tight" style={{ color: '#64748b', fontSize: '0.6rem' }}>{t(b.labelKey)}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>{t('marketplace.checkout.yourDetails')}</div>
            <div className="space-y-3">
              {!loggedInUser && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>{t('marketplace.checkout.fullName')}</label>
                      <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('marketplace.checkout.fullNamePlaceholder')} className={inputCls} style={{ ...inputStyle }} onFocus={fg} onBlur={bl} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>{t('marketplace.checkout.email')}</label>
                      <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder={t('marketplace.checkout.emailPlaceholder')} className={inputCls} style={{ ...inputStyle }} onFocus={fg} onBlur={bl} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>{t('marketplace.checkout.brandCompany')}</label>
                    <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder={t('marketplace.checkout.brandPlaceholder')} className={inputCls} style={{ ...inputStyle }} onFocus={fg} onBlur={bl} />
                  </div>
                </>
              )}
              {loggedInUser && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>{loggedInUser.name[0]?.toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{loggedInUser.name}</div>
                    <div className="text-xs truncate" style={{ color: '#64748b' }}>{loggedInUser.email}</div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>{t('marketplace.checkout.campaignBrief')}</label>
                <textarea value={form.brief} onChange={e => setForm(p => ({ ...p, brief: e.target.value }))} placeholder={t('marketplace.checkout.briefPlaceholder')} rows={2} className={inputCls + ' resize-none'} style={{ ...inputStyle }} onFocus={fg} onBlur={bl} />
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>{t('marketplace.checkout.paymentMethod')}</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(isKzCheckout ? [
                { id: 'card' as CPPayMethod, label: 'Карта', icon: <CreditCard size={14} />, color: '#00C48C' },
                { id: 'kaspi' as CPPayMethod, label: 'Kaspi Red', icon: <span className="font-black text-xs">K</span>, color: '#E53935' },
              ] : [
                { id: 'card' as CPPayMethod, label: t('marketplace.checkout.payCard'), icon: <CreditCard size={14} />, color: '#00C48C' },
                { id: 'tabby' as CPPayMethod, label: t('marketplace.checkout.payTabby'), icon: <span className="font-black text-xs">tabby</span>, color: '#3DBBAC' },
                { id: 'tamara' as CPPayMethod, label: t('marketplace.checkout.payTamara'), icon: <span className="font-black text-xs">tamara</span>, color: '#BC8BF0' },
              ] as { id: CPPayMethod; label: string; icon: React.ReactNode; color: string }[]).map(m => {
                const active = payMethod === m.id;
                return (
                  <button key={m.id} onClick={() => setPayMethod(m.id)}
                    className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 text-center transition-all"
                    style={{ background: active ? `${m.color}18` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? m.color + '60' : 'rgba(255,255,255,0.08)'}` }}>
                    <span style={{ color: active ? m.color : '#475569' }}>{m.icon}</span>
                    <span className="leading-tight" style={{ color: active ? m.color : '#475569', fontSize: '0.6rem', fontWeight: active ? 700 : 400 }}>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {payMethod === 'kaspi' && (
              <div className="rounded-xl p-3 mb-3 text-xs" style={{ background: 'rgba(229,57,53,0.06)', border: '1px solid rgba(229,57,53,0.25)', color: '#94a3b8' }}>
                Доступна оплата через <span className="font-black" style={{ color: '#E53935' }}>Kaspi Red</span> и рассрочка 0-0-12
              </div>
            )}
            {payMethod === 'tabby' && !isKzCheckout && (
              <div className="rounded-xl p-3 mb-3 text-xs" style={{ background: 'rgba(61,187,172,0.06)', border: '1px solid rgba(61,187,172,0.25)', color: '#64748b' }}>
                {t('marketplace.checkout.bnplSnippet', { count: 4, amount: Math.ceil(clientPrice / 4).toLocaleString(), currency: creatorCurrency })} <span className="font-black" style={{ color: '#3DBBAC' }}>tabby</span>
              </div>
            )}
            {payMethod === 'tamara' && !isKzCheckout && (
              <div className="rounded-xl p-3 mb-3 text-xs" style={{ background: 'rgba(188,139,240,0.06)', border: '1px solid rgba(188,139,240,0.25)', color: '#64748b' }}>
                {t('marketplace.checkout.bnplSnippet', { count: 3, amount: Math.ceil(clientPrice / 3).toLocaleString(), currency: creatorCurrency })} <span className="font-black" style={{ color: '#BC8BF0' }}>tamara</span>
              </div>
            )}

            {payMethod === 'card' && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(0,196,140,0.04)', border: '1px solid rgba(0,196,140,0.15)' }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <Shield size={14} style={{ color: '#00C48C' }} />
                  <span className="text-xs font-bold" style={{ color: '#00C48C' }}>{t('marketplace.checkout.securePayment')}</span>
                </div>
                <p className="text-xs" style={{ color: '#64748b' }}>
                  {isKzCheckout ? 'Безопасная оплата через Stripe. Вы будете перенаправлены для ввода данных карты.' : 'You will be securely redirected to Stripe to complete your payment.'}
                </p>
              </div>
            )}

            {isKaspi && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(229,57,53,0.04)', border: '1px solid rgba(229,57,53,0.15)' }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <Shield size={14} style={{ color: '#E53935' }} />
                  <span className="text-xs font-bold" style={{ color: '#E53935' }}>Kaspi Red / Kredit</span>
                </div>
                <p className="text-xs" style={{ color: '#64748b' }}>
                  Оплата через Kaspi Red. Рассрочка до 12 месяцев без переплаты (0-0-12).
                </p>
              </div>
            )}

            {isBnpl && (
              <div className="mt-3">
                <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>{t('marketplace.checkout.whatsapp')}</label>
                <input value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder={t('marketplace.checkout.whatsappPlaceholder')} className={inputCls} style={{ ...inputStyle }} onFocus={fg} onBlur={bl} />
              </div>
            )}
          </div>

          {payError && (
            <div className="rounded-xl px-4 py-3 text-sm mb-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              {payError}
            </div>
          )}
          <button onClick={handlePay} disabled={!canSubmit}
            className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: processing ? 'rgba(255,255,255,0.05)' :
                isKaspi ? 'linear-gradient(135deg, #E53935, #C62828)' :
                payMethod === 'tabby' ? 'linear-gradient(135deg, #3DBBAC, #2a9488)' :
                payMethod === 'tamara' ? 'linear-gradient(135deg, #9c6dd4, #7c4db5)' :
                'linear-gradient(135deg, #0e7c4a, #0a5c38)',
              color: '#fff',
              border: `1px solid ${isKaspi ? 'rgba(229,57,53,0.4)' : payMethod === 'tabby' ? 'rgba(61,187,172,0.4)' : payMethod === 'tamara' ? 'rgba(188,139,240,0.4)' : 'rgba(0,196,140,0.3)'}`,
              boxShadow: isKaspi ? '0 8px 32px rgba(229,57,53,0.2)' : payMethod === 'tabby' ? '0 8px 32px rgba(61,187,172,0.2)' : payMethod === 'tamara' ? '0 8px 32px rgba(188,139,240,0.2)' : '0 8px 32px rgba(0,196,140,0.25)',
            }}>
            {processing ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('marketplace.checkout.processing')}</>
            ) : isBnpl ? (
              <>{t('marketplace.checkout.bnplContinue', { provider: payMethod === 'tabby' ? 'Tabby' : 'Tamara' })} <ChevronRight size={16} /></>
            ) : (
              <><Shield size={16} />{t('marketplace.checkout.pay', { price: clientPrice.toLocaleString(), currency: creatorCurrency })}</>
            )}
          </button>
          <p className="text-center text-xs" style={{ color: '#374151' }}>{t('marketplace.checkout.sslNotice')}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   NOT FOUND
   ═══════════════════════════════════════════════════════════════════ */
function NotFound({ username }: { username: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#080d16' }}>
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.25)' }}>
          <span className="text-3xl font-black" style={{ color: '#f87171' }}>404</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Profile not found</h2>
        <p className="text-sm mb-8" style={{ color: '#64748b' }}>
          <span className="font-mono text-white">@{username}</span> does not exist or is not published.
        </p>
        <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)', border: '1px solid rgba(0,196,140,0.3)' }}>
          Back to Marketplace
        </a>
      </div>
    </div>
  );
}

const BUNNY_CDN = 'vz-f9c8ad95-914.b-cdn.net';
function getBunnyThumb(embedUrl: string): string | null {
  const m = embedUrl.match(/embed\/\d+\/([^/?#]+)/);
  return m ? `https://${BUNNY_CDN}/${m[1]}/thumbnail.jpg` : null;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN TAPLINK-STYLE PAGE
   ═══════════════════════════════════════════════════════════════════ */
function PublicCreatorProfile({ username }: { username: string }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<PublicProfile | null | 'loading'>('loading');
  const [checkoutPkg, setCheckoutPkg] = useState<CreatorPackage | null>(null);
  const [clientSession, setClientSession] = useState<boolean | null>(null);
  const [hasClientProfile, setHasClientProfile] = useState(false);
  const [showBrandGate, setShowBrandGate] = useState(false);

  useEffect(() => {
    const checkClientProfile = async (userId: string) => {
      try {
        const { data: cp } = await supabase
          .from('client_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        setHasClientProfile(!!cp);
      } catch {
        // Non-client users (creators, admins) may not have a client_profiles row;
        // RLS may block the read — treat as "no client profile", do not crash.
        setHasClientProfile(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      const hasSession = !!data.session;
      setClientSession(hasSession);
      if (hasSession && data.session?.user) {
        checkClientProfile(data.session.user.id);
      }
    }).catch(() => setClientSession(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      const hasSession = !!s;
      setClientSession(hasSession);
      if (hasSession && s?.user) {
        checkClientProfile(s.user.id);
      } else {
        setHasClientProfile(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function handleOrderClick(pkg: CreatorPackage) {
    if (isKzCreator) {
      const isBrand = clientSession === true && hasClientProfile;
      if (!isBrand) {
        setShowBrandGate(true);
        return;
      }
      setCheckoutPkg(pkg);
      return;
    }
    if (clientSession === false) {
      safeSetItem('brand_checkout_intent', JSON.stringify({ username, packageId: pkg.id }));
      window.location.href = '/brand/signup';
      return;
    }
    setCheckoutPkg(pkg);
  }
  const [copied, setCopied] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);

  useEffect(() => {
    if (!username) { setProfile(null); return; }

    const cleanUsername = decodeURIComponent(username || '').replace(/^@/, '').toLowerCase();

    // Safety timeout — if query never resolves, show NotFound after 8s
    const timeout = setTimeout(() => setProfile(null), 8000);

    (async () => {
      try {
        const { data, error } = await publicSupabase
          .from('creator_profiles')
          .select('id, display_name, handle, username, bio, creator_type, category, location, languages, avatar_url, cover_url, instagram_url, youtube_url, tiktok_url, followers_count, avg_views, engagement_rate, rating, review_count, is_verified, is_hidden, status, packages, is_published, equipment_list, model_height, model_weight, model_age, model_nationality, model_hourly_rate, model_min_hours, model_shoot_types, model_restrictions, portfolio_urls, portfolio_items, model_bust, model_waist, model_hips, model_shoe_size, model_clothing_size, model_hair_color, model_eye_color, model_skills, model_features, video_comp_url, region')
          .eq('username', cleanUsername)
          .maybeSingle();
        clearTimeout(timeout);
        if (error) {
          console.error('[PublicCreatorProfile] fetch error:', error.message);
          setProfile(null);
          return;
        }
        setProfile((data as PublicProfile | null) ?? null);
      } catch (err) {
        clearTimeout(timeout);
        console.error('[PublicCreatorProfile] unexpected error:', err);
        setProfile(null);
      }
    })();

    return () => clearTimeout(timeout);
  }, [username]);

  useEffect(() => {
    if (!profile || profile === 'loading') return;
    if (typeof profile === 'object' && profile.is_published && !profile.is_hidden && profile.status !== 'banned') {
      applyCreatorSeo({
        display_name: profile.display_name,
        username: profile.username,
        bio: profile.bio,
        category: profile.category,
        creator_type: profile.creator_type,
        location: profile.location,
        avatar_url: profile.avatar_url,
        followers_count: profile.followers_count,
        is_verified: profile.is_verified,
        packages: Array.isArray(profile.packages) ? profile.packages as Array<{ name: string; price: number; description?: string }> : [],
      });
    }
    return () => { resetDefaultSeo(); };
  }, [profile]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${decodeURIComponent(username || '').replace(/^@/, '')}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (profile === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080d16' }}>
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return <NotFound username={username} />;

  if (profile.status === 'banned' || profile.is_hidden || !profile.is_published) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#080d16' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
            <Lock size={28} style={{ color: '#64748b' }} />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Profile Unavailable</h1>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>This creator profile is not currently available.</p>
          <a href="/" className="inline-block px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(0,196,140,0.1)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.25)' }}>
            Browse Marketplace
          </a>
        </div>
      </div>
    );
  }

  const packages: CreatorPackage[] = Array.isArray(profile.packages) ? profile.packages as CreatorPackage[] : [];
  const getClientPrice = (p: CreatorPackage) => p.clientPrice ?? Math.round(p.price * 1.2);
  const minPrice = packages.length > 0 ? Math.min(...packages.map(getClientPrice)) : 0;
  const isProduction = profile.creator_type === 'videographer' || profile.creator_type === 'photographer';
  const isModel = profile.creator_type === 'model';
  const isVideographer = profile.creator_type === 'videographer';
  const isEditorType = profile.creator_type === 'ugc' || profile.creator_type === 'videographer' || profile.creator_type === 'photographer' || profile.creator_type === 'editor';
  const isKzCreator = profile.region === 'KZ';
  const creatorRegion = (profile.region as Region) ?? 'UAE';
  const creatorCurrency = REGION_CONFIG[creatorRegion].currency;
  const fmtCreatorPrice = (amount: number) => formatPriceForRegion(amount, creatorRegion);

  // Build rich portfolio items — prefer portfolio_items, fall back to portfolio_urls
  const portfolioItems: Array<{ url: string; type?: 'image' | 'video'; title?: string; clientName?: string; description?: string }> = (() => {
    if (Array.isArray(profile.portfolio_items) && profile.portfolio_items.length > 0) {
      return profile.portfolio_items;
    }
    if (Array.isArray(profile.portfolio_urls) && profile.portfolio_urls.length > 0) {
      return profile.portfolio_urls.map(url => ({ url }));
    }
    return [];
  })();

  const platformLinks: { href: string | null; icon: React.ReactNode; label: string; color: string }[] = [
    { href: profile.instagram_url, icon: <Instagram size={18} />, label: 'Instagram', color: '#e1306c' },
    { href: profile.youtube_url, icon: <Youtube size={18} />, label: 'YouTube', color: '#ef4444' },
    { href: profile.tiktok_url, icon: <Play size={18} />, label: 'TikTok', color: '#69c9d0' },
  ].filter(p => p.href);

  return (
    <div className="min-h-screen relative" style={{ background: '#080d16' }}>
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(0,196,140,0.3) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-48 w-80 h-80 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 -left-24 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)' }} />
      </div>

      {/* Taplink container */}
      <div className="relative z-10 max-w-md mx-auto w-full min-h-screen px-4 pt-8 pb-32">

        {/* Top bar: Back + Share */}
        <div className="flex items-center justify-between mb-6">
          <a href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textDecoration: 'none' }}
          >
            <ArrowLeft size={12} /> Back
          </a>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
            style={{ background: copied ? 'rgba(0,196,140,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? 'rgba(0,196,140,0.4)' : 'rgba(255,255,255,0.1)'}`, color: copied ? '#00C48C' : '#94a3b8' }}
          >
            {copied ? <><Check size={12} /> Copied!</> : <><Share2 size={12} /> Share Link</>}
          </button>
        </div>

        {/* ─── HEADER: Avatar + Name + Rating ─── */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden mb-4"
            style={{ border: '3px solid rgba(0,196,140,0.4)', boxShadow: '0 0 40px rgba(0,196,140,0.15)' }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-3xl font-black" style={{ background: 'rgba(0,196,140,0.15)', color: '#00C48C' }}>
                  {profile.display_name[0]?.toUpperCase()}
                </div>}
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white">{profile.display_name}</h1>
            {profile.is_verified && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#3b82f6' }}>
                <Check size={10} color="white" strokeWidth={3} />
              </div>
            )}
          </div>

          <p className="text-sm mb-2" style={{ color: '#64748b' }}>@{profile.username}</p>

          {/* Rating stars */}
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} size={14} fill={i <= Math.round(profile.rating || 5) ? '#fbbf24' : 'transparent'} style={{ color: i <= Math.round(profile.rating || 5) ? '#fbbf24' : '#374151' }} />
            ))}
            <span className="text-xs font-semibold ml-1" style={{ color: '#fbbf24' }}>{(profile.rating || 5).toFixed(1)}</span>
            <span className="text-xs" style={{ color: '#475569' }}>({profile.review_count || 0})</span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
            {profile.location && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                <MapPin size={10} /> {profile.location}
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize" style={{ background: 'rgba(99,179,237,0.1)', color: '#63b3ed', border: '1px solid rgba(99,179,237,0.2)' }}>
              {profile.creator_type === 'ugc' ? 'UGC Creator' : profile.creator_type === 'model' ? 'Model' : profile.creator_type === 'videographer' ? 'Videographer' : profile.creator_type === 'photographer' ? 'Photographer' : profile.creator_type === 'editor' ? 'Video Editor' : profile.creator_type === 'telegram_channel' ? 'Telegram Channel' : 'Blogger'}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize" style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
              {profile.category}
            </span>
          </div>

          {/* Bio */}
          {profile.bio && (() => {
            const cleanBio = profile.bio.split(/keywords:/i)[0].trim();
            const isLong = cleanBio.length > 220;
            const shown = bioExpanded || !isLong ? cleanBio : cleanBio.slice(0, 220).trim() + '…';
            return (
              <div className="max-w-sm mx-auto text-center">
                <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{shown}</p>
                {isLong && (
                  <button onClick={() => setBioExpanded(v => !v)} className="text-xs mt-1 font-medium" style={{ color: '#00C48C' }}>
                    {bioExpanded ? 'Свернуть' : 'Читать ещё'}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Social links */}
          {platformLinks.length > 0 && (
            <div className="flex items-center gap-3 mt-4">
              {platformLinks.map(pl => (
                <a key={pl.label} href={pl.href!} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={{ background: `${pl.color}18`, border: `1px solid ${pl.color}33`, color: pl.color }}>
                  {pl.icon}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* ─── MODEL COMP CARD ─── */}
        {isModel && (profile.model_height || profile.model_age || profile.model_nationality) && (
          <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>Model Card</div>
            <div className="grid grid-cols-2 gap-2">
              {profile.model_height && (
                <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xs mb-0.5" style={{ color: '#475569' }}>Height</div>
                  <div className="text-sm font-semibold text-white">{profile.model_height}</div>
                </div>
              )}
              {profile.model_weight && (
                <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xs mb-0.5" style={{ color: '#475569' }}>Weight</div>
                  <div className="text-sm font-semibold text-white">{profile.model_weight}</div>
                </div>
              )}
              {profile.model_age && (
                <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xs mb-0.5" style={{ color: '#475569' }}>Age</div>
                  <div className="text-sm font-semibold text-white">{profile.model_age}</div>
                </div>
              )}
              {profile.model_nationality && (
                <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xs mb-0.5" style={{ color: '#475569' }}>Nationality</div>
                  <div className="text-sm font-semibold text-white">{profile.model_nationality}</div>
                </div>
              )}
            </div>
            {profile.model_shoot_types && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.model_shoot_types.split(/[,;]+/).filter(Boolean).map((type, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                    {type.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── MODEL MEASUREMENTS (extended) ─── */}
        {isModel && (profile.model_bust || profile.model_waist || profile.model_hips || profile.model_hair_color || profile.model_eye_color) && (
          <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>Measurements</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {profile.model_bust && (
                <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] mb-0.5" style={{ color: '#475569' }}>Bust</div>
                  <div className="text-xs font-semibold text-white">{profile.model_bust}</div>
                </div>
              )}
              {profile.model_waist && (
                <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] mb-0.5" style={{ color: '#475569' }}>Waist</div>
                  <div className="text-xs font-semibold text-white">{profile.model_waist}</div>
                </div>
              )}
              {profile.model_hips && (
                <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] mb-0.5" style={{ color: '#475569' }}>Hips</div>
                  <div className="text-xs font-semibold text-white">{profile.model_hips}</div>
                </div>
              )}
              {profile.model_shoe_size && (
                <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] mb-0.5" style={{ color: '#475569' }}>Shoes</div>
                  <div className="text-xs font-semibold text-white">{profile.model_shoe_size}</div>
                </div>
              )}
              {profile.model_clothing_size && (
                <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] mb-0.5" style={{ color: '#475569' }}>Clothing</div>
                  <div className="text-xs font-semibold text-white">{profile.model_clothing_size}</div>
                </div>
              )}
              {profile.model_hair_color && (
                <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] mb-0.5" style={{ color: '#475569' }}>Hair</div>
                  <div className="text-xs font-semibold text-white">{profile.model_hair_color}</div>
                </div>
              )}
              {profile.model_eye_color && (
                <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] mb-0.5" style={{ color: '#475569' }}>Eyes</div>
                  <div className="text-xs font-semibold text-white">{profile.model_eye_color}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── MODEL SKILLS & FEATURES ─── */}
        {isModel && (profile.model_skills || profile.model_features) && (
          <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>Skills & Features</div>
            {profile.model_skills && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {profile.model_skills.split(/[,;]+/).filter(Boolean).map((s, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: 'rgba(0,196,140,0.08)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.2)' }}>
                    {s.trim()}
                  </span>
                ))}
              </div>
            )}
            {profile.model_features && (
              <div className="flex flex-wrap gap-1.5">
                {profile.model_features.split(/[,;]+/).filter(Boolean).map((f, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: 'rgba(148,163,184,0.08)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' }}>
                    {f.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── VIDEO COMP CARD ─── */}
        {isModel && profile.video_comp_url && (
          <div className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>Video Introduction</h2>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <video src={profile.video_comp_url} controls className="w-full aspect-video object-contain" style={{ background: '#0a0f1a' }} />
            </div>
          </div>
        )}

        {/* ─── STATS ─── */}
        {!isProduction && !isModel && !isEditorType && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { label: t('marketplace.card.followers'), value: formatNum(profile.followers_count), icon: <Users size={16} /> },
              { label: t('marketplace.card.avgViews'), value: formatNum(profile.avg_views), icon: <TrendingUp size={16} /> },
              { label: 'ER', value: profile.engagement_rate + '%', icon: <Zap size={16} /> },
            ].map(s => (
              <div key={s.label} className="text-center rounded-2xl py-4 px-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)' }}>
                <div className="flex justify-center mb-2" style={{ color: '#00C48C' }}>{s.icon}</div>
                <div className="font-bold text-white text-lg leading-none">{s.value}</div>
                <div className="mt-1.5 text-xs" style={{ color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Equipment (for production types) */}
        {isProduction && profile.equipment_list && (
          <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>Equipment</div>
            <div className="flex flex-wrap gap-1.5">
              {profile.equipment_list.split(/[,\n]+/).filter(Boolean).map((item, i) => (
                <span key={i} className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                  style={{ background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.18)' }}>
                  {item.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ─── SERVICES / PACKAGES ─── */}
        {packages.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>
              {t('marketplace.modal.choosePackage')}
            </h2>
            <div className="space-y-2">
              {packages.map(pkg => (
                <div
                  key={pkg.id}
                  onClick={() => handleOrderClick(pkg)}
                  className="rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98] hover:border-emerald-500/30"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-white">{pkg.name}</span>
                      {pkg.description && (
                        <p
                          className="text-xs mt-0.5 leading-snug"
                          style={{
                            color: '#64748b',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {pkg.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="font-bold text-white">{fmtCreatorPrice(getClientPrice(pkg))}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs" style={{ color: '#475569' }}>
                      <Clock size={10} /> {isModel ? t('packages.hours_display', { hours: pkg.deliveryDays }) : `${pkg.deliveryDays} days`}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium" style={{ color: '#00C48C' }}>
                      Order <ExternalLink size={10} />
                    </div>
                  </div>
                  {pkg.includes && pkg.includes.length > 0 && pkg.includes.filter(Boolean).join(' ').trim() !== (pkg.description || '').trim() && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {pkg.includes.filter(Boolean).map(item => (
                        <span key={item} className="flex items-center gap-1 text-xs max-w-full" style={{ color: '#64748b' }}>
                          <Check size={9} style={{ color: '#00C48C', flexShrink: 0 }} />
                          <span className="truncate">{item}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── PORTFOLIO / CASES ─── */}
        {portfolioItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>
              Portfolio
            </h2>
            <div className={`grid gap-2 ${isModel ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {portfolioItems.map((item, i) => {
                const isBunny = item.type === 'video' && item.url.includes('iframe.mediadelivery.net');
                const isVideo = isBunny || item.type === 'video' || /\.(mp4|mov|webm)$/i.test(item.url);
                if (isBunny) {
                  const thumb = getBunnyThumb(item.url);
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveVideo(item.url)}
                      className="relative rounded-xl overflow-hidden bg-black group aspect-[9/16]"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {thumb ? (
                        <img src={thumb} alt={item.title || `Video ${i + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full" style={{ background: '#0a0f1a' }} />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                    </button>
                  );
                }
                return (
                  <div key={i} className={`rounded-xl overflow-hidden ${isModel ? 'aspect-[3/4]' : 'aspect-square'}`} style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                    {isVideo ? (
                      <video src={item.url} controls controlsList="nodownload" playsInline preload="metadata" className="w-full h-full object-cover" />
                    ) : (
                      <img src={item.url} alt={item.title || `Work ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fullscreen video modal */}
        {activeVideo && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.9)' }}
            onClick={() => setActiveVideo(null)}
          >
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
            <div className="bg-black rounded-xl overflow-hidden" style={{ width: '100%', maxWidth: 400, aspectRatio: '9 / 16' }} onClick={e => e.stopPropagation()}>
              <iframe
                src={activeVideo + '?autoplay=true'}
                loading="lazy"
                style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* ─── TRUST STRIP ─── */}
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(0,196,140,0.04)', border: '1px solid rgba(0,196,140,0.12)' }}>
          <Shield size={18} style={{ color: '#00C48C', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="text-sm font-bold text-white mb-1">{t('marketplace.escrow.title')}</div>
            <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
              {t('marketplace.escrow.step1Desc')} {t('marketplace.escrow.step3Desc')}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {isKzCreator ? (
                <>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(229,57,53,0.1)', color: '#E53935', border: '1px solid rgba(229,57,53,0.2)' }}>Kaspi Red</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(229,57,53,0.06)', color: '#EF5350', border: '1px solid rgba(229,57,53,0.15)' }}>Kaspi Kredit</span>
                  <span className="text-xs" style={{ color: '#374151' }}>Рассрочка 0-0-12</span>
                </>
              ) : (
                <>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(61,187,172,0.1)', color: '#3DBBAC', border: '1px solid rgba(61,187,172,0.2)' }}>tabby</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(188,139,240,0.1)', color: '#BC8BF0', border: '1px solid rgba(188,139,240,0.2)' }}>tamara</span>
                  <span className="text-xs" style={{ color: '#374151' }}>{t('marketplace.checkout.bnplInterestFree')}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── STICKY BOTTOM CTA ─── */}
      {packages.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-[calc(28rem-2rem)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <button
            onClick={() => handleOrderClick(packages[0])}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97] hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)',
              color: '#fff',
              border: '1px solid rgba(0,196,140,0.3)',
              boxShadow: '0 8px 32px rgba(0,196,140,0.25), 0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            <CreditCard size={16} />
            {t('marketplace.modal.bookCta', { price: minPrice.toLocaleString(), currency: creatorCurrency })}
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-xs" style={{ color: '#475569' }}>
            <Lock size={10} style={{ color: '#00C48C' }} />
            <span>{t('marketplace.escrow.badge')}</span>
          </div>
        </div>
      )}

      {/* KZ brand-only gate modal */}
      {showBrandGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowBrandGate(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} />
          <div
            className="relative w-full max-w-sm rounded-2xl p-8 text-center"
            style={{ background: '#131929', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowBrandGate(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full transition-colors hover:bg-white/10"
              style={{ color: '#64748b' }}
            >
              <X size={16} />
            </button>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(225,125,0,0.12)', border: '1px solid rgba(225,125,0,0.3)' }}>
              <Shield size={28} style={{ color: '#E17D00' }} />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">{t('marketplace.brandGate.title', 'Только для брендов')}</h2>
            <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
              {t('marketplace.brandGate.desc', 'Только зарегистрированные бренды могут оформлять заказы у креаторов. Пожалуйста, зарегистрируйте аккаунт компании.')}
            </p>
            <button
              onClick={() => {
                safeSetItem('brand_checkout_intent', JSON.stringify({ username }));
                window.location.href = '/brand/signup';
              }}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #E17D00, #F59E0B)', color: '#fff' }}
            >
              {t('marketplace.brandGate.cta', 'Зарегистрироваться как Бренд')}
            </button>
            <button
              onClick={() => { window.location.href = '/brand/signup?mode=login'; }}
              className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
              style={{ color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {t('marketplace.brandGate.loginLink', 'Уже есть аккаунт? Войти')}
            </button>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutPkg && (
        <CheckoutModal
          profile={profile}
          pkg={checkoutPkg}
          onClose={() => setCheckoutPkg(null)}
        />
      )}
    </div>
  );
}

export default PublicCreatorProfile;
