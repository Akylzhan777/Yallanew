import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface VideoAnalysis {
  id: string;
  video_url: string;
  transcript: string;
  analysis: string;
  requested_by: string | null;
  created_at: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function VideoAnalysisPanel() {
  const [analyses, setAnalyses] = useState<VideoAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Record<string, 'transcript' | 'analysis'>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('video_analyses')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setAnalyses(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const handleAnalyze = async () => {
    if (!videoUrl.trim()) { setError('Please enter a video URL'); return; }
    setAnalyzing(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/telegram-broadcast/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ video_url: videoUrl.trim(), requested_by: 'admin' }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'Analysis failed');
      setSuccess('Analysis complete! Saved to history.');
      setVideoUrl('');
      await fetchAnalyses();
    } catch (e) {
      setError(String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
  };

  const getPlatformColor = (url: string) => {
    if (url.includes('youtube') || url.includes('youtu.be')) return { color: '#EF4444', bg: '#EF444415', label: 'YouTube' };
    if (url.includes('instagram')) return { color: '#E1306C', bg: '#E1306C15', label: 'Instagram' };
    if (url.includes('tiktok')) return { color: '#69C9D0', bg: '#69C9D015', label: 'TikTok' };
    return { color: '#6B7280', bg: '#6B728015', label: getDomain(url) };
  };

  const toggleSection = (id: string, section: 'transcript' | 'analysis') => {
    setActiveSection(prev => ({ ...prev, [id]: section }));
  };

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, #1A3A2A 0%, #0F2218 100%)',
          border: '1px solid #2D5A3D',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', flexShrink: 0,
        }}>
          🎬
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            Video Analysis — Virale
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '3px 0 0 0' }}>
            AI-powered content analysis via Gemini · YouTube & Reels
          </p>
        </div>
      </div>

      <div style={{
        background: '#0D1117',
        border: '1px solid #1F2937',
        borderRadius: 14,
        padding: '20px',
        marginBottom: 24,
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          Analyze New Video
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            placeholder="https://youtube.com/watch?v=... or Instagram Reels URL"
            style={{
              flex: 1,
              padding: '10px 14px',
              background: '#161B22',
              border: '1px solid #2D3748',
              borderRadius: 8,
              color: '#E5E7EB',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#22C55E'}
            onBlur={e => e.currentTarget.style.borderColor = '#2D3748'}
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !videoUrl.trim()}
            style={{
              padding: '10px 20px',
              background: analyzing ? '#1A2E1A' : 'linear-gradient(135deg, #16A34A, #15803D)',
              border: '1px solid ' + (analyzing ? '#2D4A2D' : '#22C55E50'),
              borderRadius: 8,
              color: analyzing ? '#4B7A4B' : '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: analyzing ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              minWidth: 110,
            }}
          >
            {analyzing ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 12, height: 12, border: '2px solid #4B7A4B',
                  borderTopColor: '#22C55E', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block',
                }} />
                Analyzing...
              </span>
            ) : 'Analyze'}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#1F0A0A', border: '1px solid #DC262630', borderRadius: 6, fontSize: '0.8rem', color: '#F87171' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#0A1F0A', border: '1px solid #22C55E30', borderRadius: 6, fontSize: '0.8rem', color: '#4ADE80' }}>
            {success}
          </div>
        )}

        <div style={{ marginTop: 12, padding: '10px 14px', background: '#0A0D12', border: '1px solid #1E3A5F', borderRadius: 8, fontSize: '0.78rem', color: '#6B7280', lineHeight: '1.6' }}>
          You can also trigger analysis from Telegram: <span style={{ color: '#60A5FA', fontFamily: 'monospace' }}>/analyze [URL]</span> — the bot will reply with the full analysis.
        </div>
      </div>

      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
        Analysis History ({analyses.length})
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 80, background: '#0D1117', border: '1px solid #1F2937', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <div style={{
          padding: '48px 24px',
          background: '#0D1117',
          border: '1px dashed #1F2937',
          borderRadius: 14,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: '0.9rem', color: '#4B5563', fontWeight: 500 }}>No analyses yet</div>
          <div style={{ fontSize: '0.8rem', color: '#374151', marginTop: 4 }}>Paste a YouTube or Reels URL above to get started</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {analyses.map(item => {
            const platform = getPlatformColor(item.video_url);
            const isExpanded = expanded === item.id;
            const section = activeSection[item.id] ?? 'analysis';

            return (
              <div
                key={item.id}
                style={{
                  background: '#0D1117',
                  border: `1px solid ${isExpanded ? '#2D3748' : '#1F2937'}`,
                  borderRadius: 12,
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
              >
                <div
                  onClick={() => setExpanded(isExpanded ? null : item.id)}
                  style={{
                    padding: '16px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#161B22')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: platform.bg,
                    border: `1px solid ${platform.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', flexShrink: 0,
                  }}>
                    {platform.label === 'YouTube' ? '▶' : platform.label === 'Instagram' ? '📸' : '🎵'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 7px',
                        background: platform.bg,
                        border: `1px solid ${platform.color}40`,
                        borderRadius: 4,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: platform.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        flexShrink: 0,
                      }}>
                        {platform.label}
                      </span>
                      <span style={{
                        fontSize: '0.82rem',
                        color: '#60A5FA',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 320,
                      }}>
                        {item.video_url}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: '0.75rem', color: '#4B5563' }}>{formatDate(item.created_at)}</span>
                      {item.requested_by && (
                        <span style={{ fontSize: '0.75rem', color: '#374151' }}>by {item.requested_by}</span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    color: '#4B5563',
                    fontSize: '0.9rem',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                  }}>
                    ▾
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid #1F2937' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #1F2937' }}>
                      {(['analysis', 'transcript'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => toggleSection(item.id, s)}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            background: section === s ? '#161B22' : 'transparent',
                            border: 'none',
                            borderBottom: section === s ? '2px solid #22C55E' : '2px solid transparent',
                            color: section === s ? '#E5E7EB' : '#6B7280',
                            fontSize: '0.8rem',
                            fontWeight: section === s ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            textTransform: 'capitalize',
                          }}
                        >
                          {s === 'analysis' ? 'Analysis' : 'Transcript'}
                        </button>
                      ))}
                    </div>

                    <div style={{ padding: '16px 20px' }}>
                      {section === 'analysis' ? (
                        <div style={{ fontSize: '0.83rem', color: '#D1D5DB', lineHeight: '1.75', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {item.analysis || 'No analysis available'}
                        </div>
                      ) : (
                        <div style={{
                          fontSize: '0.82rem', color: '#9CA3AF', lineHeight: '1.75',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                          background: '#0A0D12', border: '1px solid #1F2937',
                          borderRadius: 8, padding: '12px 14px',
                          maxHeight: 300, overflowY: 'auto',
                        }}>
                          {item.transcript || 'No transcript available'}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '0 20px 14px', display: 'flex', gap: 8 }}>
                      <a
                        href={item.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          border: '1px solid #2D3748',
                          borderRadius: 6,
                          color: '#60A5FA',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          textDecoration: 'none',
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#60A5FA'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#2D3748'}
                      >
                        Open Video
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
