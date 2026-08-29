import { useState, createContext } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import Home from './pages/Home';
import Diagnostico from './pages/Diagnostico';
import Repositorio from './pages/Repositorio';
import Portfolio from './pages/Portfolio';
import Transmitir from './pages/Transmitir';
import IA from './pages/IA';
import StrategyStudio from './pages/StrategyStudio';
import PortfolioReport from './pages/PortfolioReport';
import Login from './pages/Login';
import './index.css';

export const AppContext = createContext<any>(null);

function App() {
  const [pendingBacktests, setPendingBacktests] = useState<any[]>([]);

  return (
    <AppContext.Provider value={{ pendingBacktests, setPendingBacktests }}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppContext.Provider>
  );
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('investhub_user');
    return saved?.trim().toUpperCase() === '579524';
  });

  const location = useLocation();
  const isReport = location.pathname === '/portfolio-report';

  // Sincroniza o scroll da sidebar quando a página principal rola / chega ao final
  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const sidebar = document.querySelector('.sidebar') as HTMLElement | null;
    if (!sidebar) return;

    const scrollableHeight = target.scrollHeight - target.clientHeight;
    if (scrollableHeight > 0) {
      const scrollRatio = target.scrollTop / scrollableHeight;
      const sidebarScrollableHeight = sidebar.scrollHeight - sidebar.clientHeight;
      if (sidebarScrollableHeight > 0) {
        sidebar.scrollTop = scrollRatio * sidebarScrollableHeight;
      }
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className={isReport ? "report-layout" : "app-container"}>
      {!isReport && <Sidebar />}
      <main className={isReport ? "report-main" : "main-content"} onScroll={handleMainScroll}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/diagnostico" element={<Diagnostico />} />
          <Route path="/repositorio" element={<Repositorio />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/portfolio/:portfolioId" element={<Portfolio />} />
          <Route path="/portfolio-report" element={<PortfolioReport />} />
          <Route path="/transmitir" element={<Transmitir />} />
          <Route path="/ia" element={<IA />} />
          <Route path="/strategy-studio" element={<StrategyStudio />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
