import { useEffect, useRef, useState, memo } from 'react';
import { supabase } from '../lib/supabase';

export interface MarqueeStar {
  id: string;
  name: string;
  status_text: string;
  photo_url: string;
  social_url: string;
  is_active: boolean;
  sort_order: number;
}

const FALLBACK_STARS: MarqueeStar[] = [
  { id: '1', name: 'Ahmed Al Rashidi', status_text: '2.4M views', photo_url: 'https://images.pexels.com/photos/3153198/pexels-photo-3153198.jpeg?auto=compress&cs=tinysrgb&w=400', social_url: '', is_active: true, sort_order: 1 },
  { id: '2', name: 'Sara Al Mansouri', status_text: '890K followers', photo_url: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=400', social_url: '', is_active: true, sort_order: 2 },
  { id: '3', name: 'Khalid Bin Zayed', status_text: '1.7M views', photo_url: 'https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=400', social_url: '', is_active: true, sort_order: 3 },
  { id: '4', name: 'Maya Farouq', status_text: '3.1M followers', photo_url: 'https://images.pexels.com/photos/4009402/pexels-photo-4009402.jpeg?auto=compress&cs=tinysrgb&w=400', social_url: '', is_active: true, sort_order: 4 },
  { id: '5', name: 'Omar El Sheikh', status_text: '540K views', photo_url: 'https://images.pexels.com/photos/3379934/pexels-photo-3379934.jpeg?auto=compress&cs=tinysrgb&w=400', social_url: '', is_active: true, sort_order: 5 },
  { id: '6', name: 'Noor Al Hamdan', status_text: '1.2M followers', photo_url: 'https://images.pexels.com/photos/7163399/pexels-photo-7163399.jpeg?auto=compress&cs=tinysrgb&w=400', social_url: '', is_active: true, sort_order: 6 },
  { id: '7', name: 'Layla Hassan', status_text: '780K views', photo_url: 'https://images.pexels.com/photos/5704720/pexels-photo-5704720.jpeg?auto=compress&cs=tinysrgb&w=400', social_url: '', is_active: true, sort_order: 7 },
  { id: '8', name: 'Rami Yousef', status_text: '4.5M followers', photo_url: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=400', social_url: '', is_active: true, sort_order: 8 },
];

interface Props {
  onStarClick?: (star: MarqueeStar) => void;
}

const StarCard = memo(function StarCard({ star, onClick }: { star: MarqueeStar; onClick: () => void }) {
  return (
    <button className="mq-star-card" onClick={onClick} type="button" tabIndex={0}>
      <div className="mq-star-photo-wrap">
        <img
          src={star.photo_url}
          alt={star.name}
          className="mq-star-photo"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </div>
      <div className="mq-star-name">{star.name}</div>
      <div className="mq-star-status">{star.status_text}</div>
    </button>
  );
});

export default function MarqueeStrip({ onStarClick }: Props) {
  const [stars, setStars] = useState<MarqueeStar[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  useEffect(() => {
    supabase
      .from('marquee_stars')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setStars(data && data.length > 0 ? data : FALLBACK_STARS);
      });
  }, []);

  const displayStars = stars.length > 0 ? stars : FALLBACK_STARS;
  const loopedStars = [...displayStars, ...displayStars, ...displayStars];

  const handlePause = () => {
    paused.current = true;
    if (trackRef.current) trackRef.current.style.animationPlayState = 'paused';
  };
  const handleResume = () => {
    paused.current = false;
    if (trackRef.current) trackRef.current.style.animationPlayState = 'running';
  };

  return (
    <section className="mq-section">
      <div className="mq-label-row">
        <div className="lp2-section-label">Наши звёзды</div>
      </div>
      <div
        className="mq-viewport"
        onMouseEnter={handlePause}
        onMouseLeave={handleResume}
        onTouchStart={handlePause}
        onTouchEnd={handleResume}
      >
        <div className="mq-track" ref={trackRef}>
          {loopedStars.map((star, idx) => (
            <StarCard
              key={`${star.id}-${idx}`}
              star={star}
              onClick={() => onStarClick?.(star)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
