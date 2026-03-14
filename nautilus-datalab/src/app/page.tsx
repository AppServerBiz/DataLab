"use client";

import React, { useState } from 'react';
import FileDropZone from '@/components/Sandbox/FileDropZone';
import { Microscope, Database, LayoutDashboard, BrainCircuit } from 'lucide-react';
import { parseMT5Csv, ParseResult } from '@/lib/parsers';

export default function Home() {
  const [results, setResults] = useState<ParseResult[]>([]);

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      if (file.name.endsWith('.csv')) {
        // MT5 CSVs are often UTF-16LE
        const arrayBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-16le');
        let text = decoder.decode(arrayBuffer);
        
        // If it doesn't look like MT5 (no <DATE>), try UTF-8
        if (!text.includes('<DATE>')) {
           text = new TextDecoder('utf-8').decode(arrayBuffer);
        }

        try {
          const result = await parseMT5Csv(text);
          setResults(prev => [...prev, result]);
        } catch (err) {
          console.error("Erro ao ler MT5:", err);
        }
      }
    }
  };

  return (
    <main className="min-h-screen p-8 bg-[#05070a]">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-nautilus-accent rounded-xl shadow-[0_0_20px_rgba(0,242,255,0.4)]">
            <Microscope className="text-nautilus-dark" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white">
              NAUTILUS <span className="text-nautilus-accent">DATALAB</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium tracking-wide">CAIXA DE AREIA & DOCUMENTAÇÃO</p>
          </div>
        </div>

        <nav className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
            <LayoutDashboard size={20} className="group-hover:text-nautilus-accent" />
            <span className="text-sm font-semibold">Dashboard</span>
          </button>
          <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
            <BrainCircuit size={20} className="group-hover:text-nautilus-accent" />
            <span className="text-sm font-semibold">Sandbox</span>
          </button>
          <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
            <Database size={20} className="group-hover:text-nautilus-accent" />
            <span className="text-sm font-semibold">Portfólio</span>
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto mb-20 text-center">
        <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
          O laboratório oficial dos <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-nautilus-accent to-nautilus-success">Robôs Nautilus</span>
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Suba seus relatórios do MT5, SQX ou QA para análise profunda, 
          comparação de estratégias e documentação automática para o portfólio.
        </p>
      </section>

      {/* Sandbox Entry */}
      <section className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-12">
          <FileDropZone onFilesProcessed={handleFiles} />

          {/* Results Area */}
          {results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((res, i) => (
                <div key={i} className="glass-card p-6 border-nautilus-accent/20">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-lg text-white">{res.robotName}</h4>
                    <span className="px-2 py-1 bg-nautilus-accent/10 text-nautilus-accent text-[10px] rounded border border-nautilus-accent/20">MT5 CSV</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-900/50 rounded-lg">
                      <p className="text-[10px] text-slate-500 uppercase">Lucro Total</p>
                      <p className="text-lg font-bold text-nautilus-success">${res.stats.totalProfit.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-lg">
                      <p className="text-[10px] text-slate-500 uppercase">Max Drawdown</p>
                      <p className="text-lg font-bold text-nautilus-danger">${res.stats.maxDrawdown.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800">
                     <p className="text-[10px] text-slate-500 mb-2">PROGRESSO DA EQUITY</p>
                     <div className="h-24 w-full bg-slate-800/30 rounded flex items-end gap-[1px]">
                        {res.metrics.filter((_, idx) => idx % Math.ceil(res.metrics.length / 50) === 0).map((m, idx) => (
                          <div 
                            key={idx} 
                            style={{ height: `${Math.max(10, (m.balance / res.stats.initialBalance) * 50)}%` }}
                            className="flex-1 bg-nautilus-accent/40 rounded-t-[1px]"
                          />
                        ))}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
