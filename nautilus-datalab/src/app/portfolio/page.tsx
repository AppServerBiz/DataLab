"use client";

import React, { useState, useEffect } from 'react';
import { RobotDB } from '@/lib/db';
import { Trash2, Sparkles, Activity, Database, TrendingUp, Save, LayoutDashboard, Loader2 } from 'lucide-react';
import { actionSavePortfolio } from '../actions';

export default function PortfolioPage() {
  const [selectedRobots, setSelectedRobots] = useState<RobotDB[]>([]);
  const [portfolioName, setPortfolioName] = useState("Alpha1 Gold Portfolio");
  const [isSaving, setIsSaving] = useState(false);
  
  const [combinedStats, setCombinedStats] = useState({
    totalProfit: 0,
    maxDrawdown: 0,
    profitFactor: 0,
    winRate: 0,
    totalTrades: 0,
    recoveryFactor: 0
  });

  useEffect(() => {
    const saved = localStorage.getItem('nautilus_selection');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedRobots(parsed);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (selectedRobots.length === 0) {
      setCombinedStats({ totalProfit: 0, maxDrawdown: 0, profitFactor: 0, winRate: 0, totalTrades: 0, recoveryFactor: 0 });
      return;
    }

    const totalProfit = selectedRobots.reduce((acc, res) => acc + (res.stats.totalProfit || 0), 0);
    const avgPF = selectedRobots.reduce((acc, res) => acc + (res.stats.profitFactor || 0), 0) / selectedRobots.length;
    const avgWR = selectedRobots.reduce((acc, res) => acc + (res.stats.winRate || 0), 0) / selectedRobots.length;
    const sumDD = selectedRobots.reduce((acc, res) => acc + (res.stats.maxDrawdown || 0), 0);
    const totalTrades = selectedRobots.reduce((acc, res) => acc + (res.stats.totalTrades || 0), 0);
    const recoveryFactor = sumDD > 0 ? totalProfit / sumDD : totalProfit;

    setCombinedStats({
      totalProfit,
      maxDrawdown: sumDD,
      profitFactor: avgPF,
      winRate: avgWR,
      totalTrades,
      recoveryFactor
    });
  }, [selectedRobots]);

  const removeRobot = (id: string) => {
    const updated = selectedRobots.filter(r => r.id !== id);
    setSelectedRobots(updated);
    localStorage.setItem('nautilus_selection', JSON.stringify(updated));
  };

  const handleSaveToDashboard = async () => {
    setIsSaving(true);
    const portfolioId = portfolioName.toLowerCase().replace(/\s+/g, '-');
    const portfolioData = {
      id: portfolioId,
      name: portfolioName,
      robotIds: selectedRobots.map(r => r.id),
      lots: selectedRobots.reduce((acc: any, r) => ({ ...acc, [r.id]: 0.1 }), {}), // Initial lot
      stats: combinedStats
    };

    const res = await actionSavePortfolio(portfolioData);
    if(res.success) {
      alert("Portfólio salvo com sucesso e enviado para Dashboard!");
      window.location.href = '/dashboard';
    } else {
      alert(`Erro ao salvar: ${res.error}`);
    }
    setIsSaving(false);
  };

  const metrics = [
    { label: 'Lucro Líquido', key: 'totalProfit', isCurrency: true },
    { label: 'Drawdown Máx', key: 'maxDrawdown', isCurrency: true },
    { label: 'Profit Factor', key: 'profitFactor', isDecimal: true },
    { label: 'Win Rate', key: 'winRate', isPct: true },
    { label: 'Total Trades', key: 'totalTrades' },
    { label: 'Recovery Factor', key: 'recoveryFactor', isDecimal: true }
  ];

  return (
    <main className="min-h-screen bg-nautilus-dark relative overflow-hidden flex flex-col pt-12 pb-24">
      <div className="absolute inset-0 mesh-gradient opacity-20" />
      
      <div className="max-w-[1600px] w-full mx-auto px-12 mb-16 relative z-10 flex flex-col">
        <div className="flex justify-between items-end mb-12">
          <div className="flex flex-col">
            <h3 className="text-[10px] font-black text-nautilus-blue uppercase tracking-[0.5em] mb-4">Portfolio Engine v2.5</h3>
            <input 
              value={portfolioName}
              onChange={(e) => setPortfolioName(e.target.value)}
              className="text-5xl font-black text-white tracking-tighter bg-transparent border-none outline-none focus:ring-0 focus:border-b border-white/10"
              placeholder="Nome do Portfólio"
            />
            <p className="text-slate-500 max-w-xl text-[13px] font-mono mt-4">
              Visão horizontal da composição. Estude a contribuição individual de cada robô para a métrica consolidada do fundo.
            </p>
          </div>
          
          <button 
             onClick={handleSaveToDashboard}
             disabled={isSaving || selectedRobots.length === 0}
             className="px-8 py-4 bg-nautilus-blue text-dark-900 rounded-xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
            Salvar e Dashboard
          </button>
        </div>

        {/* Matrix Table */}
        <div className="glass-card p-0 overflow-hidden border-white/5 bg-white/[0.02]">
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                       <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-white/10">Métrica \ Robô</th>
                       {selectedRobots.map(r => (
                          <th key={r.id} className="p-6 min-w-[200px] border-r border-white/10">
                             <div className="flex justify-between items-center group">
                                <span className="text-sm font-black text-white">{r.name}</span>
                                <button 
                                  onClick={() => removeRobot(r.id)}
                                  className="text-slate-700 hover:text-nautilus-crimson transition-colors"
                                >
                                   <Trash2 size={14} />
                                </button>
                             </div>
                          </th>
                       ))}
                       <th className="p-6 bg-nautilus-emerald/5 min-w-[200px]">
                          <span className="text-xs font-black text-nautilus-emerald uppercase tracking-[0.2em] flex items-center gap-2">
                             <Sparkles size={14} /> Consolidado
                          </span>
                       </th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/10">
                    {metrics.map(m => (
                       <tr key={m.label} className="hover:bg-white/5 transition-colors group">
                          <td className="p-6 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-r border-white/10 bg-white/[0.01]">
                             {m.label}
                          </td>
                          {selectedRobots.map(r => {
                             const val = (r.stats as any)[m.key];
                             return (
                                <td key={r.id} className="p-6 font-mono text-sm font-bold text-white border-r border-white/10">
                                   {m.isCurrency ? `$${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 
                                    m.isPct ? `${(val || 0).toFixed(1)}%` : 
                                    m.isDecimal ? (val || 0).toFixed(2) : val}
                                </td>
                             );
                          })}
                          <td className="p-6 bg-nautilus-emerald/[0.03] font-mono text-sm font-black text-nautilus-emerald">
                             {m.isCurrency ? `$${(combinedStats as any)[m.key].toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 
                              m.isPct ? `${(combinedStats as any)[m.key].toFixed(1)}%` : 
                              m.isDecimal ? (combinedStats as any)[m.key].toFixed(2) : (combinedStats as any)[m.key]}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        {selectedRobots.length === 0 && (
           <div className="py-40 text-center flex flex-col items-center gap-5">
              <Database size={48} className="text-slate-800" />
              <p className="text-slate-500 font-mono text-sm">Seu portfólio está vazio. Comece selecionando robôs na Estrutura.</p>
              <Link href="/estrutura" className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-white hover:bg-white/10 transition-all">
                Ir para Estrutura
              </Link>
           </div>
        )}
      </div>
    </main>
  );
}

import Link from 'next/link';
