import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

type PageType = 'home' | 'ideas' | 'academy' | 'gallery' | 'calendar' | 'scripts' | 'referral' | 'collabs' | 'shop';

interface SidebarProps {
  page: PageType;
  setPage: (p: PageType) => void;
  onOpenDashboard?: () => void;
}

export default function Sidebar({ page, setPage }: SidebarProps) {
  const { profile, user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="sidebar">
      <button
        className={`menu-btn ${page === 'home' ? 'active' : ''}`}
        onClick={() => setPage('home')}
        title={t('nav.home')}
      >
        🏠
      </button>

      <div className="sidebar-spacer" />

      <LanguageSwitcher variant="dark" />

      {user ? (
        <a
          href="/creator-dashboard"
          className="menu-btn sidebar-avatar-btn"
          title={t('nav.dashboard')}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="sidebar-avatar-img" />
          ) : (
            <span className="sidebar-avatar-initials">
              {user.email?.[0]?.toUpperCase() ?? '?'}
            </span>
          )}
        </a>
      ) : (
        <a
          href="/login"
          className="menu-btn sidebar-login-btn"
          title={t('nav.login')}
        >
          👤
        </a>
      )}
    </div>
  );
}
