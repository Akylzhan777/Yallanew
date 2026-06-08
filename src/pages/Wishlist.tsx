import { useWishlist } from '../context/WishlistContext';
import { Heart, Trash2, ArrowRight } from 'lucide-react';

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, clearWishlist } = useWishlist();

  if (wishlist.length === 0) {
    return (
      <div style={{ marginTop: 80, padding: '80px 40px', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Heart size={32} style={{ color: '#ef4444', opacity: 0.5 }} />
        </div>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Your wishlist is empty</h2>
        <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: 14 }}>
          Save creators to compare and book them later
        </p>
        <a
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', background: '#00c48c',
            color: '#000', borderRadius: 10, textDecoration: 'none',
            fontWeight: 700, fontSize: 14,
          }}
        >
          Explore Creators <ArrowRight size={15} />
        </a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 80, padding: '40px 20px', maxWidth: 1200, margin: '80px auto 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Heart size={18} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Wishlist</h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>{wishlist.length} saved creator{wishlist.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => { if (confirm('Clear all saved creators?')) clearWishlist(); }}
          style={{
            padding: '8px 16px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444', borderRadius: 8,
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          Clear all
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {wishlist.map(item => (
          <div
            key={item.creatorId}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: 16,
              display: 'flex', flexDirection: 'column', gap: 12,
              transition: 'border-color 0.2s',
            }}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              <img
                src={item.creatorAvatar || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150'}
                alt={item.creatorName}
                style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: 0 }}>{item.creatorName}</p>
                <p style={{ color: '#64748b', fontSize: 12, margin: '2px 0 0', textTransform: 'capitalize' }}>
                  {item.creatorType?.replace(/_/g, ' ')}
                </p>
                <p style={{ color: '#475569', fontSize: 11, margin: '4px 0 0' }}>
                  Saved {new Date(item.savedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={`/${item.username || item.creatorId}`}
                style={{
                  flex: 1, padding: '8px 12px',
                  background: 'rgba(0,196,140,0.1)',
                  border: '1px solid rgba(0,196,140,0.25)',
                  color: '#00c48c', borderRadius: 8,
                  textDecoration: 'none', fontSize: 13, fontWeight: 600,
                  textAlign: 'center', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                View <ArrowRight size={13} />
              </a>
              <button
                onClick={() => removeFromWishlist(item.creatorId)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#ef4444', borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title="Remove"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
