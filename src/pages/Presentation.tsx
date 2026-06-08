import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Camera, Film, CalendarCheck, Clock, Users, Zap, ArrowRight, ArrowLeft, Sparkles, TrendingUp, Target, Monitor, Rocket, Crosshair, CreditCard, ShieldCheck, Globe, Check, X, PenTool } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { translations, type PresentationLang } from '../lib/presentationI18n';

type PresentationContentRow = {
  section_key: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  icon_url: string;
};

type PresentationCaseRow = {
  id: string;
  name: string;
  instagram_url: string;
  image_url: string;
};

type PresentationData = {
  content: Record<string, PresentationContentRow>;
  cases: PresentationCaseRow[];
  loading: boolean;
  slideOrder: string[];
};

const PresentationDataContext = createContext<PresentationData>({ content: {}, cases: [], loading: true, slideOrder: [] });

const PresentationLangContext = createContext<{ lang: PresentationLang; setLang: (l: PresentationLang) => void }>({ lang: 'en', setLang: () => {} });

function usePresentationData() {
  return useContext(PresentationDataContext);
}

function useT(key: string): string {
  const { lang } = useContext(PresentationLangContext);
  return translations[lang][key] || translations['en'][key] || key;
}

function useSectionContent(key: string, fallback: { title?: string; subtitle?: string; description?: string }) {
  const { content } = usePresentationData();
  const row = content[key];
  return {
    title: row?.title || fallback.title || '',
    subtitle: row?.subtitle || fallback.subtitle || '',
    description: row?.description || fallback.description || '',
    image_url: row?.image_url || '',
    icon_url: row?.icon_url || '',
  };
}

function PresentationLangSwitcher() {
  const { lang, setLang } = useContext(PresentationLangContext);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const langs: { code: PresentationLang; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: 'EN' },
    { code: 'ru', label: 'Русский', flag: 'RU' },
    { code: 'ar', label: 'العربية', flag: 'AR' },
  ];

  const current = langs.find(l => l.code === lang) || langs[0];

  return (
    <div ref={ref} className="fixed top-6 right-6 z-50">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all"
        style={{ color: '#94a3b8', background: 'rgba(6,10,18,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Globe size={13} />
        <span>{current.flag}</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 rounded-xl overflow-hidden" style={{ background: 'rgba(6,10,18,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 120 }}>
          {langs.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors"
              style={{ color: l.code === lang ? '#fbbf24' : '#94a3b8', background: l.code === lang ? 'rgba(251,191,36,0.08)' : 'transparent' }}
            >
              <span className="font-bold w-5">{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Screen = 'intro' | 'choose' | 'b2b' | 'personal';

const pageTransition = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -30, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const fadeChild = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function FloatingOrb({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-15 transition-transform duration-[2000ms] ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.25) 0%, rgba(0,196,140,0.08) 50%, transparent 70%)',
          left: '60%',
          top: '30%',
          transform: `translate(calc(-50% + ${mouseX * 25}px), calc(-50% + ${mouseY * 25}px))`,
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-10 transition-transform duration-[2500ms] ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(0,196,140,0.3) 0%, transparent 60%)',
          left: '20%',
          top: '60%',
          transform: `translate(${mouseX * -18}px, ${mouseY * -18}px)`,
        }}
      />
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />
    </div>
  );
}

function IntroScreen({ onNext, mouseX, mouseY }: { onNext: () => void; mouseX: number; mouseY: number }) {
  const t = useT;
  return (
    <motion.section
      className="relative min-h-screen flex flex-col items-center justify-center px-6"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <FloatingOrb mouseX={mouseX} mouseY={mouseY} />

      <motion.div className="relative z-10 text-center max-w-4xl" variants={staggerContainer} initial="initial" animate="animate">
        <motion.div
          variants={fadeChild}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
        >
          <Sparkles size={14} style={{ color: '#fbbf24' }} />
          <span className="text-xs font-bold tracking-wider uppercase" style={{ color: '#fbbf24' }}>{t('intro.badge')}</span>
        </motion.div>

        <motion.h1
          variants={fadeChild}
          className="text-5xl sm:text-7xl md:text-[5.5rem] font-black leading-[0.95] tracking-tight mb-6"
        >
          <span className="text-white">{t('intro.title1')}</span>
          <br />
          <span style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #00C48C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('intro.title2')}
          </span>
        </motion.h1>

        <motion.p
          variants={fadeChild}
          className="text-lg sm:text-2xl max-w-2xl mx-auto mb-14 leading-relaxed font-medium"
          style={{ color: '#cbd5e1' }}
        >
          {t('intro.desc1')}
          <br />
          <span style={{ color: '#94a3b8' }}>{t('intro.desc2')}</span>
        </motion.p>

        <motion.button
          variants={fadeChild}
          onClick={onNext}
          className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            color: '#0B101B',
            boxShadow: '0 8px 40px rgba(251,191,36,0.25)',
          }}
          whileHover={{ scale: 1.04, boxShadow: '0 12px 60px rgba(251,191,36,0.35)' }}
          whileTap={{ scale: 0.97 }}
        >
          {t('intro.cta')}
          <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
        </motion.button>
      </motion.div>
    </motion.section>
  );
}

function ChooseScreen({ onSelect, mouseX, mouseY }: { onSelect: (s: Screen) => void; mouseX: number; mouseY: number }) {
  const t = useT;
  return (
    <motion.section
      className="relative min-h-screen flex flex-col items-center justify-center px-6"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <FloatingOrb mouseX={mouseX} mouseY={mouseY} />

      <motion.div className="relative z-10 text-center max-w-5xl w-full" variants={staggerContainer} initial="initial" animate="animate">
        <motion.h2
          variants={fadeChild}
          className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight"
        >
          {t('choose.title')}
        </motion.h2>
        <motion.p variants={fadeChild} className="text-lg mb-14" style={{ color: '#94a3b8' }}>
          {t('choose.subtitle')}
        </motion.p>

        <motion.div variants={fadeChild} className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <motion.button
            onClick={() => onSelect('b2b')}
            className="group relative p-8 sm:p-10 rounded-3xl text-left cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(251,191,36,0.12)',
              backdropFilter: 'blur(40px)',
            }}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 20px 80px rgba(251,191,36,0.12), 0 0 0 1px rgba(251,191,36,0.3)',
            }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <Users size={28} style={{ color: '#fbbf24' }} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">{t('choose.b2b.title')}</h3>
            <p className="text-base leading-relaxed mb-8" style={{ color: '#94a3b8' }}>
              {t('choose.b2b.desc')}
            </p>
            <div className="flex items-center gap-2 text-base font-bold" style={{ color: '#fbbf24' }}>
              <span>{t('choose.b2b.cta')}</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </div>
            <div className="absolute top-5 right-5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
              {t('choose.b2b.badge')}
            </div>
          </motion.button>

          <motion.button
            onClick={() => onSelect('personal')}
            className="group relative p-8 sm:p-10 rounded-3xl text-left cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(0,196,140,0.12)',
              backdropFilter: 'blur(40px)',
            }}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 20px 80px rgba(0,196,140,0.12), 0 0 0 1px rgba(0,196,140,0.3)',
            }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(0,196,140,0.1)', border: '1px solid rgba(0,196,140,0.25)' }}>
              <TrendingUp size={28} style={{ color: '#00C48C' }} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">{t('choose.personal.title')}</h3>
            <p className="text-base leading-relaxed mb-8" style={{ color: '#94a3b8' }}>
              {t('choose.personal.desc')}
            </p>
            <div className="flex items-center gap-2 text-base font-bold" style={{ color: '#00C48C' }}>
              <span>{t('choose.personal.cta')}</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </div>
            <div className="absolute top-5 right-5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(0,196,140,0.1)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.25)' }}>
              {t('choose.personal.badge')}
            </div>
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

/* ─── B2B Scroll-Snap Slide Component ─── */

interface B2BSlideProps {
  children: React.ReactNode;
  orbColor1: string;
  orbColor2: string;
  mouseX: number;
  mouseY: number;
}

function B2BSlide({ children, orbColor1, orbColor2, mouseX, mouseY }: B2BSlideProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.5 });

  return (
    <div
      ref={ref}
      className="h-screen w-full flex-shrink-0 snap-start snap-always relative flex items-center justify-center px-6 sm:px-10 overflow-hidden"
    >
      {/* 3D Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[500px] h-[500px] rounded-full transition-transform duration-[2500ms] ease-out"
          style={{
            background: `radial-gradient(circle, ${orbColor1}30 0%, ${orbColor1}08 40%, transparent 70%)`,
            right: '-10%',
            top: '20%',
            transform: `translate(${mouseX * -30}px, ${mouseY * -20}px)`,
            filter: 'blur(2px)',
          }}
        />
        <div
          className="absolute w-[350px] h-[350px] rounded-full transition-transform duration-[3000ms] ease-out"
          style={{
            background: `radial-gradient(circle, ${orbColor2}25 0%, transparent 60%)`,
            left: '5%',
            bottom: '15%',
            transform: `translate(${mouseX * 20}px, ${mouseY * 15}px)`,
            filter: 'blur(1px)',
          }}
        />
        {/* Glass sphere */}
        <div
          className="absolute w-[180px] h-[180px] rounded-full transition-transform duration-[2000ms] ease-out hidden sm:block"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${orbColor1}15, transparent 60%)`,
            border: `1px solid ${orbColor1}12`,
            backdropFilter: 'blur(8px)',
            right: '15%',
            top: '50%',
            transform: `translate(${mouseX * 40}px, ${mouseY * 30}px) translateY(-50%)`,
          }}
        />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)',
        backgroundSize: '100px 100px',
      }} />

      {/* Content */}
      <motion.div
        className="relative z-10 max-w-5xl w-full"
        initial={{ opacity: 0, y: 60 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

const CASES = [
  { name: 'Al Noor', initials: 'AN', color: '#fbbf24' },
  { name: 'Dubai Luxe', initials: 'DL', color: '#00C48C' },
  { name: 'Glow Beauty', initials: 'GB', color: '#f472b6' },
  { name: 'TechFlow', initials: 'TF', color: '#38bdf8' },
  { name: 'Marina Club', initials: 'MC', color: '#fb923c' },
  { name: 'Royal Eats', initials: 'RE', color: '#a78bfa' },
  { name: 'SkyBrand', initials: 'SB', color: '#34d399' },
  { name: 'Zenith Co', initials: 'ZC', color: '#fbbf24' },
  { name: 'Palm Living', initials: 'PL', color: '#f87171' },
  { name: 'GoldMark', initials: 'GM', color: '#00C48C' },
  { name: 'Luxora', initials: 'LX', color: '#e879f9' },
  { name: 'NovaCorp', initials: 'NC', color: '#38bdf8' },
  { name: 'AquaPure', initials: 'AP', color: '#fb923c' },
  { name: 'UrbanPulse', initials: 'UP', color: '#a3e635' },
  { name: 'Crescent', initials: 'CR', color: '#fbbf24' },
  { name: 'OpalStudio', initials: 'OS', color: '#f472b6' },
];

const CASE_COLORS = ['#fbbf24', '#00C48C', '#f472b6', '#38bdf8', '#fb923c', '#a78bfa', '#34d399', '#f87171'];

function IntroSlideContent() {
  const t = useT;
  const s = useSectionContent('intro', {
    title: t('b2b.intro.title'),
    subtitle: t('b2b.intro.subtitle'),
  });
  return (
    <div className="text-center">
      <motion.div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider mb-8"
        style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Target size={13} /> {t('b2b.badge')}
      </motion.div>
      <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] max-w-3xl mx-auto">
        <span className="text-white">{s.title}</span>
        <br />
        <span style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {s.subtitle}
        </span>
      </h1>
    </div>
  );
}

function CinemaGradeSlideContent() {
  const t = useT;
  const s = useSectionContent('cinema_grade', {
    title: t('b2b.cinema.title1') + '\n' + t('b2b.cinema.title2'),
    description: t('b2b.cinema.desc'),
  });
  const titleParts = s.title.split('\n');
  return (
    <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
      <div className="flex-1">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
          <Camera size={36} style={{ color: '#fbbf24' }} />
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mb-6 leading-[1.1]">
          {titleParts[0] || 'Видеооператор'}
          <br />
          <span style={{ color: '#fbbf24' }}>{titleParts[1] || 'Cinema Grade'}</span>
        </h2>
        <p className="text-lg sm:text-xl leading-relaxed max-w-lg" style={{ color: '#94a3b8' }}>
          {s.description}
        </p>
      </div>
      <div className="flex-shrink-0 hidden lg:block">
        <div className="w-64 h-64 rounded-3xl relative"
          style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)', backdropFilter: 'blur(20px)' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            {s.image_url ? (
              <img src={s.image_url} alt="" className="w-full h-full object-cover rounded-3xl opacity-60" />
            ) : (
              <Camera size={80} style={{ color: '#fbbf24', opacity: 0.3 }} />
            )}
          </div>
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.2), transparent)', filter: 'blur(8px)' }} />
        </div>
      </div>
    </div>
  );
}

function PlatformSlideContent() {
  const t = useT;
  const s = useSectionContent('platform', {
    title: t('b2b.platform.title'),
    description: t('b2b.platform.desc'),
    subtitle: t('b2b.platform.accent'),
  });
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)' }}>
          <Monitor size={30} style={{ color: '#38bdf8' }} />
        </div>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
          <Clock size={30} style={{ color: '#fbbf24' }} />
        </div>
      </div>
      <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mb-6 leading-[1.1]">
        {(() => {
          const parts = s.title.split(' & ');
          return parts.length === 2 ? (
            <>
              {parts[0]} <span style={{ color: '#38bdf8' }}>&</span>
              <br />
              {parts[1]}
            </>
          ) : (
            s.title
          );
        })()}
      </h2>
      <p className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10" style={{ color: '#94a3b8' }}>
        {s.description}
      </p>
      <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl"
        style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
        <Zap size={18} fill="#fbbf24" style={{ color: '#fbbf24' }} />
        <span className="text-base font-bold" style={{ color: '#fbbf24' }}>{s.subtitle}</span>
      </div>
    </div>
  );
}

function TargetingSlideContent() {
  const t = useT;
  const s = useSectionContent('targeting', {
    title: t('b2b.targeting.title'),
    description: t('b2b.targeting.pub_desc'),
    subtitle: t('b2b.targeting.target_desc'),
  });
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.25)' }}>
          <Rocket size={30} style={{ color: '#f472b6' }} />
        </div>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)' }}>
          <Crosshair size={30} style={{ color: '#fb923c' }} />
        </div>
      </div>
      <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mb-6 leading-[1.1]">
        {(() => {
          const parts = s.title.split(' & ');
          return parts.length === 2 ? (
            <>
              <span style={{ color: '#f472b6' }}>{parts[0]}</span> <span style={{ color: 'white' }}>&</span>
              <br />
              <span style={{ color: '#fb923c' }}>{parts[1]}</span>
            </>
          ) : (
            s.title
          );
        })()}
      </h2>
      <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto mt-10">
        <div className="p-6 rounded-2xl text-left"
          style={{ background: 'rgba(244,114,182,0.04)', border: '1px solid rgba(244,114,182,0.12)' }}>
          <h4 className="text-lg font-bold text-white mb-2">{t('b2b.targeting.pub_title')}</h4>
          <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
            {s.description}
          </p>
        </div>
        <div className="p-6 rounded-2xl text-left"
          style={{ background: 'rgba(251,146,60,0.04)', border: '1px solid rgba(251,146,60,0.12)' }}>
          <h4 className="text-lg font-bold text-white mb-2">{t('b2b.targeting.target_title')}</h4>
          <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
            {s.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function MechanismSlideContent() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3, once: true });
  const t = useT;
  const s = useSectionContent('mechanism', {
    title: t('b2b.mechanism.title'),
    subtitle: t('b2b.mechanism.subtitle'),
    description: t('b2b.mechanism.desc'),
  });

  const problems = [
    { text: 'Виза в ОАЭ?', x: -220, y: -80 },
    { text: 'Ежегодный отпуск?', x: -200, y: 60 },
    { text: 'Больничный лист?', x: 200, y: -80 },
    { text: 'Смена сломалась?', x: 220, y: 60 },
  ];

  const gears = [
    { cx: 0, cy: 0, r: 60, teeth: 12, speed: 20, color: '#fbbf24' },
    { cx: 85, cy: 50, r: 35, teeth: 8, speed: -15, color: '#d4a017' },
    { cx: -80, cy: 55, r: 30, teeth: 7, speed: -18, color: '#b8860b' },
    { cx: 0, cy: -80, r: 25, teeth: 6, speed: 22, color: '#f59e0b' },
  ];

  function renderGear(gear: typeof gears[0], idx: number) {
    const { cx, cy, r, teeth, color } = gear;
    const toothDepth = r * 0.18;
    const toothWidth = (Math.PI * 2) / (teeth * 2);
    let d = '';
    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      const innerR = r - toothDepth;
      const outerR = r + toothDepth;
      const x1 = cx + Math.cos(angle - toothWidth) * innerR;
      const y1 = cy + Math.sin(angle - toothWidth) * innerR;
      const x2 = cx + Math.cos(angle - toothWidth * 0.5) * outerR;
      const y2 = cy + Math.sin(angle - toothWidth * 0.5) * outerR;
      const x3 = cx + Math.cos(angle + toothWidth * 0.5) * outerR;
      const y3 = cy + Math.sin(angle + toothWidth * 0.5) * outerR;
      const x4 = cx + Math.cos(angle + toothWidth) * innerR;
      const y4 = cy + Math.sin(angle + toothWidth) * innerR;
      d += `${i === 0 ? 'M' : 'L'}${x1},${y1} L${x2},${y2} L${x3},${y3} L${x4},${y4} `;
    }
    d += 'Z';
    return (
      <motion.g
        key={idx}
        animate={isInView ? { rotate: [0, 360 * Math.sign(gear.speed)] } : { rotate: 0 }}
        transition={{ duration: Math.abs(gear.speed), repeat: Infinity, ease: 'linear' }}
        style={{ originX: `${cx + 150}px`, originY: `${cy + 150}px` }}
      >
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" opacity="0.8"
          style={{ transform: `translate(150px, 150px)` }} />
        <circle cx={cx + 150} cy={cy + 150} r={r * 0.3} fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
        <circle cx={cx + 150} cy={cy + 150} r={3} fill={color} opacity="0.9" />
      </motion.g>
    );
  }

  return (
    <div ref={ref} className="relative text-center flex flex-col items-center justify-center overflow-hidden w-full">
      {/* Top headline */}
      <motion.h2
        className="text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-tight uppercase leading-tight mb-2 relative z-10"
        initial={{ opacity: 0, y: -30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        {(s.title || 'Мы не просим отпусков.\nНам не нужны визы.').split('\n').map((line, i, arr) => (
          <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
        ))}
      </motion.h2>

      {/* Central mechanism */}
      <div className="relative my-6 sm:my-10">
        {/* Glow behind mechanism */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ filter: 'blur(40px)' }}
          initial={{ opacity: 0 }}
          animate={isInView ? {
            opacity: [0, 0.4, 0.2, 0.4],
            scale: [0.8, 1.1, 1, 1.1],
          } : { opacity: 0 }}
          transition={{ duration: 4, delay: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-full h-full rounded-full" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.3), transparent)' }} />
        </motion.div>

        {/* SVG Mechanism */}
        <motion.svg
          viewBox="0 0 300 300"
          className="w-48 h-48 sm:w-64 sm:h-64 lg:w-72 lg:h-72 relative z-10"
          initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
          animate={isInView ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.6, rotate: -30 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {gears.map((g, i) => renderGear(g, i))}
          {/* Center emblem */}
          <circle cx="150" cy="150" r="18" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.9" />
          <circle cx="150" cy="150" r="8" fill="#fbbf24" opacity="0.7" />
        </motion.svg>

        {/* Problem clouds that disintegrate */}
        {problems.map((prob, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap pointer-events-none"
            style={{
              background: 'rgba(100,116,139,0.15)',
              border: '1px solid rgba(100,116,139,0.3)',
              color: '#94a3b8',
            }}
            initial={{
              opacity: 0,
              x: prob.x * 0.3,
              y: prob.y * 0.3,
              scale: 1,
            }}
            animate={isInView ? {
              opacity: [0, 0.9, 0.9, 0],
              x: [prob.x * 0.5, prob.x * 0.7, prob.x * 0.7, prob.x * 0.3],
              y: [prob.y * 0.5, prob.y * 0.7, prob.y * 0.7, prob.y * 0.3],
              scale: [0.7, 1, 1, 0],
              filter: ['blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(8px)'],
            } : { opacity: 0 }}
            transition={{
              duration: 4,
              delay: 1.8 + i * 0.3,
              times: [0, 0.3, 0.7, 1],
              ease: 'easeInOut',
            }}
          >
            {prob.text}
          </motion.div>
        ))}

        {/* Gold flash when problems disappear */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.4), transparent 70%)',
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={isInView ? {
            opacity: [0, 0, 0.8, 0],
            scale: [0.5, 0.5, 1.5, 2],
          } : { opacity: 0 }}
          transition={{ duration: 4, delay: 1.8, times: [0, 0.6, 0.8, 1], ease: 'easeOut' }}
        />
      </div>

      {/* Central statement */}
      <motion.p
        className="text-xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight relative z-10"
        style={{
          background: 'linear-gradient(135deg, #fbbf24, #fffbeb, #f59e0b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 15px rgba(251,191,36,0.3))',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.7, delay: 3.5 }}
      >
        {s.subtitle}
      </motion.p>

      {/* Final benefit */}
      <motion.p
        className="text-sm sm:text-base max-w-lg leading-relaxed mt-6 relative z-10"
        style={{ color: '#94a3b8' }}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.7, delay: 4 }}
      >
        {s.description}
      </motion.p>
    </div>
  );
}

function SpeedPlatformSlideContent() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3, once: true });
  const t = useT;
  const s = useSectionContent('speed', {
    title: t('b2b.speed.title1') + '\n' + t('b2b.speed.title2'),
    subtitle: t('b2b.speed.subtitle'),
    description: t('b2b.speed.desc'),
  });

  const speedLines = Array.from({ length: 28 }, (_, i) => ({
    top: `${4 + (i * 3.4)}%`,
    width: 60 + Math.random() * 200,
    delay: Math.random() * 1.5,
    duration: 0.6 + Math.random() * 0.8,
    opacity: 0.15 + Math.random() * 0.4,
  }));

  const platforms = [
    { name: 'Instagram', color: '#E1306C', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
    { name: 'Facebook', color: '#1877F2', icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
    { name: 'YouTube', color: '#FF0000', icon: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
    { name: 'TikTok', color: '#00F2EA', icon: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
  ];

  return (
    <div ref={ref} className="relative text-center flex flex-col items-center overflow-hidden w-full">
      {/* Hyperspace speed lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {speedLines.map((line, i) => (
          <motion.div
            key={i}
            className="absolute left-0 h-[1px]"
            style={{
              top: line.top,
              width: 0,
              background: `linear-gradient(90deg, transparent, ${i % 2 === 0 ? '#fbbf24' : '#38bdf8'}${Math.round(line.opacity * 255).toString(16).padStart(2, '0')}, transparent)`,
            }}
            initial={{ width: 0, x: '-10%', opacity: 0 }}
            animate={isInView ? {
              width: [0, line.width, line.width * 1.5],
              x: ['-10%', '40%', '110%'],
              opacity: [0, line.opacity, 0],
            } : { width: 0, opacity: 0 }}
            transition={{
              duration: line.duration,
              delay: line.delay,
              repeat: Infinity,
              repeatDelay: 1 + Math.random() * 2,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      {/* Car silhouette - abstract glowing lines */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ bottom: '8%', right: '5%', width: '320px', height: '120px' }}
        initial={{ opacity: 0, x: 100 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 100 }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg viewBox="0 0 320 120" fill="none" className="w-full h-full">
          {/* Car body outline */}
          <motion.path
            d="M30 80 L60 80 L80 55 L140 45 L200 42 L260 45 L280 55 L300 65 L310 75 L310 85 L30 85 Z"
            stroke="url(#carGradient)"
            strokeWidth="1.5"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={isInView ? { pathLength: 1, opacity: 0.7 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 2, delay: 0.8, ease: 'easeInOut' }}
          />
          {/* Roof line */}
          <motion.path
            d="M100 55 L130 35 L210 32 L250 40 L260 45"
            stroke="url(#carGradient)"
            strokeWidth="1"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={isInView ? { pathLength: 1, opacity: 0.5 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 1.5, delay: 1.2, ease: 'easeInOut' }}
          />
          {/* Wheels */}
          <motion.circle cx="90" cy="85" r="14" stroke="#fbbf24" strokeWidth="1.5" fill="none"
            initial={{ opacity: 0 }} animate={isInView ? { opacity: 0.6 } : { opacity: 0 }} transition={{ delay: 1.5 }} />
          <motion.circle cx="250" cy="85" r="14" stroke="#fbbf24" strokeWidth="1.5" fill="none"
            initial={{ opacity: 0 }} animate={isInView ? { opacity: 0.6 } : { opacity: 0 }} transition={{ delay: 1.6 }} />
          {/* Headlight glow */}
          <motion.circle cx="305" cy="72" r="6" fill="none"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: [0, 0.8, 0.4, 0.8] } : { opacity: 0 }}
            transition={{ duration: 2, delay: 1.8, repeat: Infinity }}
            style={{ filter: 'blur(3px)' }}
          >
            <animate attributeName="fill" values="#fbbf24;#fffbeb;#fbbf24" dur="2s" repeatCount="indefinite" />
          </motion.circle>
          <motion.ellipse cx="305" cy="72" rx="20" ry="10" fill="rgba(251,191,36,0.1)"
            initial={{ opacity: 0 }} animate={isInView ? { opacity: [0, 0.4, 0.2, 0.4] } : { opacity: 0 }}
            transition={{ duration: 2, delay: 1.8, repeat: Infinity }}
            style={{ filter: 'blur(8px)' }} />
          {/* Speed streaks from car */}
          <motion.line x1="20" y1="60" x2="0" y2="60" stroke="#fbbf24" strokeWidth="1"
            initial={{ opacity: 0 }} animate={isInView ? { opacity: [0, 0.5, 0] } : { opacity: 0 }}
            transition={{ duration: 0.8, delay: 2, repeat: Infinity, repeatDelay: 0.5 }} />
          <motion.line x1="25" y1="70" x2="-5" y2="70" stroke="#38bdf8" strokeWidth="0.8"
            initial={{ opacity: 0 }} animate={isInView ? { opacity: [0, 0.4, 0] } : { opacity: 0 }}
            transition={{ duration: 0.7, delay: 2.2, repeat: Infinity, repeatDelay: 0.6 }} />
          <motion.line x1="20" y1="80" x2="0" y2="80" stroke="#fbbf24" strokeWidth="0.6"
            initial={{ opacity: 0 }} animate={isInView ? { opacity: [0, 0.3, 0] } : { opacity: 0 }}
            transition={{ duration: 0.9, delay: 2.4, repeat: Infinity, repeatDelay: 0.7 }} />
          <defs>
            <linearGradient id="carGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fffbeb" stopOpacity="1" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Content */}
      <motion.div className="relative z-10 flex flex-col items-center max-w-4xl">
        {/* Headline */}
        <motion.h2
          className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1] uppercase mb-4"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {(s.title.split('\n')[0]) || 'Ваш бизнес будет расти'}
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #fbbf24 0%, #fffbeb 50%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.4))',
          }}>
            {(s.title.split('\n')[1]) || 'с невероятной скоростью.'}
          </span>
        </motion.h2>

        <motion.p
          className="text-base sm:text-lg mb-10 max-w-xl"
          style={{ color: '#64748b' }}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {s.subtitle}
        </motion.p>

        {/* Platforms */}
        <motion.p
          className="text-xs font-bold uppercase tracking-[0.25em] mb-6"
          style={{ color: '#475569' }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {t('b2b.speed.platforms_label')}
        </motion.p>

        <div className="grid grid-cols-4 gap-4 sm:gap-6 mb-8">
          {platforms.map((p, i) => (
            <motion.div
              key={i}
              className="relative flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.8 }}
              transition={{ duration: 0.6, delay: 0.7 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Glass card */}
              <motion.div
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                }}
                animate={isInView ? {
                  boxShadow: [
                    `0 0 0px ${p.color}00`,
                    `0 0 25px ${p.color}40, 0 0 50px ${p.color}20`,
                    `0 0 15px ${p.color}30`,
                  ],
                  borderColor: [
                    'rgba(255,255,255,0.08)',
                    `${p.color}60`,
                    `${p.color}30`,
                  ],
                } : {}}
                transition={{
                  duration: 2,
                  delay: 1.2 + i * 0.15,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }}
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 sm:w-9 sm:h-9" fill={p.color}>
                  <path d={p.icon} />
                </svg>
              </motion.div>
              <span className="text-[10px] sm:text-xs font-semibold" style={{ color: '#94a3b8' }}>{p.name}</span>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-sm max-w-md leading-relaxed"
          style={{ color: '#64748b' }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          {s.description}
        </motion.p>
      </motion.div>
    </div>
  );
}

function UnlimitedSlideContent() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3, once: true });
  const t = useT;
  const s = useSectionContent('unlimited', {
    title: t('b2b.unlimited.title1') + '\n' + t('b2b.unlimited.title2'),
    subtitle: t('b2b.unlimited.subtitle'),
    description: t('b2b.unlimited.desc'),
  });

  const team = [
    { icon: <Camera size={20} />, role: t('b2b.unlimited.role1'), desc: t('b2b.unlimited.role1_desc'), color: '#fbbf24' },
    { icon: <Film size={20} />, role: t('b2b.unlimited.role2'), desc: t('b2b.unlimited.role2_desc'), color: '#00C48C' },
    { icon: <Sparkles size={20} />, role: t('b2b.unlimited.role3'), desc: t('b2b.unlimited.role3_desc'), color: '#38bdf8' },
  ];

  const particles = Array.from({ length: 24 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 4,
  }));

  return (
    <div ref={ref} className="relative text-center flex flex-col items-center overflow-hidden">
      {/* Explosion particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#f59e0b' : '#fffbeb',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? {
            opacity: [0, 0.8, 0],
            scale: [0, 1.5, 0],
            x: [(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 120],
            y: [(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 120],
          } : { opacity: 0 }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Central radial burst */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.06) 0%, transparent 60%)',
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={isInView ? { opacity: 1, scale: 1.2 } : { opacity: 0, scale: 0.5 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Infinity symbol */}
        <motion.div
          className="text-5xl sm:text-8xl font-black mb-3 sm:mb-6"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #fffbeb)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.4))',
          }}
          initial={{ opacity: 0, scale: 0.5, rotateX: 45 }}
          animate={isInView ? { opacity: 1, scale: 1, rotateX: 0 } : { opacity: 0, scale: 0.5, rotateX: 45 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          &#8734;
        </motion.div>

        {/* Main headline */}
        <motion.h2
          className="text-xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1] mb-2 sm:mb-4 uppercase"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          {(s.title.split('\n')[0]) || 'Мы не считаем'}
          <br />
          {(s.title.split('\n')[1]) || 'количество видео.'}
        </motion.h2>

        {/* Gold accent */}
        <motion.p
          className="text-base sm:text-2xl lg:text-3xl font-black uppercase tracking-wide mb-4 sm:mb-8"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.3))',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, delay: 0.45 }}
        >
          {s.subtitle}
        </motion.p>

        {/* Manifesto text */}
        <motion.p
          className="hidden sm:block text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-10"
          style={{ color: '#94a3b8' }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {s.description}
        </motion.p>

        {/* Team block */}
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, delay: 0.7 }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.25em] mb-3 sm:mb-5" style={{ color: '#475569' }}>
            {t('b2b.unlimited.team_label')}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {team.map((member, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${member.color}20`,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                whileHover={{
                  borderColor: `${member.color}50`,
                  boxShadow: `0 0 20px ${member.color}15`,
                }}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${member.color}12`, color: member.color }}>
                  {member.icon}
                </div>
                <span className="text-xs sm:text-sm font-bold text-white text-center leading-tight">{member.role}</span>
                <span className="text-xs hidden sm:block" style={{ color: '#64748b' }}>{member.desc}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function PricingSlideContent() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.5, once: true });
  const t = useT;
  const s = useSectionContent('pricing', {
    title: t('b2b.pricing.title'),
    subtitle: t('b2b.pricing.price'),
    description: t('b2b.pricing.period'),
  });

  return (
    <div ref={ref} className="text-center flex flex-col items-center">
      <motion.p
        className="text-xs font-bold uppercase tracking-[0.3em] mb-6"
        style={{ color: '#64748b' }}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        {t('b2b.pricing.label')}
      </motion.p>

      <motion.h2
        className="text-2xl sm:text-3xl font-semibold text-white mb-14 tracking-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        {s.title}
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.88 }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 60, scale: 0.88 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center"
      >
        <span
          className="font-black leading-none tracking-tighter"
          style={{
            fontSize: 'clamp(3.5rem, 12vw, 9rem)',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #fffbeb 70%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 40px rgba(251,191,36,0.25))',
          }}
        >
          {s.subtitle}
        </span>
        <span className="mt-3 text-base font-medium" style={{ color: '#475569' }}>{s.description}</span>
      </motion.div>

      <motion.div
        className="w-24 h-px my-12"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)' }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={isInView ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
        transition={{ duration: 0.8, delay: 0.55 }}
      />

      <motion.a
        href="https://wa.me/971585931600?text=Хочу%20подключить%20B2B%20подписку"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold"
        style={{
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          color: '#0B101B',
          boxShadow: '0 8px 40px rgba(251,191,36,0.2)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 0.65 }}
        whileHover={{ scale: 1.04, boxShadow: '0 12px 60px rgba(251,191,36,0.45)' }}
        whileTap={{ scale: 0.97 }}
      >
        <CalendarCheck size={20} />
        {t('b2b.pricing.cta')}
      </motion.a>
    </div>
  );
}

function CasesSlideContent() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3, once: true });
  const t = useT;
  const { cases: dbCases } = usePresentationData();

  const displayCases = dbCases.length > 0
    ? dbCases.map((c, i) => ({ name: c.name, initials: c.name.slice(0, 2).toUpperCase(), color: CASE_COLORS[i % CASE_COLORS.length], image_url: c.image_url, instagram_url: c.instagram_url }))
    : CASES.map(c => ({ ...c, image_url: '', instagram_url: '' }));

  return (
    <div ref={ref} className="text-center">
      <motion.div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider mb-6"
        style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <Sparkles size={12} /> {t('b2b.cases.badge')}
      </motion.div>
      <motion.h2
        className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-3 leading-[1.1]"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        <span className="text-white">{t('b2b.cases.title1')}</span>{' '}
        <span style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t('b2b.cases.title2')}
        </span>
      </motion.h2>
      <motion.p
        className="text-base mb-10"
        style={{ color: '#64748b' }}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {t('b2b.cases.desc')}
      </motion.p>

      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-5 max-w-4xl mx-auto">
        {displayCases.map((c, i) => {
          const inner = (
            <motion.div
              key={i}
              className="flex flex-col items-center gap-2 group cursor-default"
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={isInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.6, y: 20 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-sm font-black overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(251,191,36,0.2)',
                  color: '#475569',
                  filter: c.image_url ? 'none' : 'grayscale(1)',
                  transition: 'filter 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease, color 0.3s ease',
                }}
                animate={isInView ? { y: [0, -4, 0] } : {}}
                transition={{ y: { duration: 3 + (i % 4) * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 } }}
                whileHover={{
                  filter: 'grayscale(0)',
                  boxShadow: `0 0 20px ${c.color}50, 0 0 40px ${c.color}20`,
                  borderColor: `${c.color}60`,
                  color: c.color,
                  scale: 1.12,
                }}
              >
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  c.initials
                )}
              </motion.div>
              <span className="text-[10px] font-medium text-center leading-tight hidden sm:block" style={{ color: '#334155' }}>
                {c.name}
              </span>
            </motion.div>
          );
          if (c.instagram_url) {
            return <a key={i} href={c.instagram_url} target="_blank" rel="noopener noreferrer">{inner}</a>;
          }
          return inner;
        })}
      </div>
    </div>
  );
}

function EditorsSlideContent() {
  const t = useT;
  return (
    <div className="flex flex-col lg:flex-row-reverse items-center gap-10 lg:gap-16">
      <div className="flex-1">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
          style={{ background: 'rgba(0,196,140,0.1)', border: '1px solid rgba(0,196,140,0.25)' }}>
          <Film size={36} style={{ color: '#00C48C' }} />
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mb-6 leading-[1.1]">
          {t('b2b.editors.title1')}
          <br />
          <span style={{ color: '#00C48C' }}>{t('b2b.editors.title2')}</span>
        </h2>
        <p className="text-lg sm:text-xl leading-relaxed max-w-lg" style={{ color: '#94a3b8' }}>
          {t('b2b.editors.desc')}
        </p>
      </div>
      <div className="flex-shrink-0 hidden lg:block">
        <div className="w-64 h-64 rounded-3xl relative"
          style={{ background: 'rgba(0,196,140,0.04)', border: '1px solid rgba(0,196,140,0.12)', backdropFilter: 'blur(20px)' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <Film size={80} style={{ color: '#00C48C', opacity: 0.3 }} />
          </div>
          <div className="absolute -bottom-4 -left-4 w-28 h-28 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,196,140,0.2), transparent)', filter: 'blur(8px)' }} />
        </div>
      </div>
    </div>
  );
}

function PaymentSlideContent() {
  const t = useT;
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
        style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
        <ShieldCheck size={30} style={{ color: '#fbbf24' }} />
      </div>
      <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mb-4 leading-[1.1]">
        {t('b2b.payment.title')} <span style={{ color: '#fbbf24' }}>{t('b2b.payment.title_accent')}</span>
      </h2>
      <p className="text-lg mb-12" style={{ color: '#64748b' }}>
        {t('b2b.payment.desc')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 mb-14">
        {(() => {
          const isKzRegion = localStorage.getItem('selectedRegion') === 'KZ';
          const methods = isKzRegion ? [
            { name: 'Stripe', icon: <CreditCard size={18} /> },
            { name: 'Kaspi Red', icon: <span className="text-sm font-black tracking-tight">K</span> },
            { name: 'Kaspi Kredit', icon: <span className="text-sm font-black tracking-tight">K</span> },
            { name: 'Invoice', icon: <span className="text-base">INV</span> },
          ] : [
            { name: 'Stripe', icon: <CreditCard size={18} /> },
            { name: 'Crypto', icon: <span className="text-base font-bold" style={{ fontFamily: 'monospace' }}>BTC</span> },
            { name: 'Tamara', icon: <span className="text-sm font-black tracking-tight">T</span> },
            { name: 'Tabby', icon: <span className="text-sm font-black tracking-tight">tab</span> },
            { name: 'Invoice', icon: <span className="text-base">INV</span> },
          ];
          return methods.map((method, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-5 py-3.5 rounded-xl"
            style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)' }}
          >
            <span style={{ color: '#fbbf24' }}>{method.icon}</span>
            <span className="text-base font-semibold" style={{ color: '#e2e8f0' }}>{method.name}</span>
          </div>
        ));
        })()}
      </div>
      <motion.a
        href="https://wa.me/971585931600?text=Хочу%20подключить%20B2B%20подписку"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          color: '#0B101B',
          boxShadow: '0 8px 40px rgba(251,191,36,0.25)',
        }}
        whileHover={{ scale: 1.04, boxShadow: '0 12px 60px rgba(251,191,36,0.4)' }}
        whileTap={{ scale: 0.97 }}
      >
        <CalendarCheck size={20} />
        {t('b2b.payment.cta')}
      </motion.a>
    </div>
  );
}

const SLIDE_CONFIG: Record<string, { orb1: string; orb2: string; component: React.ReactNode }> = {
  intro: { orb1: '#fbbf24', orb2: '#00C48C', component: <IntroSlideContent /> },
  cinema_grade: { orb1: '#fbbf24', orb2: '#f59e0b', component: <CinemaGradeSlideContent /> },
  editors: { orb1: '#00C48C', orb2: '#38bdf8', component: <EditorsSlideContent /> },
  unlimited: { orb1: '#fbbf24', orb2: '#f59e0b', component: <UnlimitedSlideContent /> },
  platform: { orb1: '#38bdf8', orb2: '#fbbf24', component: <PlatformSlideContent /> },
  targeting: { orb1: '#f472b6', orb2: '#fb923c', component: <TargetingSlideContent /> },
  payment: { orb1: '#fbbf24', orb2: '#f59e0b', component: <PaymentSlideContent /> },
  speed: { orb1: '#fbbf24', orb2: '#38bdf8', component: <SpeedPlatformSlideContent /> },
  mechanism: { orb1: '#fbbf24', orb2: '#d4a017', component: <MechanismSlideContent /> },
  cases: { orb1: '#fbbf24', orb2: '#00C48C', component: <CasesSlideContent /> },
  pricing: { orb1: '#fbbf24', orb2: '#f59e0b', component: <PricingSlideContent /> },
};

const DEFAULT_SLIDE_ORDER = ['intro', 'cinema_grade', 'editors', 'unlimited', 'platform', 'targeting', 'payment', 'speed', 'mechanism', 'cases', 'pricing'];

function B2BScreen({ onBack, mouseX, mouseY }: { onBack: () => void; mouseX: number; mouseY: number }) {
  const [presData, setPresData] = useState<PresentationData>({ content: {}, cases: [], loading: true, slideOrder: DEFAULT_SLIDE_ORDER });

  useEffect(() => {
    async function load() {
      const [contentRes, casesRes] = await Promise.all([
        supabase.from('presentation_content').select('*').order('sort_order', { ascending: true }),
        supabase.from('presentation_cases').select('*').order('created_at', { ascending: true }),
      ]);
      const contentMap: Record<string, PresentationContentRow> = {};
      let slideOrder = DEFAULT_SLIDE_ORDER;
      if (contentRes.data && contentRes.data.length > 0) {
        for (const row of contentRes.data) {
          contentMap[row.section_key] = row;
        }
        const sorted = [...contentRes.data].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const orderKeys = sorted.map(r => r.section_key);
        const allKeys = new Set(orderKeys);
        for (const key of DEFAULT_SLIDE_ORDER) {
          if (!allKeys.has(key)) orderKeys.push(key);
        }
        slideOrder = orderKeys;
      }
      setPresData({ content: contentMap, cases: casesRes.data || [], loading: false, slideOrder });
    }
    load();
  }, []);

  const t = useT;

  return (
    <PresentationDataContext.Provider value={presData}>
    <motion.div
      className="h-screen w-full overflow-y-auto snap-y snap-mandatory"
      style={{ background: '#060A12', scrollBehavior: 'smooth' }}
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Back button fixed */}
      <motion.button
        onClick={onBack}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
        style={{ color: '#94a3b8', background: 'rgba(6,10,18,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <ArrowLeft size={16} />
        {t('back')}
      </motion.button>

      {presData.slideOrder.map(key => {
        const config = SLIDE_CONFIG[key];
        if (!config) return null;
        return (
          <B2BSlide key={key} orbColor1={config.orb1} orbColor2={config.orb2} mouseX={mouseX} mouseY={mouseY}>
            {config.component}
          </B2BSlide>
        );
      })}
    </motion.div>
    </PresentationDataContext.Provider>
  );
}

function PersonalSlide({ children, fullBleed }: { children: React.ReactNode; fullBleed?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.4 });

  return (
    <div
      ref={ref}
      className="h-screen w-full flex-shrink-0 snap-start snap-always relative flex items-center justify-center px-6 sm:px-10 overflow-hidden"
    >
      {!fullBleed && (
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />
      )}
      {fullBleed ? (
        children
      ) : (
        <motion.div
          className="relative z-10 max-w-5xl w-full"
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

function PersonalSlide1Content() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.5, once: true });
  const t = useT;

  return (
    <div ref={ref} className="text-center flex flex-col items-center relative">
      {/* Pulsating aura */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, rgba(139,92,246,0.05) 30%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Rising neon wave */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(56,189,248,0.03), transparent)',
        }}
        animate={{ opacity: [0.3, 0.7, 0.3], y: [20, 0, 20] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.h2
        className="relative text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-tight leading-[1.1]"
        style={{ textShadow: '0 0 60px rgba(255,255,255,0.15)' }}
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {t('personal.slide1.title')}
      </motion.h2>

      <motion.div
        className="mt-10 w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(56,189,248,0.06)',
          border: '1px solid rgba(56,189,248,0.2)',
          boxShadow: '0 0 30px rgba(56,189,248,0.15)',
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowRight size={24} className="rotate-90" style={{ color: '#38bdf8' }} />
        </motion.div>
      </motion.div>
    </div>
  );
}

function PersonalSlide2Content() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.4, once: true });
  const t = useT;

  const socials = [
    { name: 'Instagram', glow: '#e1306c', angle: 0, icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 sm:w-10 sm:h-10">
        <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="18" cy="6" r="1.5" fill="currentColor"/>
      </svg>
    )},
    { name: 'TikTok', glow: '#00f2ea', angle: 120, icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 sm:w-10 sm:h-10">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .55.04.8.1V9.01a6.33 6.33 0 00-.8-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 0010.86 4.46V13.2a8.16 8.16 0 005.58 2.2V12a4.85 4.85 0 01-3.58-1.64V6.69h3.58z"/>
      </svg>
    )},
    { name: 'Shorts', glow: '#ff0000', angle: 240, icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 sm:w-10 sm:h-10">
        <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
      </svg>
    )},
  ];

  return (
    <div ref={ref} className="text-center flex flex-col items-center relative">
      {/* Rotating glass orbs around text */}
      <div className="absolute inset-0 pointer-events-none">
        {socials.map((social, i) => (
          <motion.div
            key={social.name}
            className="absolute top-1/2 left-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: `0 0 30px ${social.glow}20, inset 0 0 20px rgba(255,255,255,0.02)`,
              color: '#e2e8f0',
              marginLeft: '-2rem',
              marginTop: '-2rem',
            }}
            initial={{ opacity: 0 }}
            animate={isInView ? {
              opacity: 1,
              x: [
                Math.cos((social.angle) * Math.PI / 180) * (window.innerWidth > 640 ? 160 : 100),
                Math.cos((social.angle + 120) * Math.PI / 180) * (window.innerWidth > 640 ? 160 : 100),
                Math.cos((social.angle + 240) * Math.PI / 180) * (window.innerWidth > 640 ? 160 : 100),
                Math.cos((social.angle + 360) * Math.PI / 180) * (window.innerWidth > 640 ? 160 : 100),
              ],
              y: [
                Math.sin((social.angle) * Math.PI / 180) * (window.innerWidth > 640 ? 120 : 80),
                Math.sin((social.angle + 120) * Math.PI / 180) * (window.innerWidth > 640 ? 120 : 80),
                Math.sin((social.angle + 240) * Math.PI / 180) * (window.innerWidth > 640 ? 120 : 80),
                Math.sin((social.angle + 360) * Math.PI / 180) * (window.innerWidth > 640 ? 120 : 80),
              ],
            } : { opacity: 0 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear', delay: i * 0.3 }}
          >
            {social.icon}
          </motion.div>
        ))}
      </div>

      <motion.div
        className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-black uppercase tracking-tight leading-[1.05] mb-6"
        style={{
          background: 'linear-gradient(135deg, #38bdf8, #818cf8, #fbbf24, #38bdf8)',
          backgroundSize: '300% 300%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 30px rgba(56,189,248,0.4))',
          animation: 'gradientShift 6s ease infinite',
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {t('personal.slide2.title')}
      </motion.div>

      <motion.p
        className="text-base sm:text-xl lg:text-2xl max-w-2xl leading-relaxed"
        style={{ color: '#94a3b8' }}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        {t('personal.slide2.subtitle')}
      </motion.p>
    </div>
  );
}

function PersonalSlide3Content() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3, once: true });
  const t = useT;
  const [bgUrl, setBgUrl] = useState('/Убери_весь_текст_и_иконки_202606021715.jpeg');

  useEffect(() => {
    supabase.from('presentation_content').select('image_url').eq('section_key', 'personal_videographer_bg').maybeSingle()
      .then(({ data }) => { if (data?.image_url) setBgUrl(data.image_url); });
  }, []);

  const equipment = [
    { label: t('personal.slide3.sony'), icon: <Camera size={22} strokeWidth={1.5} /> },
    { label: t('personal.slide3.ronin'), icon: <Target size={22} strokeWidth={1.5} /> },
    { label: t('personal.slide3.mic'), icon: <Monitor size={22} strokeWidth={1.5} /> },
  ];

  return (
    <div ref={ref} className="absolute inset-0 flex flex-col items-center justify-center">
      {/* Full-bleed background with Ken Burns */}
      <motion.div
        className="absolute inset-0"
        animate={{ scale: [1, 1.05] }}
        transition={{ duration: 14, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
      >
        <img
          src={bgUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Cinematic gradient overlay */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 35%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.92) 100%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to right, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.3) 100%)',
      }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Main heading */}
        <motion.h2
          className="text-4xl sm:text-6xl lg:text-7xl font-extralight tracking-[0.15em] text-white mb-3"
          style={{
            textShadow: '0 0 60px rgba(255,255,255,0.25), 0 0 120px rgba(255,255,255,0.1)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          {t('personal.slide3.title')}
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          className="text-xs sm:text-sm lg:text-base font-light tracking-[0.3em] uppercase mb-14 sm:mb-20"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          {t('personal.slide3.subtitle')}
        </motion.p>

      </div>
    </div>
  );
}

function PersonalSlide4Content() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.4, once: true });
  const t = useT;

  return (
    <div ref={ref} className="absolute inset-0 flex flex-col items-center justify-center">
      {/* Background photo */}
      <motion.div
        className="absolute inset-0"
        animate={{ scale: [1, 1.05] }}
        transition={{ duration: 16, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
      >
        <img
          src="/Здесь_необходимо_добавить_фон_с_202606021730.jpeg"
          alt=""
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Dark overlay */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.75) 100%)',
      }} />

      {/* Content */}
      <div className="relative z-10 text-center flex flex-col items-center px-6">
      <motion.p
        className="text-base sm:text-xl lg:text-2xl font-medium mb-6 max-w-xl leading-relaxed"
        style={{ color: '#94a3b8' }}
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        {t('personal.slide4.title')}
      </motion.p>

      {/* Glowing accent - 48 hours */}
      <motion.div
        className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase mb-12"
        style={{
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.4))',
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        {t('personal.slide4.accent')}
      </motion.div>

      {/* Monitor with timeline */}
      </div>
    </div>
  );
}

function PersonalSlide5Content() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.4, once: true });
  const t = useT;
  const [isHovered, setIsHovered] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);

  const scriptLines = [
    'INT. DUBAI MARINA - GOLDEN HOUR',
    '',
    'The camera glides through crystalline towers',
    'as warm light bathes the waterfront.',
    '',
    'NARRATOR (V.O.)',
    '"Every frame tells a story...',
    'Every story builds an empire."',
    '',
    'CUT TO: Hero walks toward the lens,',
    'confidence radiating with each step.',
    '',
    'FADE TO BLACK.',
  ];

  useEffect(() => {
    if (!isHovered) {
      setVisibleLines(0);
      return;
    }
    let line = 0;
    const interval = setInterval(() => {
      line++;
      if (line > scriptLines.length) {
        clearInterval(interval);
        return;
      }
      setVisibleLines(line);
    }, 180);
    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <div ref={ref} className="absolute inset-0 flex flex-col items-center justify-center">
      {/* Background photo */}
      <motion.div
        className="absolute inset-0"
        animate={{ scale: [1, 1.05] }}
        transition={{ duration: 16, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
      >
        <img
          src="/На_этом_фоне_теперь_давай_202606021735.jpeg"
          alt=""
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Dark overlay */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.75) 100%)',
      }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full px-6">
      {/* Warm ambient glow that activates on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(251,191,36,0.06) 0%, transparent 60%)',
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      />

      {/* Title */}
      <motion.h2
        className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1] mb-6 text-center"
        style={{ textShadow: '0 0 40px rgba(255,255,255,0.1)' }}
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {t('personal.slide5.title')}
      </motion.h2>

      {/* Hover hint */}
      <motion.p
        className="text-xs sm:text-sm uppercase tracking-[0.2em] mb-8"
        style={{ color: '#64748b' }}
        animate={{ opacity: isHovered ? 0 : [0.4, 0.8, 0.4] }}
        transition={isHovered ? { duration: 0.3 } : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {t('personal.slide5.hint')}
      </motion.p>

      {/* Interactive writing area */}
      <motion.div
        className="relative w-full max-w-lg min-h-[320px] sm:min-h-[380px] rounded-2xl p-6 sm:p-8 cursor-pointer"
        style={{
          background: isHovered ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${isHovered ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)'}`,
          boxShadow: isHovered
            ? '0 20px 60px rgba(0,0,0,0.4), inset 0 0 60px rgba(251,191,36,0.02)'
            : '0 12px 40px rgba(0,0,0,0.2)',
          transition: 'background 0.6s, border-color 0.6s, box-shadow 0.6s',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {/* Pen icon - visible when not hovered, animates on hover */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{
            opacity: isHovered ? 0 : 0.15,
            scale: isHovered ? 0.8 : 1,
          }}
          transition={{ duration: 0.4 }}
        >
          <PenTool size={64} strokeWidth={0.8} style={{ color: '#fbbf24' }} />
        </motion.div>

        {/* Writing pen that appears on hover */}
        <motion.div
          className="absolute top-4 right-6"
          animate={{
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 10,
            rotate: isHovered ? [-2, 2, -2] : 0,
          }}
          transition={{
            opacity: { duration: 0.4 },
            y: { duration: 0.4 },
            rotate: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <PenTool size={20} style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.4))' }} />
        </motion.div>

        {/* Typewriter text */}
        <div className="relative z-10 space-y-0">
          {scriptLines.map((line, i) => (
            <motion.p
              key={i}
              className="text-sm sm:text-base leading-relaxed"
              style={{
                fontFamily: '"Courier New", Courier, monospace',
                color: line.startsWith('INT.') || line.startsWith('CUT TO') || line.startsWith('FADE')
                  ? '#fbbf24'
                  : line.startsWith('NARRATOR')
                    ? '#d4a574'
                    : line.startsWith('"')
                      ? '#e8c47a'
                      : '#a89070',
                textShadow: i < visibleLines && isHovered ? '0 0 8px rgba(251,191,36,0.15)' : 'none',
                minHeight: line === '' ? '0.75rem' : 'auto',
              }}
              animate={{
                opacity: i < visibleLines && isHovered ? 1 : 0,
                x: i < visibleLines && isHovered ? 0 : -8,
              }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {line}
            </motion.p>
          ))}
        </div>

        {/* Blinking cursor */}
        <motion.span
          className="inline-block w-2 h-4 mt-1"
          style={{ background: '#fbbf24' }}
          animate={{
            opacity: isHovered ? [1, 0, 1] : 0,
          }}
          transition={{
            opacity: isHovered
              ? { duration: 0.8, repeat: Infinity, ease: 'steps(2)' }
              : { duration: 0.2 },
          }}
        />
      </motion.div>
      </div>
    </div>
  );
}


function PersonalFocusSlideContent() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3, once: true });
  const t = useT;
  const [leftTilt, setLeftTilt] = useState({ x: 0, y: 0 });
  const [rightTilt, setRightTilt] = useState({ x: 0, y: 0 });

  const handleTilt = (e: React.MouseEvent<HTMLDivElement>, setter: typeof setLeftTilt) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setter({ x: y * -8, y: x * 8 });
  };

  const doItems = [
    t('personal.focus.item1'),
    t('personal.focus.item2'),
    t('personal.focus.item3'),
    t('personal.focus.item4'),
  ];

  const dontItems = [
    t('personal.focus.no1'),
    t('personal.focus.no2'),
    t('personal.focus.no3'),
    t('personal.focus.no4'),
  ];

  return (
    <div ref={ref} className="flex flex-col items-center w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 w-full max-w-4xl">
        {/* Left card: What we DO */}
        <motion.div
          className="p-6 sm:p-8 rounded-3xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(251,191,36,0.04), rgba(255,255,255,0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(251,191,36,0.15)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 30px rgba(251,191,36,0.05)',
            transform: `perspective(800px) rotateX(${leftTilt.x}deg) rotateY(${leftTilt.y}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          onMouseMove={(e) => handleTilt(e, setLeftTilt)}
          onMouseLeave={() => setLeftTilt({ x: 0, y: 0 })}
          initial={{ opacity: 0, x: -40 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Corner glow */}
          <div className="absolute top-0 left-0 w-40 h-40 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.1), transparent 70%)' }} />

          <h3 className="text-base sm:text-lg font-black uppercase tracking-wide mb-6 relative z-10"
            style={{ color: '#fbbf24', textShadow: '0 0 20px rgba(251,191,36,0.3)' }}>
            {t('personal.focus.left_title')}
          </h3>

          <div className="space-y-4 relative z-10">
            {doItems.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <Check size={13} style={{ color: '#fbbf24' }} />
                </div>
                <span className="text-sm sm:text-base font-medium" style={{ color: '#e2e8f0' }}>{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right card: What we DON'T do */}
        <motion.div
          className="p-6 sm:p-8 rounded-3xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(100,116,139,0.04), rgba(255,255,255,0.01))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(100,116,139,0.15)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            transform: `perspective(800px) rotateX(${rightTilt.x}deg) rotateY(${rightTilt.y}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          onMouseMove={(e) => handleTilt(e, setRightTilt)}
          onMouseLeave={() => setRightTilt({ x: 0, y: 0 })}
          initial={{ opacity: 0, x: 40 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Subtle red corner glow */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.06), transparent 70%)' }} />

          <h3 className="text-base sm:text-lg font-black uppercase tracking-wide mb-6 relative z-10"
            style={{ color: '#64748b' }}>
            {t('personal.focus.right_title')}
          </h3>

          <div className="space-y-4 relative z-10">
            {dontItems.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <X size={12} style={{ color: '#ef4444' }} />
                </div>
                <span className="text-sm sm:text-base font-medium" style={{ color: '#94a3b8' }}>{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function PersonalSlide6Content() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3, once: true });
  const t = useT;

  const tiers = [
    {
      title: t('personal.slide6.tier1.title'),
      price: t('personal.slide6.tier1.price'),
      desc: t('personal.slide6.tier1.desc'),
      badge: null,
      featured: false,
    },
    {
      title: t('personal.slide6.tier2.title'),
      price: t('personal.slide6.tier2.price'),
      desc: t('personal.slide6.tier2.desc'),
      badge: t('personal.slide6.tier2.badge'),
      featured: true,
    },
    {
      title: t('personal.slide6.tier3.title'),
      price: t('personal.slide6.tier3.price'),
      desc: t('personal.slide6.tier3.desc'),
      badge: t('personal.slide6.tier3.badge'),
      featured: false,
    },
  ];

  return (
    <div ref={ref} className="flex flex-col items-center w-full">
      {/* Badge */}
      <motion.p
        className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] mb-8 sm:mb-10"
        style={{ color: '#64748b' }}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        {t('personal.slide6.badge')}
      </motion.p>

      {/* Three cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl items-center">
        {tiers.map((tier, i) => (
          <motion.div
            key={i}
            className="relative p-5 sm:p-7 rounded-2xl sm:rounded-3xl flex flex-col items-center text-center"
            style={{
              background: tier.featured
                ? 'linear-gradient(145deg, rgba(251,191,36,0.06), rgba(56,189,248,0.04), rgba(255,255,255,0.02))'
                : 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(20px)',
              border: tier.featured
                ? '1px solid rgba(251,191,36,0.25)'
                : '1px solid rgba(255,255,255,0.07)',
              boxShadow: tier.featured
                ? '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(251,191,36,0.08)'
                : '0 12px 40px rgba(0,0,0,0.3)',
              transform: tier.featured ? 'scale(1.05)' : 'scale(1)',
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.7, delay: 0.2 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -8, boxShadow: tier.featured
              ? '0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(251,191,36,0.12)'
              : '0 24px 60px rgba(0,0,0,0.4), 0 0 30px rgba(56,189,248,0.06)'
            }}
          >
            {/* Animated border for featured */}
            {tier.featured && (
              <span className="absolute inset-0 rounded-2xl sm:rounded-3xl pointer-events-none"
                style={{
                  border: '1px solid rgba(251,191,36,0.3)',
                  animation: 'neonPulseGold 3s ease-in-out infinite',
                }}
              />
            )}

            {/* Badge */}
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider"
                style={{
                  background: tier.featured ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                  color: '#000',
                  boxShadow: tier.featured ? '0 4px 15px rgba(251,191,36,0.3)' : '0 4px 15px rgba(56,189,248,0.3)',
                }}>
                {tier.badge}
              </div>
            )}

            {/* Title */}
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider mt-2 mb-4"
              style={{ color: tier.featured ? '#fbbf24' : '#94a3b8' }}>
              {tier.title}
            </p>

            {/* Price */}
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-1"
              style={{
                background: tier.featured
                  ? 'linear-gradient(180deg, #ffffff 10%, #fbbf24 90%)'
                  : 'linear-gradient(180deg, #ffffff 20%, #94a3b8 80%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: tier.featured ? 'drop-shadow(0 2px 15px rgba(251,191,36,0.2))' : 'drop-shadow(0 2px 10px rgba(255,255,255,0.08))',
              }}>
              {tier.price}
            </div>
            <p className="text-xs sm:text-sm mb-4" style={{ color: '#64748b' }}>
              {t('personal.slide6.perMonth')}
            </p>

            {/* Description */}
            <p className="text-xs sm:text-sm font-medium" style={{ color: tier.featured ? '#e2e8f0' : '#94a3b8' }}>
              {tier.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* CTA button */}
      <motion.a
        href="/creator-login"
        className="group relative inline-flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-bold overflow-hidden mt-10 sm:mt-12"
        style={{ background: 'rgba(3,5,8,0.9)', color: '#e2e8f0' }}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <span className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            border: '1px solid rgba(56,189,248,0.4)',
            boxShadow: '0 0 15px rgba(56,189,248,0.15), inset 0 0 15px rgba(56,189,248,0.05)',
            animation: 'neonPulse 3s ease-in-out infinite',
          }}
        />
        <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ boxShadow: '0 0 40px rgba(56,189,248,0.25), inset 0 0 30px rgba(56,189,248,0.05)' }} />
        <Sparkles size={18} className="relative z-10" style={{ color: '#38bdf8' }} />
        <span className="relative z-10">{t('personal.slide6.cta')}</span>
        <ArrowRight size={16} className="relative z-10 transition-transform group-hover:translate-x-1" />
      </motion.a>

      {/* VAT note */}
      <motion.p
        className="mt-4 text-xs sm:text-sm"
        style={{ color: '#475569' }}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        {t('personal.slide6.vat')}
      </motion.p>
    </div>
  );
}

function PersonalScreen({ onBack, mouseX, mouseY }: { onBack: () => void; mouseX: number; mouseY: number }) {
  const t = useT;

  return (
    <motion.div
      className="h-screen w-full overflow-y-auto snap-y snap-mandatory"
      style={{ background: '#030508', scrollBehavior: 'smooth' }}
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Fixed back button */}
      <motion.button
        onClick={onBack}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
        style={{ color: '#94a3b8', background: 'rgba(3,5,8,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <ArrowLeft size={16} />
        {t('back')}
      </motion.button>

      {/* Slide 1: Intro */}
      <PersonalSlide><PersonalSlide1Content /></PersonalSlide>
      {/* Slide 2: Unlimited & Platforms */}
      <PersonalSlide><PersonalSlide2Content /></PersonalSlide>
      {/* Slide 3: Videographer Arsenal */}
      <PersonalSlide fullBleed><PersonalSlide3Content /></PersonalSlide>
      {/* Slide 4: Editing Factory */}
      <PersonalSlide fullBleed><PersonalSlide4Content /></PersonalSlide>
      {/* Slide 5: Scripts & Ideas */}
      <PersonalSlide fullBleed><PersonalSlide5Content /></PersonalSlide>
      {/* Slide 6: Focus & Boundaries */}
      <PersonalSlide><PersonalFocusSlideContent /></PersonalSlide>
      {/* Slide 7: Pricing */}
      <PersonalSlide><PersonalSlide6Content /></PersonalSlide>

      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes neonPulse {
          0%, 100% { border-color: rgba(56,189,248,0.3); box-shadow: 0 0 10px rgba(56,189,248,0.1), inset 0 0 10px rgba(56,189,248,0.03); }
          50% { border-color: rgba(56,189,248,0.6); box-shadow: 0 0 25px rgba(56,189,248,0.25), inset 0 0 20px rgba(56,189,248,0.08); }
        }
        @keyframes neonPulseGold {
          0%, 100% { border-color: rgba(251,191,36,0.2); box-shadow: 0 0 10px rgba(251,191,36,0.08); }
          50% { border-color: rgba(251,191,36,0.45); box-shadow: 0 0 25px rgba(251,191,36,0.15); }
        }
      `}</style>
    </motion.div>
  );
}

export default function Presentation() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [lang, setLang] = useState<PresentationLang>('en');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouseX(x);
      setMouseY(y);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [screen]);

  return (
    <PresentationLangContext.Provider value={{ lang, setLang }}>
    <div
      ref={containerRef}
      style={{
        background: '#060A12',
        height: '100vh',
        overflowY: screen === 'b2b' ? 'hidden' : 'auto',
        overflowX: 'hidden',
        position: 'relative',
        direction: lang === 'ar' ? 'rtl' : 'ltr',
      }}
    >
      <PresentationLangSwitcher />
      <AnimatePresence mode="wait">
        {screen === 'intro' && (
          <IntroScreen key="intro" onNext={() => setScreen('choose')} mouseX={mouseX} mouseY={mouseY} />
        )}
        {screen === 'choose' && (
          <ChooseScreen key="choose" onSelect={setScreen} mouseX={mouseX} mouseY={mouseY} />
        )}
        {screen === 'b2b' && (
          <B2BScreen key="b2b" onBack={() => setScreen('choose')} mouseX={mouseX} mouseY={mouseY} />
        )}
        {screen === 'personal' && (
          <PersonalScreen key="personal" onBack={() => setScreen('choose')} mouseX={mouseX} mouseY={mouseY} />
        )}
      </AnimatePresence>
    </div>
    </PresentationLangContext.Provider>
  );
}