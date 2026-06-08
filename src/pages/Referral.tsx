import { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import HomeSkeleton from '../components/HomeSkeleton';

export default function Referral() {
  const { profile, loading } = useAuth();
  const [copied, setCopied] = useState(false);

  if (loading || !profile) return <HomeSkeleton />;

  const code = profile.referral_code ?? '';

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Мой промокод',
        text: `Используй мой промокод ${code} и получи скидку 10%!`,
      });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-4">Бонусная программа</h1>

      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
      >
        <div className="relative z-10">
          <p className="text-lg font-semibold leading-tight mb-1">Твой промокод</p>
          <p className="text-sm opacity-80 mb-4 leading-snug">
            Поделись с другом — он получит скидку 10%, а ты — бесплатный ролик!
          </p>

          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-between gap-3 border-2 border-dashed border-white/50 bg-black/20 rounded-xl px-4 py-3 cursor-pointer hover:bg-black/30 transition-colors"
          >
            <span className="font-mono font-bold text-base text-white tracking-wide truncate">
              {code || '—'}
            </span>
            <span className="flex-shrink-0 text-white/90">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </span>
          </button>

          {copied && (
            <p className="text-xs text-white/80 mt-1.5 text-center">Скопировано!</p>
          )}

          <div className="flex gap-3 mt-4">
            <div className="flex-1 bg-black/20 rounded-xl px-4 py-3 text-center">
              <div className="text-xs text-white/70 mb-0.5">Приглашено</div>
              <div className="text-2xl font-bold">{profile.invited_count ?? 0}</div>
            </div>
            <div className="flex-1 bg-black/20 rounded-xl px-4 py-3 text-center">
              <div className="text-xs text-white/70 mb-0.5">Заработано</div>
              <div className="text-2xl font-bold">{profile.earned_count ?? 0}</div>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-xl py-3 font-semibold text-sm"
          >
            <Share2 size={16} />
            Поделиться
          </button>
        </div>

        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'white' }}
        />
        <div
          className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10"
          style={{ background: 'white' }}
        />
      </div>
    </div>
  );
}
