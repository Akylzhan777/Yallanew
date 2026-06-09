import { useState, useEffect, useRef } from 'react';
import { Check, ChevronRight, Plus, Trash2, Upload, Instagram, Youtube, Play, Globe, MapPin, Languages, Zap, X, AtSign, Loader, Phone, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useCreatorAuth, CreatorPackage } from '../context/CreatorAuthContext';
import { useRegion } from '../context/RegionContext';
import { getDashboardPathForCreatorType } from '../lib/dashboardRouting';
import { sendWhatsAppWelcome } from '../lib/whatsapp';

const WHATSAPP_REGEX = /^\+\d{8,15}$/;

function langCodeFromList(langs: string[]): string {
  const first = (langs[0] || 'English').toLowerCase();
  if (first.startsWith('rus')) return 'ru';
  if (first.startsWith('ara')) return 'ar';
  return 'en';
}

const RESERVED_USERNAMES = new Set([
  'admin', 'booking', 'manager', 'operator', 'dashboard', 'login', 'register',
  'api', 'edit', 'job', 'cancel', 'creator', 'creator-login', 'creator-dashboard',
  'creator-onboarding', 'manager-panel', 'telegram-dashboard', 'www', 'app', 'mail',
  'support', 'help', 'about', 'terms', 'privacy', 'blog', 'shop', 'marketplace',
  'home', 'index',
]);

const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/;

const STEPS = [
  { id: 1, titleKey: 'onboarding.steps.basic.title', descKey: 'onboarding.steps.basic.desc' },
  { id: 2, titleKey: 'onboarding.steps.social.title', descKey: 'onboarding.steps.social.desc' },
  { id: 3, titleKey: 'onboarding.steps.packages.title', descKey: 'onboarding.steps.packages.desc' },
  { id: 4, titleKey: 'onboarding.steps.portfolio.title', descKey: 'onboarding.steps.portfolio.desc' },
  { id: 5, titleKey: 'onboarding.steps.live.title', descKey: 'onboarding.steps.live.desc' },
];

const TG_STEPS = [
  { id: 1, titleKey: 'onboarding.tgSteps.channelInfo.title', descKey: 'onboarding.tgSteps.channelInfo.desc' },
  { id: 2, titleKey: 'onboarding.tgSteps.audience.title', descKey: 'onboarding.tgSteps.audience.desc' },
  { id: 3, titleKey: 'onboarding.tgSteps.adFormats.title', descKey: 'onboarding.tgSteps.adFormats.desc' },
  { id: 4, titleKey: 'onboarding.tgSteps.mediaKit.title', descKey: 'onboarding.tgSteps.mediaKit.desc' },
  { id: 5, titleKey: 'onboarding.tgSteps.live.title', descKey: 'onboarding.tgSteps.live.desc' },
];

function getVisibleSteps(creatorType: string) {
  const steps = creatorType === 'telegram_channel' ? TG_STEPS : STEPS;
  if (creatorType === 'editor' || creatorType === 'videographer') {
    return steps.filter(s => s.id !== 2);
  }
  return steps;
}

function getNextStep(current: number, creatorType: string): number {
  if ((creatorType === 'editor' || creatorType === 'videographer') && current === 1) return 3;
  return current + 1;
}

function getPrevStep(current: number, creatorType: string): number {
  if ((creatorType === 'editor' || creatorType === 'videographer') && current === 3) return 1;
  return current - 1;
}

const CATEGORIES = ['lifestyle', 'beauty', 'fitness', 'food', 'tech', 'travel', 'fashion', 'business', 'gaming', 'parenting', 'health', 'finance', 'entertainment', 'events'];
const CREATOR_TYPES = [
  { value: 'blogger', labelKey: 'onboarding.creatorTypes.blogger.title', descKey: 'onboarding.creatorTypes.blogger.description' },
  { value: 'model', labelKey: 'onboarding.creatorTypes.model.title', descKey: 'onboarding.creatorTypes.model.description' },
  { value: 'ugc', labelKey: 'onboarding.creatorTypes.ugc.title', descKey: 'onboarding.creatorTypes.ugc.description' },
  { value: 'videographer', labelKey: 'onboarding.creatorTypes.videographer.title', descKey: 'onboarding.creatorTypes.videographer.description' },
  { value: 'photographer', labelKey: 'onboarding.creatorTypes.photographer.title', descKey: 'onboarding.creatorTypes.photographer.description' },
  { value: 'editor', labelKey: 'onboarding.creatorTypes.editor.title', descKey: 'onboarding.creatorTypes.editor.description' },
  { value: 'telegram_channel', labelKey: 'onboarding.creatorTypes.telegram.title', descKey: 'onboarding.creatorTypes.telegram.description' },
];
const LANGUAGES = ['English', 'Arabic', 'Russian', 'French', 'Hindi', 'Urdu', 'Tagalog', 'Mandarin'];
const LANGUAGES_KZ: { value: string; label: string }[] = [
  { value: 'Kazakh', label: 'Казахский' },
  { value: 'Russian', label: 'Русский' },
  { value: 'English', label: 'Английский' },
  { value: 'Arabic', label: 'Арабский' },
  { value: 'French', label: 'Французский' },
  { value: 'Hindi', label: 'Хинди' },
  { value: 'Urdu', label: 'Урду' },
  { value: 'Tagalog', label: 'Тагальский' },
  { value: 'Mandarin', label: 'Китайский' },
];

const inputCls = 'w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all bg-[#0f1520] border border-[rgba(255,255,255,0.08)]';
const labelCls = 'block text-xs font-medium mb-1.5 text-slate-400 uppercase tracking-wide';

function calcCompletion(step: number): number {
  return Math.round((step / 5) * 100);
}

function emptyPackage(): CreatorPackage {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    price: 0,
    deliveryDays: 5,
    includes: [''],
  };
}

function defaultTgPackages(): CreatorPackage[] {
  return [
    { id: crypto.randomUUID(), name: 'Curated List Feature', description: 'Brand mention in a curated list post — ideal for discovery campaigns.', price: 0, deliveryDays: 3, includes: [''] },
    { id: crypto.randomUUID(), name: 'Native Content', description: "Authored sponsored post written in the channel's editorial voice.", price: 0, deliveryDays: 5, includes: [''] },
    { id: crypto.randomUUID(), name: 'Experience Review', description: 'Full in-depth review with an on-site visit, photos and video.', price: 0, deliveryDays: 7, includes: [''] },
  ];
}

export default function CreatorOnboarding() {
  const { user, creatorProfile, refreshCreatorProfile } = useCreatorAuth();
  const { t } = useTranslation();
  const { region, config: regionConfig } = useRegion();
  const currency = regionConfig.currency;
  const [step, setStep] = useState(creatorProfile?.onboarding_step ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1 state
  const [displayName, setDisplayName] = useState(creatorProfile?.display_name ?? '');
  const [username, setUsername] = useState((creatorProfile as unknown as { username?: string })?.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const usernameTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [whatsapp, setWhatsapp] = useState(creatorProfile?.whatsapp_number ?? '');
  const [bio, setBio] = useState(creatorProfile?.bio ?? '');
  const availableCreatorTypes = region === 'KZ'
    ? CREATOR_TYPES.filter(ct => ct.value === 'ugc' || ct.value === 'videographer')
    : CREATOR_TYPES;
  const [creatorType, setCreatorType] = useState<string>(creatorProfile?.creator_type ?? (region === 'KZ' ? '' : 'blogger'));
  const [category, setCategory] = useState(creatorProfile?.category ?? 'lifestyle');
  const [location, setLocation] = useState(creatorProfile?.location ?? (region === 'KZ' ? 'Алматы, KZ' : 'Dubai, UAE'));
  const [languages, setLanguages] = useState<string[]>(creatorProfile?.languages ?? ['English']);

  // Model-specific state (Step 1)
  const [modelHeight, setModelHeight] = useState<string>((creatorProfile as unknown as { model_height?: string })?.model_height ?? '');
  const [modelWeight, setModelWeight] = useState<string>((creatorProfile as unknown as { model_weight?: string })?.model_weight ?? '');
  const [modelAge, setModelAge] = useState<string>((creatorProfile as unknown as { model_age?: string })?.model_age ?? '');
  const [modelNationality, setModelNationality] = useState<string>((creatorProfile as unknown as { model_nationality?: string })?.model_nationality ?? '');

  // Model-specific state (Step 3)
  const [modelHourlyRate, setModelHourlyRate] = useState<string>((creatorProfile as unknown as { model_hourly_rate?: number })?.model_hourly_rate?.toString() ?? '');
  const [modelMinHours, setModelMinHours] = useState<string>((creatorProfile as unknown as { model_min_hours?: number })?.model_min_hours?.toString() ?? '2');
  const [modelShootTypes, setModelShootTypes] = useState<string>((creatorProfile as unknown as { model_shoot_types?: string })?.model_shoot_types ?? '');
  const [modelRestrictions, setModelRestrictions] = useState<string>((creatorProfile as unknown as { model_restrictions?: string })?.model_restrictions ?? '');

  // Step 2 state
  const [instagramUrl, setInstagramUrl] = useState(creatorProfile?.instagram_url ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(creatorProfile?.youtube_url ?? '');
  const [tiktokUrl, setTiktokUrl] = useState(creatorProfile?.tiktok_url ?? '');
  const [extraSocials, setExtraSocials] = useState<string[]>(() => {
    const init: string[] = [];
    if (creatorProfile?.youtube_url) init.push('youtube');
    if (creatorProfile?.tiktok_url) init.push('tiktok');
    return init;
  });
  const [followers, setFollowers] = useState(String(creatorProfile?.followers_count ?? ''));
  const [avgViews, setAvgViews] = useState(String(creatorProfile?.avg_views ?? ''));
  const [engRate, setEngRate] = useState(String(creatorProfile?.engagement_rate ?? ''));

  // Step 3 state
  const [packages, setPackages] = useState<CreatorPackage[]>(
    creatorProfile?.packages?.length ? (creatorProfile.packages as CreatorPackage[]) : [emptyPackage()]
  );
  const [markupPct, setMarkupPct] = useState(20);

  useEffect(() => {
    supabase.from('platform_settings').select('markup_percentage').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setMarkupPct(Number(data.markup_percentage) || 20);
    });
  }, []);

  // Step 4 state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(creatorProfile?.avatar_url ?? '');
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);

  // Telegram channel-specific state
  const [tgChannelUrl, setTgChannelUrl] = useState<string>((creatorProfile as unknown as { tg_channel_url?: string })?.tg_channel_url ?? '');
  const [tgSubscribers, setTgSubscribers] = useState<string>(String((creatorProfile as unknown as { tg_subscribers?: number })?.tg_subscribers ?? ''));
  const [tgUniqueReach, setTgUniqueReach] = useState<string>(String((creatorProfile as unknown as { tg_unique_reach?: number })?.tg_unique_reach ?? ''));
  const [tgMonthlyImpressions, setTgMonthlyImpressions] = useState<string>(String((creatorProfile as unknown as { tg_monthly_impressions?: number })?.tg_monthly_impressions ?? ''));
  const [audienceGender, setAudienceGender] = useState<string>('');
  const [audienceAge, setAudienceAge] = useState<string>('');
  const [audienceGeo, setAudienceGeo] = useState<string>('');
  const [audienceInterests, setAudienceInterests] = useState<string>('');
  const [licenseNo, setLicenseNo] = useState<string>('');
  const [advertiserPermit, setAdvertiserPermit] = useState<string>('');
  const [clientLogoFiles, setClientLogoFiles] = useState<File[]>([]);
  const [clientLogoPreviews, setClientLogoPreviews] = useState<string[]>([]);

  // Initialize packages based on creator type
  const packagesInitialized = useRef(false);
  useEffect(() => {
    if (packagesInitialized.current) return;
    packagesInitialized.current = true;
    if (creatorType === 'telegram_channel' && !creatorProfile?.packages?.length) {
      setPackages(defaultTgPackages());
    }
  }, [creatorType, creatorProfile?.packages]);

  const completion = calcCompletion(step - 1);

  const toggleLanguage = (lang: string) => {
    setLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);
  };

  const handleUsernameChange = (raw: string) => {
    const val = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setUsername(val);
    if (usernameTimeout.current) clearTimeout(usernameTimeout.current);
    if (!val) { setUsernameStatus('idle'); return; }
    if (RESERVED_USERNAMES.has(val) || !USERNAME_REGEX.test(val)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    usernameTimeout.current = setTimeout(async () => {
      const existingUsername = (creatorProfile as unknown as { username?: string })?.username;
      if (existingUsername && existingUsername === val) { setUsernameStatus('available'); return; }
      const { data } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('username', val)
        .maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
  };

  useEffect(() => () => { if (usernameTimeout.current) clearTimeout(usernameTimeout.current); }, []);

  const saveStep = async (nextStep: number) => {
    setError('');
    setSaving(true);
    try {
      if (!user) throw new Error('Not authenticated');

      let payload: Record<string, unknown> = {
        user_id: user.id,
        region,
        onboarding_step: nextStep,
        onboarding_done: nextStep > 5,
        profile_completion: calcCompletion(nextStep - 1),
        updated_at: new Date().toISOString(),
      };

      if (step === 1) {
        if (!displayName.trim()) { setError('Display name is required.'); setSaving(false); return; }
        if (!creatorType) { setError('Please select a creator type.'); setSaving(false); return; }
        if (!username.trim()) { setError('Please choose a handle for your profile.'); setSaving(false); return; }
        if (!USERNAME_REGEX.test(username)) { setError('Handle must be 3–30 characters: lowercase letters, numbers, hyphens, underscores only.'); setSaving(false); return; }
        if (RESERVED_USERNAMES.has(username)) { setError('This handle is reserved. Please choose a different one.'); setSaving(false); return; }
        if (usernameStatus === 'taken') { setError('This handle is already taken. Please choose another.'); setSaving(false); return; }
        if (usernameStatus === 'checking') { setError('Please wait while we check handle availability.'); setSaving(false); return; }
        if (!WHATSAPP_REGEX.test(whatsapp.trim())) { setError(region === 'KZ' ? 'Please enter a valid WhatsApp number (e.g. +77011234567).' : 'Please enter a valid WhatsApp number in international format (e.g. +971501234567).'); setSaving(false); return; }
        if (creatorType === 'model') {
          if (!modelHeight.trim()) { setError(t('onboarding.model.heightRequired')); setSaving(false); return; }
          if (!modelAge.trim()) { setError(t('onboarding.model.ageRequired')); setSaving(false); return; }
          if (!modelNationality.trim()) { setError(t('onboarding.model.nationalityRequired')); setSaving(false); return; }
        }
        if (creatorType === 'telegram_channel') {
          if (!tgChannelUrl.trim()) { setError('Please enter your Telegram channel URL.'); setSaving(false); return; }
          if (!tgChannelUrl.trim().startsWith('https://t.me/')) { setError('Channel URL must start with https://t.me/'); setSaving(false); return; }
        }
        payload = { ...payload, display_name: displayName.trim(), username: username.trim(), handle: username.trim(), bio: bio.trim(), creator_type: creatorType, category, location, languages, whatsapp_number: whatsapp.trim(), preferred_language: langCodeFromList(languages), ...(creatorType === 'telegram_channel' ? { tg_channel_url: tgChannelUrl.trim(), legal_info: { licenseNo: licenseNo.trim(), advertiserPermit: advertiserPermit.trim() } } : {}), ...(creatorType === 'model' ? { model_height: modelHeight.trim(), model_weight: modelWeight.trim(), model_age: modelAge.trim(), model_nationality: modelNationality.trim() } : {}) };
      } else if (step === 2) {
        if (creatorType === 'telegram_channel') {
          if (!tgSubscribers.trim()) { setError('Please enter your subscriber count.'); setSaving(false); return; }
          const audienceProfile = { gender: audienceGender.trim(), ageRange: audienceAge.trim(), geo: audienceGeo.trim(), interests: audienceInterests.trim() };
          payload = { ...payload, tg_subscribers: parseInt(tgSubscribers) || 0, tg_unique_reach: parseInt(tgUniqueReach) || 0, tg_monthly_impressions: parseInt(tgMonthlyImpressions) || 0, audience_profile: audienceProfile };
        } else if (creatorType === 'model') {
          payload = { ...payload, instagram_url: instagramUrl.trim() || null, youtube_url: null, tiktok_url: null, followers_count: 0, avg_views: 0, engagement_rate: 0 };
        } else if (creatorType !== 'editor') {
          if (region === 'KZ') {
            if (!instagramUrl.trim()) { setError('Instagram URL обязателен. Заполните ссылку на профиль.'); setSaving(false); return; }
            if (!instagramUrl.trim().startsWith('https://')) { setError('Instagram URL должен начинаться с https://'); setSaving(false); return; }
            if (!followers.trim() || parseInt(followers) <= 0) { setError('Укажите количество подписчиков.'); setSaving(false); return; }
          }
          const links = [instagramUrl.trim(), youtubeUrl.trim(), tiktokUrl.trim()].filter(Boolean);
          if (links.length) {
            const invalidLink = links.find(l => !l.startsWith('https://'));
            if (invalidLink) {
              setError('All links must be valid URLs starting with https://');
              setSaving(false);
              return;
            }
          }
          payload = { ...payload, instagram_url: instagramUrl.trim() || null, youtube_url: youtubeUrl.trim() || null, tiktok_url: tiktokUrl.trim() || null, followers_count: parseInt(followers) || 0, avg_views: parseInt(avgViews) || 0, engagement_rate: parseFloat(engRate) || 0 };
        } else {
          payload = { ...payload, instagram_url: instagramUrl.trim() || null, youtube_url: youtubeUrl.trim() || null, tiktok_url: tiktokUrl.trim() || null, followers_count: parseInt(followers) || 0, avg_views: parseInt(avgViews) || 0, engagement_rate: parseFloat(engRate) || 0 };
        }
      } else if (step === 3) {
        if (creatorType === 'model') {
          const hourly = parseInt(modelHourlyRate) || 0;
          if (hourly <= 0) { setError(t('onboarding.model.hourlyRateRequired')); setSaving(false); return; }
          const clientHourly = Math.round(hourly * (1 + markupPct / 100));
          const modelPkg: CreatorPackage & { clientPrice: number } = {
            id: packages[0]?.id ?? crypto.randomUUID(),
            name: 'Hourly Rate',
            description: modelShootTypes.trim() || 'Model booking',
            price: hourly,
            clientPrice: clientHourly,
            deliveryDays: 1,
            includes: [`Min ${modelMinHours || 2} hours`],
          };
          payload = { ...payload, packages: [modelPkg], model_hourly_rate: hourly, model_min_hours: parseInt(modelMinHours) || 2, model_shoot_types: modelShootTypes.trim(), model_restrictions: modelRestrictions.trim() };
        } else {
          const validPkgs = packages.filter(p => p.name.trim() && p.price > 0);
          if (!validPkgs.length) { setError(region === 'KZ' ? 'Добавьте хотя бы один пакет с названием и ценой.' : 'Add at least one package with a name and price.'); setSaving(false); return; }
          const pkgsWithClientPrice = validPkgs.map(p => ({
            ...p,
            clientPrice: Math.round(p.price * (1 + markupPct / 100)),
          }));
          payload = { ...payload, packages: pkgsWithClientPrice };
        }
      } else if (step === 4) {
        setUploadProgress(true);

        // Upload avatar only
        const uploadTasks: Promise<void>[] = [];

        if (avatarFile && user) {
          uploadTasks.push((async () => {
            const ext = avatarFile.name.split('.').pop();
            const path = `${user.id}/avatar.${ext}`;
            const { error: upErr } = await supabase.storage.from('creator-avatars').upload(path, avatarFile, { upsert: true });
            if (!upErr) {
              const { data: urlData } = supabase.storage.from('creator-avatars').getPublicUrl(path);
              payload.avatar_url = urlData.publicUrl;
            }
          })());
        }

        // Model: upload portfolio photos (up to 10)
        if (creatorType === 'model' && portfolioFiles.length > 0 && user) {
          const portfolioUrls: string[] = [];
          for (const file of portfolioFiles) {
            uploadTasks.push((async () => {
              const ext = file.name.split('.').pop();
              const fname = `portfolio/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
              const path = `${user.id}/${fname}`;
              const { error: upErr } = await supabase.storage.from('creator-portfolio').upload(path, file);
              if (!upErr) {
                const { data: urlData } = supabase.storage.from('creator-portfolio').getPublicUrl(path);
                portfolioUrls.push(urlData.publicUrl);
              }
            })());
          }
          await Promise.all(uploadTasks);
          payload.portfolio_urls = portfolioUrls;
        } else if (creatorType === 'telegram_channel') {
          const cpRow = await supabase.from('creator_profiles').select('id').eq('user_id', user.id).maybeSingle();
          // Upload client logos
          const logoUrls: string[] = [];
          for (const file of clientLogoFiles) {
            uploadTasks.push((async () => {
              const ext = file.name.split('.').pop();
              const fname = `logos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
              const path = `${user.id}/${fname}`;
              const { error: upErr } = await supabase.storage.from('creator-portfolio').upload(path, file);
              if (!upErr) {
                const { data: urlData } = supabase.storage.from('creator-portfolio').getPublicUrl(path);
                logoUrls.push(urlData.publicUrl);
              }
            })());
          }
          void cpRow;
          await Promise.all(uploadTasks);
          payload.client_logos = logoUrls;
        } else {
          await Promise.all(uploadTasks);
        }
        setUploadProgress(false);
      } else if (step === 5) {
        payload = { ...payload, is_published: true, onboarding_done: true, profile_completion: 100 };
      }

      // Upsert creator profile
      const { error: dbErr } = await supabase
        .from('creator_profiles')
        .upsert({ ...payload }, { onConflict: 'user_id' });
      if (dbErr) {
        if (dbErr.message.includes('creator_profiles_handle_key') || dbErr.message.includes('creator_profiles_username_key')) {
          setUsernameStatus('taken');
          setError('This handle is already taken. Please choose another.');
          setSaving(false);
          return;
        }
        throw new Error('Something went wrong. Please try again.');
      }

      await refreshCreatorProfile();

      // After publishing, redirect to the role-specific dashboard.
      if (step === 5 && user) {
        if (creatorType === 'editor') {
          await supabase.from('editing_editor_profiles').upsert({
            user_id: user.id,
            display_name: `Editor #${Math.floor(1000 + Math.random() * 9000)}`,
            real_name: displayName.trim(),
            specialties: ['Reels', 'Commercial'],
            available: true,
          }, { onConflict: 'user_id' });
        }
        if (whatsapp && WHATSAPP_REGEX.test(whatsapp.trim())) {
          try {
            const result = await sendWhatsAppWelcome({
              phone: whatsapp.trim(),
              name: displayName.trim(),
              language: langCodeFromList(languages),
            });
            console.log('[whatsapp-welcome] result:', result);
          } catch (err) {
            console.error('[whatsapp-welcome] fetch error:', err);
          }
        }
        window.location.replace(getDashboardPathForCreatorType(creatorType));
        return;
      }

      setStep(nextStep);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    }
    setSaving(false);
  };

  const handleSkip = async () => {
    if (!user) return;
    if (!WHATSAPP_REGEX.test(whatsapp.trim())) {
      setError('Please enter a valid WhatsApp number in international format (e.g. +971501234567) before continuing.');
      return;
    }
    setSaving(true);
    try {
      const effectiveType = creatorType || 'ugc';
      await supabase.from('creator_profiles').upsert(
        {
          user_id: user.id,
          creator_type: effectiveType,
          whatsapp_number: whatsapp.trim(),
          preferred_language: langCodeFromList(languages),
          onboarding_done: true,
          onboarding_step: 5,
          profile_completion: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      await refreshCreatorProfile();
      window.location.replace(getDashboardPathForCreatorType(effectiveType));
    } catch {
      setSaving(false);
    }
  };

  const addPackage = () => setPackages(prev => [...prev, emptyPackage()]);
  const removePackage = (id: string) => setPackages(prev => prev.filter(p => p.id !== id));
  const updatePackage = (id: string, field: keyof CreatorPackage, value: unknown) => {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const addInclude = (pkgId: string) => {
    setPackages(prev => prev.map(p => p.id === pkgId ? { ...p, includes: [...p.includes, ''] } : p));
  };
  const updateInclude = (pkgId: string, idx: number, val: string) => {
    setPackages(prev => prev.map(p => p.id === pkgId ? { ...p, includes: p.includes.map((inc, i) => i === idx ? val : inc) } : p));
  };
  const removeInclude = (pkgId: string, idx: number) => {
    setPackages(prev => prev.map(p => p.id === pkgId ? { ...p, includes: p.includes.filter((_, i) => i !== idx) } : p));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPortfolioFiles(prev => [...prev, ...files]);
    setPortfolioPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  if (step > 5) {
    const dashPath = getDashboardPathForCreatorType(creatorType);
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#080d16' }}>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(0,196,140,0.15)', border: '2px solid rgba(0,196,140,0.3)' }}>
            <Check size={36} style={{ color: '#00C48C' }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">{t('onboarding.youAreLive')}</h2>
          <p className="text-sm mb-5" style={{ color: '#64748b' }}>{t('onboarding.youAreLiveDesc')}</p>
          {username && (
            <div className="rounded-xl px-4 py-3 mb-5 flex items-center gap-2" style={{ background: 'rgba(0,196,140,0.08)', border: '1px solid rgba(0,196,140,0.25)' }}>
              <AtSign size={14} style={{ color: '#00C48C', flexShrink: 0 }} />
              <span className="text-sm font-mono font-bold" style={{ color: '#00C48C' }}>yallainfluencers.com/{username}</span>
            </div>
          )}
          <a href={dashPath} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)', border: '1px solid rgba(0,196,140,0.3)' }}>
            {t('onboarding.goToDashboard')} <ChevronRight size={15} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="creator-onboarding-root min-h-screen" style={{ background: '#080d16' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(8,13,22,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,196,140,0.15)', border: '1px solid rgba(0,196,140,0.3)' }}>
            <Zap size={13} style={{ color: '#00C48C' }} />
          </div>
          <span className="font-bold text-white text-sm hidden sm:inline">{t('onboarding.title')}</span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 mx-4 max-w-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: '#00C48C' }}>{completion}% {t('onboarding.complete')}</span>
            <span className="text-xs" style={{ color: '#374151' }}>{t('onboarding.stepOf', { current: step, total: 5 })}</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completion}%`, background: 'linear-gradient(90deg, #00C48C, #38bdf8)' }} />
          </div>
        </div>

        <button
          onClick={handleSkip}
          disabled={saving}
          className="text-xs transition-colors hidden sm:block disabled:opacity-40"
          style={{ color: '#374151', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#64748b')}
          onMouseLeave={e => (e.currentTarget.style.color = '#374151')}
        >
          {t('onboarding.skipForNow')}
        </button>
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-1 py-4 px-4 overflow-x-auto scrollbar-none">
        {getVisibleSteps(creatorType).map((s, idx, arr) => (
          <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step > s.id ? 'scale-90' : step === s.id ? 'scale-100' : 'scale-90 opacity-40'
            }`} style={{
              background: step > s.id ? '#00C48C' : step === s.id ? 'rgba(0,196,140,0.2)' : 'rgba(255,255,255,0.05)',
              border: step >= s.id ? '1px solid rgba(0,196,140,0.5)' : '1px solid rgba(255,255,255,0.1)',
              color: step > s.id ? '#0f1115' : step === s.id ? '#00C48C' : '#374151',
            }}>
              {step > s.id ? <Check size={12} strokeWidth={3} /> : idx + 1}
            </div>
            <span className="text-xs hidden md:block transition-all" style={{ color: step === s.id ? '#94a3b8' : '#374151' }}>{t(s.titleKey)}</span>
            {idx < arr.length - 1 && <div className="w-4 h-px mx-1" style={{ background: step > s.id ? 'rgba(0,196,140,0.4)' : 'rgba(255,255,255,0.08)' }} />}
          </div>
        ))}
      </div>

      {/* Form content */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">{t((creatorType === 'telegram_channel' ? TG_STEPS : STEPS)[step - 1].titleKey)}</h2>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>{t((creatorType === 'telegram_channel' ? TG_STEPS : STEPS)[step - 1].descKey)}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>{t('onboarding.displayName')} *</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t('onboarding.displayNamePlaceholder')} className={inputCls}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            {/* Handle — also becomes the profile URL slug */}
            <div>
              <label className={labelCls}>{t('onboarding.handleUrl')} *</label>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${usernameStatus === 'available' ? 'rgba(0,196,140,0.5)' : usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`, background: '#0f1520', transition: 'border-color 0.2s' }}>
                <div className="flex items-center">
                  <div className="flex items-center gap-1.5 px-3 py-3 border-r flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                    <AtSign size={13} style={{ color: '#374151' }} />
                    <span className="text-xs" style={{ color: '#374151', whiteSpace: 'nowrap' }}>yallainfluencers.com/</span>
                  </div>
                  <input
                    value={username}
                    onChange={e => handleUsernameChange(e.target.value)}
                    placeholder="yourhandle"
                    className="flex-1 px-3 py-3 text-sm text-white placeholder-slate-600 outline-none bg-transparent"
                    style={{ minWidth: 0 }}
                    maxLength={30}
                  />
                  <div className="px-3 flex-shrink-0">
                    {usernameStatus === 'checking' && <Loader size={14} className="animate-spin" style={{ color: '#475569' }} />}
                    {usernameStatus === 'available' && <Check size={14} style={{ color: '#00C48C' }} />}
                    {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <X size={14} style={{ color: '#f87171' }} />}
                  </div>
                </div>
              </div>
              <div className="mt-1.5 min-h-[1rem]">
                {usernameStatus === 'available' && <p className="text-xs" style={{ color: '#00C48C' }}>{t('onboarding.handleAvailable', { username })}</p>}
                {usernameStatus === 'taken' && <p className="text-xs" style={{ color: '#f87171' }}>{t('onboarding.handleTaken')}</p>}
                {usernameStatus === 'invalid' && username.length > 0 && (
                  <p className="text-xs" style={{ color: '#f87171' }}>
                    {RESERVED_USERNAMES.has(username) ? t('onboarding.handleReserved') : t('onboarding.handleInvalid')}
                  </p>
                )}
                {usernameStatus === 'idle' && <p className="text-xs" style={{ color: '#374151' }}>{t('onboarding.handleHint')}</p>}
              </div>
            </div>

            <div>
              <label className={labelCls}><span className="flex items-center gap-1"><Phone size={11} /> {t('onboarding.whatsappNumber')} *</span></label>
              <div className="relative flex">
                <div className="flex items-center justify-center px-3 rounded-l-xl text-sm font-medium select-none"
                  style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', borderLeft: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                  +
                </div>
                <input
                  value={whatsapp.startsWith('+') ? whatsapp.slice(1) : whatsapp}
                  onChange={e => {
                    const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 15);
                    setWhatsapp(digits ? '+' + digits : '');
                  }}
                  placeholder={region === 'KZ' ? '77011234567' : '971501234567'}
                  inputMode="tel"
                  maxLength={15}
                  className={inputCls + ' rounded-l-none'}
                  style={{
                    borderColor: whatsapp && !WHATSAPP_REGEX.test(whatsapp) ? 'rgba(239,68,68,0.5)' : whatsapp && WHATSAPP_REGEX.test(whatsapp) ? 'rgba(0,196,140,0.4)' : 'rgba(255,255,255,0.08)',
                  }}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: whatsapp && !WHATSAPP_REGEX.test(whatsapp) ? '#f87171' : '#374151' }}>
                {whatsapp && !WHATSAPP_REGEX.test(whatsapp)
                  ? t('onboarding.whatsappInvalid')
                  : t(region === 'KZ' ? 'onboarding.whatsappHintKz' : 'onboarding.whatsappHint')}
              </p>
            </div>

            <div>
              <label className={labelCls}>{t('onboarding.bio')}</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder={t('onboarding.bioPlaceholder')} rows={3}
                className={inputCls + ' resize-none'}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            <div>
              <label className={labelCls}>{t('onboarding.creatorType')} *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableCreatorTypes.map(ct => (
                  <div key={ct.value} onClick={() => setCreatorType(ct.value)}
                    className="rounded-xl p-4 cursor-pointer transition-all"
                    style={{
                      background: creatorType === ct.value ? 'rgba(0,196,140,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${creatorType === ct.value ? 'rgba(0,196,140,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: creatorType === ct.value ? '#00C48C' : '#374151', background: creatorType === ct.value ? '#00C48C' : 'transparent' }}>
                        {creatorType === ct.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm font-semibold text-white">{t(ct.labelKey)}</span>
                    </div>
                    <p className="text-xs ml-6" style={{ color: '#475569' }}>{t(ct.descKey)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t('onboarding.primaryNiche')} *</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls + ' cursor-pointer'} style={{ colorScheme: 'dark' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}><span className="flex items-center gap-1"><MapPin size={11} /> {t('onboarding.location')}</span></label>
                {region === 'KZ' ? (
                  <select value={location} onChange={e => setLocation(e.target.value)} className={inputCls + ' cursor-pointer'} style={{ colorScheme: 'dark' }}>
                    {['Алматы, KZ', 'Астана, KZ', 'Шымкент, KZ', 'Туркестан, KZ', 'Актобе, KZ', 'Караганда, KZ', 'Атырау, KZ', 'Тараз, KZ', 'Павлодар, KZ', 'Усть-Каменогорск, KZ', 'Семей, KZ', 'Кызылорда, KZ', 'Костанай, KZ', 'Уральск, KZ', 'Петропавловск, KZ', 'Актау, KZ'].map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                ) : (
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Dubai, UAE" className={inputCls}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                )}
              </div>
            </div>

            <div>
              <label className={labelCls}><span className="flex items-center gap-1"><Languages size={11} /> {t('onboarding.languages')}</span></label>
              <div className="flex flex-wrap gap-2">
                {region === 'KZ'
                  ? LANGUAGES_KZ.map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => toggleLanguage(value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: languages.includes(value) ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
                        color: languages.includes(value) ? '#60a5fa' : '#475569',
                        border: `1px solid ${languages.includes(value) ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      {label}
                    </button>
                  ))
                  : LANGUAGES.map(l => (
                    <button key={l} type="button" onClick={() => toggleLanguage(l)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: languages.includes(l) ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
                        color: languages.includes(l) ? '#60a5fa' : '#475569',
                        border: `1px solid ${languages.includes(l) ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      {l}
                    </button>
                  ))
                }
              </div>
            </div>

            {/* Model-specific fields */}
            {creatorType === 'model' && (
              <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>{t('onboarding.model.physicalInfo')}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className={labelCls}>{t('onboarding.model.height')} *</label>
                    <input value={modelHeight} onChange={e => setModelHeight(e.target.value)} placeholder="175 cm" className={inputCls}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('onboarding.model.weight')}</label>
                    <input value={modelWeight} onChange={e => setModelWeight(e.target.value)} placeholder="55 kg" className={inputCls}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('onboarding.model.age')} *</label>
                    <input type="number" min={16} max={99} value={modelAge} onChange={e => setModelAge(e.target.value)} placeholder="24" className={inputCls}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('onboarding.model.nationality')} *</label>
                    <input value={modelNationality} onChange={e => setModelNationality(e.target.value)} placeholder="e.g. Russian" className={inputCls}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Telegram Channel-specific: Channel URL + Legal */}
            {creatorType === 'telegram_channel' && (
              <>
                <div>
                  <label className={labelCls}><span className="flex items-center gap-1"><Send size={11} /> {t('onboarding.tgChannelUrl')} *</span></label>
                  <div className="relative">
                    <Send size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                    <input
                      value={tgChannelUrl}
                      onChange={e => setTgChannelUrl(e.target.value)}
                      placeholder="https://t.me/yourchannel"
                      className={inputCls}
                      style={{ paddingLeft: 36, borderColor: tgChannelUrl && !tgChannelUrl.startsWith('https://t.me/') ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)' }}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                      onBlur={e => e.currentTarget.style.borderColor = tgChannelUrl && !tgChannelUrl.startsWith('https://t.me/') ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: '#374151' }}>{t('onboarding.tgChannelUrlHint')}</p>
                </div>

                <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>{t('onboarding.legalCompliance')}</div>
                    <p className="text-xs mb-3" style={{ color: '#374151' }}>{t('onboarding.legalHint')}</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>{t('onboarding.licenseNo')}</label>
                      <input value={licenseNo} onChange={e => setLicenseNo(e.target.value)} placeholder="e.g. 12345 / 2024" className={inputCls}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{t('onboarding.advertiserPermit')}</label>
                      <input value={advertiserPermit} onChange={e => setAdvertiserPermit(e.target.value)} placeholder="e.g. NMC-2024-000123" className={inputCls}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 2: Social Links (non-telegram) or Audience & Metrics (telegram) ── */}
        {step === 2 && creatorType === 'telegram_channel' && (
          <div className="space-y-5">
            {/* Engagement Metrics */}
            <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>{t('onboarding.engagementMetrics')}</div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t('onboarding.tgSubscribers'), val: tgSubscribers, set: setTgSubscribers, ph: '50000' },
                  { label: t('onboarding.tgUniqueReach'), val: tgUniqueReach, set: setTgUniqueReach, ph: '12000' },
                  { label: t('onboarding.tgMonthlyImpressions'), val: tgMonthlyImpressions, set: setTgMonthlyImpressions, ph: '350000' },
                ].map(s => (
                  <div key={s.label}>
                    <label className={labelCls}>{s.label}</label>
                    <input type="number" value={s.val} onChange={e => s.set(e.target.value)} placeholder={s.ph} className={inputCls}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Audience Profile */}
            <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>{t('onboarding.audienceProfile')}</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t('onboarding.genderSplit')}</label>
                  <input value={audienceGender} onChange={e => setAudienceGender(e.target.value)} placeholder="e.g. 70% women, 30% men" className={inputCls}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('onboarding.ageRange')}</label>
                  <input value={audienceAge} onChange={e => setAudienceAge(e.target.value)} placeholder="e.g. 25–44" className={inputCls}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('onboarding.audienceLocation')}</label>
                  <input value={audienceGeo} onChange={e => setAudienceGeo(e.target.value)} placeholder="e.g. Dubai residents only" className={inputCls}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('onboarding.keyInterests')}</label>
                  <input value={audienceInterests} onChange={e => setAudienceInterests(e.target.value)} placeholder="e.g. Dining, Travel, Shopping, Lifestyle" className={inputCls}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && creatorType !== 'telegram_channel' && (
          <div className="space-y-5">
            {/* Model: only Instagram link, no stats */}
            {creatorType === 'model' ? (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}><span className="flex items-center gap-1.5" style={{ color: '#e1306c' }}><Instagram size={16} /> Instagram URL</span></label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                    <input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/yourhandle"
                      className={inputCls} style={{ paddingLeft: 36 }}
                      onFocus={e => e.currentTarget.style.borderColor = '#e1306c55'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <p className="text-xs" style={{ color: '#60a5fa' }}>
                    {t('onboarding.model.socialHint')}
                  </p>
                </div>
              </div>
            ) : (
            <>
            <div className="space-y-3">
              {/* Instagram — always visible */}
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5" style={{ color: '#e1306c' }}>
                    <Instagram size={16} />
                    {creatorType === 'videographer' || creatorType === 'photographer' || creatorType === 'editor' ? 'Instagram / Behance URL' : 'Instagram URL'}
                    {region === 'KZ' && <span style={{ color: '#ef4444' }}>*</span>}
                  </span>
                </label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                  <input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)}
                    placeholder={creatorType === 'videographer' || creatorType === 'photographer' || creatorType === 'editor' ? 'https://instagram.com/handle or behance.net/...' : 'https://instagram.com/yourhandle'}
                    className={inputCls} style={{ paddingLeft: 36, borderColor: region === 'KZ' && !instagramUrl.trim() ? 'rgba(239,68,68,0.35)' : undefined }}
                    onFocus={e => e.currentTarget.style.borderColor = '#e1306c55'}
                    onBlur={e => e.currentTarget.style.borderColor = region === 'KZ' && !instagramUrl.trim() ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}
                  />
                </div>
              </div>

              {/* YouTube — shown if added */}
              {extraSocials.includes('youtube') && (
                <div>
                  <label className={labelCls}><span className="flex items-center gap-1.5" style={{ color: '#ef4444' }}><Youtube size={16} /> YouTube URL</span></label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                    <input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/@yourchannel"
                      className={inputCls} style={{ paddingLeft: 36 }}
                      onFocus={e => e.currentTarget.style.borderColor = '#ef444455'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                </div>
              )}

              {/* TikTok — shown if added */}
              {extraSocials.includes('tiktok') && (
                <div>
                  <label className={labelCls}><span className="flex items-center gap-1.5" style={{ color: '#69c9d0' }}><Play size={16} /> TikTok URL</span></label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                    <input value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)}
                      placeholder="https://tiktok.com/@yourhandle"
                      className={inputCls} style={{ paddingLeft: 36 }}
                      onFocus={e => e.currentTarget.style.borderColor = '#69c9d055'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                </div>
              )}

              {/* Add social button */}
              {(extraSocials.length < 2) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {!extraSocials.includes('youtube') && (
                    <button type="button" onClick={() => setExtraSocials(prev => [...prev, 'youtube'])}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#64748b'; }}>
                      <Plus size={12} /> YouTube
                    </button>
                  )}
                  {!extraSocials.includes('tiktok') && (
                    <button type="button" onClick={() => setExtraSocials(prev => [...prev, 'tiktok'])}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(105,201,208,0.3)'; e.currentTarget.style.color = '#69c9d0'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#64748b'; }}>
                      <Plus size={12} /> TikTok
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Audience stats — only for bloggers/ugc (NOT model) */}
            {creatorType !== 'videographer' && creatorType !== 'photographer' && creatorType !== 'editor' && creatorType !== 'model' && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>{t('onboarding.audienceStats')}</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t('onboarding.totalFollowers'), val: followers, set: setFollowers, placeholder: '150000', required: region === 'KZ' },
                    { label: t('onboarding.avgViews'), val: avgViews, set: setAvgViews, placeholder: '50000', required: false },
                    { label: t('onboarding.engagementPct'), val: engRate, set: setEngRate, placeholder: '4.5', required: false },
                  ].map(s => (
                    <div key={s.label}>
                      <label className={labelCls}>
                        {s.label}
                        {s.required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
                      </label>
                      <input type="number" value={s.val} onChange={e => s.set(e.target.value)} placeholder={s.placeholder} className={inputCls}
                        style={s.required && (!s.val || parseInt(s.val) <= 0) ? { borderColor: 'rgba(239,68,68,0.35)' } : undefined}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                        onBlur={e => e.currentTarget.style.borderColor = s.required && (!s.val || parseInt(s.val) <= 0) ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hint for videographers/photographers */}
            {(creatorType === 'videographer' || creatorType === 'photographer' || creatorType === 'editor') && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <p className="text-xs" style={{ color: '#60a5fa' }}>
                  {t('onboarding.statsOptionalHint')}
                </p>
              </div>
            )}
            </>
            )}
          </div>
        )}

        {/* ── Step 3: Packages ── */}
        {step === 3 && creatorType === 'model' && (
          <div className="space-y-5">
            <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>{t('onboarding.model.pricingTitle')}</div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t('onboarding.model.hourlyRate')} ({currency}) *</label>
                  <input type="number" min={0} value={modelHourlyRate} onChange={e => setModelHourlyRate(e.target.value)}
                    placeholder="500" className={inputCls}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                  {parseInt(modelHourlyRate) > 0 && (
                    <p className="text-xs mt-1.5" style={{ color: '#475569' }}>
                      {t('onboarding.clientPays')} <span style={{ color: '#94a3b8' }}>{Math.round(parseInt(modelHourlyRate) * (1 + markupPct / 100)).toLocaleString()} {currency}/{t('onboarding.model.perHour')}</span> ({t('onboarding.inclFee', { pct: markupPct })}). {t('onboarding.youEarn')} <span style={{ color: '#00C48C' }}>{parseInt(modelHourlyRate).toLocaleString()} {currency}/{t('onboarding.model.perHour')}</span>.
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>{t('onboarding.model.minHours')} *</label>
                  <input type="number" min={1} max={24} value={modelMinHours} onChange={e => setModelMinHours(e.target.value)}
                    placeholder="2" className={inputCls}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                  <p className="text-xs mt-1.5" style={{ color: '#374151' }}>{t('onboarding.model.minHoursHint')}</p>
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>{t('onboarding.model.shootTypes')}</label>
              <input value={modelShootTypes} onChange={e => setModelShootTypes(e.target.value)}
                placeholder={t('onboarding.model.shootTypesPlaceholder')}
                className={inputCls}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              <p className="text-xs mt-1.5" style={{ color: '#374151' }}>{t('onboarding.model.shootTypesHint')}</p>
            </div>

            <div>
              <label className={labelCls}>{t('onboarding.model.restrictions')}</label>
              <textarea value={modelRestrictions} onChange={e => setModelRestrictions(e.target.value)}
                placeholder={t('onboarding.model.restrictionsPlaceholder')}
                rows={3} className={inputCls + ' resize-none'}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              <p className="text-xs mt-1.5" style={{ color: '#374151' }}>{t('onboarding.model.restrictionsHint')}</p>
            </div>
          </div>
        )}

        {step === 3 && creatorType !== 'model' && (
          <div className="space-y-4">
            {packages.map((pkg, pi) => (
              <div key={pkg.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ background: 'rgba(0,196,140,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-sm font-bold text-white">{t('onboarding.packageN', { n: pi + 1 })}</span>
                  {packages.length > 1 && (
                    <button onClick={() => removePackage(pkg.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#475569' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>{t('onboarding.packageName')} *</label>
                      <input value={pkg.name} onChange={e => updatePackage(pkg.id, 'name', e.target.value)}
                        placeholder={creatorType === 'editor' ? (pi === 0 ? 'Editing 1 Reel (up to 60s)' : pi === 1 ? 'YouTube Vlog Editing' : 'Color Grading') : creatorType === 'videographer' ? 'e.g., 1 Hour Shoot, Half-Day (4 hrs), or 1 Reel (Shoot + Edit)' : 'e.g. Reel Post'}
                        className={inputCls}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>{creatorType === 'telegram_channel' || creatorType === 'editor' ? t('onboarding.yourEarnings', { currency }) : t('onboarding.yourPrice', { currency })} *</label>
                        <input type="number" min={0} value={pkg.price || ''} onChange={e => updatePackage(pkg.id, 'price', Number(e.target.value))}
                          placeholder={creatorType === 'editor' ? '100' : '2500'} className={inputCls}
                          onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                        />
                        {pkg.price > 0 && (
                          <p className="text-xs mt-1.5" style={{ color: '#475569' }}>
                            {t('onboarding.clientPays')} <span style={{ color: '#94a3b8' }}>{Math.round(pkg.price * (1 + markupPct / 100)).toLocaleString()} {currency}</span> ({t('onboarding.inclFee', { pct: markupPct })}). {t('onboarding.youEarn')} <span style={{ color: '#00C48C' }}>{pkg.price.toLocaleString()} {currency}</span>.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={labelCls}>{t('onboarding.deliveryDays')}</label>
                        <input type="number" min={1} max={60} value={pkg.deliveryDays} onChange={e => updatePackage(pkg.id, 'deliveryDays', Math.min(60, Math.max(1, Number(e.target.value) || 1)))} className={inputCls}
                          onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>{t('onboarding.description')}</label>
                    <input value={pkg.description} onChange={e => updatePackage(pkg.id, 'description', e.target.value)}
                      placeholder={creatorType === 'editor' ? 'Professional editing with transitions, effects & color correction' : creatorType === 'videographer' ? 'e.g., Includes Sony FX3, basic lighting, raw footage delivery' : "What's included in this package?"}
                      className={inputCls}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('onboarding.whatsIncluded')}</label>
                    <div className="space-y-2">
                      {pkg.includes.map((inc, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input value={inc} onChange={e => updateInclude(pkg.id, idx, e.target.value)}
                            placeholder={creatorType === 'editor' ? (idx === 0 ? 'Full editing with cuts & transitions' : idx === 1 ? 'Color grading' : 'Background music & SFX') : 'e.g. 1 Reel video (30\u201360s)'}
                            className={inputCls + ' flex-1'}
                            onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                          />
                          {pkg.includes.length > 1 && (
                            <button onClick={() => removeInclude(pkg.id, idx)} className="p-2 rounded-lg" style={{ color: '#374151' }}>
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => addInclude(pkg.id)} className="flex items-center gap-1.5 text-xs py-1.5 transition-colors" style={{ color: '#475569' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#00C48C'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                        <Plus size={12} /> {t('onboarding.addItem')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {packages.length < 4 && (
              <button onClick={addPackage} className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                style={{ border: '1px dashed rgba(255,255,255,0.12)', color: '#475569' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,196,140,0.3)'; e.currentTarget.style.color = '#00C48C'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#475569'; }}>
                <Plus size={15} /> {t('onboarding.addPackage')}
              </button>
            )}
          </div>
        )}

        {/* ── Step 4: Portfolio / Media Kit ── */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Avatar */}
            <div>
              <label className={labelCls}>{t('onboarding.profilePhoto')}</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                    : <Upload size={22} style={{ color: '#374151' }} />}
                </div>
                <div>
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all"
                    style={{ background: 'rgba(0,196,140,0.08)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.25)' }}>
                    <Upload size={14} />
                    {t('onboarding.uploadPhoto')}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                  <p className="text-xs mt-1" style={{ color: '#374151' }}>{t('onboarding.photoFormats')}</p>
                  {!avatarPreview && !avatarFile && (
                    <p className="text-[10px] mt-1 font-medium" style={{ color: '#f87171' }}>{t('onboarding.photoRequired')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Model: Professional photos (up to 10) */}
            {creatorType === 'model' && (
              <div>
                <label className={labelCls}>{t('onboarding.model.portfolioPhotos')}</label>
                <p className="text-xs mb-3" style={{ color: '#374151' }}>{t('onboarding.model.portfolioHint')}</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {portfolioPreviews.map((url, i) => (
                    <div key={i} className="aspect-[3/4] rounded-xl overflow-hidden relative"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => {
                        setPortfolioFiles(prev => prev.filter((_, pi) => pi !== i));
                        setPortfolioPreviews(prev => prev.filter((_, pi) => pi !== i));
                      }} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                        <X size={10} color="white" />
                      </button>
                    </div>
                  ))}
                  {portfolioPreviews.length < 10 && (
                    <label className="aspect-[3/4] rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all"
                      style={{ border: '2px dashed rgba(255,255,255,0.1)', color: '#374151' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'; e.currentTarget.style.color = '#00C48C'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#374151'; }}>
                      <Upload size={20} />
                      <span className="text-xs mt-1">{t('onboarding.model.addPhoto')}</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioChange} />
                    </label>
                  )}
                </div>
                <p className="text-xs mt-2" style={{ color: '#374151' }}>{t('onboarding.model.photoLimit')}</p>
              </div>
            )}

            {creatorType === 'telegram_channel' && (
              /* Telegram: Trusted-by client logos */
              <div>
                <label className={labelCls}>{t('onboarding.trustedBy')}</label>
                <p className="text-xs mb-3" style={{ color: '#374151' }}>{t('onboarding.trustedByHint')}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {clientLogoPreviews.map((url, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden relative flex items-center justify-center p-2"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <img src={url} alt="" className="max-w-full max-h-full object-contain" />
                      <button onClick={() => {
                        setClientLogoFiles(prev => prev.filter((_, li) => li !== i));
                        setClientLogoPreviews(prev => prev.filter((_, li) => li !== i));
                      }} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                        <X size={10} color="white" />
                      </button>
                    </div>
                  ))}
                  {clientLogoPreviews.length < 12 && (
                    <label className="aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all"
                      style={{ border: '2px dashed rgba(255,255,255,0.1)', color: '#374151' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)'; e.currentTarget.style.color = '#38bdf8'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#374151'; }}>
                      <Plus size={20} />
                      <span className="text-xs mt-1">{t('onboarding.addLogo')}</span>
                      <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" multiple className="hidden" onChange={e => {
                        const files = Array.from(e.target.files ?? []);
                        setClientLogoFiles(prev => [...prev, ...files]);
                        setClientLogoPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
                      }} />
                    </label>
                  )}
                </div>
                <p className="text-xs mt-2" style={{ color: '#374151' }}>{t('onboarding.logoFormats')}</p>
              </div>
            )}

            {uploadProgress && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(0,196,140,0.08)', border: '1px solid rgba(0,196,140,0.25)' }}>
                <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin flex-shrink-0" />
                <span className="text-sm" style={{ color: '#00C48C' }}>{t('onboarding.uploadingFiles')}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Step 5: Go Live ── */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,196,140,0.25)' }}>
              <div className="px-5 py-4" style={{ background: 'rgba(0,196,140,0.06)', borderBottom: '1px solid rgba(0,196,140,0.15)' }}>
                <div className="font-bold text-white mb-0.5">{t('onboarding.profilePreview')}</div>
                <div className="text-xs" style={{ color: '#475569' }}>{t('onboarding.profilePreviewDesc')}</div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  {avatarPreview
                    ? <img src={avatarPreview} alt="" className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
                    : <div className="w-14 h-14 rounded-2xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />}
                  <div>
                    <div className="font-bold text-white">{displayName || 'Your Name'}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{username ? '@' + username : '@handle'}</div>
                    <div className="text-xs mt-1 capitalize" style={{ color: '#00C48C' }}>{creatorType} · {category}</div>
                  </div>
                </div>
                <p className="text-sm" style={{ color: '#94a3b8' }}>{bio || 'Your bio will appear here.'}</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { check: !!displayName, label: t('onboarding.checkDisplayName') },
                ...(creatorType !== 'editor' && creatorType !== 'videographer' ? [{ check: !!(instagramUrl || youtubeUrl || tiktokUrl), label: t('onboarding.checkSocialLink') }] : []),
                { check: packages.some(p => p.name && p.price > 0), label: t('onboarding.checkPackage') },
                ...(creatorType !== 'editor' && creatorType !== 'videographer' ? [{ check: followers > '0', label: t('onboarding.checkStats') }] : []),
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.check ? 'bg-emerald-500/20' : 'bg-slate-800'}`}
                    style={{ border: item.check ? '1px solid rgba(0,196,140,0.4)' : '1px solid rgba(255,255,255,0.1)' }}>
                    {item.check && <Check size={11} style={{ color: '#00C48C' }} strokeWidth={3} />}
                  </div>
                  <span className="text-sm" style={{ color: item.check ? '#94a3b8' : '#475569' }}>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <p className="text-sm" style={{ color: '#fbbf24' }}>
                {t('onboarding.publishWarning')}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button onClick={() => setStep(getPrevStep(step, creatorType))} className="px-5 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
              {t('onboarding.back')}
            </button>
          )}
          <button onClick={() => saveStep(getNextStep(step, creatorType))} disabled={saving || (step === 4 && !avatarPreview && !avatarFile) || (step === 1 && !creatorType)}
            className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)', color: '#fff', border: '1px solid rgba(0,196,140,0.3)', boxShadow: '0 6px 20px rgba(0,196,140,0.15)' }}>
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>{step === 5 ? t('onboarding.publishProfile') : t('onboarding.continue')} <ChevronRight size={15} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
