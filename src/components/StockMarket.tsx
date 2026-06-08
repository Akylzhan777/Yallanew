import { useState, useEffect, useRef, useCallback } from 'react';
import { Store, Upload, Download, Search, Play, Eye, ShoppingBag, Film, TrendingUp, DollarSign, X, BadgeCheck, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StockItem {
  id: string;
  seller_id: string;
  seller_name: string;
  title: string;
  category: string;
  description: string;
  price: number;
  preview_url: string;
  thumbnail_url: string;
  duration_seconds: number;
  resolution: string;
  views: number;
  sales_count: number;
  status: string;
  is_admin_global: boolean;
  original_link: string | null;
  created_at: string;
}

interface Transaction {
  id: string;
  footage_id: string;
  amount: number;
  payment_method: string;
  created_at: string;
  stock_footage?: StockItem;
}

const CATEGORIES = ['All', 'Drone', 'City', 'Interior', 'Nature', 'People', 'Food', 'Tech', 'Abstract', 'Lifestyle'];
const PLATFORM_FEE_RATE = 0.30;
const WATERMARK_CELLS = Array.from({ length: 24 });

type Tab = 'marketplace' | 'uploads' | 'purchased';

// ── Watermark Overlay ──
function WatermarkOverlay() {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-wrap justify-center items-center overflow-hidden select-none">
      {WATERMARK_CELLS.map((_, i) => (
        <span key={i} className="text-white/[0.15] font-bold text-sm whitespace-nowrap mx-4 my-3" style={{ transform: 'rotate(-35deg)' }}>
          YALLA PRODUCTION
        </span>
      ))}
    </div>
  );
}

// ── Video Card with Play-on-Hover ──
function VideoCard({ item, onClickCard, onBuy, buying }: {
  item: StockItem;
  onClickCard: () => void;
  onBuy: () => void;
  buying: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = useCallback(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  return (
    <div
      className="rounded-2xl overflow-hidden break-inside-avoid mb-4 group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-black/20"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Preview */}
      <div className="relative overflow-hidden" style={{ background: '#0a0f18' }} onClick={onClickCard}>
        {item.preview_url ? (
          <video
            ref={videoRef}
            src={item.preview_url}
            className="w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
            preload="metadata"
            muted
            loop
            playsInline
            controlsList="nodownload"
            onContextMenu={e => e.preventDefault()}
          />
        ) : (
          <div className="w-full aspect-video flex items-center justify-center">
            <Play size={24} style={{ color: '#1e293b' }} />
          </div>
        )}
        <WatermarkOverlay />
        {/* Tags */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 z-20">
          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase" style={{ background: 'rgba(0,0,0,0.7)', color: '#94a3b8', backdropFilter: 'blur(4px)' }}>
            {item.category}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold" style={{ background: 'rgba(0,0,0,0.7)', color: '#60a5fa', backdropFilter: 'blur(4px)' }}>
            {item.resolution}
          </span>
        </div>
        {item.duration_seconds > 0 && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold z-20 flex items-center gap-0.5" style={{ background: 'rgba(0,0,0,0.8)', color: '#e2e8f0' }}>
            <Clock size={8} />
            {Math.floor(item.duration_seconds / 60)}:{String(item.duration_seconds % 60).padStart(2, '0')}
          </div>
        )}
        {/* Play icon overlay — shown when NOT hovered */}
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-60 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <Play size={16} className="text-white ml-0.5" fill="white" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h4 className="text-[13px] font-semibold text-white truncate mb-1">{item.title}</h4>
        <div className="flex items-center gap-2.5 text-[10px] mb-3" style={{ color: '#64748b' }}>
          <span className="flex items-center gap-0.5">
            {item.is_admin_global ? 'Yalla Production' : item.seller_name || 'Creator'}
            {item.is_admin_global && <BadgeCheck size={10} style={{ color: '#f59e0b', flexShrink: 0 }} />}
          </span>
          <span className="flex items-center gap-0.5"><Eye size={9} /> {item.views}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold" style={{ color: '#00C48C' }}>{item.price}</span>
            <span className="text-[10px] ml-1" style={{ color: '#64748b' }}>AED</span>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onBuy(); }}
            disabled={buying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)', color: '#fff', border: '1px solid rgba(0,196,140,0.3)' }}>
            <ShoppingBag size={11} />
            {buying ? '...' : 'Buy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
export default function StockMarket({ creatorId, creatorName }: { creatorId: string; creatorName: string }) {
  const [tab, setTab] = useState<Tab>('marketplace');
  const [items, setItems] = useState<StockItem[]>([]);
  const [myUploads, setMyUploads] = useState<StockItem[]>([]);
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [buying, setBuying] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<StockItem | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentDownloadUrl, setPaymentDownloadUrl] = useState<string | null>(null);
  const [paymentFootageTitle, setPaymentFootageTitle] = useState('');

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Drone');
  const [uploadPrice, setUploadPrice] = useState(50);
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadResolution, setUploadResolution] = useState('4K');
  const [uploadDuration, setUploadDuration] = useState(10);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadData(); }, [tab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success' && params.get('type') === 'stock') {
      const txId = params.get('tx');
      setTab('purchased');
      setPaymentProcessing(true);
      setPaymentConfirmed(false);
      setPaymentDownloadUrl(null);

      const confirmAndPoll = async () => {
        if (txId) {
          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-purchase`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
              body: JSON.stringify({ action: 'confirm', transaction_id: txId }),
            });
          } catch { /* webhook will handle */ }
        }
        let confirmedTx: Transaction | null = null;
        for (let i = 0; i < 8; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const { data } = await supabase
            .from('stock_transactions')
            .select('*, stock_footage(*)')
            .eq('buyer_id', creatorId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false });
          if (data && data.length > 0) {
            setPurchases(data);
            confirmedTx = (txId ? data.find((t: Transaction) => t.id === txId) : null) || data[0];
            break;
          }
        }

        if (confirmedTx) {
          setPaymentFootageTitle(confirmedTx.stock_footage?.title || 'Your file');
          try {
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-purchase`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
              body: JSON.stringify({ action: 'download', footage_id: confirmedTx.footage_id, buyer_id: creatorId }),
            });
            const dlData = await res.json();
            if (dlData.url) setPaymentDownloadUrl(dlData.url);
          } catch { /* user can retry manually */ }
          setPaymentConfirmed(true);
        } else {
          setPaymentConfirmed(true);
        }
        setPaymentProcessing(false);
      };

      confirmAndPoll();
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    if (tab === 'marketplace') {
      const { data } = await supabase
        .from('stock_footage')
        .select('*')
        .or('status.eq.approved,is_admin_global.eq.true')
        .neq('seller_id', creatorId)
        .order('created_at', { ascending: false });
      setItems(data ?? []);
    } else if (tab === 'uploads') {
      const { data } = await supabase
        .from('stock_footage')
        .select('*')
        .eq('seller_id', creatorId)
        .order('created_at', { ascending: false });
      setMyUploads(data ?? []);
    } else {
      const { data, error } = await supabase
        .from('stock_transactions')
        .select('*, stock_footage(*)')
        .eq('buyer_id', creatorId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      if (error) console.error('Failed to load purchases:', error.message);
      setPurchases(data ?? []);
    }
    setLoading(false);
  };

  const filteredItems = items.filter(item => {
    const matchCat = category === 'All' || item.category === category;
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleUpload = async () => {
    if (!uploadTitle || !previewFile || !originalFile) return;
    setUploading(true);

    const ts = Date.now();
    const previewPath = `${creatorId}/${ts}-preview-${previewFile.name}`;
    const originalPath = `${creatorId}/${ts}-original-${originalFile.name}`;

    const [previewRes, originalRes] = await Promise.all([
      supabase.storage.from('stock-previews').upload(previewPath, previewFile),
      supabase.storage.from('stock-originals').upload(originalPath, originalFile),
    ]);

    if (previewRes.error || originalRes.error) {
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('stock-previews').getPublicUrl(previewPath);

    await supabase.from('stock_footage').insert({
      seller_id: creatorId,
      seller_name: creatorName,
      title: uploadTitle,
      category: uploadCategory,
      description: uploadDesc,
      price: uploadPrice,
      preview_url: publicUrl,
      original_path: originalPath,
      thumbnail_url: publicUrl,
      duration_seconds: uploadDuration,
      resolution: uploadResolution,
      status: 'pending_approval',
    });

    setUploadTitle(''); setUploadDesc(''); setUploadPrice(50); setPreviewFile(null); setOriginalFile(null);
    setShowUpload(false);
    setUploading(false);
    loadData();
  };

  const buyFootage = async (item: StockItem) => {
    setBuying(item.id);
    setBuyError(null);
    try {
      // Get current user session token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          footage_id: item.id,
          buyer_id: creatorId,
          seller_id: item.seller_id,
          amount: item.price,
          return_url: window.location.pathname,
        }),
      });

      const data = await res.json().catch(() => ({ error: `Server returned ${res.status}` }));

      if (!res.ok) {
        const errMsg = data.error || `Server error (${res.status})`;
        setBuyError(errMsg);
        setTimeout(() => setBuyError(null), 8000);
        setBuying(null);
        return;
      }

      // Server returned 200 but with an error field
      if (data.error && !data.already_owned) {
        setBuyError(data.error);
        setTimeout(() => setBuyError(null), 8000);
        setBuying(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.already_owned) {
        setTab('purchased');
        setPreviewItem(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setBuyError(`Request failed: ${msg}`);
      setTimeout(() => setBuyError(null), 8000);
    }
    setBuying(null);
  };

  const downloadPurchase = async (tx: Transaction) => {
    const footage = tx.stock_footage;
    if (!footage) {
      setBuyError('Download link not found');
      setTimeout(() => setBuyError(null), 5000);
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: 'download', footage_id: footage.id, buyer_id: creatorId }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        setBuyError(data.error || 'Download link not found');
        setTimeout(() => setBuyError(null), 5000);
      }
    } catch {
      setBuyError('Failed to get download link');
      setTimeout(() => setBuyError(null), 5000);
    }
  };

  const totalEarnings = myUploads.reduce((s, u) => s + u.sales_count * u.price * (1 - PLATFORM_FEE_RATE), 0);
  const totalViews = myUploads.reduce((s, u) => s + u.views, 0);
  const totalSales = myUploads.reduce((s, u) => s + u.sales_count, 0);

  return (
    <div className="space-y-5">
      {/* Error Toast */}
      {buyError && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl text-sm font-medium shadow-xl animate-[fadeInUp_0.3s_ease-out]"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', backdropFilter: 'blur(12px)' }}>
          {buyError}
        </div>
      )}

      {/* ── Pexels-style Preview Modal ── */}
      {previewItem && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setPreviewItem(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
          <div
            className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden animate-[fadeInUp_0.25s_ease-out]"
            style={{ background: 'rgba(15,21,32,0.95)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button onClick={() => setPreviewItem(null)} className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <X size={18} className="text-white" />
            </button>

            <div className="flex flex-col lg:flex-row">
              {/* Video */}
              <div className="relative flex-1 bg-black">
                {previewItem.preview_url ? (
                  <video
                    src={previewItem.preview_url}
                    className="w-full max-h-[55vh] lg:max-h-[80vh] object-contain"
                    autoPlay muted loop playsInline
                    controlsList="nodownload"
                    onContextMenu={e => e.preventDefault()}
                  />
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center">
                    <Play size={48} className="text-gray-700" />
                  </div>
                )}
                <WatermarkOverlay />
              </div>

              {/* Info Sidebar */}
              <div className="lg:w-[320px] p-6 flex flex-col gap-5">
                <div>
                  <h2 className="text-lg font-bold text-white mb-2">{previewItem.title}</h2>
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
                    <span className="flex items-center gap-1">
                      {previewItem.is_admin_global ? 'Yalla Production' : previewItem.seller_name || 'Creator'}
                      {previewItem.is_admin_global && <BadgeCheck size={12} style={{ color: '#f59e0b' }} />}
                    </span>
                  </div>
                </div>

                {previewItem.description && (
                  <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{previewItem.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#475569' }}>Category</div>
                    <div className="text-xs font-semibold text-white">{previewItem.category}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#475569' }}>Resolution</div>
                    <div className="text-xs font-semibold text-white">{previewItem.resolution}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#475569' }}>Duration</div>
                    <div className="text-xs font-semibold text-white">
                      {previewItem.duration_seconds > 0
                        ? `${Math.floor(previewItem.duration_seconds / 60)}:${String(previewItem.duration_seconds % 60).padStart(2, '0')}`
                        : '—'}
                    </div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#475569' }}>Views</div>
                    <div className="text-xs font-semibold text-white">{previewItem.views}</div>
                  </div>
                </div>

                <div className="mt-auto pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold" style={{ color: '#00C48C' }}>{previewItem.price}</span>
                    <span className="text-sm" style={{ color: '#64748b' }}>AED</span>
                  </div>
                  <button
                    onClick={() => buyFootage(previewItem)}
                    disabled={buying === previewItem.id}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)', color: '#fff', border: '1px solid rgba(0,196,140,0.3)', boxShadow: '0 8px 32px rgba(0,196,140,0.15)' }}>
                    <ShoppingBag size={16} />
                    {buying === previewItem.id ? 'Processing...' : `Buy Now for ${previewItem.price} AED`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Stock Footage Market</h3>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Buy and sell professional footage clips</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {([
          { id: 'marketplace' as Tab, icon: <Store size={14} />, label: 'Marketplace' },
          { id: 'uploads' as Tab, icon: <Upload size={14} />, label: 'My Uploads' },
          { id: 'purchased' as Tab, icon: <Download size={14} />, label: 'Purchased' },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: tab === t.id ? 'rgba(0,196,140,0.1)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${tab === t.id ? 'rgba(0,196,140,0.25)' : 'rgba(255,255,255,0.06)'}`,
              color: tab === t.id ? '#00C48C' : '#64748b',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* MARKETPLACE TAB */}
      {tab === 'marketplace' && (
        <div className="space-y-4">
          {/* Search + Filters */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search footage..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-transparent text-white outline-none"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap"
                style={{
                  background: category === cat ? 'rgba(0,196,140,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${category === cat ? 'rgba(0,196,140,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  color: category === cat ? '#00C48C' : '#64748b',
                }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Masonry Grid */}
          {loading ? (
            <div className="text-center py-12"><span className="text-xs" style={{ color: '#475569' }}>Loading...</span></div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Film size={32} style={{ color: '#1e293b', margin: '0 auto 12px' }} />
              <p className="text-sm" style={{ color: '#475569' }}>No footage available yet</p>
              <p className="text-xs mt-1" style={{ color: '#334155' }}>Be the first to upload and sell your clips</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
              {filteredItems.map(item => (
                <VideoCard
                  key={item.id}
                  item={item}
                  onClickCard={() => setPreviewItem(item)}
                  onBuy={() => buyFootage(item)}
                  buying={buying === item.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* MY UPLOADS TAB */}
      {tab === 'uploads' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'rgba(0,196,140,0.05)', border: '1px solid rgba(0,196,140,0.12)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#475569' }}>Earnings</div>
              <div className="text-lg font-bold text-white">{Math.round(totalEarnings)}<span className="text-xs ml-1 font-normal" style={{ color: '#475569' }}>AED</span></div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.12)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#475569' }}>Views</div>
              <div className="text-lg font-bold text-white">{totalViews}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#475569' }}>Sales</div>
              <div className="text-lg font-bold text-white">{totalSales}</div>
            </div>
          </div>

          {/* Upload button */}
          <button onClick={() => setShowUpload(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'rgba(0,196,140,0.08)', border: '1px dashed rgba(0,196,140,0.3)', color: '#00C48C' }}>
            <Upload size={16} /> Upload New Footage
          </button>

          {/* Upload form */}
          {showUpload && (
            <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Upload Footage</h4>
                <button onClick={() => setShowUpload(false)}><X size={16} style={{ color: '#64748b' }} /></button>
              </div>

              <div className="grid gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Title</label>
                  <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="e.g. Dubai Marina Aerial Sunset"
                    className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Category</label>
                    <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#0f1520' }}>
                      {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Price (AED)</label>
                    <input type="number" value={uploadPrice} onChange={e => setUploadPrice(+e.target.value)} min={10} step={10}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Resolution</label>
                    <select value={uploadResolution} onChange={e => setUploadResolution(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#0f1520' }}>
                      <option value="4K">4K</option>
                      <option value="1080p">1080p</option>
                      <option value="6K">6K</option>
                      <option value="ProRes">ProRes</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Description (optional)</label>
                  <textarea value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} rows={2} placeholder="Color grading, framerate, location..."
                    className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent text-white outline-none resize-none" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Duration (seconds)</label>
                  <input type="number" value={uploadDuration} onChange={e => setUploadDuration(+e.target.value)} min={1}
                    className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Preview (watermarked)</label>
                    <label className="flex items-center justify-center gap-2 py-6 rounded-xl cursor-pointer transition-all"
                      style={{ border: '1px dashed rgba(255,255,255,0.12)', background: previewFile ? 'rgba(0,196,140,0.05)' : 'transparent' }}>
                      <input type="file" accept="video/*,image/*" className="hidden" onChange={e => setPreviewFile(e.target.files?.[0] || null)} />
                      <Upload size={14} style={{ color: previewFile ? '#00C48C' : '#475569' }} />
                      <span className="text-xs" style={{ color: previewFile ? '#00C48C' : '#475569' }}>
                        {previewFile ? previewFile.name.slice(0, 20) : 'Choose file'}
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Original (high quality)</label>
                    <label className="flex items-center justify-center gap-2 py-6 rounded-xl cursor-pointer transition-all"
                      style={{ border: '1px dashed rgba(255,255,255,0.12)', background: originalFile ? 'rgba(96,165,250,0.05)' : 'transparent' }}>
                      <input type="file" accept="video/*" className="hidden" onChange={e => setOriginalFile(e.target.files?.[0] || null)} />
                      <Upload size={14} style={{ color: originalFile ? '#60a5fa' : '#475569' }} />
                      <span className="text-xs" style={{ color: originalFile ? '#60a5fa' : '#475569' }}>
                        {originalFile ? originalFile.name.slice(0, 20) : 'Choose file'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-3" style={{ background: 'rgba(0,196,140,0.04)', border: '1px solid rgba(0,196,140,0.12)' }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#64748b' }}>You receive per sale (70%)</span>
                  <span className="font-bold" style={{ color: '#00C48C' }}>{Math.round(uploadPrice * 0.7)} AED</span>
                </div>
                <div className="text-[10px] mt-1" style={{ color: '#334155' }}>Platform commission: 30%</div>
              </div>

              <button onClick={handleUpload} disabled={uploading || !uploadTitle || !previewFile || !originalFile}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)', color: '#fff', border: '1px solid rgba(0,196,140,0.3)' }}>
                {uploading ? 'Uploading...' : 'Publish Footage'}
              </button>
            </div>
          )}

          {/* My uploads list */}
          {loading ? (
            <div className="text-center py-8"><span className="text-xs" style={{ color: '#475569' }}>Loading...</span></div>
          ) : myUploads.length === 0 && !showUpload ? (
            <div className="text-center py-10">
              <Film size={28} style={{ color: '#1e293b', margin: '0 auto 10px' }} />
              <p className="text-xs" style={{ color: '#475569' }}>You haven't uploaded any footage yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myUploads.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#0a0f18' }}>
                    {item.preview_url ? (
                      <img src={item.preview_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Play size={12} style={{ color: '#1e293b' }} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{item.title}</div>
                    <div className="text-[10px]" style={{ color: '#475569' }}>{item.category} · {item.resolution}</div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-[10px]" style={{ color: '#475569' }}>
                    <span className="flex items-center gap-0.5"><Eye size={9} /> {item.views}</span>
                    <span className="flex items-center gap-0.5"><TrendingUp size={9} /> {item.sales_count}</span>
                    <span className="font-bold" style={{ color: '#00C48C' }}>{item.price} AED</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PURCHASED TAB */}
      {tab === 'purchased' && (
        <div className="space-y-3">
          {(paymentProcessing || paymentConfirmed) && (
            <div className="relative rounded-3xl overflow-hidden p-10 text-center" style={{ background: 'rgba(15,21,32,0.6)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
              {!paymentConfirmed ? (
                <div className="flex flex-col items-center gap-5 py-6">
                  <div className="w-14 h-14 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'rgba(0,196,140,0.3)', borderTopColor: 'transparent' }} />
                  <div>
                    <p className="text-lg font-bold text-white">Confirming your payment...</p>
                    <p className="text-sm mt-2" style={{ color: '#64748b' }}>Please wait, processing securely.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5 py-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,196,140,0.12)', border: '2px solid rgba(0,196,140,0.3)' }}>
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#00C48C" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">Payment Successful!</p>
                    {paymentFootageTitle && (
                      <p className="text-sm mt-1.5" style={{ color: '#94a3b8' }}>{paymentFootageTitle}</p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 w-full max-w-xs">
                    {paymentDownloadUrl ? (
                      <button
                        onClick={() => {
                          window.open(paymentDownloadUrl, '_blank');
                          window.history.replaceState({}, '', window.location.pathname);
                          setPaymentConfirmed(false);
                          setPaymentDownloadUrl(null);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #00C48C, #00a876)', boxShadow: '0 4px 20px rgba(0,196,140,0.3)' }}
                      >
                        <Download size={16} /> Download Source File
                      </button>
                    ) : (
                      <p className="text-xs" style={{ color: '#64748b' }}>No download link available for this file.</p>
                    )}
                    <button
                      onClick={() => {
                        window.history.replaceState({}, '', window.location.pathname);
                        setPaymentConfirmed(false);
                        setPaymentDownloadUrl(null);
                        loadData();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                      style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                    >
                      Back to Purchases
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {loading && !paymentProcessing && !paymentConfirmed ? (
            <div className="text-center py-8"><span className="text-xs" style={{ color: '#475569' }}>Loading...</span></div>
          ) : !paymentProcessing && !paymentConfirmed && purchases.length === 0 ? (
            <div className="text-center py-12">
              <Download size={32} style={{ color: '#1e293b', margin: '0 auto 12px' }} />
              <p className="text-sm" style={{ color: '#475569' }}>No purchases yet</p>
              <p className="text-xs mt-1" style={{ color: '#334155' }}>Browse the marketplace to find footage</p>
            </div>
          ) : (paymentProcessing || paymentConfirmed) ? null : purchases.map(tx => {
            const footage = tx.stock_footage;
            return (
              <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#0a0f18' }}>
                  {footage?.preview_url ? (
                    <img src={footage.preview_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Play size={12} style={{ color: '#1e293b' }} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{footage?.title || 'Footage'}</div>
                  <div className="text-[10px]" style={{ color: '#475569' }}>
                    {footage?.category} · {footage?.resolution} · Paid {tx.amount} AED
                  </div>
                </div>
                <button onClick={() => downloadPurchase(tx)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(0,196,140,0.1)', border: '1px solid rgba(0,196,140,0.2)', color: '#00C48C' }}>
                  <Download size={12} /> Download
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
