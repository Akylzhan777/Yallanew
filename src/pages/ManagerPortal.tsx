import { useState } from 'react';
import { Eye, EyeOff, LogOut, Video, Film, Scissors, RefreshCw, X, MapPin, Menu } from 'lucide-react';
import { ManagerAuthProvider, useManagerAuth } from '../context/ManagerAuthContext';
import { DataProvider } from '../context/DataContext';
import ShootingsPanel from '../components/ShootingsPanel';
import EditorsPanel from './admin/EditorsPanel';
import ShootingsAccountingPanel from './admin/ShootingsAccountingPanel';
import LocationsPanel from './admin/LocationsPanel';

/* ─── Login ──────────────────────────────────────────────────────────────── */

function ManagerLogin() {
  const { signIn } = useManagerAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const ok = signIn(login.trim(), password);
      if (!ok) setError('Неверный логин или пароль');
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Video size={20} className="text-white" />
          </div>
          <span className="text-white text-xl font-bold tracking-tight">Manager Portal</span>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-white text-lg font-semibold mb-1">Вход в систему</h1>
          <p className="text-slate-400 text-sm mb-6">Только для менеджеров Yalla Production</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Логин</label>
              <input
                type="text"
                value={login}
                onChange={e => setLogin(e.target.value)}
                autoComplete="username"
                className="w-full bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="manageryalla"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Пароль</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 pr-11 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/30 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !login || !password}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading && <RefreshCw size={14} className="animate-spin" />}
              Войти
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          <a href="/" className="hover:text-slate-400 transition-colors">← Вернуться на сайт</a>
        </p>
      </div>
    </div>
  );
}

/* ─── Dashboard ──────────────────────────────────────────────────────────── */

type ManagerTab = 'accounting' | 'shootings' | 'editors' | 'locations';

const NAV_ITEMS: Array<{ id: ManagerTab; label: string; icon: typeof Video }> = [
  { id: 'accounting', label: 'Учет съемок',  icon: Film     },
  { id: 'shootings',  label: 'Съемки',       icon: Video    },
  { id: 'editors',    label: 'Монтажеры',    icon: Scissors },
  { id: 'locations',  label: 'Локации',      icon: MapPin   },
];

function ManagerApp() {
  const { signOut } = useManagerAuth();
  const [tab, setTab] = useState<ManagerTab>('accounting');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const current = NAV_ITEMS.find(n => n.id === tab)!;

  return (
    <div className="min-h-screen bg-[#0F1115] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-[#161922] border-r border-[#2C2F3A] min-h-screen fixed left-0 top-0 bottom-0 z-30">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#2C2F3A]">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Video size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-sm tracking-tight">Manager Portal</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${tab === item.id ? 'bg-blue-600 text-white' : 'text-[#8F90A6] hover:text-white hover:bg-[#2C2F3A]'}`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[#2C2F3A]">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-[#2C2F3A] flex items-center justify-center text-xs font-bold text-slate-200">M</div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-xs font-medium truncate">Manager</p>
              <p className="text-[#8F90A6] text-xs">Yalla Production</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#8F90A6] hover:text-red-400 hover:bg-[#2C2F3A] transition-colors"
          >
            <LogOut size={15} /> Выйти
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0F1115] border-b border-[#2C2F3A] flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Video size={14} className="text-white" />
          </div>
          <span className="text-white font-bold text-sm">Manager Portal</span>
          <span className="text-[#8F90A6] text-xs ml-2">/ {current.label}</span>
        </div>
        <button onClick={() => setMobileNavOpen(v => !v)} className="p-2 rounded-lg text-[#8F90A6] hover:text-white hover:bg-[#2C2F3A] transition-colors">
          <Menu size={20} />
        </button>
      </header>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-4/5 max-w-xs bg-[#161922] border-r border-[#2C2F3A] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2C2F3A]">
              <span className="text-white font-bold text-sm">Меню</span>
              <button onClick={() => setMobileNavOpen(false)} className="text-[#8F90A6] hover:text-white"><X size={18} /></button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.id} onClick={() => { setTab(item.id); setMobileNavOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${tab === item.id ? 'bg-blue-600 text-white' : 'text-[#8F90A6] hover:text-white hover:bg-[#2C2F3A]'}`}>
                    <Icon size={16} /> {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-[#2C2F3A]">
              <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#8F90A6] hover:text-red-400 hover:bg-[#2C2F3A] transition-colors">
                <LogOut size={15} /> Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content — uses the exact same components as AdminDashboard */}
      <div className="flex-1 md:ml-60 pt-14 md:pt-0 min-w-0">
        <div className="admin-main">
          {tab === 'accounting' && <ShootingsAccountingPanel />}
          {tab === 'shootings'  && <ShootingsPanel />}
          {tab === 'editors'    && <EditorsPanel isManager />}
          {tab === 'locations'  && <LocationsPanel />}
        </div>
      </div>
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────────────────────── */

export default function ManagerPortal() {
  return (
    <ManagerAuthProvider>
      <ManagerPortalInner />
    </ManagerAuthProvider>
  );
}

function ManagerPortalInner() {
  const { isAuthed } = useManagerAuth();
  if (!isAuthed) return <ManagerLogin />;
  return (
    <DataProvider>
      <ManagerApp />
    </DataProvider>
  );
}
