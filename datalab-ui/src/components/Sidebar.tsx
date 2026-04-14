import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, BarChart2, Database, Briefcase, Menu, ChevronDown, ChevronRight, FolderOpen, Sparkles, Lock, Unlock, Network } from 'lucide-react';
import { fetchPortfolios } from '../api';

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(true);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const location = useLocation();

  useEffect(() => {
    const load = () => fetchPortfolios().then(setPortfolios).catch(() => {});
    load();
    window.addEventListener('portfolioUpdated', load);
    return () => window.removeEventListener('portfolioUpdated', load);
  }, [location]); // refresh list when navigation happens or update event

  const isPortfolioActive = location.pathname.startsWith('/portfolio');

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

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Home size={20} />
          {!collapsed && <span>Visão Geral</span>}
        </NavLink>

        <NavLink to="/diagnostico" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <BarChart2 size={20} />
          {!collapsed && <span>Diagnóstico</span>}
        </NavLink>

        <NavLink to="/repositorio" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Database size={20} />
          {!collapsed && <span>Repositório</span>}
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
              {!collapsed && <span>Portfólio</span>}
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
                <span style={{ opacity: 0.6 }}>+ Gerenciar</span>
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
           {!collapsed && <span>Transmitir</span>}
         </NavLink>

         <NavLink to="/ia" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
           <Sparkles size={20} />
           {!collapsed && <span>Nautilus AI</span>}
         </NavLink>
       </nav>
    </aside>
  );
};
