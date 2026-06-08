import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ScriptItem {
  id: string;
  title: string;
  tags: string[];
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 animate-pulse">
      <div className="h-4 w-3/4 rounded bg-white/10 mb-3" />
      <div className="h-3 w-1/2 rounded bg-white/10 mb-4" />
      <div className="flex gap-2">
        <div className="h-5 w-14 rounded-full bg-white/10" />
        <div className="h-5 w-10 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

export default function Scripts() {
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchScripts() {
      setLoading(true);
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke('get-scripts');
      if (fnError) {
        setError('Не удалось загрузить сценарии.');
      } else {
        setScripts(data?.scripts ?? []);
      }
      setLoading(false);
    }
    fetchScripts();
  }, []);

  return (
    <div className="px-4 pt-5 pb-6">
      <div className="mb-6">
        <h1 className="font-bold text-white text-xl leading-tight">Сценарии</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8F90A6' }}>
          Управляйте своими идеями для съемки.
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && scripts.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm" style={{ color: '#8F90A6' }}>
            Нет доступных сценариев.
          </p>
        </div>
      )}

      {!loading && !error && scripts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {scripts.map((script) => (
            <div
              key={script.id}
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 cursor-pointer transition-all duration-200 hover:bg-white/10 hover:border-white/20 hover:shadow-lg"
            >
              <h3 className="font-semibold text-white text-base leading-snug mb-1 line-clamp-2">
                {script.title}
              </h3>
              {script.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {script.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
