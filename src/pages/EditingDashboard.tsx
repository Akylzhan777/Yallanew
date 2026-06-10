import { useState, useEffect, useRef } from 'react';
import { LogOut, Briefcase, ListChecks, Wallet, Clock, Check, Play, ExternalLink, MessageSquare, X, DollarSign, LayoutDashboard, TrendingUp, Zap, MessageCircle, ChevronRight, Search, ArrowLeft, Film, Images, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCreatorAuth } from '../context/CreatorAuthContext';
import OrderChat from '../components/OrderChat';
import DealMessenger from '../components/DealMessenger';
import StockMarket from '../components/StockMarket';

interface EditorProfile {
  id: string;
  user_id: string;
  display_name: string;
  balance: number;
  rating: number;
  completed_count: number;
}

interface EditingOrder {
  id: string;
  order_number: number;
  title: string;
  video_type: string;
  source_link: string;
  brief: string;
  deadline: string | null;
  budget: number;
  editor_payout: number;
  status: string;
  editor_id: string | null;
  result_link: string;
  preview_link: string;
  created_at: string;
}

type Tab = 'overview' | 'available' | 'tasks' | 'messages' | 'wallet' | 'stock' | 'portfolio';

interface PortfolioItem {
  url: string;
  type: 'image' | 'video';
  title?: string;
  videoId?: string;
}

interface EditorDealChat {
  id: string;
  order_id: string;
  client_id: string;
  freelancer_id: string;
  status: string;
  created_at: string;
  client_name?: string;
  order_package_name?: string;
  order_status?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: 'Available', color: '#fbbf24' },
  assigned: { label: 'Assigned', color: '#60a5fa' },
  in_progress: { label: 'In Progress', color: '#f97316' },
  review: { label: 'Under Review', color: '#a78bfa' },
  revision: { label: 'Revision Needed', color: '#fb923c' },
  completed: { label: 'Completed', color: '#00C48C' },
};

export default function EditingDashboard() {
  const { session, user, signOut } = useCreatorAuth();
  const [editorProfile, setEditorProfile] = useState<EditorProfile | null>(null);
  const [realName, setRealName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [availableJobs, setAvailableJobs] = useState<EditingOrder[]>([]);
  const [myTasks, setMyTasks] = useState<EditingOrder[]>([]);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [resultLink, setResultLink] = useState('');
  const [dealChats, setDealChats] = useState<EditorDealChat[]>([]);
  const [activeDealChatId, setActiveDealChatId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState('');

  // Payout request state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'crypto' | 'cash'>('bank');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutRequests, setPayoutRequests] = useState<{ id: string; amount: number; payment_method: string; status: string; created_at: string }[]>([]);

  // Portfolio state
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    loadProfile();
    supabase.from('creator_profiles').select('display_name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.display_name) setRealName(data.display_name); });
  }, [user]);

  useEffect(() => {
    if (!editorProfile) return;
    loadJobs();
  }, [editorProfile]);

  useEffect(() => {
    if (!user) return;
    supabase.from('payout_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setPayoutRequests(data); });
  }, [user]);

  async function submitPayoutRequest() {
    if (!user || !editorProfile) return;
    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt < 100 || amt > editorProfile.balance) return;
    setPayoutSubmitting(true);
    const { error } = await supabase.from('payout_requests').insert({ user_id: user.id, amount: amt, payment_method: payoutMethod, details: payoutDetails });
    if (!error) {
      await supabase.from('creator_profiles').update({ balance_available: editorProfile.balance - amt }).eq('user_id', user.id);
      await loadProfile();
      const { data } = await supabase.from('payout_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setPayoutRequests(data);
      setShowPayoutModal(false);
      setPayoutAmount('');
      setPayoutDetails('');
    }
    setPayoutSubmitting(false);
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: chatRows } = await supabase
        .from('deal_chats')
        .select('*')
        .eq('freelancer_id', user.id)
        .order('created_at', { ascending: false });
      if (chatRows && chatRows.length > 0) {
        const clientIds = [...new Set(chatRows.map((c: EditorDealChat) => c.client_id))];
        const orderIds = chatRows.map((c: EditorDealChat) => c.order_id);
        const [{ data: cpRows }, { data: orderRows }] = await Promise.all([
          supabase.from('client_profiles').select('user_id, display_name').in('user_id', clientIds),
          supabase.from('marketplace_orders').select('id, package_name, status').in('id', orderIds),
        ]);
        const nameMap = new Map((cpRows ?? []).map((p: { user_id: string; display_name: string }) => [p.user_id, p.display_name]));
        const orderMap = new Map((orderRows ?? []).map((o: { id: string; package_name: string; status: string }) => [o.id, o]));
        setDealChats(chatRows.map((c: EditorDealChat) => ({
          ...c,
          client_name: nameMap.get(c.client_id) ?? 'Client',
          order_package_name: orderMap.get(c.order_id)?.package_name ?? 'Order',
          order_status: orderMap.get(c.order_id)?.status ?? 'paid',
        })));
      }
    })();
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('editing_editor_profiles')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();
    setEditorProfile(data);
    if (data?.portfolio_items) {
      setPortfolioItems(data.portfolio_items as PortfolioItem[]);
    }
    setLoading(false);
  };

  const loadJobs = async () => {
    const { data: available } = await supabase
      .from('editing_orders')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    setAvailableJobs(available ?? []);

    const { data: tasks } = await supabase
      .from('editing_orders')
      .select('*')
      .eq('editor_id', editorProfile!.id)
      .in('status', ['assigned', 'in_progress', 'review', 'revision', 'completed'])
      .order('created_at', { ascending: false });
    setMyTasks(tasks ?? []);
  };

  const claimJob = async (orderId: string) => {
    if (!editorProfile) return;
    await supabase.from('editing_orders').update({ editor_id: editorProfile.id, status: 'assigned' }).eq('id', orderId);
    loadJobs();
  };

  const startWork = async (orderId: string) => {
    await supabase.from('editing_orders').update({ status: 'in_progress' }).eq('id', orderId);
    loadJobs();
  };

  const submitForReview = async (orderId: string) => {
    if (!resultLink.trim()) return;
    await supabase.from('editing_orders').update({ status: 'review', preview_link: resultLink, result_link: resultLink }).eq('id', orderId);
    setResultLink('');
    loadJobs();
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !editorProfile) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPortfolioError(null);
    const VIDEO_MAX = 1024 * 1024 * 1024;
    const IMAGE_MAX = 50 * 1024 * 1024;
    const badVideo = files.find(f => f.type.startsWith('video') && f.size > VIDEO_MAX);
    if (badVideo) {
      setPortfolioError(`Видео "${badVideo.name}" больше 1 ГБ.`);
      e.target.value = '';
      return;
    }
    const badImage = files.find(f => f.type.startsWith('image') && f.size > IMAGE_MAX);
    if (badImage) {
      setPortfolioError(`Изображение "${badImage.name}" больше 50 МБ.`);
      e.target.value = '';
      return;
    }
    setPortfolioUploading(true);
    const newItems: PortfolioItem[] = [...portfolioItems];
    const failed: string[] = [];
    const authSession = await supabase.auth.getSession();
    const accessToken = authSession.data.session?.access_token ?? '';
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    for (const file of files) {
      const isVideo = file.type.startsWith('video');
      if (isVideo) {
        // Upload via Bunny Stream: create video slot → PUT file directly to Bunny
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/bunny-upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
            },
            body: JSON.stringify({ title: file.name }),
          });
          if (!res.ok) {
            const msg = await res.text();
            throw new Error(`bunny-upload: ${msg}`);
          }
          const { videoId, libraryId, apiKey } = await res.json() as { videoId: string; libraryId: number; apiKey: string };
          // PUT the file directly browser → Bunny (no server in the middle)
          const putRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
            method: 'PUT',
            headers: { AccessKey: apiKey },
            body: file,
          });
          if (!putRes.ok) {
            const msg = await putRes.text();
            throw new Error(`Bunny PUT: ${msg}`);
          }
          newItems.push({
            url: `https://iframe.mediadelivery.net/embed/679977/${videoId}`,
            type: 'video',
            title: file.name,
            videoId,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('Bunny upload error:', msg);
          failed.push(`${file.name}: ${msg}`);
        }
      } else {
        // Images — keep Supabase Storage TUS upload
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
        const fname = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const objectPath = `${user.id}/${fname}`;
        try {
          const uploadUrl = `${supabaseUrl}/storage/v1/upload/resumable`;
          const chunkSize = 6 * 1024 * 1024;
          const createRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
              'Content-Type': 'application/offset+octet-stream',
              'Upload-Length': String(file.size),
              'Upload-Metadata': [
                `filename ${btoa(fname)}`,
                `bucketName ${btoa('editor-portfolio')}`,
                `objectName ${btoa(objectPath)}`,
                `contentType ${btoa(file.type || 'application/octet-stream')}`,
                `cacheControl ${btoa('3600')}`,
              ].join(','),
              'Tus-Resumable': '1.0.0',
            },
          });
          if (!createRes.ok) {
            const msg = await createRes.text();
            throw new Error(msg);
          }
          const location = createRes.headers.get('Location') ?? '';
          let offset = 0;
          while (offset < file.size) {
            const chunk = file.slice(offset, offset + chunkSize);
            const patchRes = await fetch(location, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
                'Content-Type': 'application/offset+octet-stream',
                'Upload-Offset': String(offset),
                'Tus-Resumable': '1.0.0',
              },
              body: chunk,
            });
            if (!patchRes.ok) {
              const msg = await patchRes.text();
              throw new Error(msg);
            }
            offset += chunkSize;
          }
          const { data: urlData } = supabase.storage.from('editor-portfolio').getPublicUrl(objectPath);
          newItems.push({ url: urlData.publicUrl, type: 'image', title: file.name });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('Portfolio image upload error:', msg);
          failed.push(`${file.name}: ${msg}`);
        }
      }
    }
    if (newItems.length !== portfolioItems.length) {
      await supabase.from('editing_editor_profiles').update({ portfolio_items: newItems }).eq('user_id', user.id);
      await supabase.from('creator_profiles').update({ portfolio_items: newItems }).eq('user_id', user.id);
      setPortfolioItems(newItems);
    }
    if (failed.length) {
      setPortfolioError(`Не удалось загрузить: ${failed.join(' · ')}`);
    }
    setPortfolioUploading(false);
    e.target.value = '';
  };

  const removePortfolioItem = async (index: number) => {
    if (!user) return;
    const updated = portfolioItems.filter((_, i) => i !== index);
    await supabase.from('editing_editor_profiles').update({ portfolio_items: updated }).eq('user_id', user.id);
    await supabase.from('creator_profiles').update({ portfolio_items: updated }).eq('user_id', user.id);
    setPortfolioItems(updated);
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B101B]">
        <div className="text-center">
          <p className="text-sm text-gray-400">Please log in to access the Editor Dashboard</p>
          <a href="/creator-login" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Log In
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B101B]">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!editorProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B101B]">
        <div className="text-center max-w-sm px-4">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-red-500/10 border border-red-500/20">
            <X size={24} className="text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Not an Editor</h2>
          <p className="text-xs text-gray-500">Your account is not registered as an editor. Contact admin to get access.</p>
          <button onClick={signOut} className="mt-6 px-5 py-2.5 rounded-xl text-xs font-medium bg-white/[0.04] text-gray-400 border border-white/10">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (chatOrderId) {
    const order = myTasks.find(o => o.id === chatOrderId);
    return (
      <div className="min-h-screen p-4 sm:p-6 bg-[#0B101B]">
        <div className="max-w-2xl mx-auto space-y-4">
          <button onClick={() => setChatOrderId(null)} className="flex items-center gap-2 text-xs font-medium text-gray-400">
            <ArrowLeft size={14} /> Back to Tasks
          </button>
          <div className="rounded-xl p-3 bg-white/[0.03] border border-white/10">
            <div className="text-sm font-bold text-white">Order #{order?.order_number}</div>
            <div className="text-xs mt-0.5 text-gray-500">Chat with client</div>
          </div>
          <OrderChat orderId={chatOrderId} senderRole="editor" senderId={editorProfile.id} />
        </div>
      </div>
    );
  }

  const activeJobs = myTasks.filter(t => ['assigned', 'in_progress', 'review', 'revision'].includes(t.status));
  const completedJobs = myTasks.filter(t => t.status === 'completed');
  const totalEarned = completedJobs.reduce((s, t) => s + t.editor_payout, 0);

  const navItems = [
    { id: 'overview' as Tab, icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { id: 'available' as Tab, icon: <Briefcase size={20} />, label: 'Job Board' },
    { id: 'tasks' as Tab, icon: <ListChecks size={20} />, label: 'My Tasks' },
    { id: 'messages' as Tab, icon: <MessageCircle size={20} />, label: 'Messages' },
    { id: 'stock' as Tab, icon: <Film size={20} />, label: 'Stock' },
    { id: 'portfolio' as Tab, icon: <Images size={20} />, label: 'Portfolio' },
    { id: 'wallet' as Tab, icon: <Wallet size={20} />, label: 'Wallet' },
  ];

  const filteredChats = dealChats.filter(c =>
    !chatSearch || (c.client_name ?? '').toLowerCase().includes(chatSearch.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B101B]">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-[88px] flex-shrink-0 items-center py-6 border-r border-white/[0.05] bg-white/[0.02] backdrop-blur-2xl fixed left-0 top-0 h-full z-50">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/[0.06] border border-white/10 mb-8">
          <ListChecks size={18} className="text-blue-400" />
        </div>

        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setTab(item.id); setActiveDealChatId(null); }}
              className="group relative w-full flex flex-col items-center gap-1 py-3 rounded-2xl transition-all duration-300"
              style={{
                background: tab === item.id ? 'rgba(96,165,250,0.08)' : 'transparent',
              }}>
              {tab === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full bg-blue-400" />
              )}
              <span style={{ color: tab === item.id ? '#60a5fa' : '#475569' }} className="transition-colors duration-200">
                {item.icon}
              </span>
              <span className="text-[10px] font-medium transition-colors duration-200"
                style={{ color: tab === item.id ? '#60a5fa' : '#475569' }}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <button onClick={signOut} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/[0.06] mt-auto transition-colors hover:bg-white/[0.06]">
          <LogOut size={16} className="text-gray-500" />
        </button>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto h-full md:ml-[88px] pb-24 md:pb-0">
        {/* Top Header */}
        <header className="sticky top-0 z-40 px-4 sm:px-8 py-4 flex items-center justify-between bg-[#0B101B]/70 backdrop-blur-2xl border-b border-white/[0.05]">
          <div>
            <h1 className="text-xl font-bold text-white">{tab === 'overview' ? 'Dashboard' : tab === 'available' ? 'Job Board' : tab === 'tasks' ? 'My Tasks' : tab === 'messages' ? 'Messages' : tab === 'stock' ? 'Stock Market' : tab === 'portfolio' ? 'My Portfolio' : 'Wallet'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 border border-white/10 flex items-center justify-center overflow-hidden">
              <span className="text-sm font-bold text-blue-300">{(realName || 'E')[0].toUpperCase()}</span>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 max-w-6xl mx-auto">
          {/* ── Overview Tab ── */}
          {tab === 'overview' && (
            <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out]">
              {/* Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Earned */}
                <div className="relative overflow-hidden rounded-2xl p-5 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl hover:bg-white/[0.06] transition-all duration-300 group">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign size={15} className="text-emerald-400" />
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Total Earned</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{(totalEarned || editorProfile.balance).toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-0.5">AED</div>
                  {/* Decorative chart line */}
                  <svg className="absolute bottom-0 left-0 w-full h-12 opacity-40" viewBox="0 0 200 40" preserveAspectRatio="none">
                    <path d="M0,35 C30,30 50,15 80,20 C110,25 130,5 160,10 C180,13 195,8 200,5" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M0,35 C30,30 50,15 80,20 C110,25 130,5 160,10 C180,13 195,8 200,5 V40 H0 Z" fill="url(#chartGrad)" />
                    <defs><linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.15"/><stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/></linearGradient></defs>
                  </svg>
                </div>

                {/* Active Jobs */}
                <div className="rounded-2xl p-5 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl hover:bg-white/[0.05] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={15} className="text-blue-400" />
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Active Jobs</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{activeJobs.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">in progress</div>
                  <div className="mt-3 space-y-2">
                    {activeJobs.slice(0, 3).map(j => (
                      <div key={j.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                          <Play size={9} className="text-gray-400" />
                        </div>
                        <span className="text-[11px] text-gray-300 truncate flex-1">{j.video_type}</span>
                        <div className="w-12 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-400/60" style={{ width: j.status === 'in_progress' ? '60%' : j.status === 'review' ? '85%' : '30%' }} />
                        </div>
                        <ChevronRight size={11} className="text-gray-600" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Completed */}
                <div className="rounded-2xl p-5 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl hover:bg-white/[0.05] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={15} className="text-amber-400" />
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Completed</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{completedJobs.length || editorProfile.completed_count}</div>
                  <div className="text-xs text-gray-500 mt-0.5">jobs done</div>
                  <div className="grid grid-cols-4 gap-1.5 mt-3">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="aspect-square rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                        <Play size={8} className="text-gray-600" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Available Jobs Scroll */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Available Jobs</h3>
                  <button onClick={() => setTab('available')} className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">View All</button>
                </div>
                {availableJobs.length === 0 ? (
                  <div className="rounded-2xl p-10 text-center bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl">
                    <Briefcase size={28} className="mx-auto mb-3 text-gray-700" />
                    <p className="text-xs text-gray-500">No available jobs right now</p>
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                    {availableJobs.slice(0, 6).map(job => (
                      <div key={job.id} className="flex-shrink-0 w-[240px] rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:border-white/15 transition-all duration-300 group cursor-pointer"
                        onClick={() => claimJob(job.id)}>
                        <div className="h-28 bg-gradient-to-br from-slate-700/40 to-slate-900/60 flex items-center justify-center relative">
                          <Play size={24} className="text-white/30" />
                          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
                              <Briefcase size={10} className="text-white" />
                            </div>
                          </div>
                        </div>
                        <div className="p-3.5">
                          <div className="text-xs font-bold text-white truncate">{job.title || `Order #${job.order_number}`}</div>
                          <div className="text-[11px] text-gray-500 mt-0.5">{job.video_type}</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-bold text-emerald-400">{job.editor_payout} AED</span>
                            {job.deadline && (
                              <span className="text-[10px] text-gray-500">Due: {new Date(job.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom 3-column grid (desktop) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Messages Preview */}
                <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.06]">
                    <h4 className="text-sm font-bold text-white">Messages</h4>
                    <button onClick={() => setTab('messages')} className="text-[10px] font-medium text-blue-400">View All</button>
                  </div>
                  <div className="p-2">
                    {dealChats.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-6">No messages yet</p>
                    ) : dealChats.slice(0, 3).map(chat => (
                      <button key={chat.id} onClick={() => { setTab('messages'); setActiveDealChatId(chat.id); }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-300">{(chat.client_name ?? 'C')[0].toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-xs font-semibold text-white truncate">{chat.client_name}</div>
                          <div className="text-[10px] text-gray-500 truncate">{chat.order_package_name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* My Tasks Preview */}
                <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.06]">
                    <h4 className="text-sm font-bold text-white">My Tasks</h4>
                    <button onClick={() => setTab('tasks')} className="text-[10px] font-medium text-blue-400">View All</button>
                  </div>
                  <div className="p-2">
                    {activeJobs.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-6">No active tasks</p>
                    ) : activeJobs.slice(0, 3).map(task => {
                      const s = STATUS_MAP[task.status] || STATUS_MAP.open;
                      return (
                        <div key={task.id} className="flex items-center gap-2.5 p-2.5 rounded-xl">
                          <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                            <ListChecks size={13} className="text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white truncate">Order #{task.order_number}</div>
                            <div className="text-[10px] text-gray-500">{task.video_type}</div>
                          </div>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Wallet Preview */}
                <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.06]">
                    <h4 className="text-sm font-bold text-white">Wallet</h4>
                    <button onClick={() => setTab('wallet')} className="text-[10px] font-medium text-blue-400">View All</button>
                  </div>
                  <div className="p-4">
                    <div className="text-[11px] text-gray-500 mb-1">Your Balance:</div>
                    <div className="text-2xl font-bold text-white">{editorProfile.balance.toLocaleString()} <span className="text-sm font-normal text-gray-500">AED</span></div>
                    <button className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/15 transition-colors">
                      Payout
                    </button>
                    <div className="mt-4 space-y-2">
                      {completedJobs.slice(0, 3).map(t => (
                        <div key={t.id} className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">{new Date(t.created_at).toLocaleDateString()}</span>
                          <span className="text-xs font-bold text-emerald-400">- {t.editor_payout} AED</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Job Board Tab ── */}
          {tab === 'available' && (
            <div className="space-y-3 animate-[fadeInUp_0.3s_ease-out]">
              {availableJobs.length === 0 ? (
                <div className="text-center py-16">
                  <Briefcase size={36} className="mx-auto mb-4 text-gray-700" />
                  <p className="text-sm text-gray-400">No available jobs right now</p>
                  <p className="text-xs mt-1 text-gray-600">Check back later for new editing orders</p>
                </div>
              ) : availableJobs.map((job, i) => (
                <div key={job.id} className="rounded-2xl p-5 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300"
                  style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-bold text-white">Order #{job.order_number}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{job.video_type} · {job.title}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-emerald-400">{job.editor_payout} AED</div>
                      <div className="text-[10px] text-gray-500">your payout</div>
                    </div>
                  </div>
                  <p className="text-xs mb-3 line-clamp-2 text-gray-500">{job.brief}</p>
                  <div className="flex items-center gap-2">
                    {job.deadline && (
                      <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/15">
                        <Clock size={10} /> {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    )}
                    <button onClick={() => claimJob(job.id)}
                      className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 transition-colors">
                      <Play size={12} /> Claim Job
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── My Tasks Tab ── */}
          {tab === 'tasks' && (
            <div className="space-y-3 animate-[fadeInUp_0.3s_ease-out]">
              {myTasks.length === 0 ? (
                <div className="text-center py-16">
                  <ListChecks size={36} className="mx-auto mb-4 text-gray-700" />
                  <p className="text-sm text-gray-400">No active tasks</p>
                  <p className="text-xs mt-1 text-gray-600">Claim jobs from the Job Board to get started</p>
                </div>
              ) : myTasks.map(task => {
                const s = STATUS_MAP[task.status] || STATUS_MAP.open;
                return (
                  <div key={task.id} className="rounded-2xl p-5 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl hover:bg-white/[0.05] transition-all duration-300">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="text-sm font-bold text-white">Order #{task.order_number}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{task.video_type} · {task.title}</div>
                      </div>
                      <span className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
                        {s.label}
                      </span>
                    </div>

                    <p className="text-xs mb-3 line-clamp-2 text-gray-500">{task.brief}</p>

                    {task.source_link && (
                      <a href={task.source_link} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium mb-3 text-blue-400 hover:text-blue-300 transition-colors">
                        <ExternalLink size={10} /> Source Files
                      </a>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setChatOrderId(task.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/10 text-gray-300 hover:bg-white/[0.07] transition-colors">
                        <MessageSquare size={12} /> Chat
                      </button>

                      {task.status === 'assigned' && (
                        <button onClick={() => startWork(task.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/15 transition-colors">
                          <Play size={12} /> Start Working
                        </button>
                      )}

                      {(task.status === 'in_progress' || task.status === 'revision') && (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input value={resultLink} onChange={e => setResultLink(e.target.value)}
                            placeholder="Paste final video link..."
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs bg-white/[0.03] border border-white/10 text-white outline-none placeholder-gray-600 focus:border-blue-500/30 transition-colors" />
                          <button onClick={() => submitForReview(task.id)} disabled={!resultLink.trim()}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 disabled:opacity-30 hover:bg-emerald-500/15 transition-colors">
                            <Check size={12} /> Submit
                          </button>
                        </div>
                      )}

                      {task.status === 'completed' && (
                        <span className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-emerald-400">
                          <Check size={12} /> Completed — {task.editor_payout} AED earned
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Messages Tab ── */}
          {tab === 'messages' && (
            <div className="animate-[fadeInUp_0.3s_ease-out]">
              {/* Desktop: two-column / Mobile: single column */}
              <div className="flex gap-0 md:gap-0 h-[calc(100vh-140px)] min-h-[500px]">
                {/* Contact list - hidden on mobile when chat is active */}
                <div className={`${activeDealChatId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[320px] rounded-2xl md:rounded-r-none bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl overflow-hidden flex-shrink-0`}>
                  {/* Search */}
                  <div className="p-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                      <Search size={14} className="text-gray-500" />
                      <input value={chatSearch} onChange={e => setChatSearch(e.target.value)}
                        placeholder="Search..."
                        className="flex-1 text-xs bg-transparent text-white outline-none placeholder-gray-500" />
                    </div>
                  </div>
                  {/* Chat list */}
                  <div className="flex-1 overflow-y-auto p-2">
                    {filteredChats.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageCircle size={28} className="mx-auto mb-3 text-gray-700" />
                        <p className="text-xs text-gray-500">No conversations yet</p>
                      </div>
                    ) : filteredChats.map(chat => (
                      <button key={chat.id} onClick={() => setActiveDealChatId(chat.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${activeDealChatId === chat.id ? 'bg-white/[0.06] border border-white/10' : 'hover:bg-white/[0.04] border border-transparent'}`}>
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-300">{(chat.client_name ?? 'C')[0].toUpperCase()}</span>
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0F1115]" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white truncate">{chat.client_name}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 truncate mt-0.5">{chat.order_package_name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat window */}
                <div className={`${activeDealChatId ? 'flex' : 'hidden md:flex'} flex-col flex-1 rounded-2xl md:rounded-l-none bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] shadow-2xl md:border-l-0 overflow-hidden`}>
                  {activeDealChatId ? (
                    <>
                      {/* Mobile back button */}
                      <div className="md:hidden p-2 border-b border-white/[0.06]">
                        <button onClick={() => setActiveDealChatId(null)} className="flex items-center gap-2 text-xs text-gray-400 px-2 py-1">
                          <ArrowLeft size={14} /> Back
                        </button>
                      </div>
                      {(() => {
                        const chat = dealChats.find(c => c.id === activeDealChatId);
                        if (!chat) return null;
                        return (
                          <DealMessenger
                            chatId={chat.id}
                            currentUserId={user!.id}
                            userRole="freelancer"
                            orderId={chat.order_id}
                            orderStatus={chat.order_status ?? 'paid'}
                            partnerName={chat.client_name ?? 'Client'}
                            onOrderUpdate={(s) => setDealChats(prev => prev.map(c => c.id === chat.id ? { ...c, order_status: s } : c))}
                            onClose={() => setActiveDealChatId(null)}
                          />
                        );
                      })()}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageCircle size={40} className="mx-auto mb-3 text-gray-700" />
                        <p className="text-sm text-gray-400">Select a conversation</p>
                        <p className="text-xs text-gray-600 mt-1">Pick a chat from the list to start messaging</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Stock Market Tab ── */}
          {tab === 'stock' && (
            <div className="animate-[fadeInUp_0.3s_ease-out]">
              <StockMarket creatorId={editorProfile.user_id} creatorName={realName || editorProfile.display_name} />
            </div>
          )}

          {/* ── Portfolio Tab ── */}
          {tab === 'portfolio' && (
            <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out]">
              {/* Upload zone */}
              <div className="rounded-2xl p-6 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Portfolio</h3>
                    <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Upload images and videos to showcase your editing work. These appear on your public profile card.</p>
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:opacity-90"
                    style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>
                    {portfolioUploading ? (
                      <div className="w-3.5 h-3.5 border-2 border-blue-400/40 border-t-blue-400 rounded-full animate-spin" />
                    ) : (
                      <Upload size={13} />
                    )}
                    {portfolioUploading ? 'Uploading...' : 'Upload Files'}
                    <input
                      ref={portfolioInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/mp4,video/quicktime,video/webm"
                      className="hidden"
                      onChange={handlePortfolioUpload}
                      disabled={portfolioUploading}
                    />
                  </label>
                </div>

                {portfolioError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mb-4" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {portfolioError}
                  </div>
                )}

                {portfolioItems.length === 0 ? (
                  <label className="flex flex-col items-center justify-center gap-3 rounded-xl p-12 cursor-pointer transition-all hover:border-blue-500/30"
                    style={{ border: '2px dashed rgba(255,255,255,0.08)', color: '#374151' }}>
                    <Images size={32} className="text-gray-700" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-500">Drop your best work here</p>
                      <p className="text-xs mt-1 text-gray-600">Images & videos up to 1 GB each</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/mp4,video/quicktime,video/webm"
                      className="hidden"
                      onChange={handlePortfolioUpload}
                      disabled={portfolioUploading}
                    />
                  </label>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {portfolioItems.map((item, i) => (
                      <div key={i} className="relative aspect-video rounded-xl overflow-hidden group" style={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {item.type === 'video' && item.url.includes('iframe.mediadelivery.net') ? (
                          <iframe
                            src={item.url}
                            loading="lazy"
                            style={{ border: 0, width: '100%', height: '100%' }}
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                          />
                        ) : item.type === 'video' || /\.(mp4|mov|webm)$/i.test(item.url) ? (
                          <video
                            src={item.url}
                            muted
                            playsInline
                            preload="metadata"
                            controls
                            controlsList="nodownload"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img src={item.url} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
                        )}
                        <button
                          onClick={() => removePortfolioItem(i)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.15)' }}
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-video rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:border-blue-500/30"
                      style={{ border: '2px dashed rgba(255,255,255,0.08)', color: '#374151' }}>
                      <Upload size={18} className="text-gray-600" />
                      <span className="text-[10px] mt-1 text-gray-600">Add more</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/mp4,video/quicktime,video/webm"
                        className="hidden"
                        onChange={handlePortfolioUpload}
                        disabled={portfolioUploading}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="rounded-2xl p-4 bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-start gap-2.5">
                  <Images size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-white mb-0.5">Visibility</div>
                    <p className="text-xs" style={{ color: '#475569' }}>Your portfolio is shown on your public creator profile card so clients can see your editing style before ordering.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Wallet Tab ── */}
          {tab === 'wallet' && (
            <div className="space-y-5 animate-[fadeInUp_0.3s_ease-out]">
              <div className="rounded-2xl p-6 bg-gradient-to-br from-blue-500/[0.06] to-cyan-500/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl">
                <div className="text-xs font-medium mb-2 text-gray-400">Your Balance</div>
                <div className="text-4xl font-bold text-white">{editorProfile.balance.toLocaleString()} <span className="text-base font-medium text-gray-500">AED</span></div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>Completed: {completedJobs.length || editorProfile.completed_count} orders</span>
                  {editorProfile.rating > 0 && <span>Rating: {editorProfile.rating}/5</span>}
                </div>
                <button
                  disabled={editorProfile.balance < 100}
                  onClick={() => setShowPayoutModal(true)}
                  className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: editorProfile.balance >= 100 ? 'rgba(0,196,140,0.12)' : 'rgba(255,255,255,0.05)', color: editorProfile.balance >= 100 ? '#00C48C' : '#475569', border: `1px solid ${editorProfile.balance >= 100 ? 'rgba(0,196,140,0.3)' : 'rgba(255,255,255,0.08)'}` }}
                >
                  {editorProfile.balance < 100 ? 'Min 100 AED' : 'Request Payout'}
                </button>
              </div>

              {/* Payout info */}
              <div className="rounded-2xl p-5 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl">
                <div className="flex items-start gap-2.5">
                  <DollarSign size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-white mb-0.5">Payouts</div>
                    <p className="text-xs text-gray-500">Your earnings are credited after the client accepts the final video. Min withdrawal: 100 AED.</p>
                  </div>
                </div>
              </div>

              {/* Payout Requests History */}
              {payoutRequests.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-400">Payout Requests</div>
                  <div className="space-y-2">
                    {payoutRequests.map(pr => (
                      <div key={pr.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.05]">
                        <div>
                          <div className="text-xs font-medium text-white">{pr.amount.toLocaleString()} AED</div>
                          <div className="text-[10px] text-gray-500">{pr.payment_method} - {new Date(pr.created_at).toLocaleDateString()}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                          background: pr.status === 'completed' ? 'rgba(0,196,140,0.15)' : pr.status === 'rejected' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)',
                          color: pr.status === 'completed' ? '#00C48C' : pr.status === 'rejected' ? '#f87171' : '#fbbf24'
                        }}>{pr.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-400">Earnings History</div>
                {completedJobs.length === 0 ? (
                  <p className="text-xs text-gray-600">No completed orders yet</p>
                ) : (
                  <div className="space-y-2">
                    {completedJobs.map(t => (
                      <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] hover:bg-white/[0.06] transition-all duration-300">
                        <div>
                          <div className="text-xs font-medium text-white">Order #{t.order_number}</div>
                          <div className="text-[10px] text-gray-500">{t.video_type}</div>
                        </div>
                        <span className="text-sm font-bold text-emerald-400">+{t.editor_payout} AED</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-[#0B101B]/80 backdrop-blur-2xl border-t border-white/[0.05] px-2 py-2 safe-area-bottom">
        <div className="flex items-center justify-around">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setTab(item.id); setActiveDealChatId(null); }}
              className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all duration-200"
              style={{
                background: tab === item.id ? 'rgba(96,165,250,0.1)' : 'transparent',
              }}>
              <span style={{ color: tab === item.id ? '#60a5fa' : '#475569' }} className="transition-colors">
                {item.icon}
              </span>
              <span className="text-[9px] font-medium" style={{ color: tab === item.id ? '#60a5fa' : '#475569' }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Payout Modal */}
      {showPayoutModal && editorProfile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowPayoutModal(false)}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: '#141B2D', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Request Payout</h3>
              <button onClick={() => setShowPayoutModal(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Amount (AED)</label>
              <input type="number" min="100" max={editorProfile.balance} value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder={`100 - ${editorProfile.balance.toLocaleString()}`}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-600" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(['bank', 'crypto', 'cash'] as const).map(m => (
                  <button key={m} onClick={() => setPayoutMethod(m)} className="px-3 py-2.5 rounded-xl text-xs font-semibold transition-all" style={{
                    background: payoutMethod === m ? 'rgba(0,196,140,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${payoutMethod === m ? 'rgba(0,196,140,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    color: payoutMethod === m ? '#00C48C' : '#9ca3af'
                  }}>{m === 'bank' ? 'Bank Transfer' : m === 'crypto' ? 'Crypto' : 'Cash'}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Payment Details</label>
              <textarea value={payoutDetails} onChange={e => setPayoutDetails(e.target.value)} rows={3} placeholder={payoutMethod === 'bank' ? 'IBAN, bank name, account holder...' : payoutMethod === 'crypto' ? 'Wallet address, network (TRC20/ERC20)...' : 'Preferred pickup method...'}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-600 resize-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
            <button
              disabled={payoutSubmitting || !payoutAmount || parseFloat(payoutAmount) < 100 || parseFloat(payoutAmount) > editorProfile.balance || !payoutDetails.trim()}
              onClick={submitPayoutRequest}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'rgba(0,196,140,0.15)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.3)' }}
            >
              {payoutSubmitting ? 'Processing...' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
