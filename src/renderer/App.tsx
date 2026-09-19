import * as React from 'react';
import { Icon } from './components/Icon';
import { useT, setLang, getLang } from './i18n/i18n';
import { ToastContainer, toast } from './state/toast';
import { Dashboard } from './views/Dashboard';
import { Patients } from './views/Patients';
import { PatientProfile } from './views/PatientProfile';
import { Appointments } from './views/Appointments';
import { Visits } from './views/Visits';
import { Treatments } from './views/Treatments';
import { Prescriptions } from './views/Prescriptions';
import { Billing } from './views/Billing';
import { Payments } from './views/Payments';
import { Documents } from './views/Documents';
import { Reports } from './views/Reports';
import { Staff } from './views/Staff';
import { Inventory } from './views/Inventory';
import { Finance } from './views/Finance';
import { NotificationsView } from './views/Notifications';
import { Settings } from './views/Settings';
import { SetupWizard } from './views/SetupWizard';
import { GlobalSearch } from './components/GlobalSearch';

declare global {
  interface Window {
    api: any;
  }
}

type View =
  | 'dashboard' | 'patients' | 'patient-profile' | 'appointments' | 'visits'
  | 'treatments' | 'prescriptions' | 'billing' | 'payments' | 'documents'
  | 'reports' | 'staff' | 'inventory' | 'finance' | 'notifications' | 'settings';

interface NavState {
  view: View;
  patientId?: number;
  filter?: any;
}

export default function App() {
  const t = useT();
  const [view, setView] = React.useState<View>('dashboard');
  const [navState, setNavState] = React.useState<NavState>({ view: 'dashboard' });
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [isFirstRun, setIsFirstRun] = React.useState<boolean | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const firstRun = await window.api.settings.isFirstRun();
        setIsFirstRun(firstRun);
        if (!firstRun) {
          const lang = await window.api.i18n.get();
          setLang(lang);
        }
      } catch (e) {
        console.error('init failed', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Keyboard shortcut: Ctrl+K for search
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Menu integration
  React.useEffect(() => {
    if (!window.api?.on) return;
    const offs = [
      window.api.on('menu:new-patient', () => navigate('patient-new')),
      window.api.on('menu:new-appointment', () => navigate('appointment-new')),
      window.api.on('menu:search', () => setSearchOpen(true)),
      window.api.on('menu:quick-action', () => setSearchOpen(true)),
      window.api.on('menu:about', () => navigate('settings', { tab: 'about' }))
    ];
    return () => offs.forEach(f => f());
  }, []);

  const navigate = (view: View | 'patient-new' | 'appointment-new' | 'invoice-new' | 'payment-new' | 'prescription-new' | 'visit-new' | 'treatment-new', filter?: any) => {
    if (view === 'patient-new') {
      setNavState({ view: 'patients', filter: { openNew: true } });
    } else if (view === 'appointment-new') {
      setNavState({ view: 'appointments', filter: { openNew: true } });
    } else if (view === 'invoice-new') {
      setNavState({ view: 'billing', filter: { openNew: true } });
    } else if (view === 'payment-new') {
      setNavState({ view: 'payments', filter: { openNew: true } });
    } else if (view === 'prescription-new') {
      setNavState({ view: 'prescriptions', filter: { openNew: true } });
    } else if (view === 'visit-new') {
      setNavState({ view: 'visits', filter: { openNew: true } });
    } else if (view === 'treatment-new') {
      setNavState({ view: 'treatments', filter: { openNew: true } });
    } else {
      setNavState({ view, filter });
    }
    setView(view);
  };

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="spinner spinner-lg" />
        <div style={{ color: '#8a8a8a' }}>Loading Dentiva...</div>
      </div>
    );
  }

  if (isFirstRun) {
    return (
      <SetupWizard
        onComplete={async () => {
          setIsFirstRun(false);
          const lang = await window.api.i18n.get();
          setLang(lang);
          toast('Setup completed successfully', 'success');
        }}
      />
    );
  }

  const currentView = navState.view;

  return (
    <div className={`app ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <Sidebar
        currentView={currentView}
        onNavigate={navigate}
        collapsed={sidebarCollapsed}
      />
      <Topbar
        onToggleSidebar={() => setSidebarCollapsed(s => !s)}
        onOpenSearch={() => setSearchOpen(true)}
        onLanguageChange={(lang) => {
          setLang(lang);
          toast(`Language switched to ${lang === 'bn' ? 'বাংলা' : 'English'}`, 'info');
        }}
      />
      <main className="main">
        <ViewRouter navState={navState} navigate={navigate} />
      </main>

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(view, filter) => {
          setSearchOpen(false);
          navigate(view, filter);
        }}
      />
      <ToastContainer />
    </div>
  );
}

function ViewRouter({ navState, navigate }: { navState: NavState; navigate: any }) {
  const { view, patientId, filter } = navState;
  switch (view) {
    case 'dashboard': return <Dashboard navigate={navigate} />;
    case 'patients': return <Patients navigate={navigate} initialFilter={filter} />;
    case 'patient-profile': return <PatientProfile patientId={patientId!} navigate={navigate} />;
    case 'appointments': return <Appointments navigate={navigate} initialFilter={filter} />;
    case 'visits': return <Visits navigate={navigate} initialFilter={filter} />;
    case 'treatments': return <Treatments navigate={navigate} initialFilter={filter} />;
    case 'prescriptions': return <Prescriptions navigate={navigate} initialFilter={filter} />;
    case 'billing': return <Billing navigate={navigate} initialFilter={filter} />;
    case 'payments': return <Payments navigate={navigate} initialFilter={filter} />;
    case 'documents': return <Documents navigate={navigate} />;
    case 'reports': return <Reports />;
    case 'staff': return <Staff navigate={navigate} initialFilter={filter} />;
    case 'inventory': return <Inventory navigate={navigate} initialFilter={filter} />;
    case 'finance': return <Finance navigate={navigate} initialFilter={filter} />;
    case 'notifications': return <NotificationsView />;
    case 'settings': return <Settings initialTab={filter?.tab} />;
    default: return <Dashboard navigate={navigate} />;
  }
}

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View, filter?: any) => void;
  collapsed: boolean;
}

function Sidebar({ currentView, onNavigate, collapsed }: SidebarProps) {
  const t = useT();
  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: t('nav_dashboard'), group: 'overview' },
    { id: 'patients', icon: 'patients', label: t('nav_patients'), group: 'clinical' },
    { id: 'appointments', icon: 'appointment', label: t('nav_appointments'), group: 'clinical' },
    { id: 'visits', icon: 'visits', label: t('nav_visits'), group: 'clinical' },
    { id: 'treatments', icon: 'treatments', label: t('nav_treatments'), group: 'clinical' },
    { id: 'prescriptions', icon: 'prescription', label: t('nav_prescriptions'), group: 'clinical' },
    { id: 'billing', icon: 'billing', label: t('nav_billing'), group: 'finance' },
    { id: 'payments', icon: 'payment', label: t('nav_payments'), group: 'finance' },
    { id: 'finance', icon: 'finance', label: t('nav_finance'), group: 'finance' },
    { id: 'documents', icon: 'documents', label: t('nav_documents'), group: 'operations' },
    { id: 'reports', icon: 'reports', label: t('nav_reports'), group: 'operations' },
    { id: 'staff', icon: 'staff', label: t('nav_staff'), group: 'operations' },
    { id: 'inventory', icon: 'inventory', label: t('nav_inventory'), group: 'operations' },
    { id: 'notifications', icon: 'notifications', label: t('nav_notifications'), group: 'system' },
    { id: 'settings', icon: 'settings', label: t('nav_settings'), group: 'system' }
  ];

  const groups = [
    { id: 'overview', label: '' },
    { id: 'clinical', label: 'CLINICAL' },
    { id: 'finance', label: 'FINANCE' },
    { id: 'operations', label: 'OPERATIONS' },
    { id: 'system', label: 'SYSTEM' }
  ];

  const itemsByGroup = (gid: string) => navItems.filter(n => n.group === gid);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo-circle">D</div>
        <div className="brand-text">
          Dentiva
          <small>CLINIC SUITE</small>
        </div>
      </div>
      <nav className="sidebar-nav">
        {groups.map(g => (
          <React.Fragment key={g.id}>
            {g.label && <div className="nav-section">{g.label}</div>}
            {itemsByGroup(g.id).map(item => (
              <div
                key={item.id}
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id as View)}
                title={collapsed ? item.label : ''}
              >
                <Icon name={item.icon} size={18} className="icon" />
                <span className="label">{item.label}</span>
              </div>
            ))}
          </React.Fragment>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-avatar">DR</div>
        <div className="user-info">
          <div style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>Dentiva User</div>
          <div style={{ fontSize: 10 }}>v1.0.0</div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ onToggleSidebar, onOpenSearch, onLanguageChange }: { onToggleSidebar: () => void; onOpenSearch: () => void; onLanguageChange: (l: 'en' | 'bn') => void }) {
  const t = useT();
  const lang = getLang();
  const [showNotifDot, setShowNotifDot] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const list = await window.api.notifications.list();
        setShowNotifDot((list || []).some((n: any) => !n.is_read));
      } catch {}
    })();
  }, []);

  return (
    <header className="topbar">
      <button className="topbar-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <Icon name="menu" size={20} />
      </button>
      <div className="topbar-search" onClick={onOpenSearch}>
        <Icon name="search" size={16} className="search-icon" />
        <input
          readOnly
          placeholder={t('search_placeholder')}
          onFocus={onOpenSearch}
        />
        <span className="shortcut">Ctrl K</span>
      </div>
      <div className="topbar-actions">
        <div className="lang-switch">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => onLanguageChange('en')}>EN</button>
          <button className={lang === 'bn' ? 'active' : ''} onClick={() => onLanguageChange('bn')}>বাং</button>
        </div>
        <button className="icon-btn" title={t('nav_notifications')}>
          <Icon name="bell" size={18} />
          {showNotifDot && <span className="dot" />}
        </button>
      </div>
    </header>
  );
}