import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import { CreatorAuthProvider, useCreatorAuth } from './context/CreatorAuthContext';
import { AppPreferencesProvider } from './context/AppPreferencesContext';
import GlobalHeader from './components/GlobalHeader';
import PaymentModal from './components/PaymentModal';
import OperatorSelector, { Operator } from './components/OperatorSelector';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Ideas from './pages/Ideas';
import Academy from './pages/Academy';
import Gallery from './pages/Gallery';
import Calendar from './pages/Calendar';
import Scripts from './pages/Scripts';
import Referral from './pages/Referral';
import Collabs from './pages/Collabs';
import Shop from './pages/Shop';
import AdminDashboard from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerPortal from './pages/ManagerPortal';
import UserDashboard from './pages/UserDashboard';
import AuthSheet from './components/AuthSheet';
import LanguagePickerModal from './components/LanguagePickerModal';
import CreatorAuth from './pages/CreatorAuth';
import CreatorOnboarding from './pages/CreatorOnboarding';
import CreatorDashboard from './pages/CreatorDashboard';
import ClientAuth from './pages/ClientAuth';
import ClientDashboard from './pages/ClientDashboard';
import { ClientAuthProvider, useClientAuth } from './context/ClientAuthContext';

type PageType = 'home' | 'ideas' | 'academy' | 'gallery' | 'calendar' | 'scripts' | 'referral' | 'collabs' | 'shop';

import CancelBooking from './pages/CancelBooking';
import EditorPortal from './pages/EditorPortal';
import EditingDashboard from './pages/EditingDashboard';
import ProductionDashboard from './pages/ProductionDashboard';
import OperatorPortal from './pages/OperatorPortal';
import JobApplication from './pages/JobApplication';
import PublicCreatorProfile from './pages/PublicCreatorProfile';
import CreatorBookingPage from './pages/CreatorBookingPage';
import Presentation from './pages/Presentation';
import { getDashboardPathForCreatorType } from './lib/dashboardRouting';
import GeoLandingPage from './pages/GeoLandingPage';
import { BlogList, BlogPostPage, BLOG_POSTS } from './pages/Blog';
import FilterLandingPage, { CREATOR_TYPE_SLUGS, LOCATION_SLUGS, LANGUAGE_SLUGS, CATEGORY_SLUGS } from './pages/FilterLandingPage';

const pathname = window.location.pathname;
const isBookingRoute = pathname === '/booking' || pathname === '/booking/';
const isLoginRoute = pathname === '/login' || pathname === '/login/';
const isAdminRoute = pathname === '/admin' || pathname === '/admin/';
const isManagerRoute = pathname === '/manager-panel' || pathname === '/manager-panel/';
const isManagerPortalRoute = pathname === '/manager' || pathname === '/manager/';
const isCancelRoute = pathname.startsWith('/cancel/');
const isEditorRoute = pathname === '/edit' || pathname === '/edit/';
const isEditingDashboardRoute = pathname === '/editor-dashboard' || pathname === '/editor-dashboard/';
const isProductionDashboardRoute = pathname === '/production-dashboard' || pathname === '/production-dashboard/';
const isTelegramDashboardRoute = pathname === '/telegram-dashboard' || pathname.startsWith('/telegram-dashboard/');
const isOperatorRoute = pathname === '/operator' || pathname === '/operator/';
const isJobRoute = pathname === '/job' || pathname === '/job/';
const isCreatorAuthRoute = pathname === '/creator-login' || pathname === '/creator-login/';
const isCreatorOnboardingRoute = pathname === '/creator-onboarding' || pathname === '/creator-onboarding/';
const isCreatorDashboardRoute = pathname === '/creator-dashboard' || pathname === '/creator-dashboard/';
const isAdminMarketplaceRoute = pathname === '/admin-marketplace' || pathname === '/admin-marketplace/';
const isClientAuthRoute = pathname === '/client-login' || pathname === '/client-login/' || pathname === '/brand/signup' || pathname === '/brand/signup/';
const isClientDashboardRoute = pathname === '/client-dashboard' || pathname === '/client-dashboard/' || pathname === '/brand/dashboard' || pathname === '/brand/dashboard/';
const isPresentationRoute = pathname === '/presentation' || pathname === '/presentation/';
// Unified booking route: /book/[username] (was also /booking/[username] for KZ — now merged)
const isCreatorBookingRoute = pathname.startsWith('/book/') || (pathname.startsWith('/booking/') && pathname !== '/booking/');
const creatorBookingHandle = isCreatorBookingRoute
  ? pathname.replace(/^\/(book|booking)\//, '').replace(/\/$/, '')
  : null;

// Path segments — must be declared before any route logic that uses them
const pathSegments = pathname.replace(/^\/|\/$/g, '').split('/');

// Blog routes: /blog  and  /blog/[slug]
const isBlogListRoute = pathname === '/blog' || pathname === '/blog/';
const isBlogPostRoute = pathname.startsWith('/blog/') && !isBlogListRoute;
const blogPostSlug = isBlogPostRoute ? pathname.replace(/^\/blog\//, '').replace(/\/$/, '') : null;

// Geo landing pages: /[niche]/[city] (legacy 2-segment shorthand kept for backward compatibility)
const GEO_NICHES = new Set(['videographers', 'photographers', 'ugc', 'bloggers', 'influencers', 'models', 'editors', 'creators']);
const GEO_CITIES = new Set(['dubai', 'abudhabi', 'sharjah', 'almaty', 'astana', 'shymkent', 'karaganda', 'aktobe', 'ust', 'atyrau', 'taraz']);
const isGeoLandingRoute =
  pathSegments.length === 2 &&
  GEO_NICHES.has(pathSegments[0]) &&
  GEO_CITIES.has(pathSegments[1]);
const geoNiche = isGeoLandingRoute ? pathSegments[0] : null;
const geoCity = isGeoLandingRoute ? pathSegments[1] : null;

// Nested filter landing pages: /[type]/[location]/[language?]/[category?]
// Handles 2, 3 and 4 segment paths where first segment is a known creator-type slug
const isFilterRoute =
  pathSegments.length >= 2 &&
  pathSegments.length <= 4 &&
  !!CREATOR_TYPE_SLUGS[pathSegments[0]] &&
  !!LOCATION_SLUGS[pathSegments[1]] &&
  (pathSegments.length < 3 || !!LANGUAGE_SLUGS[pathSegments[2]] || !!CATEGORY_SLUGS[pathSegments[2]]) &&
  (pathSegments.length < 4 || !!CATEGORY_SLUGS[pathSegments[3]]);

// Resolve language / category at positions 2 and 3
const filterTypeSlug     = isFilterRoute ? pathSegments[0] : null;
const filterLocationSlug = isFilterRoute ? pathSegments[1] : null;
const filterLangSlug     = isFilterRoute && pathSegments.length >= 3 && LANGUAGE_SLUGS[pathSegments[2]] ? pathSegments[2] : null;
const filterCatSlug      = isFilterRoute
  ? (pathSegments.length === 4
      ? pathSegments[3]
      : (pathSegments.length === 3 && CATEGORY_SLUGS[pathSegments[2]] ? pathSegments[2] : null))
  : null;

// Reserved paths that must never be treated as creator usernames
const RESERVED_PATHS = new Set([
  '', 'admin', 'booking', 'book', 'manager', 'manager-panel', 'operator', 'dashboard',
  'login', 'register', 'api', 'edit', 'job', 'cancel', 'creator',
  'creator-login', 'creator-dashboard', 'creator-onboarding', 'admin-marketplace',
  'client-login', 'client-dashboard', 'editor-dashboard', 'production-dashboard', 'telegram-dashboard', 'presentation',
  'brand', 'www', 'app', 'mail', 'support', 'help', 'about', 'terms', 'privacy',
  'blog', 'shop', 'marketplace', 'home', 'index', 'ae',
  // filter landing type slugs — must never be creator usernames
  'ugc-creators', 'influencers', 'bloggers', 'videographers', 'photographers', 'models', 'editors', 'creators',
]);

// Detect /[username], /@[username], or /%40[username] (URL-encoded @)
// decodeURIComponent handles %40 -> @, then we strip the leading @ if present
const rawSegment = pathSegments[0] ?? '';
const decodedSegment = (() => { try { return decodeURIComponent(rawSegment); } catch { return rawSegment; } })();
const cleanedSegment = decodedSegment.replace(/^@/, '').toLowerCase();
const isPublicCreatorRoute =
  pathSegments.length === 1 &&
  cleanedSegment.length >= 3 &&
  /^[a-z0-9_.-]+$/.test(cleanedSegment) &&
  !RESERVED_PATHS.has(cleanedSegment);
const creatorUsernameFromPath = isPublicCreatorRoute ? cleanedSegment : null;

if (isAdminRoute) {
  localStorage.removeItem('yalla_profile_cache');
}

function hasChosenLanguage(): boolean {
  return !!localStorage.getItem('yalla_lang');
}

function BookingPage() {
  const [operator, setOperator] = useState<Operator | null>(null);

  return (
    <AppSettingsProvider>
      <AuthProvider>
        <div style={{ minHeight: '100dvh', background: '#0F1115', overflowY: 'auto' }}>
          {operator ? (
            <Calendar operator={operator} onBack={() => setOperator(null)} />
          ) : (
            <OperatorSelector onSelect={setOperator} />
          )}
        </div>
      </AuthProvider>
    </AppSettingsProvider>
  );
}

function AppContent() {
  const { session, loading, profile } = useAuth();
  const { t } = useTranslation();
  const [page, setPage] = useState<PageType>('home');
  const [showModal, setShowModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [calendarOperator, setCalendarOperator] = useState<Operator | null>(null);
  const [guestPage, setGuestPage] = useState<PageType>('home');

  if (loading && !profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0F1115', color: '#fff', fontSize: '1.2rem' }}>
        {t('loading')}
      </div>
    );
  }

  if (isLoginRoute) {
    if (session) {
      window.location.replace('/');
      return null;
    }
    return <Auth onBack={() => window.location.replace('/')} />;
  }

  if (isAdminRoute) {
    if (!session && !profile) {
      window.location.replace('/login');
      return null;
    }
    if (profile?.role !== 'admin') {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080d16', padding: '2rem' }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Access Denied</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 24 }}>You do not have permission to access the admin panel. This area is restricted to administrators only.</p>
            <button onClick={() => window.location.replace('/')} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              Go to Homepage
            </button>
          </div>
        </div>
      );
    }
    return <AdminDashboard />;
  }

  if (session || profile) {
    if (isManagerRoute) return <ManagerDashboard />;
    if (profile && profile.role === 'manager' && !isManagerRoute) {
      window.location.replace('/manager-panel');
      return null;
    }
    return (
      <div className="app-container">
        {page !== 'home' && (
          <GlobalHeader
            setPage={(p) => { setPage(p); if (p !== 'calendar') setCalendarOperator(null); }}
            onOpenDashboard={() => setShowDashboard(true)}
          />
        )}
        <div className={page === 'home' ? 'home-full-width' : 'main-content'} style={page !== 'home' ? { paddingTop: '76px' } : undefined}>
          {page === 'home'     && <Home setPage={setPage} setShowModal={setShowModal} />}
          {page === 'ideas'    && <Ideas />}
          {page === 'academy'  && <Academy />}
          {page === 'gallery'  && <Gallery />}
          {page === 'calendar' && (
            calendarOperator
              ? <Calendar operator={calendarOperator} onBack={() => setCalendarOperator(null)} />
              : <OperatorSelector onSelect={setCalendarOperator} />
          )}
          {page === 'scripts'  && <Scripts />}
          {page === 'referral' && <Referral />}
          {page === 'collabs'  && <Collabs />}
          {page === 'shop'     && <Shop />}
        </div>
        {showModal && <PaymentModal onClose={() => setShowModal(false)} />}
        {showDashboard && (
          <UserDashboard
            onClose={() => setShowDashboard(false)}
            onBook={() => { setShowDashboard(false); setPage('calendar'); }}
          />
        )}
      </div>
    );
  }

  const handleGuestSetPage = (p: PageType) => {
    if (p === 'calendar') return;
    setGuestPage(p);
  };

  return (
    <>
      <div className="app-container">
        <div className={guestPage === 'home' ? 'home-full-width' : 'main-content'}>
          {guestPage === 'home' && (
            <Home
              setPage={handleGuestSetPage}
              setShowModal={(_v) => setShowAuthSheet(true)}
              isGuest
              onLoginRequest={() => setShowAuthSheet(true)}
            />
          )}
          {guestPage === 'shop' && <Shop />}
        </div>
        {guestPage !== 'home' && (
          <button
            onClick={() => setGuestPage('home')}
            style={{
              position: 'fixed', top: 14, left: 14, zIndex: 200,
              width: 38, height: 38,
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '50%',
              color: '#e5e7eb',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}
            aria-label="Назад на главную"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
        )}
      </div>
      {showAuthSheet && (
        <AuthSheet
          onClose={() => setShowAuthSheet(false)}
          onContinueAsGuest={() => setShowAuthSheet(false)}
          onSuccess={() => setShowAuthSheet(false)}
        />
      )}
    </>
  );
}

function ClientRoutes() {
  const { session, loading } = useClientAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080d16' }}>
        <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (isClientAuthRoute) {
    if (session) { window.location.replace('/brand/dashboard'); return null; }
    return <ClientAuth onBack={() => window.location.replace('/')} />;
  }

  if (isClientDashboardRoute) {
    if (!session) { window.location.replace('/brand/signup'); return null; }
    return <ClientDashboard />;
  }

  return null;
}

function CreatorRoutes() {
  const { session, creatorProfile, loading } = useCreatorAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080d16' }}>
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Client/brand users should never reach creator pages — redirect them to their dashboard
  if (session?.user?.user_metadata?.portal === 'client') {
    window.location.replace('/brand/dashboard');
    return null;
  }

  if (isCreatorAuthRoute) {
    if (session) {
      if (!creatorProfile) { window.location.replace('/creator-onboarding'); return null; }
      if (!creatorProfile.onboarding_done) { window.location.replace('/creator-onboarding'); return null; }
      window.location.replace(getDashboardPathForCreatorType(creatorProfile.creator_type));
      return null;
    }
    return <CreatorAuth onBack={() => window.location.replace('/')} />;
  }

  if (isCreatorOnboardingRoute) {
    if (!session) { window.location.replace('/creator-login'); return null; }
    if (creatorProfile?.onboarding_done) {
      window.location.replace(getDashboardPathForCreatorType(creatorProfile.creator_type));
      return null;
    }
    return <CreatorOnboarding />;
  }

  // Role-based dashboard routing — every creator type has its own home dashboard
  // and is redirected back to it if they try to access a foreign one.
  const correctPath = getDashboardPathForCreatorType(creatorProfile?.creator_type);

  if (isCreatorDashboardRoute) {
    if (!session) { window.location.replace('/creator-login'); return null; }
    if (!creatorProfile || !creatorProfile.onboarding_done) { window.location.replace('/creator-onboarding'); return null; }
    if (correctPath !== '/creator-dashboard') { window.location.replace(correctPath); return null; }
    return <CreatorDashboard />;
  }

  if (isEditingDashboardRoute) {
    if (!session) { window.location.replace('/creator-login'); return null; }
    if (!creatorProfile || !creatorProfile.onboarding_done) { window.location.replace('/creator-onboarding'); return null; }
    if (correctPath !== '/editor-dashboard') { window.location.replace(correctPath); return null; }
    return <EditingDashboard />;
  }

  if (isProductionDashboardRoute) {
    if (!session) { window.location.replace('/creator-login'); return null; }
    if (!creatorProfile || !creatorProfile.onboarding_done) { window.location.replace('/creator-onboarding'); return null; }
    if (correctPath !== '/production-dashboard') { window.location.replace(correctPath); return null; }
    return <ProductionDashboard />;
  }

  if (isTelegramDashboardRoute) {
    if (!session) { window.location.replace('/creator-login'); return null; }
    if (!creatorProfile || !creatorProfile.onboarding_done) { window.location.replace('/creator-onboarding'); return null; }
    if (correctPath !== '/telegram-dashboard') { window.location.replace(correctPath); return null; }
    return <TelegramDashboard />;
  }

  return null;
}

export default function App() {
  const [showLangPicker, setShowLangPicker] = useState(!hasChosenLanguage());

  // Redirect /@username or /%40username → /username for canonical URLs
  if ((rawSegment.startsWith('@') || rawSegment.startsWith('%40')) && cleanedSegment.length >= 3) {
    window.location.replace(`/${cleanedSegment}${window.location.search}`);
    return null;
  }

  if (isPresentationRoute) return <Presentation />;
  if (isCancelRoute) return <CancelBooking />;
  if (isBookingRoute) return <BookingPage />;
  if (isCreatorBookingRoute && creatorBookingHandle) return <CreatorBookingPage handle={creatorBookingHandle} />;
  if (isEditorRoute) return <EditorPortal />;
  if (isOperatorRoute) return <OperatorPortal />;
  if (isJobRoute) return <JobApplication />;
  if (isManagerPortalRoute) return <ManagerPortal />;
  if (isAdminMarketplaceRoute) { window.location.replace('/admin'); return null; }
  if (isBlogListRoute) {
    const lang = localStorage.getItem('yalla_lang') || localStorage.getItem('selectedRegion') === 'KZ' ? 'ru' : 'en';
    return <BlogList isRu={lang === 'ru'} />;
  }
  if (isBlogPostRoute && blogPostSlug) {
    const lang = localStorage.getItem('yalla_lang') || localStorage.getItem('selectedRegion') === 'KZ' ? 'ru' : 'en';
    return <BlogPostPage slug={blogPostSlug} isRu={lang === 'ru'} />;
  }
  if (isGeoLandingRoute && geoNiche && geoCity) return <GeoLandingPage niche={geoNiche} city={geoCity} />;
  if (isFilterRoute && filterTypeSlug && filterLocationSlug) return <FilterLandingPage typeSlug={filterTypeSlug} locationSlug={filterLocationSlug} languageSlug={filterLangSlug ?? undefined} categorySlug={filterCatSlug ?? undefined} />;
  if (isPublicCreatorRoute && creatorUsernameFromPath) return <AppPreferencesProvider><PublicCreatorProfile username={creatorUsernameFromPath} /></AppPreferencesProvider>;

  // Creator-specific routes — isolated from main app auth, with strict role-based dashboard guards
  if (
    isCreatorAuthRoute ||
    isCreatorOnboardingRoute ||
    isCreatorDashboardRoute ||
    isEditingDashboardRoute ||
    isProductionDashboardRoute ||
    isTelegramDashboardRoute
  ) {
    return (
      <AppPreferencesProvider>
        <CreatorAuthProvider>
          <CreatorRoutes />
        </CreatorAuthProvider>
      </AppPreferencesProvider>
    );
  }

  // Client (advertiser) routes — isolated auth context
  if (isClientAuthRoute || isClientDashboardRoute) {
    return (
      <AppPreferencesProvider>
        <ClientAuthProvider>
          <ClientRoutes />
        </ClientAuthProvider>
      </AppPreferencesProvider>
    );
  }

  return (
    <AppPreferencesProvider>
      <AppSettingsProvider>
        <AuthProvider>
          <AppContent />
          {showLangPicker && (
            <LanguagePickerModal onClose={() => setShowLangPicker(false)} />
          )}
        </AuthProvider>
      </AppSettingsProvider>
    </AppPreferencesProvider>
  );
}
