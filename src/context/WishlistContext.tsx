import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface WishlistItem {
  creatorId: string;
  username: string;
  creatorName: string;
  creatorAvatar: string;
  creatorType: string;
  savedAt: number;
}

interface WishlistContextValue {
  wishlist: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (creatorId: string) => void;
  isInWishlist: (creatorId: string) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('yalla_wishlist');
    if (saved) {
      try { setWishlist(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('yalla_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const addToWishlist = (item: WishlistItem) => {
    setWishlist(prev =>
      prev.some(w => w.creatorId === item.creatorId) ? prev : [...prev, item]
    );
  };

  const removeFromWishlist = (creatorId: string) => {
    setWishlist(prev => prev.filter(w => w.creatorId !== creatorId));
  };

  const isInWishlist = (creatorId: string) => wishlist.some(w => w.creatorId === creatorId);

  const clearWishlist = () => setWishlist([]);

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, clearWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
