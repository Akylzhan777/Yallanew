import { useEffect, useState } from 'react';
import { supabase, GalleryItem } from '../lib/supabase';
import { Download, Share2, Film } from 'lucide-react';

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('gallery_items')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  const handleDownload = (title: string) => alert(`Скачивание файла "${title}" началось...`);
  const handleShare = (title: string) => {
    navigator.clipboard.writeText(`https://portal.example.com/video/${encodeURIComponent(title)}`).then(() => {
      alert(`Ссылка на "${title}" скопирована!`);
    });
  };

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="px-4 pt-5 pb-6">
      <div className="mb-4">
        <h1 className="font-bold text-white text-xl leading-tight">Мои файлы</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8F90A6' }}>Ваши готовые видео и материалы.</p>
      </div>

      {items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 rounded-2xl text-center"
          style={{ background: '#1A1D25', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Film size={32} className="mb-3 opacity-30" color="#fff" />
          <div className="text-sm font-medium" style={{ color: '#8F90A6' }}>Файлов пока нет</div>
          <div className="text-xs mt-1" style={{ color: '#555' }}>Администратор ещё не добавил видео</div>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#1A1D25', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4"
              style={{
                height: 64,
                borderBottom: idx < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <div className="flex-shrink-0 rounded-xl overflow-hidden" style={{ width: 44, height: 44 }}>
                <img
                  src={item.img_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={e => (e.currentTarget.src = 'https://placehold.co/120x120/1C1E26/FFF?text=V')}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate" style={{ fontSize: '0.82rem' }}>
                  {item.title}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#8F90A6' }}>
                  {item.date_label} · {item.size_label}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleDownload(item.title)}
                  className="flex items-center justify-center w-8 h-8 rounded-xl transition-all active:scale-90"
                  style={{ background: 'rgba(0,196,140,0.1)', color: '#00C48C' }}
                  title="Скачать"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => handleShare(item.title)}
                  className="flex items-center justify-center w-8 h-8 rounded-xl transition-all active:scale-90"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#8F90A6' }}
                  title="Поделиться"
                >
                  <Share2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
