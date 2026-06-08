const WA_NUMBER = '971585973177';

import { supabase } from './supabase';

export const WA_MESSAGES = {
  reels: 'Здравствуйте! Хочу заказать Reels Production...',
  podcast: 'Привет! Хочу забронировать студию подкастов...',
  web: 'Интересует создание сайта/запуск рекламы...',
  ads: 'Интересует создание сайта/запуск рекламы...',
  smm: 'Здравствуйте! Хочу узнать подробнее про SMM-ведение...',
  photo: 'Здравствуйте! Хочу заказать фотосессию...',
  telegram: 'Здравствуйте! Хочу создать Telegram-канал под ключ...',
  course: 'Здравствуйте! Хочу запустить онлайн-курс...',
  general: 'Здравствуйте! Хочу узнать подробнее о ваших услугах...',
  instagram: 'Привет! Хочу продвижение в Instagram — упаковку профиля и Reels-стратегию.',
  youtube: 'Привет! Хочу продвижение на YouTube — создание Shorts и оптимизацию канала.',
  tiktok: 'Привет! Хочу продвижение в TikTok — виральный контент и работу с трендами.',
  snapchat: 'Привет! Хочу продвижение в Snapchat — Spotlight и рекламу на аудиторию ОАЭ.',
  telegramSocial: 'Привет! Хочу создать Telegram-канал с воронкой продаж и автоматизацией.',
};

export function openWhatsApp(message?: string) {
  const text = encodeURIComponent(message ?? WA_MESSAGES.general);
  window.open(`https://wa.me/${WA_NUMBER}?text=${text}`, '_blank', 'noopener,noreferrer');
}

interface WelcomeArgs {
  phone: string;
  name: string;
  language: string;
}

export async function sendWhatsAppWelcome({ phone, name, language }: WelcomeArgs): Promise<{ ok: boolean; error?: string; log?: Record<string, unknown> }> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-welcome`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ phone, name, language }),
  });

  const json = await res.json().catch(() => ({ error: 'Non-JSON response from edge function' }));
  if (!res.ok) {
    console.error('[whatsapp-welcome] edge function error', json);
  }
  return json;
}
