import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, BarChart2, Database, Briefcase, Menu, ChevronDown, ChevronRight, FolderOpen, Sparkles, Lock, Unlock, Network, Cpu, Globe } from 'lucide-react';
import { fetchPortfolios } from '../api';
import { useLanguage, type Language } from '../LanguageContext';

export const Sidebar = () => {
  const { language, setLanguage, t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(true);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [userIp, setUserIp] = useState('Detectando...');
  const location = useLocation();

  useEffect(() => {
    const load = () => fetchPortfolios().then(setPortfolios).catch(() => {});
    load();
    window.addEventListener('portfolioUpdated', load);
    return () => window.removeEventListener('portfolioUpdated', load);
  }, [location]); // refresh list when navigation happens or update event

  useEffect(() => {
    fetch('https://ip-api.com/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.status === 'success') {
          setUserIp(data.query);
        } else {
          setUserIp('127.0.0.1');
        }
      })
      .catch(() => setUserIp('127.0.0.1'));
  }, []);

  const isPortfolioActive = location.pathname.startsWith('/portfolio');

  const handleLogout = () => {
    localStorage.removeItem('investhub_user');
    window.location.reload();
  };

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'pt', label: 'PT', flag: '🇧🇷' },
    { code: 'en', label: 'EN', flag: '🇺🇸' },
    { code: 'es', label: 'ES', flag: '🇪🇸' }
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-logo-container">
            <span className="logo-line-1">DATA_LAB</span>
            <span className="logo-line-2">Nautilus</span>
          </div>
        )}
        <Menu
          style={{ cursor: 'pointer', color: '#fff', marginLeft: collapsed ? '0' : 'auto' }}
          onClick={() => setCollapsed(!collapsed)}
          size={24}
        />
      </div>

      {/* Language Selector */}
      <div style={{ padding: collapsed ? '0 0.5rem 1rem' : '0 1.2rem 1.2rem', display: 'flex', justifyContent: 'center' }}>
        {!collapsed ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '3px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            width: '100%',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '6px', color: 'var(--text-muted)' }}>
              <Globe size={13} />
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  title={lang.code.toUpperCase()}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: language === lang.code ? 'var(--accent-blue)' : 'transparent',
                    color: language === lang.code ? '#000' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={() => {
                const nextLang: Record<Language, Language> = { pt: 'en', en: 'es', es: 'pt' };
                setLanguage(nextLang[language]);
              }}
              title={`Idioma: ${language.toUpperCase()} (Clique para alternar)`}
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                padding: '4px 6px',
                fontSize: '0.65rem',
                fontWeight: 800,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--accent-blue)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span>{languages.find(l => l.code === language)?.flag}</span>
              <span>{language.toUpperCase()}</span>
            </button>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Home size={20} />
          {!collapsed && <span>{t('sidebar.overview')}</span>}
        </NavLink>

        <NavLink to="/diagnostico" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <BarChart2 size={20} />
          {!collapsed && <span>{t('sidebar.diagnostico')}</span>}
        </NavLink>

        <NavLink to="/strategy-studio" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Cpu size={20} />
          {!collapsed && <span>{t('sidebar.studio')}</span>}
        </NavLink>

        <NavLink to="/repositorio" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Database size={20} />
          {!collapsed && <span>{t('sidebar.repositorio')}</span>}
        </NavLink>

        {/* Portfolio with expandable submenus */}
        <div>
          <div
            className={`nav-item ${isPortfolioActive ? 'active' : ''}`}
            style={{ cursor: 'pointer', justifyContent: 'space-between' }}
            onClick={() => {
              if (collapsed) return;
              setPortfolioOpen(o => !o);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
              <Briefcase size={20} />
              {!collapsed && <span>{t('sidebar.portfolio')}</span>}
            </div>
            {!collapsed && (
              portfolioOpen
                ? <ChevronDown size={14} style={{ opacity: 0.5 }} />
                : <ChevronRight size={14} style={{ opacity: 0.5 }} />
            )}
          </div>

          {/* Submenu — portfolio list */}
          {!collapsed && portfolioOpen && (
            <div style={{ paddingLeft: '0.8rem', borderLeft: '1px solid rgba(255,255,255,0.06)', marginLeft: '1.2rem' }}>
              <NavLink
                to="/portfolio"
                end
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', gap: '0.5rem' }}
              >
                <span style={{ opacity: 0.6 }}>{t('sidebar.manage')}</span>
              </NavLink>

              {portfolios.map(pf => (
                <NavLink
                  key={pf.id}
                  to={`/portfolio/${pf.id}`}
                  className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                  style={{ 
                    fontSize: '0.78rem', 
                    padding: '0.4rem 0.8rem', 
                    gap: '0.5rem',
                    background: 'transparent',
                    borderLeft: (location.pathname === `/portfolio/${pf.id}` || location.pathname.startsWith(`/portfolio/${pf.id}/`)) ? '3px solid var(--accent-blue)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%' }}>
                    <FolderOpen size={13} />
                    <span style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap', 
                      maxWidth: pf.locked ? '100px' : '120px'
                    }}>{pf.name}</span>
                    {pf.locked ? (
                      <Lock size={12} style={{ color: 'var(--accent-red)', opacity: 0.8, marginLeft: 'auto' }} />
                    ) : (
                      <Unlock size={12} style={{ color: 'var(--accent-green)', opacity: 0.5, marginLeft: 'auto' }} />
                    )}
                  </div>
                </NavLink>
              ))}
            </div>
          )}
        </div>
 
        <NavLink to="/transmitir" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Network size={20} />
          {!collapsed && <span>{t('sidebar.transmitir')}</span>}
        </NavLink>

        <NavLink to="/ia" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Sparkles size={20} />
          {!collapsed && <span>{t('sidebar.ia')}</span>}
        </NavLink>
      </nav>

      {/* Bottom Group: User Profile + Logout */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
        {!collapsed ? (
          <div className="sidebar-user-footer" style={{ padding: '0.5rem 0' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{t('sidebar.loggedInAs')}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <strong style={{ color: 'var(--accent-blue)', fontSize: '0.85rem' }}>Admin</strong>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-main)' }}>{userIp}</span>
              </div>
              <button
                onClick={handleLogout}
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontWeight: 700, fontSize: '0.65rem', padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
              >
                {t('sidebar.logout')}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
            <button
              onClick={handleLogout}
              title={`${t('sidebar.logout')} (${t('sidebar.loggedInAs')} Admin [${userIp}])`}
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontWeight: 700, fontSize: '0.65rem', padding: '8px 10px', borderRadius: '4px', textTransform: 'uppercase', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
            >
              {t('sidebar.logout')}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

