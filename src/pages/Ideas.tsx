import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ideas } from '../data/mockData';
import { Zap } from 'lucide-react';

export default function Ideas() {
  const { user } = useAuth();

  const handleUseIdea = async (title: string) => {
    if (!user) return;
    const { error } = await supabase.from('scripts').insert({
      user_id: user.id,
      title,
      status: 'Черновик',
    });
    if (!error) alert(`Черновик "${title}" создан!`);
  };

  return (
    <div className="px-4 pt-5 pb-6">
      <div className="mb-4">
        <h1 className="font-bold text-white text-xl leading-tight">Идеи и Тренды</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8F90A6' }}>Не знаешь что снять? Выбери идею.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ideas.map(idea => (
          <div
            key={idea.id}
            className="rounded-2xl overflow-hidden relative"
            style={{ background: '#1A1D25', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="relative">
              <img
                src={idea.img}
                alt={idea.title}
                className="w-full object-cover"
                style={{ aspectRatio: '3/4', display: 'block' }}
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }}
              />
              <span
                className="absolute top-2 left-2 font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.85)', fontSize: '0.65rem', backdropFilter: 'blur(4px)' }}
              >
                {idea.category}
              </span>
              <div className="absolute bottom-0 inset-x-0 px-2.5 pb-2.5">
                <div className="font-semibold text-white leading-tight mb-2" style={{ fontSize: '0.78rem' }}>
                  {idea.title}
                </div>
                <button
                  onClick={() => handleUseIdea(idea.title)}
                  className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl font-bold transition-all active:scale-95"
                  style={{ background: 'rgba(0,196,140,0.85)', color: '#fff', fontSize: '0.68rem', backdropFilter: 'blur(4px)' }}
                >
                  <Zap size={10} />
                  Снять это
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
