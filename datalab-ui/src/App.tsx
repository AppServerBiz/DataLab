import { useState, createContext } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import Home from './pages/Home';
import Comparativo from './pages/Comparativo';
import Banco from './pages/Banco';
import Portfolio from './pages/Portfolio';
import IA from './pages/IA';
import './index.css';

export const AppContext = createContext<any>(null);

function App() {
  const [pendingBacktests, setPendingBacktests] = useState<any[]>([]);

  return (
    <AppContext.Provider value={{ pendingBacktests, setPendingBacktests }}>
      <BrowserRouter>
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/comparativo" element={<Comparativo />} />
              <Route path="/banco" element={<Banco />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/portfolio/:portfolioId" element={<Portfolio />} />
              <Route path="/ia" element={<IA />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
