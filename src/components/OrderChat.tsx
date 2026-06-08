import { useState, useEffect, useRef } from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  sender_role: string;
  content: string;
  attachment_url: string;
  has_flagged_content: boolean;
  created_at: string;
}

const CONTACT_PATTERN = /(\b\d{7,15}\b|@[\w.\-]+|\bt\.me\/|wa\.me|\bwhatsapp\b|\btelegram\b|\binstagram\.com\/|\bfacebook\.com\/|https?:\/\/|www\.|[\w.\-]+@[\w.\-]+\.[a-z]{2,})/i;

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  creator: { label: 'You', color: '#00C48C' },
  editor: { label: 'Editor', color: '#60a5fa' },
  admin: { label: 'Admin', color: '#fbbf24' },
};

export default function OrderChat({ orderId, senderRole, senderId }: { orderId: string; senderRole: string; senderId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [warning, setWarning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`order-chat-${orderId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('order_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
  };

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Client-side soft hint only — server always re-evaluates via DB trigger
    if (CONTACT_PATTERN.test(trimmed)) {
      setWarning(true);
      setTimeout(() => setWarning(false), 4000);
    }

    setSending(true);
    await supabase.from('order_messages').insert({
      order_id: orderId,
      sender_role: senderRole,
      sender_id: senderId,
      content: trimmed,
    });
    setText('');
    setSending(false);
  };

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', height: 420 }}>
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs" style={{ color: '#334155' }}>No messages yet. Start the conversation.</p>
          </div>
        )}
        {messages.map(msg => {
          const isOwn = msg.sender_role === senderRole;
          const role = ROLE_DISPLAY[msg.sender_role] || ROLE_DISPLAY.editor;
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'}`}
                style={{ background: isOwn ? 'rgba(0,196,140,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isOwn ? 'rgba(0,196,140,0.15)' : 'rgba(255,255,255,0.06)'}` }}>
                {!isOwn && <div className="text-[10px] font-bold mb-1" style={{ color: role.color }}>{role.label}</div>}
                <p className="text-xs leading-relaxed text-white break-words">{msg.content}</p>
                {msg.has_flagged_content && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <AlertTriangle size={10} style={{ color: '#f97316' }} />
                    <span className="text-[9px]" style={{ color: '#f97316' }}>Contact info detected</span>
                  </div>
                )}
                <div className="text-[9px] mt-1" style={{ color: '#334155' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning */}
      {warning && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
          <AlertTriangle size={12} style={{ color: '#f97316' }} />
          <span className="text-[10px] font-medium" style={{ color: '#f97316' }}>Sharing contact info is not allowed. Communication must stay on-platform.</span>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type a message..."
            className="flex-1 px-3.5 py-2.5 rounded-xl text-xs bg-transparent text-white outline-none"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
          <button onClick={sendMessage} disabled={sending || !text.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: 'rgba(0,196,140,0.12)', border: '1px solid rgba(0,196,140,0.25)' }}>
            <Send size={14} style={{ color: '#00C48C' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
