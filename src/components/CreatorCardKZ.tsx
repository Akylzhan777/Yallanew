import { Heart, Star, Users, TrendingUp, Clock, CheckCircle, Zap } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useRegion } from '../context/RegionContext';

interface KZCreator {
  id: string;
  name: string;
  handle: string;
  username: string;
  type: string;
  platform: string;
  category: string;
  avatar: string;
  coverPhoto: string;
  followers: number;
  engagement: number;
  avgViews: number;
  location: string;
  rating: number;
  reviewCount: number;
  languages: string[];
  packages: { id: string; name: string; price: number; clientPrice?: number; deliveryDays: number }[];
  bio: string;
  tags: string[];
  verified: boolean;
  featured?: boolean;
  promoted?: boolean;
}

interface Props {
  creator: KZCreator;
}

const COLOR_SCHEMES: Record<string, { gradient: string; accent: string; badge: string }> = {
  blogger: {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    accent: '#667eea',
    badge: 'rgba(102,126,234,0.15)',
  },
  videographer: {
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    accent: '#f5576c',
    badge: 'rgba(245,87,108,0.15)',
  },
  ugc: {
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    accent: '#00f2fe',
    badge: 'rgba(0,242,254,0.15)',
  },
  model: {
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    accent: '#fa709a',
    badge: 'rgba(250,112,154,0.15)',
  },
  photographer: {
    gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    accent: '#30cfd0',
    badge: 'rgba(48,207,208,0.15)',
  },
  editor: {
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    accent: '#a8edea',
    badge: 'rgba(168,237,234,0.15)',
  },
  telegram_channel: {
    gradient: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)',
    accent: '#2AABEE',
    badge: 'rgba(42,171,238,0.15)',
  },
};

const DEFAULT_SCHEME = {
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  accent: '#667eea',
  badge: 'rgba(102,126,234,0.15)',
};

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

export default function CreatorCardKZ({ creator }: Props) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { formatPrice } = useRegion();

  const scheme = COLOR_SCHEMES[creator.type] ?? DEFAULT_SCHEME;
  const inWishlist = isInWishlist(creator.id);
  const profileUrl = creator.username ? `/${creator.username}` : '#';
  const minPrice = creator.packages.length > 0
    ? Math.min(...creator.packages.map(p => p.clientPrice ?? Math.round(p.price * 1.2)))
    : 0;

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) {
      removeFromWishlist(creator.id);
    } else {
      addToWishlist({
        creatorId: creator.id,
        username: creator.username,
        creatorName: creator.name,
        creatorAvatar: creator.avatar,
        creatorType: creator.type,
        savedAt: Date.now(),
      });
    }
  };

  const typeLabel = creator.type.replace(/_/g, ' ');

  return (
    <a
      href={profileUrl}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: 320,
        borderRadius: 20,
        overflow: 'hidden',
        background: 'rgba(15,21,36,0.9)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        textDecoration: 'none',
        position: 'relative',
        transition: 'transform 0.25s, box-shadow 0.25s',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = `0 20px 56px rgba(0,0,0,0.5), 0 0 0 1px ${scheme.accent}33`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
      }}
    >
      {/* Banner */}
      <div style={{ height: 120, background: scheme.gradient, position: 'relative', flexShrink: 0 }}>
        {creator.promoted && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20,
            background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
            color: '#fbbf24', fontSize: 10, fontWeight: 800,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <Zap size={10} fill="currentColor" /> TOP
          </div>
        )}

        {/* Type badge */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          padding: '4px 10px', borderRadius: 20,
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
          color: '#fff', fontSize: 11, fontWeight: 600,
          textTransform: 'capitalize',
        }}>
          {typeLabel}
        </div>

        {/* Rating */}
        {creator.rating > 0 && (
          <div style={{
            position: 'absolute', bottom: 10, left: 10,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 20,
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
          }}>
            <Star size={11} fill="#fbbf24" style={{ color: '#fbbf24' }} />
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>
              {creator.rating.toFixed(1)}
            </span>
            {creator.reviewCount > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                ({creator.reviewCount})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Wishlist button */}
      <button
        onClick={handleWishlist}
        style={{
          position: 'absolute', top: 86, right: 14, zIndex: 10,
          width: 32, height: 32, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: inWishlist ? 'rgba(220,38,38,0.25)' : 'rgba(0,0,0,0.45)',
          border: inWishlist ? '1.5px solid rgba(220,38,38,0.7)' : '1.5px solid rgba(255,255,255,0.2)',
          color: inWishlist ? '#f87171' : '#fff',
          backdropFilter: 'blur(8px)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        title={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
      >
        <Heart size={14} fill={inWishlist ? 'currentColor' : 'none'} />
      </button>

      {/* Avatar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -36, position: 'relative', zIndex: 5, marginBottom: 10 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
          border: `3px solid rgba(15,21,36,1)`,
          boxShadow: `0 0 0 2px ${scheme.accent}55`,
        }}>
          <img
            src={creator.avatar}
            alt={creator.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </div>

      {/* Name + handle + verified */}
      <div style={{ textAlign: 'center', padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>
            {creator.name}
          </span>
          {creator.verified && (
            <CheckCircle size={14} style={{ color: scheme.accent, flexShrink: 0 }} fill={scheme.accent} />
          )}
        </div>
        <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{creator.handle || `@${creator.username}`}</p>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', justifyContent: 'space-around',
        padding: '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        marginBottom: 12,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 2 }}>
            <Users size={11} style={{ color: scheme.accent }} />
            <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 700 }}>
              {formatFollowers(creator.followers)}
            </span>
          </div>
          <span style={{ color: '#475569', fontSize: 10 }}>followers</span>
        </div>

        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch' }} />

        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 2 }}>
            <TrendingUp size={11} style={{ color: scheme.accent }} />
            <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 700 }}>
              {creator.engagement > 0 ? `${creator.engagement.toFixed(1)}%` : '—'}
            </span>
          </div>
          <span style={{ color: '#475569', fontSize: 10 }}>engagement</span>
        </div>

        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch' }} />

        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 2 }}>
            <Clock size={11} style={{ color: scheme.accent }} />
            <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 700 }}>
              {creator.packages[0]?.deliveryDays ?? 3}d
            </span>
          </div>
          <span style={{ color: '#475569', fontSize: 10 }}>delivery</span>
        </div>
      </div>

      {/* Tags */}
      {creator.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 14px 12px' }}>
          {creator.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              style={{
                padding: '3px 9px', borderRadius: 20,
                background: scheme.badge,
                color: scheme.accent,
                fontSize: 11, fontWeight: 600,
                border: `1px solid ${scheme.accent}22`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Price + CTA */}
      <div style={{ padding: '12px 14px 14px', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#475569', fontSize: 10, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              from
            </p>
            <p style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 800, margin: 0 }}>
              {minPrice > 0 ? formatPrice(minPrice) : '—'}
            </p>
          </div>
          <span
            style={{
              padding: '9px 18px', borderRadius: 12,
              background: scheme.gradient,
              color: '#fff', fontSize: 13, fontWeight: 700,
              boxShadow: `0 4px 14px ${scheme.accent}44`,
              letterSpacing: '-0.01em',
            }}
          >
            Book
          </span>
        </div>
      </div>
    </a>
  );
}
