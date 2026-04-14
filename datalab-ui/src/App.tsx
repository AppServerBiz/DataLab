import { useState, createContext } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import Home from './pages/Home';
import Diagnostico from './pages/Diagnostico';
import Repositorio from './pages/Repositorio';
import Portfolio from './pages/Portfolio';
import Transmitir from './pages/Transmitir';
import IA from './pages/IA';
import PortfolioReport from './pages/PortfolioReport';
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
  const location = useLocation();
  const isReport = location.pathname === '/portfolio-report';

  return (
    <div className={isReport ? "report-layout" : "app-container"}>
      {!isReport && <Sidebar />}
      <main className={isReport ? "report-main" : "main-content"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/diagnostico" element={<Diagnostico />} />
          <Route path="/repositorio" element={<Repositorio />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/portfolio/:portfolioId" element={<Portfolio />} />
          <Route path="/portfolio-report" element={<PortfolioReport />} />
          <Route path="/transmitir" element={<Transmitir />} />
          <Route path="/ia" element={<IA />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
