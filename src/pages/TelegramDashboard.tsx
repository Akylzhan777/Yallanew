import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, BarChart2, Package, LogOut, ExternalLink, CreditCard as Edit3, Users, Eye, TrendingUp, ChevronRight, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCreatorAuth, CreatorPackage } from '../context/CreatorAuthContext';
import { useRegion } from '../context/RegionContext';

type Tab = 'stats' | 'packages' | 'orders' | 'mediakit';

interface Order {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  package_name?: string;
  client_name?: string;
  brand?: string;
}

export default function TelegramDashboard() {
  const { t } = useTranslation();
  const { creatorProfile, signOut } = useCreatorAuth();
  const { config: regionConfig } = useRegion();
  const currency = regionConfig.currency;
  const [tab, setTab] = useState<Tab>('stats');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (tab !== 'orders') return;
    setLoadingOrders(true);
    (async () => {
      if (!creatorProfile?.id) { setLoadingOrders(false); return; }
      const { data } = await supabase
        .from('marketplace_orders')
        .select('id, status, total_price, created_at, package_name, client_name, brand')
        .eq('creator_id', creatorProfile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setOrders((data as Order[]) ?? []);
      setLoadingOrders(false);
    })();
  }, [tab, creatorProfile?.id]);

  const profile = creatorProfile as Record<string, unknown> | null;
  const tgUrl = (profile?.tg_channel_url as string) ?? '';
  const subscribers = (profile?.tg_subscribers as number) ?? 0;
  const uniqueReach = (profile?.tg_unique_reach as number) ?? 0;
  const monthlyImpressions = (profile?.tg_monthly_impressions as number) ?? 0;
  const audienceProfile = (profile?.audience_profile as Record<string, string>) ?? {};
  const packages = (profile?.packages as CreatorPackage[]) ?? [];
  const username = (profile?.username as string) ?? '';
  const displayName = (profile?.display_name as string) ?? '';
  const avatarUrl = (profile?.avatar_url as string) ?? '';
  const bio = (profile?.bio as string) ?? '';
  const category = (profile?.category as string) ?? '';

  const statCards = [
    { icon: <Users size={18} />, label: t('tgDashboard.subscribers'), value: subscribers.toLocaleString(), color: '#38bdf8' },
    { icon: <Eye size={18} />, label: t('tgDashboard.uniqueReach'), value: uniqueReach.toLocaleString(), color: '#00C48C' },
    { icon: <TrendingUp size={18} />, label: t('tgDashboard.monthlyImpressions'), value: monthlyImpressions.toLocaleString(), color: '#f59e0b' },
  ];

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'stats', label: t('tgDashboard.stats'), icon: <BarChart2 size={15} /> },
    { key: 'packages', label: t('tgDashboard.adFormats'), icon: <Package size={15} /> },
    { key: 'orders', label: t('tgDashboard.orders'), icon: <Send size={15} /> },
    { key: 'mediakit', label: t('tgDashboard.mediaKit'), icon: <Star size={15} /> },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#080d16' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(8,13,22,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="w-8 h-8 rounded-xl object-cover flex-shrink-0" />
            : <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)' }}><Send size={14} style={{ color: '#38bdf8' }} /></div>
          }
          <div>
            <div className="text-sm font-bold text-white leading-tight">{displayName || t('tgDashboard.title')}</div>
            {username && <div className="text-xs" style={{ color: '#475569' }}>@{username}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tgUrl && (
            <a href={tgUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: 'rgba(56,189,248,0.08)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}>
              <ExternalLink size={12} /> {t('tgDashboard.channel')}
            </a>
          )}
          <a href={`/${username}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Eye size={12} /> {t('tgDashboard.viewPublic')}
          </a>
          <button
            onClick={() => signOut()}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
            onMouseLeave={e => e.currentTarget.style.color = '#475569'}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="mx-4 mt-4 rounded-2xl p-4 flex items-center gap-4" style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)' }}>
        {avatarUrl
          ? <img src={avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
          : <div className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)' }}><Send size={24} style={{ color: '#38bdf8' }} /></div>
        }
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white">{displayName}</div>
          {username && <div className="text-xs mt-0.5" style={{ color: '#38bdf8' }}>@{username}</div>}
          {category && <div className="text-xs mt-1 capitalize" style={{ color: '#475569' }}>{category}</div>}
          {bio && <p className="text-xs mt-1.5 line-clamp-2" style={{ color: '#64748b' }}>{bio}</p>}
        </div>
        <a href="/creator-onboarding"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Edit3 size={12} /> {t('tgDashboard.editProfile')}
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 mt-4 overflow-x-auto scrollbar-none">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0 transition-all"
            style={{
              background: tab === tb.key ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.03)',
              color: tab === tb.key ? '#38bdf8' : '#475569',
              border: `1px solid ${tab === tb.key ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}>
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-16 max-w-2xl">

        {/* Stats tab */}
        {tab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {statCards.map(s => (
                <div key={s.label} className="rounded-xl p-4 flex flex-col items-center text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `rgba(${s.color === '#38bdf8' ? '56,189,248' : s.color === '#00C48C' ? '0,196,140' : '245,158,11'},0.12)`, color: s.color }}>
                    {s.icon}
                  </div>
                  <div className="text-lg font-bold text-white">{s.value || '—'}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Audience profile */}
            {Object.keys(audienceProfile).length > 0 && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>{t('tgDashboard.audienceProfile')}</div>
                {Object.entries(audienceProfile).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span style={{ color: '#475569', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-white">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {tgUrl && (
              <a href={tgUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl transition-all group"
                style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)' }}>
                <div className="flex items-center gap-3">
                  <Send size={18} style={{ color: '#38bdf8' }} />
                  <div>
                    <div className="text-sm font-semibold text-white">{t('tgDashboard.channel')}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#38bdf8' }}>{tgUrl}</div>
                  </div>
                </div>
                <ExternalLink size={14} style={{ color: '#38bdf8' }} />
              </a>
            )}
          </div>
        )}

        {/* Ad Formats tab */}
        {tab === 'packages' && (
          <div className="space-y-3">
            {packages.length === 0 ? (
              <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-sm" style={{ color: '#475569' }}>{t('tgDashboard.noOrders')}</p>
              </div>
            ) : packages.map((pkg, i) => (
              <div key={pkg.id ?? i} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(56,189,248,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-sm font-bold text-white">{pkg.name}</span>
                  <span className="text-sm font-bold" style={{ color: '#00C48C' }}>{pkg.price.toLocaleString()} {currency}</span>
                </div>
                <div className="p-4 space-y-2">
                  {pkg.description && <p className="text-xs" style={{ color: '#64748b' }}>{pkg.description}</p>}
                  {pkg.includes?.filter(Boolean).length > 0 && (
                    <ul className="space-y-1">
                      {pkg.includes.filter(Boolean).map((inc, j) => (
                        <li key={j} className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
                          <ChevronRight size={10} style={{ color: '#38bdf8', flexShrink: 0 }} /> {inc}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center gap-4 pt-1">
                    <span className="text-xs" style={{ color: '#475569' }}>{pkg.deliveryDays}d delivery</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          <div className="space-y-3">
            {loadingOrders ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Send size={28} className="mx-auto mb-3" style={{ color: '#1e293b' }} />
                <p className="text-sm font-medium" style={{ color: '#475569' }}>{t('tgDashboard.noOrders')}</p>
                <p className="text-xs mt-1" style={{ color: '#374151' }}>{t('tgDashboard.ordersDesc')}</p>
              </div>
            ) : orders.map(order => (
              <div key={order.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{order.client_name || order.brand || 'Brand'}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{order.package_name}</div>
                    <div className="text-xs mt-1" style={{ color: '#374151' }}>{new Date(order.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold" style={{ color: '#00C48C' }}>{order.total_price?.toLocaleString()} {currency}</div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: order.status === 'paid' ? 'rgba(0,196,140,0.12)' : order.status === 'completed' ? 'rgba(56,189,248,0.12)' : 'rgba(251,191,36,0.1)',
                        color: order.status === 'paid' ? '#00C48C' : order.status === 'completed' ? '#38bdf8' : '#fbbf24',
                      }}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Media Kit tab */}
        {tab === 'mediakit' && (
          <div className="space-y-4">
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>{t('tgDashboard.trustedBy')}</div>
              <p className="text-xs" style={{ color: '#374151' }}>
                {t('tgOnboarding.portfolio.trustedByNote')}
              </p>
            </div>

            {/* Channel stats card — shareable media kit */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d1a2e, #071220)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    : <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.15)' }}><Send size={20} style={{ color: '#38bdf8' }} /></div>
                  }
                  <div>
                    <div className="font-bold text-white">{displayName}</div>
                    <div className="text-xs" style={{ color: '#38bdf8' }}>{category}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {statCards.map(s => (
                    <div key={s.label}>
                      <div className="text-base font-bold" style={{ color: s.color }}>{(s.value && s.value !== '0') ? s.value : '—'}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
