import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, X, CheckCircle, RotateCcw, Upload, FileText, Image, Film, AlertTriangle, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string | null;
  file_url: string | null;
  file_type: string | null;
  is_system: boolean;
  created_at: string;
}

interface DealMessengerProps {
  chatId: string;
  currentUserId: string;
  userRole: 'client' | 'freelancer';
  orderId: string;
  orderStatus: string;
  partnerName: string;
  partnerId?: string;
  partnerTable?: 'client_profiles' | 'creator_profiles';
  onOrderUpdate?: (newStatus: string) => void;
  onClose?: () => void;
}

const CONTACT_REGEX = /(\+?\d[\d\s\-()]{7,}\d)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
const HEARTBEAT_INTERVAL_MS = 60 * 1000;    // 1 minute

function filterContacts(text: string): { filtered: string; hasContact: boolean } {
  const hasContact = CONTACT_REGEX.test(text);
  if (!hasContact) return { filtered: text, hasContact: false };
  const filtered = text.replace(CONTACT_REGEX, '***');
  return { filtered, hasContact: true };
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function formatLastSeen(dateStr: string | null): string {
  if (!dateStr) return 'Оффлайн';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < ONLINE_THRESHOLD_MS) return 'Онлайн';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Был(а) ${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Был(а) ${hours} ч. назад`;
  const d = new Date(dateStr);
  return `Был(а) ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
}

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return <FileText size={16} />;
  if (fileType.startsWith('image')) return <Image size={16} />;
  if (fileType.startsWith('video')) return <Film size={16} />;
  return <FileText size={16} />;
}

export default function DealMessenger({
  chatId,
  currentUserId,
  userRole,
  orderId,
  orderStatus,
  partnerName,
  partnerId,
  partnerTable,
  onOrderUpdate,
  onClose,
}: DealMessengerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [contactWarning, setContactWarning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Heartbeat: update current user's last_seen every minute
  const updateHeartbeat = useCallback(async () => {
    const table = userRole === 'client' ? 'client_profiles' : 'creator_profiles';
    await supabase
      .from(table)
      .update({ last_seen: new Date().toISOString() })
      .eq('user_id', currentUserId);
  }, [currentUserId, userRole]);

  useEffect(() => {
    updateHeartbeat();
    const interval = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [updateHeartbeat]);

  // Fetch partner's last_seen and subscribe to changes
  useEffect(() => {
    if (!partnerId || !partnerTable) return;

    const fetchPartnerLastSeen = async () => {
      const { data } = await supabase
        .from(partnerTable)
        .select('last_seen')
        .eq('user_id', partnerId)
        .maybeSingle();
      setPartnerLastSeen((data as { last_seen?: string | null } | null)?.last_seen ?? null);
    };

    fetchPartnerLastSeen();

    // Poll partner last_seen every 30 seconds (lightweight)
    const poll = setInterval(fetchPartnerLastSeen, 30000);
    return () => clearInterval(poll);
  }, [partnerId, partnerTable]);

  // Load messages + subscribe to real-time inserts
  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'deal_messages',
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === (payload.new as Message).id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    const { data } = await supabase
      .from('deal_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const { filtered, hasContact } = filterContacts(text.trim());
    if (hasContact) {
      setContactWarning(true);
      setTimeout(() => setContactWarning(false), 4000);
    }

    setSending(true);
    await supabase.from('deal_messages').insert({
      chat_id: chatId,
      text: filtered,
      is_system: false,
    });
    setText('');
    setSending(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 524288000) { alert('Файл должен быть меньше 500 МБ.'); return; }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${currentUserId}/${chatId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from('chat-files').upload(path, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(path);
      await supabase.from('deal_messages').insert({
        chat_id: chatId,
        text: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        is_system: false,
      });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmitWork() {
    setActionLoading(true);
    await supabase.from('marketplace_orders').update({ status: 'delivered' }).eq('id', orderId);
    await supabase.from('deal_messages').insert({
      chat_id: chatId,
      text: 'Работа отправлена на проверку.', is_system: true,
    });
    onOrderUpdate?.('delivered');
    setActionLoading(false);
  }

  async function handleApprove() {
    setActionLoading(true);
    await supabase.from('marketplace_orders').update({ status: 'completed', accepted_at: new Date().toISOString() }).eq('id', orderId);
    await supabase.from('deal_messages').insert({
      chat_id: chatId,
      text: 'Работа принята! Оплата переведена исполнителю.', is_system: true,
    });
    onOrderUpdate?.('completed');
    setActionLoading(false);
  }

  async function handleRequestRevision() {
    setActionLoading(true);
    await supabase.from('marketplace_orders').update({ status: 'revision' }).eq('id', orderId);
    await supabase.from('deal_messages').insert({
      chat_id: chatId,
      text: 'Запрошена доработка. Ознакомьтесь с замечаниями и повторно отправьте работу.', is_system: true,
    });
    onOrderUpdate?.('revision');
    setActionLoading(false);
  }

  const online = isOnline(partnerLastSeen);
  const lastSeenText = formatLastSeen(partnerLastSeen);
  let prevDate = '';

  return (
    <div className="flex flex-col bg-[#0B101B]" style={{ height: '100%', maxHeight: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-white/[0.05] bg-white/[0.02]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-300">{partnerName[0]?.toUpperCase() ?? '?'}</span>
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0B101B] ${online ? 'bg-emerald-400' : 'bg-gray-600'}`} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{partnerName}</div>
            <div className={`text-[11px] flex items-center gap-1 ${online ? 'text-emerald-400' : 'text-gray-500'}`}>
              {online && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />}
              {lastSeenText}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-[10px] px-2 py-1 rounded-full font-medium"
            style={{
              background: orderStatus === 'completed' ? 'rgba(16,185,129,0.1)' : orderStatus === 'delivered' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
              color: orderStatus === 'completed' ? '#34d399' : orderStatus === 'delivered' ? '#60a5fa' : '#fbbf24',
              border: `1px solid ${orderStatus === 'completed' ? 'rgba(16,185,129,0.2)' : orderStatus === 'delivered' ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)'}`,
            }}>
            {orderStatus === 'paid' || orderStatus === 'on_hold' ? 'В работе' :
             orderStatus === 'delivered' ? 'Проверка' :
             orderStatus === 'revision' ? 'Доработка' :
             orderStatus === 'completed' ? 'Завершён' : orderStatus}
          </div>
          {onClose && (
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
              <X size={15} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Action bar */}
      {(orderStatus === 'paid' || orderStatus === 'on_hold' || orderStatus === 'revision') && userRole === 'freelancer' && (
        <div className="px-4 py-2 flex-shrink-0 border-b border-emerald-500/10 bg-emerald-500/[0.03]">
          <button onClick={handleSubmitWork} disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 transition-colors disabled:opacity-50">
            <Upload size={13} /> Отправить работу
          </button>
        </div>
      )}

      {orderStatus === 'delivered' && userRole === 'client' && (
        <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0 border-b border-blue-500/10 bg-blue-500/[0.03]">
          <button onClick={handleApprove} disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 transition-colors disabled:opacity-50">
            <CheckCircle size={13} /> Принять
          </button>
          <button onClick={handleRequestRevision} disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/15 transition-colors disabled:opacity-50">
            <RotateCcw size={13} /> На доработку
          </button>
        </div>
      )}

      {orderStatus === 'completed' && (
        <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0 border-b border-emerald-500/10 bg-emerald-500/[0.03]">
          <Shield size={13} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-emerald-400">Сделка закрыта. Оплата выпущена.</span>
        </div>
      )}

      {/* Messages — scrollable area fills remaining space */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 overscroll-contain" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {messages.map((msg) => {
          const msgDate = new Date(msg.created_at).toDateString();
          let showDateSep = false;
          if (msgDate !== prevDate) { showDateSep = true; prevDate = msgDate; }
          const isOwn = msg.sender_id === currentUserId;

          if (msg.is_system) {
            return (
              <div key={msg.id}>
                {showDateSep && (
                  <div className="flex justify-center my-4">
                    <span className="text-[10px] px-3 py-1 rounded-full bg-white/[0.04] text-gray-500 font-medium">
                      {formatDateSeparator(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className="flex justify-center my-3">
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] bg-blue-500/[0.06] text-blue-400 border border-blue-500/10 max-w-[80%] text-center">
                    <Shield size={11} className="flex-shrink-0" />
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="flex justify-center my-4">
                  <span className="text-[10px] px-3 py-1 rounded-full bg-white/[0.04] text-gray-500 font-medium">
                    {formatDateSeparator(msg.created_at)}
                  </span>
                </div>
              )}
              <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1.5`}>
                {!isOwn && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center flex-shrink-0 mr-2 mt-1 self-end">
                    <span className="text-[9px] font-bold text-blue-300">{partnerName[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="max-w-[75%] min-w-0">
                  <div className="rounded-2xl px-3.5 py-2.5"
                    style={{
                      background: isOwn ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)',
                      border: isOwn ? '1px solid rgba(245,158,11,0.15)' : '1px solid rgba(255,255,255,0.08)',
                      borderBottomRightRadius: isOwn ? 4 : undefined,
                      borderBottomLeftRadius: !isOwn ? 4 : undefined,
                    }}>
                    {msg.file_url && (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 mb-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
                        <span className="text-gray-400 flex-shrink-0">{getFileIcon(msg.file_type)}</span>
                        <span className="text-[11px] font-medium truncate text-gray-300">{msg.text || 'Файл'}</span>
                      </a>
                    )}
                    {msg.text && !msg.file_url && (
                      <p className="text-[13px] whitespace-pre-wrap break-words leading-relaxed" style={{ color: isOwn ? '#fde68a' : '#e2e8f0' }}>
                        {msg.text}
                      </p>
                    )}
                  </div>
                  <div className={`mt-0.5 ${isOwn ? 'text-right' : 'text-left'}`}>
                    <span className="text-[10px] text-gray-600">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Contact warning */}
      {contactWarning && (
        <div className="mx-4 mb-2 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/15 flex-shrink-0">
          <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
          <span className="text-[11px] text-amber-400">Обмен контактами запрещён правилами платформы.</span>
        </div>
      )}

      {/* Input — always pinned to bottom */}
      <form onSubmit={sendMessage} className="flex items-center gap-2 px-4 py-3 flex-shrink-0 border-t border-white/[0.05] bg-[#0d1421]" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors disabled:opacity-50">
          {uploading
            ? <div className="w-4 h-4 border-2 border-gray-500/30 border-t-gray-400 rounded-full animate-spin" />
            : <Paperclip size={15} className="text-gray-400" />}
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}
          accept="image/*,video/*,.pdf,.zip,.rar,.psd,.ai,.prproj,.aep,.drp" />
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e as unknown as React.FormEvent); } }}
          placeholder="Написать сообщение..."
          className="flex-1 min-w-0 px-4 py-2.5 rounded-full text-sm text-white placeholder-gray-600 outline-none bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/30 transition-colors"
        />
        <button type="submit" disabled={!text.trim() || sending}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-500 hover:bg-blue-400 transition-colors disabled:opacity-30 disabled:bg-blue-500/50">
          <Send size={15} className="text-white" />
        </button>
      </form>
    </div>
  );
}
