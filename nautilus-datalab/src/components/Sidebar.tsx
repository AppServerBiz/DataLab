"use client";

import React, { useState } from 'react';
import { LayoutDashboard, BrainCircuit, Database, Settings, ChevronLeft, ChevronRight, Microscope } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { id: 'dashboard', label: 'Monitor Dashboard', icon: LayoutDashboard, href: '/dashboard', active: pathname === '/dashboard' },
    { id: 'sandbox', label: 'Forensic Sandbox', icon: BrainCircuit, href: '/', active: pathname === '/' },
    { id: 'estrutura', label: 'Asset Estrutura', icon: Microscope, href: '/estrutura', active: pathname === '/estrutura' },
    { id: 'portfolio', label: 'Portfolio Engine', icon: Database, href: '/portfolio', active: pathname === '/portfolio' },
  ];

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-nautilus-obsidian border-r border-white/5 transition-all duration-500 z-50 flex flex-col group/sidebar ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="absolute inset-0 noise-overlay opacity-[0.03]" />
      
      <div className="p-8 mb-12 flex items-center gap-4 overflow-hidden relative">
        <div className="min-w-[48px] h-12 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover/sidebar:scale-110 transition-transform duration-500">
          <Microscope size={24} className="text-nautilus-dark" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter text-white leading-none font-sans">
              NAUTILUS <span className="text-nautilus-blue">AI</span>
            </span>
            <span className="text-[8px] font-black tracking-[0.4em] text-slate-500 uppercase mt-1 font-mono">Terminal v2.0</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-6 space-y-3 relative">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            href={item.href || '#'}
            className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group/link overflow-hidden relative ${
              item.active 
                ? 'bg-white/5 text-white border border-white/10 shadow-2xl' 
                : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            {item.active && (
              <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-nautilus-blue rounded-r-full shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
            )}
            
            <item.icon size={20} className={`${item.active ? 'text-nautilus-blue' : 'group-hover/link:text-nautilus-blue'} transition-colors duration-300`} />
            
            {!collapsed && (
              <span className="text-[11px] font-black uppercase tracking-[0.15em] font-sans">{item.label}</span>
            )}
            
            {!collapsed && item.active && (
              <div className="ml-auto w-1 h-1 rounded-full bg-nautilus-blue" />
            )}
          </Link>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5 relative bg-nautilus-dark/50">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-3 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all duration-300 border border-transparent hover:border-white/5"
        >
          {collapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-3"><ChevronLeft size={20} /><span className="text-[9px] font-black uppercase tracking-[0.2em] font-mono">Minimize System</span></div>}
        </button>
      </div>
    </aside>
  );
}
