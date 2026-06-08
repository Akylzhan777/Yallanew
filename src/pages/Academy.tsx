import { academy } from '../data/mockData';
import { ChevronRight, Clock } from 'lucide-react';

export default function Academy() {
  return (
    <div className="px-4 pt-5 pb-6">
      <div className="mb-4">
        <h1 className="font-bold text-white text-xl leading-tight">Академия автора</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8F90A6' }}>Полезные материалы для подготовки к съемке.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {academy.map(item => (
          <div
            key={item.id}
            className="rounded-2xl p-3.5 flex flex-col gap-2 cursor-pointer transition-all active:scale-95"
            style={{ background: '#1A1D25', border: '1px solid rgba(255,255,255,0.06)' }}
            onClick={() => alert(`Открываю статью: "${item.title}"`)}
          >
            <div className="text-2xl leading-none">{item.icon}</div>
            <div className="font-semibold text-white leading-snug" style={{ fontSize: '0.82rem' }}>
              {item.title}
            </div>
            <div className="flex items-center gap-1 mt-auto" style={{ color: '#8F90A6' }}>
              <Clock size={11} />
              <span style={{ fontSize: '0.68rem' }}>{item.readTime}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
