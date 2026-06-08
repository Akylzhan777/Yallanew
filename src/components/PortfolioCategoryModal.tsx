import { useEffect, useRef, useState } from 'react';
import { X, Play, Users, ChevronLeft, Film, MessageCircle, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PortfolioClient {
  id: string;
  first_name: string;
  last_name: string;
  profession: string;
  followers_count: string;
  stats: string;
  cover_img: string;
  videos: Array<{ type: string; src: string; title: string; poster?: string }>;
  category: string;
  case_task?: string;
  case_solution?: string;
  case_result?: string;
}

interface Props {
  category: string;
  categoryColor: string;
  categoryBg: string;
  onClose: () => void;
}

type EmbedResult =
  | { kind: 'direct'; url: string }
  | { kind: 'iframe'; url: string }
  | { kind: 'unsupported'; url: string };

function resolveEmbed(src: string): EmbedResult {
  const s = src.trim();

  if (/\.(mp4|mov|webm|ogg)/i.test(s)) return { kind: 'direct', url: s };

  const driveMatch = s.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) return { kind: 'direct', url: `https://drive.google.com/uc?export=download&id=${driveMatch[1]}` };

  if (s.includes('youtube.com/embed/') || s.includes('youtube-nocookie.com/embed/')) return { kind: 'iframe', url: s };
  const ytWatch = s.match(/youtube\.com\/watch\?(?:.*&)?v=([^&]+)/);
  if (ytWatch) return { kind: 'iframe', url: `https://www.youtube.com/embed/${ytWatch[1]}?autoplay=1&rel=0` };
  const ytShort = s.match(/youtu\.be\/([^?&/]+)/);
  if (ytShort) return { kind: 'iframe', url: `https://www.youtube.com/embed/${ytShort[1]}?autoplay=1&rel=0` };
  const ytShorts = s.match(/youtube\.com\/shorts\/([^?&/]+)/);
  if (ytShorts) return { kind: 'iframe', url: `https://www.youtube.com/embed/${ytShorts[1]}?autoplay=1&rel=0` };

  const vimeo = s.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { kind: 'iframe', url: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1` };

  if (s.includes('instagram.com')) {
    const igClean = s.replace(/\/$/, '');
    return { kind: 'iframe', url: `${igClean}/embed` };
  }

  const tiktokMatch = s.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (tiktokMatch) return { kind: 'iframe', url: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}` };

  return { kind: 'unsupported', url: s };
}

function getAutoThumb(src: string): string | null {
  const ytWatch = src.match(/youtube\.com\/watch\?(?:.*&)?v=([^&]+)/);
  if (ytWatch) return `https://img.youtube.com/vi/${ytWatch[1]}/mqdefault.jpg`;
  const ytShort = src.match(/youtu\.be\/([^?&/]+)/);
  if (ytShort) return `https://img.youtube.com/vi/${ytShort[1]}/mqdefault.jpg`;
  const ytEmbed = src.match(/youtube\.com\/embed\/([^?&/]+)/);
  if (ytEmbed) return `https://img.youtube.com/vi/${ytEmbed[1]}/mqdefault.jpg`;
  const ytShorts = src.match(/youtube\.com\/shorts\/([^?&/]+)/);
  if (ytShorts) return `https://img.youtube.com/vi/${ytShorts[1]}/mqdefault.jpg`;
  return null;
}

/* ─── FULLSCREEN VIDEO PLAYER MODAL ──────────────────────────────────────── */
function VideoPlayerModal({
  video,
  clientName,
  onClose,
}: {
  video: { src: string; title: string; poster?: string };
  clientName: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 20000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 430,
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          position: 'relative',
          background: '#000',
        }}
      >
        {/* close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 3,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '50%',
            width: 42,
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          <X size={20} color="#fff" />
        </button>

        {/* title */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 70,
          right: 16,
          zIndex: 3,
          pointerEvents: 'none',
        }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            {video.title || clientName}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginTop: 2 }}>
            {clientName}
          </div>
        </div>

        {/* native video player */}
        <div style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
        }}>
          <video
            ref={videoRef}
            src={video.src}
            controls
            autoPlay
            playsInline
            controlsList="nodownload"
            poster={video.poster || undefined}
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── VIDEO THUMBNAIL CARD ────────────────────────────────────────────────── */
function VideoThumbnail({
  video,
  accent,
  onClick,
}: {
  video: { src: string; title: string; poster?: string };
  accent: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const src = video.src?.trim() ?? '';
  const isDirect = /\.(mp4|mov|webm|ogg)/i.test(src);
  const autoThumb = getAutoThumb(src);
  const hasUploadedPoster = !imgError && !!video.poster;
  const useStaticThumb = hasUploadedPoster || !!autoThumb;
  const useDirectVideo = !useStaticThumb && isDirect;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        aspectRatio: '9/16',
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        transform: hovered ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 0.15s',
        background: '#0d0e14',
      }}
    >
      {/* background: poster image > YouTube thumb > native video preview > gradient placeholder */}
      {useStaticThumb ? (
        <img
          src={hasUploadedPoster ? video.poster! : autoThumb!}
          alt={video.title}
          onError={() => setImgError(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : useDirectVideo ? (
        <video
          src={src}
          muted
          preload="metadata"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(145deg, #13151e, ${accent}28)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Film size={28} color={`${accent}88`} />
        </div>
      )}

      {/* dark vignette overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 3,
        background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* hover brighten */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 4,
        background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        transition: 'background 0.15s',
        pointerEvents: 'none',
      }} />

      {/* play button + title */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '8px 8px 10px',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: hovered ? accent : 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(4px)',
          borderRadius: '50%',
          width: 34,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
          transition: 'background 0.15s',
          flexShrink: 0,
        }}>
          <Play size={14} color="#fff" fill="#fff" />
        </div>
        {video.title && (
          <div style={{
            color: '#fff',
            fontSize: '0.68rem',
            fontWeight: 600,
            lineHeight: 1.3,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}>
            {video.title}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── CLIENT VIDEOS MODAL ─────────────────────────────────────────────────── */
function ClientVideosModal({
  client: initialClient,
  categoryColor,
  onClose,
  onBack,
}: {
  client: PortfolioClient;
  categoryColor: string;
  onClose: () => void;
  onBack: () => void;
}) {
  const [client, setClient] = useState<PortfolioClient>(initialClient);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<{ src: string; title: string; poster?: string } | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    supabase
      .from('portfolio_clients')
      .select('*')
      .eq('id', initialClient.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setClient(data as PortfolioClient);
        setLoading(false);
      });
  }, [initialClient.id]);

  const videos = client.videos ?? [];

  return (
    <>
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 15001,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          flex: 1,
          background: '#111318',
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {/* sticky header */}
          <div style={{
            padding: '20px 16px 12px',
            borderBottom: '1px solid #1e2030',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'sticky',
            top: 0,
            background: '#111318',
            zIndex: 2,
          }}>
            <button
              onClick={onBack}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: 'none',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={20} color="#fff" />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2 }}>
                {client.first_name} {client.last_name}
              </div>
              <div style={{ color: '#8F90A6', fontSize: '0.78rem', marginTop: 2 }}>
                {client.profession}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: 'none',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} color="#fff" />
            </button>
          </div>

          {/* client profile row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px',
            borderBottom: '1px solid #1e2030',
          }}>
            <img
              src={client.cover_img || 'https://placehold.co/80x80/1a1a2e/555?text=?'}
              alt={client.first_name}
              onError={e => (e.currentTarget.src = 'https://placehold.co/80x80/1a1a2e/555?text=?')}
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                objectFit: 'cover',
                border: `2px solid ${categoryColor}44`,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              {client.followers_count && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Users size={13} color={categoryColor} />
                  <span style={{ color: categoryColor, fontWeight: 700, fontSize: '0.88rem' }}>
                    {client.followers_count} подписчиков
                  </span>
                </div>
              )}
              {client.stats && (
                <div style={{
                  display: 'inline-block',
                  background: `${categoryColor}18`,
                  border: `1px solid ${categoryColor}44`,
                  borderRadius: 6,
                  padding: '3px 10px',
                  color: categoryColor,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}>
                  {client.stats}
                </div>
              )}
              <div style={{ color: '#8F90A6', fontSize: '0.75rem', marginTop: 6 }}>
                {loading ? '...' : `${videos.length} видео`}
              </div>
            </div>
          </div>

          {/* case study block */}
          {(client.case_task || client.case_solution || client.case_result) && (
            <div style={{
              margin: '0 16px 0',
              background: 'linear-gradient(135deg, #13151e 0%, #1a1c28 100%)',
              border: `1px solid ${categoryColor}22`,
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${categoryColor}22`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <TrendingUp size={15} color={categoryColor} />
                <span style={{ color: categoryColor, fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                  Кейс
                </span>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {client.case_task && (
                  <div>
                    <div style={{ color: '#8F90A6', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 5 }}>
                      Задача
                    </div>
                    <div style={{ color: '#d4d6e0', fontSize: '0.88rem', lineHeight: 1.6 }}>
                      {client.case_task}
                    </div>
                  </div>
                )}
                {client.case_solution && (
                  <div>
                    <div style={{ color: '#8F90A6', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 5 }}>
                      Решение
                    </div>
                    <div style={{ color: '#d4d6e0', fontSize: '0.88rem', lineHeight: 1.6 }}>
                      {client.case_solution}
                    </div>
                  </div>
                )}
                {client.case_result && (
                  <div>
                    <div style={{ color: categoryColor, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 5 }}>
                      Результат
                    </div>
                    <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.6 }}>
                      {client.case_result}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* video grid */}
          {(client.case_task || client.case_solution || client.case_result) && videos.length > 0 && (
            <div style={{ padding: '16px 16px 4px', color: '#8F90A6', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              Работы
            </div>
          )}
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#4B5063', fontSize: '0.9rem' }}>
              Загрузка...
            </div>
          ) : videos.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#4B5063', fontSize: '0.9rem' }}>
              Видео пока не добавлены
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 3,
              padding: 3,
            }}>
              {videos.map((v, i) => (
                <VideoThumbnail
                  key={i}
                  video={v}
                  accent={categoryColor}
                  onClick={() => setActiveVideo(v)}
                />
              ))}
            </div>
          )}

          {/* WhatsApp CTA */}
          <div style={{ padding: '20px 16px 32px' }}>
            <a
              href="https://wa.me/971000000000?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82!%20%D0%A5%D0%BE%D1%87%D1%83%20%D0%BE%D0%B1%D1%81%D1%83%D0%B4%D0%B8%D1%82%D1%8C%20%D1%81%D1%8A%D1%91%D0%BC%D0%BA%D1%83%20Reels%20%D0%B2%20%D0%94%D1%83%D0%B1%D0%B0%D0%B5"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: 'linear-gradient(135deg, #25D366 0%, #1da851 100%)',
                color: '#fff',
                borderRadius: 14,
                padding: '16px 24px',
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 6px 28px rgba(37,211,102,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 10px 36px rgba(37,211,102,0.45)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 28px rgba(37,211,102,0.35)';
              }}
            >
              <MessageCircle size={20} color="#fff" fill="#fff" />
              Узнать цену на безлимит
            </a>
          </div>
        </div>
      </div>

      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          clientName={`${client.first_name} ${client.last_name}`}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </>
  );
}

/* ─── CLIENT CARD (list view — unchanged layout) ──────────────────────────── */
function ClientCard({
  client,
  accent,
  onClick,
}: {
  client: PortfolioClient;
  accent: string;
  onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        background: '#1a1c24',
        border: '1px solid #1e2030',
        borderRadius: 14,
        padding: '14px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        transition: 'transform 0.1s',
      }}
    >
      <img
        src={client.cover_img || 'https://placehold.co/60x60/1a1a2e/555?text=?'}
        alt={client.first_name}
        onError={e => (e.currentTarget.src = 'https://placehold.co/60x60/1a1a2e/555?text=?')}
        style={{
          width: 60,
          height: 60,
          borderRadius: 12,
          objectFit: 'cover',
          border: `1.5px solid ${accent}33`,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>
          {client.first_name} {client.last_name}
        </div>
        {client.profession && (
          <div style={{ color: '#8F90A6', fontSize: '0.75rem', marginTop: 2, lineHeight: 1.3 }}>
            {client.profession}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' as const }}>
          {client.followers_count && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={11} color={accent} />
              <span style={{ color: accent, fontWeight: 700, fontSize: '0.78rem' }}>
                {client.followers_count}
              </span>
            </div>
          )}
          {client.stats && (
            <span style={{
              background: `${accent}18`,
              border: `1px solid ${accent}33`,
              borderRadius: 4,
              padding: '1px 7px',
              color: accent,
              fontSize: '0.7rem',
              fontWeight: 700,
            }}>
              {client.stats}
            </span>
          )}
          {(client.videos?.length ?? 0) > 0 && (
            <span style={{ color: '#4B5063', fontSize: '0.7rem' }}>
              {client.videos.length} видео
            </span>
          )}
        </div>
      </div>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: `${accent}18`,
        border: `1px solid ${accent}33`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Play size={11} color={accent} fill={accent} />
      </div>
    </div>
  );
}

/* ─── MAIN MODAL ──────────────────────────────────────────────────────────── */
export default function PortfolioCategoryModal({ category, categoryColor, categoryBg, onClose }: Props) {
  const [clients, setClients] = useState<PortfolioClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<PortfolioClient | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    supabase
      .from('portfolio_clients')
      .select('*')
      .eq('category', category)
      .order('sort_order')
      .then(({ data }) => {
        setClients((data ?? []) as PortfolioClient[]);
        setLoading(false);
      });
  }, [category]);

  if (selectedClient) {
    return (
      <ClientVideosModal
        client={selectedClient}
        categoryColor={categoryColor}
        onClose={onClose}
        onBack={() => setSelectedClient(null)}
      />
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 15000,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        flex: 1,
        background: '#111318',
        maxWidth: 480,
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <div style={{
          padding: '0 0 1px',
          background: categoryBg,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: -40, right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: `${categoryColor}30`,
            filter: 'blur(40px)',
          }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 16px 16px',
            position: 'relative',
            zIndex: 1,
          }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>
                ПОРТФОЛИО
              </div>
              <div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.1 }}>
                {category}
              </div>
              {!loading && (
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', marginTop: 4 }}>
                  {clients.length} {clients.length === 1 ? 'клиент' : clients.length < 5 ? 'клиента' : 'клиентов'}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={20} color="#fff" />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: 12 }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ color: '#8F90A6', fontSize: '0.9rem' }}>Загрузка...</div>
            </div>
          ) : clients.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#4B5063', fontSize: '0.9rem' }}>
              Клиентов в этой категории пока нет
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clients.map(c => (
                <ClientCard
                  key={c.id}
                  client={c}
                  accent={categoryColor}
                  onClick={() => setSelectedClient(c)}
                />
              ))}
            </div>
          )}
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
