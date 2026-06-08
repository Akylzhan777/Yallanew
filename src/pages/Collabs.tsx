import { useState, useRef } from 'react';
import { X, Heart, MessageCircle, ChevronLeft, Users } from 'lucide-react';

interface CollabProfile {
  id: number;
  name: string;
  niche: string;
  subs: string;
  desc: string;
  img: string;
  telegram?: string;
  location?: string;
  tags?: string[];
}

const PROFILES: CollabProfile[] = [
  {
    id: 1,
    name: 'Иван Петров',
    niche: 'Бизнес & Продажи',
    subs: '50K',
    desc: 'Ищу экспертов для интервью про B2B и предпринимательство. Готов к коллабам раз в месяц.',
    img: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=800',
    telegram: 'ivan_petrov',
    location: 'Москва',
    tags: ['B2B', 'Интервью', 'Экспертное'],
  },
  {
    id: 2,
    name: 'Мария Соколова',
    niche: 'Психология',
    subs: '120K',
    desc: 'Интересны темы выгорания, мотивации и отношений. Ищу специалистов в смежных нишах.',
    img: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=800',
    telegram: 'maria_psych',
    location: 'Санкт-Петербург',
    tags: ['Психология', 'Лайфстайл', 'Саморазвитие'],
  },
  {
    id: 3,
    name: 'Алекс Фит',
    niche: 'Спорт & ЗОЖ',
    subs: '230K',
    desc: 'Снимем совместный челлендж? Открыт к коллабам с нутрициологами, тренерами, медиками.',
    img: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=800',
    telegram: 'alex_fit',
    location: 'Дубай',
    tags: ['Фитнес', 'Челлендж', 'ЗОЖ'],
  },
  {
    id: 4,
    name: 'Елена Артова',
    niche: 'Дизайн интерьера',
    subs: '15K',
    desc: 'Ищу коллабы с риелторами, архитекторами и мебельными брендами для совместных Reels.',
    img: 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=800',
    telegram: 'elena_design',
    location: 'Москва',
    tags: ['Интерьер', 'Дизайн', 'Недвижимость'],
  },
  {
    id: 5,
    name: 'Дмитрий Инвест',
    niche: 'Финансы & Крипто',
    subs: '88K',
    desc: 'Делаю образовательный контент о финансовой свободе. Ищу коллег по нише для обменов.',
    img: 'https://images.pexels.com/photos/874158/pexels-photo-874158.jpeg?auto=compress&cs=tinysrgb&w=800',
    telegram: 'dmitry_invest',
    location: 'Дубай',
    tags: ['Финансы', 'Инвестиции', 'Крипто'],
  },
  {
    id: 6,
    name: 'Анна Кук',
    niche: 'Кулинария',
    subs: '310K',
    desc: 'Веду фудблог. Хочу снимать совместные рецепты и обзоры ресторанов с блогерами из ниши лайфстайл.',
    img: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=800',
    telegram: 'anna_cook',
    location: 'Москва',
    tags: ['Еда', 'Рецепты', 'Лайфстайл'],
  },
];

function ConnectModal({ profile, onClose }: { profile: CollabProfile; onClose: () => void }) {
  const handleTelegram = () => {
    if (profile.telegram) {
      window.open(`https://t.me/${profile.telegram}`, '_blank');
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl p-6 pb-10"
        style={{ background: '#1A1D25', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-5">
          <img
            src={profile.img}
            alt={profile.name}
            className="w-14 h-14 rounded-2xl object-cover"
          />
          <div>
            <div className="font-bold text-white text-lg leading-tight">{profile.name}</div>
            <div className="text-sm mt-0.5" style={{ color: '#00C48C' }}>{profile.niche}</div>
          </div>
        </div>

        <p className="text-sm mb-6 leading-relaxed" style={{ color: '#A0A3B1' }}>
          {profile.desc}
        </p>

        <button
          onClick={handleTelegram}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-white text-base transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #2AABEE, #1a8fd1)' }}
        >
          <MessageCircle size={18} />
          Написать в Telegram
        </button>

        <button
          onClick={onClose}
          className="w-full mt-3 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#8F90A6' }}
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

export default function Collabs() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [connectProfile, setConnectProfile] = useState<CollabProfile | null>(null);
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null);
  const [liked, setLiked] = useState<number[]>([]);
  const [passed, setPassed] = useState<number[]>([]);
  const animating = useRef(false);

  const remaining = PROFILES.filter((_, i) => i >= currentIndex);
  const isDone = currentIndex >= PROFILES.length;

  const advance = (direction: 'left' | 'right') => {
    if (animating.current || isDone) return;
    animating.current = true;
    setExiting(direction);
    setTimeout(() => {
      setCurrentIndex(i => i + 1);
      setExiting(null);
      animating.current = false;
    }, 340);
  };

  const handlePass = () => {
    setPassed(p => [...p, PROFILES[currentIndex].id]);
    advance('left');
  };

  const handleConnect = () => {
    setLiked(l => [...l, PROFILES[currentIndex].id]);
    setConnectProfile(PROFILES[currentIndex]);
    advance('right');
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setLiked([]);
    setPassed([]);
  };

  return (
    <div className="flex flex-col items-center" style={{ minHeight: '100%', paddingBottom: 24 }}>
      <div className="w-full max-w-sm px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="font-bold text-white text-xl leading-tight">Найти партнера</h1>
            <p className="text-sm mt-0.5" style={{ color: '#8F90A6' }}>Тиндер для совместных Reels</p>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(0,196,140,0.12)', color: '#00C48C' }}
          >
            <Users size={14} />
            {PROFILES.length - currentIndex > 0 ? `${PROFILES.length - currentIndex} осталось` : '0'}
          </div>
        </div>
      </div>

      <div className="relative flex-1 w-full max-w-sm px-4" style={{ height: 'calc(100dvh - 260px)', minHeight: 380, maxHeight: 560 }}>
        {isDone ? (
          <div
            className="w-full h-full rounded-3xl flex flex-col items-center justify-center gap-4 text-center px-8"
            style={{ background: '#1A1D25', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-5xl mb-2">🎉</div>
            <div className="font-bold text-white text-xl">Вы просмотрели всех!</div>
            <div className="text-sm leading-relaxed" style={{ color: '#8F90A6' }}>
              Лайков: {liked.length} · Пропущено: {passed.length}
            </div>
            <button
              onClick={handleReset}
              className="mt-2 px-6 py-3 rounded-2xl font-bold text-white text-sm transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #00C48C, #00a376)' }}
            >
              Начать заново
            </button>
          </div>
        ) : (
          <>
            {remaining.slice(1, 3).map((profile, stackIdx) => {
              const depth = stackIdx + 1;
              const scale = 1 - depth * 0.04;
              const translateY = depth * 10;
              return (
                <div
                  key={profile.id}
                  className="absolute inset-0 rounded-3xl overflow-hidden"
                  style={{
                    transform: `scale(${scale}) translateY(${translateY}px)`,
                    transformOrigin: 'bottom center',
                    zIndex: 10 - depth,
                    transition: 'transform 0.3s ease',
                  }}
                >
                  <img src={profile.img} alt="" className="w-full h-full object-cover" />
                  <div
                    className="absolute inset-x-0 bottom-0 h-2/3"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)' }}
                  />
                </div>
              );
            })}

            <div
              key={PROFILES[currentIndex].id}
              className="absolute inset-0 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
              style={{
                zIndex: 20,
                transform: exiting === 'left'
                  ? 'translateX(-120%) rotate(-15deg)'
                  : exiting === 'right'
                  ? 'translateX(120%) rotate(15deg)'
                  : 'translateX(0) rotate(0deg)',
                opacity: exiting ? 0 : 1,
                transition: exiting
                  ? 'transform 0.34s cubic-bezier(0.4,0,0.2,1), opacity 0.34s ease'
                  : 'none',
                boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
              }}
            >
              <img
                src={PROFILES[currentIndex].img}
                alt={PROFILES[currentIndex].name}
                className="w-full h-full object-cover"
                draggable={false}
              />

              <div
                className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-16"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-white text-2xl leading-tight">
                      {PROFILES[currentIndex].name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(0,196,140,0.2)', color: '#00C48C' }}
                      >
                        {PROFILES[currentIndex].niche}
                      </span>
                      <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {PROFILES[currentIndex].subs} подписчиков
                      </span>
                    </div>
                  </div>
                  {PROFILES[currentIndex].location && (
                    <span className="text-xs mt-1 shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      📍 {PROFILES[currentIndex].location}
                    </span>
                  )}
                </div>

                <p className="text-sm mt-3 leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {PROFILES[currentIndex].desc}
                </p>

                {PROFILES[currentIndex].tags && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {PROFILES[currentIndex].tags!.map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {exiting === 'right' && (
                <div
                  className="absolute top-8 left-6 rotate-[-20deg] border-4 rounded-xl px-4 py-1.5 font-black text-xl tracking-wider"
                  style={{ borderColor: '#00C48C', color: '#00C48C', textShadow: '0 0 20px rgba(0,196,140,0.5)' }}
                >
                  КОЛЛАБ
                </div>
              )}
              {exiting === 'left' && (
                <div
                  className="absolute top-8 right-6 rotate-[20deg] border-4 rounded-xl px-4 py-1.5 font-black text-xl tracking-wider"
                  style={{ borderColor: '#FF5C5C', color: '#FF5C5C', textShadow: '0 0 20px rgba(255,92,92,0.5)' }}
                >
                  ПРОПУСК
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {!isDone && (
        <div className="flex items-center justify-center gap-8 mt-6 w-full max-w-sm px-4">
          <button
            onClick={handlePass}
            className="flex items-center justify-center rounded-full shadow-lg transition-all active:scale-90 hover:scale-105"
            style={{
              width: 64,
              height: 64,
              background: '#1C1E26',
              border: '2px solid rgba(255,92,92,0.4)',
              boxShadow: '0 8px 32px rgba(255,92,92,0.2)',
              color: '#FF5C5C',
            }}
          >
            <X size={28} strokeWidth={2.5} />
          </button>

          <button
            onClick={handlePass}
            className="flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{
              width: 44,
              height: 44,
              background: 'rgba(255,255,255,0.06)',
              color: '#8F90A6',
            }}
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={handleConnect}
            className="flex items-center justify-center rounded-full shadow-lg transition-all active:scale-90 hover:scale-105"
            style={{
              width: 64,
              height: 64,
              background: '#1C1E26',
              border: '2px solid rgba(0,196,140,0.4)',
              boxShadow: '0 8px 32px rgba(0,196,140,0.2)',
              color: '#00C48C',
            }}
          >
            <Heart size={26} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {!isDone && (
        <div className="flex gap-1.5 mt-4">
          {PROFILES.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? 20 : 6,
                height: 6,
                background: i === currentIndex
                  ? '#00C48C'
                  : i < currentIndex
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
      )}

      {connectProfile && (
        <ConnectModal
          profile={connectProfile}
          onClose={() => setConnectProfile(null)}
        />
      )}
    </div>
  );
}
