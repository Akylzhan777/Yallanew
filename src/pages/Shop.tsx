import { useEffect, useState } from 'react';
import { supabase, Product } from '../lib/supabase';
import { ShoppingCart } from 'lucide-react';

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .order('created_at')
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      });
  }, []);

  const handleBuy = (name: string) => alert(`Заказ на "${name}" создан! Наш менеджер свяжется с вами.`);

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="px-4 pt-5 pb-6">
      <div className="mb-4">
        <h1 className="font-bold text-white text-xl leading-tight">Магазин техники</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8F90A6' }}>Всё для качественной съемки.</p>
      </div>

      {products.length === 0 ? (
        <p className="text-sm" style={{ color: '#8F90A6' }}>Товары временно недоступны.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map(product => (
            <div
              key={product.id}
              className="rounded-2xl overflow-hidden flex flex-col"
              style={{ background: '#1A1D25', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <img
                src={product.img_url || 'https://placehold.co/400x300/1C1E26/FFF?text=Товар'}
                alt={product.name}
                className="w-full object-cover"
                style={{ aspectRatio: '4/3', display: 'block' }}
                onError={e => (e.currentTarget.src = 'https://placehold.co/400x300/1C1E26/FFF?text=Товар')}
              />
              <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                <div className="font-semibold text-white leading-snug" style={{ fontSize: '0.78rem' }}>
                  {product.name}
                </div>
                <div className="font-bold" style={{ color: '#00C48C', fontSize: '0.82rem' }}>
                  {product.price}
                </div>
                <button
                  onClick={() => handleBuy(product.name)}
                  className="mt-auto w-full flex items-center justify-center gap-1 py-1.5 rounded-xl font-bold transition-all active:scale-95"
                  style={{ background: 'rgba(0,196,140,0.12)', color: '#00C48C', fontSize: '0.68rem', border: '1px solid rgba(0,196,140,0.25)' }}
                >
                  <ShoppingCart size={10} />
                  В корзину
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
