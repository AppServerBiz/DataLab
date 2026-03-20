"use client";

import React, { useEffect, useState } from 'react';
import { actionGetRobots } from '../actions';
import { RobotDB } from '@/lib/db';
import { Activity, LayoutGrid, CheckSquare, Square, ArrowRight, Table as TableIcon } from 'lucide-react';
import Link from 'next/link';

export default function EstruturaPage() {
  const [robots, setRobots] = useState<RobotDB[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await actionGetRobots();
      if (res.success && res.robots) {
        setRobots(res.robots);
      }
      setLoading(false);
    }
    load();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSendToPortfolio = () => {
    if (selectedIds.length === 0) return alert("Selecione ao menos um robô");
    const selectedRobots = robots.filter(r => selectedIds.includes(r.id));
    localStorage.setItem('nautilus_selection', JSON.stringify(selectedRobots));
    window.location.href = '/portfolio';
  };

  return (
    <main className="min-h-screen bg-nautilus-dark flex flex-col pt-12">
      <div className="absolute inset-0 mesh-gradient opacity-20 pointer-events-none" />
      
      <div className="max-w-[1600px] w-full mx-auto px-12 relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-end mb-12">
          <div className="flex flex-col">
            <h3 className="text-[10px] font-black text-nautilus-blue uppercase tracking-[0.5em] mb-4">Master Infrastructure</h3>
            <h2 className="text-5xl font-black text-white tracking-tighter mb-4">
              ESTRUTURA <span className="text-nautilus-emerald">DE ROBÔS</span>
            </h2>
            <p className="text-slate-500 text-[13px] font-mono leading-relaxed bg-white/5 p-4 border border-white/5 rounded-lg max-w-2xl">
              Página de gestão de ativos individuais. Selecione os robôs validados no Sandbox para construir seus portfólios no motor de composição.
            </p>
          </div>
          
          <button 
            onClick={handleSendToPortfolio}
            className="px-8 py-4 bg-nautilus-emerald text-dark-900 rounded-xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            Encaminhar para Portfólio ({selectedIds.length}) <ArrowRight size={16} />
          </button>
        </div>

        {/* Table View */}
        <div className="glass-card p-0 overflow-hidden border-white/5 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="p-6 w-16"></th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Robô / Estratégia</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Lucro Total</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Líquido</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Exposição</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Fator Lucro</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Win Rate</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Trades</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {robots.map((robot) => {
                  const isSelected = selectedIds.includes(robot.id);
                  const stats = robot.stats || {};
                  
                  return (
                    <tr 
                      key={robot.id} 
                      onClick={() => toggleSelect(robot.id)}
                      className={`group hover:bg-white/5 transition-colors cursor-pointer ${isSelected ? 'bg-nautilus-blue/5' : ''}`}
                    >
                      <td className="p-6 align-middle">
                        {isSelected ? (
                          <CheckSquare className="text-nautilus-blue" size={20} />
                        ) : (
                          <Square className="text-slate-700 group-hover:text-slate-500" size={20} />
                        )}
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-white group-hover:text-nautilus-blue transition-colors tracking-tight">
                            {robot.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">ID: {robot.id}</span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <span className={`font-mono text-sm font-bold text-white`}>
                          ${(stats.totalProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <span className={`font-mono text-sm font-bold ${stats.totalProfit >= 0 ? 'text-nautilus-emerald' : 'text-nautilus-crimson'}`}>
                          ${(stats.totalProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <span className="font-mono text-sm font-bold text-nautilus-crimson">
                          {((stats.maxDrawdownPct || 0)).toFixed(2)}%
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <span className="font-mono text-sm font-bold text-white">
                          {(stats.profitFactor || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <span className="font-mono text-sm font-bold text-white">
                          {(stats.winRate || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <span className="font-mono text-sm font-bold text-slate-400">
                          {stats.totalTrades || 0} EAs
                        </span>
                      </td>
                      <td className="p-6 text-right">
                         <div className="flex justify-end">
                            <span className="px-3 py-1 rounded-full bg-nautilus-emerald/10 text-nautilus-emerald text-[9px] font-black uppercase tracking-widest border border-nautilus-emerald/20">
                               Ativo
                            </span>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {robots.length === 0 && !loading && (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <LayoutGrid size={40} className="text-slate-700" />
                <p className="text-slate-500 font-mono text-sm">Nenhum robô encontrado. Envie robôs do Sandbox para começar.</p>
                <Link href="/" className="text-nautilus-blue text-xs font-black uppercase tracking-widest hover:underline">
                  Voltar ao Sandbox
                </Link>
              </div>
            )}
            {loading && (
              <div className="py-20 text-center animate-pulse">
                <p className="text-slate-500 font-mono text-sm">Carregando estrutura...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
