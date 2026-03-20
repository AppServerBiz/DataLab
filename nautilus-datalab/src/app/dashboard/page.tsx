"use client";

import React, { useEffect, useState } from 'react';
import { actionGetPortfolios, actionSavePortfolio } from '../actions';
import { LayoutDashboard, TrendingUp, AlertTriangle, Scale, Target, Save, ChevronRight, Briefcase } from 'lucide-react';

export default function DashboardPage() {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [capitalFundo, setCapitalFundo] = useState(30000);

  useEffect(() => {
    async function load() {
      const res = await actionGetPortfolios();
      if (res.success && res.portfolios) {
        setPortfolios(res.portfolios);
        if (res.portfolios.length > 0) setSelectedPortfolio(res.portfolios[0]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const updateLot = (robotId: string, newLot: number) => {
    if (!selectedPortfolio) return;
    const updated = {
      ...selectedPortfolio,
      lots: { ...selectedPortfolio.lots, [robotId]: newLot }
    };
    setSelectedPortfolio(updated);
  };

  const handleSave = async () => {
    const res = await actionSavePortfolio(selectedPortfolio);
    if (res.success) alert("Configurações de lote salvas!");
  };

  if (loading) return <div className="p-20 text-center font-mono text-slate-500">Sincronizando fundos...</div>;

  return (
    <main className="min-h-screen bg-nautilus-dark flex flex-col pt-12 pb-20">
      <div className="absolute inset-0 mesh-gradient opacity-10 pointer-events-none" />
      
      <div className="max-w-[1600px] w-full mx-auto px-12 relative z-10 grid grid-cols-12 gap-8">
        
        {/* Sidebar: Fund List */}
        <div className="col-span-3 space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Meus Portfólios</h3>
          {portfolios.map(p => (
            <button 
              key={p.id}
              onClick={() => setSelectedPortfolio(p)}
              className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 ${
                selectedPortfolio?.id === p.id 
                ? 'bg-nautilus-blue/10 border-nautilus-blue shadow-[0_0_20px_rgba(56,189,248,0.1)]' 
                : 'bg-white/5 border-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-black uppercase tracking-wider ${selectedPortfolio?.id === p.id ? 'text-nautilus-blue' : 'text-slate-400'}`}>
                  {p.name}
                </span>
                <ChevronRight size={14} className={selectedPortfolio?.id === p.id ? 'text-nautilus-blue' : 'text-slate-600'} />
              </div>
              <div className="flex items-end gap-3">
                <span className="text-xl font-black text-white">$ {p.stats.totalProfit?.toLocaleString()}</span>
                <span className="text-[10px] font-mono text-nautilus-emerald mb-1">+{((p.stats.totalProfit / capitalFundo) * 100).toFixed(1)}%</span>
              </div>
            </button>
          ))}
        </div>

        {/* Main: Analysis Matrix */}
        <div className="col-span-9">
          {selectedPortfolio ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              
              <div className="flex justify-between items-end">
                <div>
                   <h2 className="text-4xl font-black text-white tracking-tighter mb-2">{selectedPortfolio.name}</h2>
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-nautilus-blue uppercase tracking-widest">
                         <Briefcase size={14} /> Capital de Gestão:
                         <input 
                           type="number" 
                           value={capitalFundo} 
                           onChange={e => setCapitalFundo(Number(e.target.value))}
                           className="bg-transparent border-b border-nautilus-blue/30 outline-none text-white w-24 ml-2"
                         />
                      </div>
                   </div>
                </div>
                <button 
                  onClick={handleSave}
                  className="px-6 py-3 bg-white text-dark-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-nautilus-blue hover:text-white transition-all flex items-center gap-2"
                >
                  <Save size={16} /> Salvar Parâmetros
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-6">
                 <div className="glass-card p-6 bg-nautilus-emerald/5 border-nautilus-emerald/20">
                    <span className="text-[9px] font-black text-nautilus-emerald uppercase tracking-widest block mb-1">Lucro Estimado</span>
                    <span className="text-3xl font-black text-white">$ {selectedPortfolio.stats.totalProfit?.toLocaleString()}</span>
                 </div>
                 <div className="glass-card p-6 bg-nautilus-crimson/5 border-nautilus-crimson/20">
                    <span className="text-[9px] font-black text-nautilus-crimson uppercase tracking-widest block mb-1">DD Estimado (DME)</span>
                    <span className="text-3xl font-black text-white">$ {selectedPortfolio.stats.maxDrawdown?.toLocaleString()}</span>
                 </div>
                 <div className="glass-card p-6 bg-white/[0.03] border-white/5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Retorno %</span>
                    <span className="text-3xl font-black text-white">{((selectedPortfolio.stats.totalProfit / capitalFundo) * 100).toFixed(2)}%</span>
                 </div>
                 <div className="glass-card p-6 bg-white/[0.03] border-white/5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Risco / DD %</span>
                    <span className="text-3xl font-black text-white">{((selectedPortfolio.stats.maxDrawdown / capitalFundo) * 100).toFixed(2)}%</span>
                 </div>
              </div>

              {/* Matrix Table */}
              <div className="glass-card p-0 overflow-hidden border-white/5">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-white/5 border-b border-white/10">
                          <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ativo / Robô</th>
                          <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Lote Base</th>
                          <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Fator Lote</th>
                          <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Lote Calculado</th>
                          <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Lucro Indiv.</th>
                          <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">DD Indiv.</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {selectedPortfolio.robotIds.map((id: string) => (
                          <tr key={id} className="hover:bg-white/[0.02] transition-colors">
                             <td className="p-6">
                                <span className="text-sm font-bold text-white uppercase tracking-tight">{id}</span>
                             </td>
                             <td className="p-6 text-right font-mono text-xs text-slate-400">0.01</td>
                             <td className="p-6 text-right">
                                <input 
                                  type="number"
                                  step="0.1"
                                  value={selectedPortfolio.lots?.[id] || 1}
                                  onChange={(e) => updateLot(id, Number(e.target.value))}
                                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-right font-mono text-sm text-nautilus-blue w-20 outline-none focus:border-nautilus-blue/50"
                                />
                             </td>
                             <td className="p-6 text-right font-mono text-sm font-black text-white">
                                {(0.01 * (selectedPortfolio.lots?.[id] || 1)).toFixed(2)}
                             </td>
                             <td className="p-6 text-right font-mono text-sm font-bold text-nautilus-emerald">
                                $ {(selectedPortfolio.stats.totalProfit / selectedPortfolio.robotIds.length * (selectedPortfolio.lots?.[id] || 1)).toLocaleString()}
                             </td>
                             <td className="p-6 text-right font-mono text-sm font-bold text-nautilus-crimson">
                                $ {(selectedPortfolio.stats.maxDrawdown / selectedPortfolio.robotIds.length * (selectedPortfolio.lots?.[id] || 1)).toLocaleString()}
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              {/* VAR and Advanced Metrics Placeholder */}
              <div className="grid grid-cols-2 gap-8">
                 <div className="glass-card p-8 border-white/5">
                    <h4 className="text-[10px] font-black text-nautilus-blue uppercase tracking-widest mb-6 flex items-center gap-2">
                       <Target size={16} /> Metas & Benchmarks
                    </h4>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 uppercase text-[10px] font-bold">Meta Mensal (3%)</span>
                          <span className="text-white font-mono">$ {(capitalFundo * 0.03).toLocaleString()}</span>
                       </div>
                       <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-nautilus-blue h-full" style={{ width: '65%' }} />
                       </div>
                       <p className="text-[10px] text-slate-500 font-mono">Status: Atingindo 65% da meta com base no lucro estimado.</p>
                    </div>
                 </div>
                 <div className="glass-card p-8 border-white/5">
                    <h4 className="text-[10px] font-black text-nautilus-crimson uppercase tracking-widest mb-6 flex items-center gap-2">
                       <Scale size={16} /> Value at Risk (VAR)
                    </h4>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 uppercase text-[10px] font-bold">Risco de Cauda (95%)</span>
                          <span className="text-white font-mono">$ {(selectedPortfolio.stats.maxDrawdown * 1.5).toLocaleString()}</span>
                       </div>
                       <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-nautilus-crimson h-full" style={{ width: '40%' }} />
                       </div>
                       <p className="text-[10px] text-slate-500 font-mono">Probabilidade de rebaixamento exceder DME: 5.2%</p>
                    </div>
                 </div>
              </div>

            </div>
          ) : (
            <div className="h-[600px] flex flex-col items-center justify-center gap-4 text-slate-700">
               <LayoutDashboard size={64} />
               <p className="font-mono text-sm">Selecione um portfólio na barra lateral para detalhamento.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
