import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import {
  fetchPortfolios, createPortfolio, updatePortfolio, deletePortfolio,
  fetchRobots, addRobotToPortfolio, updateRobotWeight, removeRobotFromPortfolio,
  fetchPortfolioStats, getExportPortfolioUrl
} from '../api';
import {
  TrendingUp, TrendingDown, Activity, DollarSign,
  RefreshCw, Edit2, Trash2, Check, X, FolderOpen, Plus, Loader, BarChart2,
  Lock, Unlock, Download, Printer
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler, BarElement, ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const fmt = (v: any, d = 2) => {
  const n = Number(v);
  if (v === null || v === undefined || isNaN(n) || (n === 0 && !v && v !== 0 && v !== '0')) return '—';
  return n.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
const fmtCurrency = (v: number) => `$${fmt(v)}`;
const fmtPct = (v: number) => `${fmt(v)}%`;

// Color for correlation values
const corrColor = (v: number) => {
  if (v >= 0.7) return 'rgba(239,68,68,0.7)';
  if (v >= 0.4) return 'rgba(245,158,11,0.5)';
  if (v >= 0.1) return 'rgba(148,163,184,0.3)';
  if (v >= -0.1) return 'rgba(34,197,94,0.2)';
  return 'rgba(34,197,94,0.5)';
};
const corrTextColor = (v: number) => v >= 0.4 ? '#fff' : '#94A3B8';

const ROBOT_COLORS = [
  '#38BDF8', '#22C55E', '#F59E0B', '#EF4444', '#A855F7', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#0EA5E9', '#10B981', '#D946EF', '#F43F5E', '#8B5CF6'
];

// ─── New Portfolio Modal ───────────────────────────────────
const PortfolioFormModal = ({ existing, onClose, onSave }: any) => {
  const [name, setName] = useState(existing?.name ?? '');
  const [capital, setCapital] = useState(existing?.capital ?? 30000);
  const [targetDd, setTargetDd] = useState(existing?.target_dd ?? 5000);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return alert('Nome do portfólio é obrigatório!');
    setSaving(true);
    try {
      await onSave({ name: name.trim(), capital: Number(capital), target_dd: Number(targetDd) });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#13171F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '1.8rem' }}>
        <h2 style={{ margin: '0 0 1.5rem', color: '#fff', fontSize: '1rem' }}>{existing ? 'Editar Portfólio' : 'Novo Portfólio'}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Nome do Fundo
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: '0.4rem', background: 'var(--bg-main)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: '#fff', fontSize: '0.9rem' }}
              placeholder="Ex: ALPHA1 GOLD" />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Capital do Fundo ($)
              <input type="number" value={capital} onChange={e => setCapital(e.target.value)}
                style={{ display: 'block', width: '100%', marginTop: '0.4rem', background: 'var(--bg-main)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: '#fff', fontSize: '0.9rem' }} />
            </label>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              DD Alvo do Portfólio ($)
              <input type="number" value={targetDd} onChange={e => setTargetDd(e.target.value)}
                style={{ display: 'block', width: '100%', marginTop: '0.4rem', background: 'var(--bg-main)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: '#fff', fontSize: '0.9rem' }} />
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }} onClick={onClose}>Cancelar</button>
          <button className="btn btn-success" onClick={handleSave} disabled={saving}>
            {saving ? '...' : <><Check size={14} /> {existing ? 'Salvar' : 'Criar Portfólio'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Available Robots Sidebar (Internal to PortfolioDetail) ────────
const AvailableRobotsList = ({ existingIds }: { existingIds: string[] }) => {
  const [robots, setRobots] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRobots().then(data => {
      setRobots(data.filter((r: any) => !existingIds.includes(r.id) && r.status === 'approved'));
      setLoading(false);
    });
  }, [existingIds]);

  const filtered = robots.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.asset.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ width: '280px', background: 'rgba(255,255,255,0.02)', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', position: 'sticky', top: '20px' }}>
      <div style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1px' }}>Robôs Disponíveis</h3>
        <input
          type="text"
          placeholder="Buscar robô..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem 0.7rem', color: '#fff', fontSize: '0.8rem' }}
        />
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>💡 Arraste para a tabela</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.8rem' }}>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem' }}><Loader size={16} className="spin" /></div> :
         filtered.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Nenhum robô encontrado</div> :
         filtered.map(r => (
          <div
            key={r.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('robotId', r.id)}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '0.8rem',
              marginBottom: '0.6rem',
              cursor: 'grab',
              transition: 'transform 0.2s, border-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
          >
            <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.2rem' }}>{r.name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              <span>{r.asset}</span>
              <span style={{ color: 'var(--accent-red)' }}>DD: {fmtCurrency(r.max_dd_from_csv || r.max_dd_equity)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Portfolio Detail View ─────────────────────────────────
const PortfolioDetail = ({ portfolio, onBack, onRefreshList }: any) => {
  const [localPortfolio, setLocalPortfolio] = useState(portfolio);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingWeight, setEditingWeight] = useState<string | null>(null);
  const [weightVal, setWeightVal] = useState<number>(1);
  const [showEditPortfolio, setShowEditPortfolio] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [confirmDeleteRobot, setConfirmDeleteRobot] = useState<{ id: string, name: string } | null>(null);
  const [locking, setLocking] = useState(false);

  useEffect(() => { setLocalPortfolio(portfolio); }, [portfolio]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try { setStats(await fetchPortfolioStats(portfolio.id)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [portfolio.id]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleWeightSave = async (robotId: string) => {
    await updateRobotWeight(portfolio.id, robotId, weightVal);
    setEditingWeight(null);
    loadStats();
  };

  const handleRemoveRobot = async (robotId: string, name: string) => {
    setConfirmDeleteRobot({ id: robotId, name });
  };

  const confirmRemoveRobot = async () => {
    if (!confirmDeleteRobot) return;

    if (portfolio.locked) {
      alert('Este portfólio está TRAVADO. Destrave-o nas configurações acima para poder excluir robôs.');
      return;
    }

    try {
      await removeRobotFromPortfolio(portfolio.id, confirmDeleteRobot.id);
      loadStats();
    } catch (err: any) {
      alert(`Erro ao remover robô: ${err.message || String(err)}`);
    } finally {
      setConfirmDeleteRobot(null);
    }
  };

  const toggleLock = async () => {
    const isLocking = !localPortfolio.locked;
    if (!window.confirm(`Confirma ${isLocking ? 'TRAVAR' : 'DESTRAVAR'} este portfólio?`)) return;
    
    setLocking(true);
    try {
      await updatePortfolio(localPortfolio.id, { ...localPortfolio, locked: isLocking });
      setLocalPortfolio(prev => ({ ...prev, locked: isLocking }));
      window.dispatchEvent(new CustomEvent('portfolioUpdated'));
      if (onRefreshList) onRefreshList();
      loadStats();
    } catch (err: any) {
      alert('Erro ao atualizar trava: ' + (err.response?.data?.error || String(err)));
    } finally {
      setLocking(false);
    }
  };

  const handleEditPortfolio = async (data: any) => {
    await updatePortfolio(portfolio.id, data);
    onRefreshList();
    loadStats();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const robotId = e.dataTransfer.getData('robotId');
    if (!robotId) return;
    try {
      await addRobotToPortfolio(portfolio.id, robotId, 1);
      loadStats();
    } catch (err) {
      alert('Erro ao adicionar robô: ' + String(err));
    }
  };

  const totals = stats?.totals;
  const corr = stats?.correlation;
  const robots = stats?.robots ?? [];
  const existingRobotIds = robots.map((r: any) => r.robot_id);

  const btnCommonStyle: any = {
    fontSize: '0.65rem',
    width: '135px',
    height: '34px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0',
    gap: '0.4rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    borderRadius: '8px',
    whiteSpace: 'nowrap'
  };

  // Helper for Print-Ready Chart Options
  const getPrintChartOptions = (originalOptions: any) => ({
    ...originalOptions,
    plugins: {
      ...originalOptions.plugins,
      legend: { 
        ...originalOptions.plugins?.legend, 
        labels: { ...originalOptions.plugins?.legend?.labels, color: '#000', font: { size: 10, weight: 'bold' } } 
      }
    },
    scales: originalOptions.scales ? Object.fromEntries(
      Object.entries(originalOptions.scales).map(([key, scale]: any) => [
        key,
        {
          ...scale,
          grid: { ...scale.grid, color: '#f0f0f0', drawBorder: true },
          border: { display: true, color: '#000', width: 2 },
          ticks: { ...scale.ticks, color: '#000', font: { size: 10, weight: '500' } }
        }
      ])
    ) : {
      x: { border: { display: true, color: '#000' }, ticks: { color: '#000' } },
      y: { border: { display: true, color: '#000' }, ticks: { color: '#000' } }
    }
  });

  const handleDownloadPDF = async () => {
    // Salvar dados no localStorage para a nova aba
    const reportData = {
      portfolio: localPortfolio,
      stats: stats
    };
    localStorage.setItem('portfolio_report_data', JSON.stringify(reportData));
    
    // Abrir o relatório em nova aba
    window.open('/portfolio-report', '_blank');
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }} data-date={new Date().toLocaleDateString()}>
      <div style={{ flex: 1 }}>
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '1.8rem' }}>
          <div>
            <button className="btn" style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', marginBottom: '0.6rem' }} onClick={onBack}>← Voltar</button>
            <h1 className="section-title" style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800' }}>{localPortfolio.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0.4rem 0 0', opacity: 0.9 }}>
              Capital: <strong style={{ color: 'var(--accent-green)', fontSize: '1.2rem' }}>{fmtCurrency(localPortfolio.capital)}</strong> · DD Alvo: <strong style={{ color: 'var(--accent-red)', fontSize: '1.2rem' }}>{fmtCurrency(localPortfolio.target_dd)}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button 
              className="btn" 
              style={{ ...btnCommonStyle, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }} 
              onClick={loadStats}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} /> {loading ? 'Sincronizando...' : 'Atualizar'}
            </button>
            <button 
              className="btn" 
              style={{ 
                ...btnCommonStyle,
                background: localPortfolio.locked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)', 
                color: localPortfolio.locked ? 'var(--accent-red)' : 'var(--text-muted)',
                border: localPortfolio.locked ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.1)'
              }} 
              onClick={toggleLock}
              disabled={locking}
            >
              {localPortfolio.locked ? <><Unlock size={13} /> DESTRAVAR</> : <><Lock size={13} /> TRAVAR</>}
            </button>
            <button 
              className="btn" 
              style={{ ...btnCommonStyle, background: 'rgba(56,189,248,0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(56,189,248,0.2)' }} 
              onClick={() => setShowEditPortfolio(true)}
            >
              <Edit2 size={13} /> Editar Fundo
            </button>
            <a 
              href={getExportPortfolioUrl(portfolio.id)} 
              className="btn" 
              style={{ 
                ...btnCommonStyle,
                background: 'rgba(34,197,94,0.1)', 
                color: 'var(--accent-green)', 
                border: '1px solid rgba(34,197,94,0.2)',
                textDecoration: 'none'
              }}
              download
            >
              <Download size={13} /> Exportar p/ Nautilus
            </a>
            <button 
              className="btn" 
              style={{ 
                ...btnCommonStyle,
                background: 'rgba(56,189,248,0.1)', 
                color: 'var(--accent-blue)', 
                border: '1px solid rgba(56,189,248,0.2)'
              }} 
              onClick={handleDownloadPDF}
            >
              <BarChart2 size={13} /> Relatório
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-muted)' }}>
            <Loader size={32} className="spin" style={{ marginBottom: '1rem' }} />
            <p>Calculando métricas do portfólio...</p>
          </div>
        ) : (
          <div id="portfolio-report">
            {/* Print Only Header */}
            <div className="print-header" style={{ display: 'none', marginBottom: '1.5rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>
               <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#000', fontWeight: '800' }}>DATA_LAB Nautilus — Portfólio</h1>
               <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#333' }}>{localPortfolio.name} · Relatório Gerencial · Gerado em: {new Date().toLocaleString('pt-BR')}</p>
            </div>

            {/* Stats Summary Cards */}
            {totals && (
              <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1.8rem' }}>
                {[
                  { label: 'LUCRO MÊS', value: fmtCurrency(totals.lucroMes || 0), icon: <TrendingUp size={16} />, color: 'var(--accent-green)', bg: 'rgba(34,197,94,0.08)' },
                  { label: 'ROI MÊS', value: fmtPct(totals.roiMes || 0), icon: <BarChart2 size={16} />, color: 'var(--accent-green)', bg: 'rgba(34,197,94,0.08)' },
                  { label: 'DD MAX PORTF.', value: fmtCurrency(totals.ddMaxPortfolio || 0), icon: <TrendingDown size={16} />, color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.08)', note: 'Sum (Day DD)' },
                  { label: 'DD MAX %', value: fmtPct(totals.ddMaxPct || 0), icon: <TrendingDown size={16} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
                  { label: 'DD MAX SOMA $', value: fmtCurrency(robots.reduce((s: any, r: any) => s + Number(r.max_dd_from_csv || r.max_dd_equity || 0) * r.weight, 0)), icon: <DollarSign size={16} />, color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.08)' },
                  { label: 'DD MAX SOMA %', value: fmtPct(robots.reduce((s: any, r: any) => s + Number(r.max_dd_from_csv || r.max_dd_equity || 0) * r.weight, 0) / portfolio.capital * 100), icon: <TrendingDown size={16} />, color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.08)', note: 'Soma Individual' },
                  {
                    label: 'DME',
                    value: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {fmtCurrency(totals.dme || 0)}
                        <button className="no-print btn" style={{ padding: '0.1rem', fontSize: '0.5rem', opacity: 0.5 }} onClick={() => {
                          const val = prompt('Digite o valor do DME manual:', String(totals.dme));
                          if (val !== null) updatePortfolio(portfolio.id, { ...portfolio, manual_dme: Number(val) }).then(loadStats);
                        }}><Edit2 size={10} /></button>
                      </div>
                    ),
                    icon: <Activity size={16} />, color: 'var(--accent-blue)', bg: 'rgba(56,189,248,0.08)'
                  },
                  { label: 'VAR 95%', value: `${fmtCurrency((totals.var95 || 0) / 100 * portfolio.capital)} - ${fmtPct(totals.var95 || 0)}`, icon: <DollarSign size={16} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', note: '95% Prob. DD' },
                  { label: 'LL/DD FATOR', value: fmt(totals.llDdPct || 0) + '%', icon: <Activity size={16} />, color: 'var(--accent-green)', bg: 'rgba(34,197,94,0.05)' },
                  { label: 'TOTAL TRADES', value: String(robots.reduce((s: any, r: any) => s + Number(r.total_trades || 0), 0)), icon: <Activity size={16} />, color: 'var(--accent-blue)', bg: 'rgba(56,189,248,0.05)' },
                  { label: 'SOMA LOTES', value: fmt(robots.reduce((s: any, r: any) => s + Number(r.total_lots || 0), 0), 2), icon: <Activity size={16} />, color: 'var(--accent-blue)', bg: 'rgba(56,189,248,0.05)' },
                  { label: 'LOTES MÊS', value: fmt(robots.reduce((s: any, r: any) => s + Number(r.lots_per_month || 0), 0), 2), icon: <Activity size={16} />, color: 'var(--accent-blue)', bg: 'rgba(56,189,248,0.05)' },
                ].map(s => (
                  <div key={s.label} className="metric-card" style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: '10px', padding: '1rem' }}>
                    <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: s.color, marginBottom: '0.5rem', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                      {s.icon} {s.label}
                    </div>
                    <div className="metric-value" style={{ color: '#fff', fontWeight: '800', fontSize: '1.2rem' }}>{s.value}</div>
                    {s.note && <div className="metric-note" style={{ color: 'var(--text-muted)', fontSize: '0.6rem', marginTop: '0.2rem' }}>{s.note}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Robots Table Area (Drop Zone) */}
            <div
              onDragOver={e => { e.preventDefault(); setIsOver(true); }}
              onDragLeave={() => setIsOver(false)}
              onDrop={handleDrop}
              style={{
                position: 'relative',
                borderRadius: '12px',
                border: isOver ? '2px dashed var(--accent-blue)' : '2px solid transparent',
                background: isOver ? 'rgba(56,189,248,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {robots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                  <FolderOpen size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>Portfólio vazio. Arraste robôs da barra lateral para cá.</p>
                </div>
              ) : (
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                  <table className="oakmont-table" style={{ fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '0.8rem' }}>ROBÔ</th>
                        <th>ATIVO</th>
                        <th>PESO LOTE</th>
                        <th style={{ color: 'var(--accent-red)' }}>DD × PESO</th>
                        <th style={{ color: 'var(--accent-green)' }}>LUCRO × PESO</th>
                        <th style={{ color: '#F59E0B' }}>VAR DME</th>
                        <th style={{ color: '#F59E0B' }}>F. CORREL.</th>
                        <th style={{ color: 'var(--accent-blue)' }}>LL/DD %</th>
                        <th>RETORNO %</th>
                        <th>AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {robots.map((r: any, idx: number) => (
                        <tr className="oakmont-row" key={idx}>
                          <td style={{ padding: '0.6rem 0.8rem', fontWeight: '700', color: 'var(--accent-blue)' }}>
                            {r.name && r.name.length > 40 ? r.name.slice(0, 37) + '...' : r.name}
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{r.asset}<br/>{r.timeframe}</td>
                          <td>
                            {editingWeight === r.robot_id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <input type="number" min="1" max="100" step="1" value={weightVal}
                                  onChange={e => setWeightVal(Number(e.target.value))}
                                  style={{ width: '60px', background: 'var(--bg-main)', border: '1px solid var(--accent-blue)', borderRadius: '4px', padding: '0.2rem 0.4rem', color: '#fff', fontSize: '0.85rem' }}
                                  autoFocus />
                                <button className="btn btn-success" style={{ padding: '0.2rem 0.4rem' }} onClick={() => handleWeightSave(r.robot_id)}><Check size={11} /></button>
                                <button className="btn" style={{ padding: '0.2rem 0.4rem', color: 'var(--text-muted)' }} onClick={() => setEditingWeight(null)}><X size={11} /></button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontWeight: '800', color: '#fff', fontSize: '1rem' }}>{r.weight}×</span>
                                <button className="btn" style={{ padding: '0.15rem 0.3rem', fontSize: '0.6rem', color: 'var(--accent-blue)', background: 'rgba(56,189,248,0.08)' }}
                                  onClick={() => { setEditingWeight(r.robot_id); setWeightVal(r.weight); }}>
                                  <Edit2 size={10} />
                                </button>
                              </div>
                            )}
                          </td>
                           <td style={{ color: 'var(--accent-red)', fontWeight: '700' }}>{fmtCurrency((r.max_dd_from_csv || r.max_dd_equity || 0) * r.weight)}</td>
                           <td style={{ color: 'var(--accent-green)', fontWeight: '700' }}>{fmtCurrency(r.avg_profit_per_month * r.weight)}</td>
                           <td style={{ color: '#F59E0B', fontWeight: '800' }}>
                             {fmt((r.var_95_dd_cap * r.initial_deposit * r.weight / (totals?.dme || portfolio.capital || 1)) * 100)}%
                           </td>
                           <td style={{ color: '#F59E0B', fontWeight: '800' }}>
                             {(() => {
                               if (!corr || !corr[r.name]) return '0%';
                               const values = Object.values(corr[r.name]).filter((v: any, i) => Object.keys(corr[r.name])[i] !== r.name);
                               if (values.length === 0) return '0%';
                               const avg = values.reduce((s: any, v: any) => s + Math.abs(v), 0) / values.length;
                               return fmt(avg * 100, 0) + '%';
                             })()}
                           </td>
                           <td style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>{fmt(r.ll_dd_pct)}%</td>
                           <td style={{ color: 'var(--accent-green)', fontSize: '0.75rem', fontWeight: '800' }}>{fmtPct(r.avg_profit_per_month * r.weight / (portfolio.capital || 1) * 100)}</td>
                          <td>
                            <button className="btn btn-danger"
                              style={{ padding: '0.3rem 0.5rem', opacity: portfolio.locked ? 0.3 : 1 }}
                              onClick={(e) => { e.stopPropagation(); if (!portfolio.locked) handleRemoveRobot(r.robot_id, r.name); }}
                              disabled={portfolio.locked}
                              title={portfolio.locked ? "Portfólio Travado (destrave para excluir)" : "Remover do Portfólio"}
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Charts Area */}
            {stats?.combined_curve && (
              <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr', gap: '1.2rem' }}>
                <div className="card chart-row" style={{ padding: '1.2rem', height: '320px' }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Curva de Saldo Fechado (Consolidado) ($)</h3>
                  <div style={{ height: '240px' }}>
                    <Line 
                      data={{ 
                        labels: (stats?.combined_curve || []).map((c: any) => c.day), 
                         datasets: [{ label: 'Saldo Fechado', data: (stats?.combined_curve || []).map((c: any) => portfolio.capital + (c.balanceProfit || 0)), borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.05)', fill: true, pointRadius: 0, borderWidth: 2 }] 
                       }} 
                       options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 12, color: '#64748B', font: { size: 9 } }, grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748B', font: { size: 9 }, callback: (v: any) => fmtCurrency(v as number) } } } }}
                    />
                  </div>
                </div>
                <div className="print-spacer" style={{ height: '3rem', display: 'none' }}></div>

                <div className="card chart-row" style={{ padding: '1.2rem', height: '320px' }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Curva Individual por Robô (Saldo Fechado) ($)</h3>
                  <div style={{ height: '240px' }}>
                    <Line 
                      data={{ 
                        labels: (stats?.combined_curve || []).map((c: any) => c.day), 
                        datasets: [
                          ...Object.entries(stats?.robot_curves || {}).map(([name, curve]: any, idx: number) => ({
                            label: (name || 'Robô').length > 20 ? (name || 'Robô').slice(0, 18) + '..' : (name || 'Robô'),
                            data: Array.isArray(curve) ? curve.map((pt: any) => (pt?.balanceProfit || 0) + (portfolio.capital / (robots?.length || 1))) : [], 
                            borderColor: ROBOT_COLORS[idx % ROBOT_COLORS.length],
                            borderWidth: 1.2,
                            pointRadius: 0,
                            fill: false
                          }))
                        ]
                      }} 
                       options={{ maintainAspectRatio: false, plugins: { legend: { display: (robots?.length || 0) <= 10, position: 'right' as any, labels: { color: '#64748B', font: { size: 8 }, boxWidth: 10 } } }, scales: { x: { ticks: { maxTicksLimit: 12, color: '#64748B', font: { size: 9 } }, grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748B', font: { size: 9 }, callback: (v: any) => fmtCurrency(v as number) } } } }}
                    />
                  </div>
                </div>
                <div className="print-spacer" style={{ height: '3rem', display: 'none' }}></div>

                <div className="card chart-row" style={{ padding: '1.2rem', height: '280px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                     <h3 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Exposição (Drawdown) em Tempo Real ($)</h3>
                     <span title="Diferença: Séries mensais usam apenas fechamentos de mês. O Real-time captura todas as oscilações intra-dia do histórico do relatório." style={{ cursor: 'help', fontSize: '0.6rem', color: 'var(--accent-blue)', textDecoration: 'underline' }}>Diferença entre Real-time e Mensal</span>
                   </div>
                   <div style={{ height: '200px' }}>
                     <Line 
                       data={{ 
                         labels: (stats?.combined_curve || []).map((c: any) => c.day), 
                         datasets: [{ label: 'Drawdown', data: (stats?.combined_curve || []).map((c: any) => -(c.dd || 0)), borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, pointRadius: 0, borderWidth: 1.5 }] 
                       }} 
                       options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 12, color: '#64748B', font: { size: 9 } }, grid: { display: false } }, y: { max: 0, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748B', font: { size: 9 } } } } }}
                     />
                   </div>
                </div>
                <div className="print-spacer" style={{ height: '3rem', display: 'none' }}></div>

                <div className="card chart-row" style={{ padding: '1.2rem', height: '320px' }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Drawdown Individual por Robô ($)</h3>
                  <div style={{ height: '240px' }}>
                    <Line 
                      data={{
                        labels: (stats?.combined_curve || []).map((c: any) => c.day),
                        datasets: Object.entries(stats?.robot_curves || {}).map(([name, curve]: any, idx: number) => ({
                          label: (name || 'Robô').length > 15 ? (name || 'Robô').slice(0, 13) + '..' : (name || 'Robô'),
                          data: Array.isArray(curve) ? curve.map((pt: any) => -(pt.dd || 0)) : [],
                          borderColor: ROBOT_COLORS[idx % ROBOT_COLORS.length],
                          borderWidth: 1.2,
                          pointRadius: 0,
                          fill: false
                        }))
                      }}
                       options={{ maintainAspectRatio: false, plugins: { legend: { display: (robots?.length || 0) <= 10, position: 'right' as any, labels: { color: '#64748B', font: { size: 8 }, boxWidth: 10 } } }, scales: { x: { ticks: { maxTicksLimit: 12, color: '#64748B', font: { size: 9 } }, grid: { display: false } }, y: { max: 0, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748B', font: { size: 9 }, callback: (v: any) => fmtCurrency(v as number) } } } }}
                    />
                  </div>
                </div>
                <div className="print-spacer" style={{ height: '3rem', display: 'none' }}></div>


                <div className="card" style={{ padding: '1.2rem' }}>
                  <h3 style={{ margin: '0 0 1.2rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Top 10 Maiores Drawdowns (Por Robô)</h3>
                  <div style={{ height: '320px' }}>
                    <Bar 
                      data={{
                        labels: (stats?.top10DD || []).map((d: any) => d.day),
                        datasets: (robots || []).map((r: any, idx: number) => ({
                          label: (r.name || 'Robô').length > 15 ? (r.name || 'Robô').slice(0, 13) + '..' : (r.name || 'Robô'),
                          data: (stats.top10DD || []).map((d: any) => d[r.name] || 0),
                          backgroundColor: ROBOT_COLORS[idx % ROBOT_COLORS.length] + '99',
                          borderColor: ROBOT_COLORS[idx % ROBOT_COLORS.length],
                          borderWidth: 1,
                          stack: 'Stack 0'
                        }))
                      }}
                      options={{
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                          legend: { position: 'bottom' as any, labels: { color: '#64748B', font: { size: 8 }, boxWidth: 10 } },
                          tooltip: {
                            callbacks: {
                              label: (context: any) => {
                                const val = context.raw;
                                return ` ${context.dataset.label}: ${fmtCurrency(val)}`;
                              }
                            }
                          }
                        },
                        scales: {
                          x: { stacked: true, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748B', font: { size: 9 } } },
                          y: { stacked: true, grid: { display: false }, ticks: { color: '#64748B', font: { size: 9 } } }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="flex-between chart-row" style={{ gap: '1.2rem', flexWrap: 'wrap' }}>
                  <div className="card" style={{ padding: '1.2rem', flex: 1, minWidth: '300px' }}>
                    <h3 style={{ margin: '0 0 1.2rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Top 10 Robôs por Lucro Total ($)</h3>
                    <div style={{ height: '320px' }}>
                      <Bar 
                        data={{
                          labels: [...robots].sort((a,b) => (b.avg_profit_per_month * b.weight) - (a.avg_profit_per_month * a.weight)).slice(0, 10).map(r => (r.name || '').length > 15 ? (r.name || '').slice(0,13)+'..' : (r.name || '')),
                          datasets: [{
                            label: 'Lucro Total Estimado',
                            data: [...robots].sort((a,b) => (b.avg_profit_per_month * b.weight) - (a.avg_profit_per_month * a.weight)).slice(0, 10).map(r => r.avg_profit_per_month * r.weight),
                            backgroundColor: ROBOT_COLORS.map(c => c + '99'),
                            borderColor: ROBOT_COLORS.map(c => c),
                            borderWidth: 1
                          }]
                        }}
                        options={{
                          maintainAspectRatio: false,
                          indexAxis: 'x', /* Vertical Bars */
                          plugins: { legend: { display: false } },
                          scales: {
                            x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 9 } } },
                            y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748B', font: { size: 9 } } }
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="card" style={{ padding: '1.2rem', flex: 1, minWidth: '300px' }}>
                    <h3 style={{ margin: '0 0 1.2rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Distribuição de Lucro (%)</h3>
                    <div style={{ height: '320px', display: 'flex', justifyContent: 'center' }}>
                      <Pie 
                         data={{
                           labels: [...robots].sort((a,b) => (b.avg_profit_per_month * b.weight) - (a.avg_profit_per_month * a.weight)).slice(0, 10).map(r => r.name),
                           datasets: [{
                             data: [...robots].sort((a,b) => (b.avg_profit_per_month * b.weight) - (a.avg_profit_per_month * a.weight)).slice(0, 10).map(r => Math.max(0, r.avg_profit_per_month * r.weight)),
                             backgroundColor: ROBOT_COLORS.slice(0, 10).map(c => c + 'BB'),
                             borderColor: 'rgba(0,0,0,0.1)',
                             borderWidth: 1
                           }]
                         }}
                         options={{
                           maintainAspectRatio: false,
                           plugins: { 
                             legend: { position: 'right' as any, labels: { color: '#64748B', font: { size: 10 }, boxWidth: 10 } } 
                           }
                         }}
                      />
                    </div>
                  </div>
                </div>
                <div className="print-spacer" style={{ height: '3rem', display: 'none' }}></div>
              </div>
            )}

            {/* TTM Decision Quadrants (Last 12 Months) */}
            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.2rem' }}>
              <div className="card" style={{ padding: '1.2rem', border: '1px solid rgba(56,189,248,0.2)', background: 'linear-gradient(135deg, rgba(56,189,248,0.05) 0%, rgba(0,0,0,0) 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tomada de Decisão (Últimos 12 Meses)</h3>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                    RECENT WINDOW: {totals?.recent?.days || 0}d
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>ESTRATÉGIA</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>LUCRO</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>MAX DD</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>VAR 95%</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>LOTES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(totals?.robotRecent || {}).map(([name, r]: any) => (
                        <tr key={name} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '0.5rem', fontWeight: '700', color: '#fff' }}>{name.length > 20 ? name.slice(0, 18) + '..' : name}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: r.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: '700' }}>{fmtCurrency(r.profit)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--accent-red)' }}>{fmtCurrency(r.maxDD)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: '#F59E0B' }}>{fmtPct(r.var95)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>{fmt(r.lots, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card" style={{ padding: '1.2rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                <h3 style={{ margin: '0 0 1.2rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Comparativo: Recente vs Histórico</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', marginBottom: '0.4rem' }}>
                    <div style={{ flex: 1.2, fontSize: '0.6rem', color: 'var(--text-muted)' }}>MÉTRICA</div>
                    <div style={{ flex: 1, fontSize: '0.6rem', color: 'var(--accent-blue)', textAlign: 'right' }}>ÚLT. 12M</div>
                    <div style={{ flex: 1, fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'right' }}>RESTANTE PONDERADO</div>
                    <div style={{ flex: 1, fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'right' }}>RESTANTE SOMA</div>
                  </div>
                  {[
                    { label: 'Lucro Total', recent: totals?.recent?.profit, past: totals?.past?.weightedProfit, pastTotal: totals?.past?.profit, isCurrency: true },
                    { label: 'Número de Trades', recent: totals?.recent?.trades, past: totals?.past?.weightedTrades, pastTotal: totals?.past?.trades, isDecimal: true },
                    { label: 'Max Drawdown (Período)', recent: totals?.recent?.maxDD, past: totals?.past?.maxDD, pastTotal: totals?.past?.maxDD, isCurrency: true, isRisk: true },
                    { label: 'VaR 95% (Risco Prob.)', recent: totals?.recent?.var95, past: totals?.past?.var95, pastTotal: totals?.past?.var95, isPct: true, isRisk: true },
                    { label: 'Eficiência (L/DD)', recent: (totals?.recent?.profit / (totals?.recent?.maxDD || 1)) * 100, past: (totals?.past?.weightedProfit / (totals?.past?.maxDD || 1)) * 100, pastTotal: (totals?.past?.profit / (totals?.past?.maxDD || 1)) * 100, isPct: true }
                  ].map(m => (
                    <div key={m.label} style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ flex: 1.2, fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.label}</div>
                      <div style={{ flex: 1, textAlign: 'right', fontSize: '0.8rem', fontWeight: '800', color: m.isRisk ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                        {(m as any).isDecimal ? fmt(m.recent || 0, 0) : m.isCurrency ? fmtCurrency(m.recent || 0) : m.isPct ? fmtPct(m.recent || 0) : fmt(m.recent || 0)}
                      </div>
                      <div style={{ flex: 1, textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
                        {(m as any).isDecimal ? fmt(m.past || 0, 0) : m.isCurrency ? fmtCurrency(m.past || 0) : m.isPct ? fmtPct(m.past || 0) : fmt(m.past || 0)}
                      </div>
                      <div style={{ flex: 1, textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: 'rgba(255,255,255,0.3)' }}>
                        {m.pastTotal !== undefined ? ((m as any).isDecimal ? fmt(m.pastTotal, 0) : m.isPct ? fmtPct(m.pastTotal) : fmtCurrency(m.pastTotal)) : '—'}
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '0.5rem', padding: '0.8rem', background: 'rgba(56,189,248,0.05)', borderRadius: '6px', fontSize: '0.65rem', color: 'var(--accent-blue)', border: '1px solid rgba(56,189,248,0.1)' }}>
                    🎯 <strong>Análise:</strong> O "Restante Ponderado" normaliza o passado para uma janela de 12 meses, permitindo uma comparação justa de performance entre as épocas.
                    <br/><br/>
                    ⚠️ <strong>Nota:</strong> Cuidado ao analisar essas métricas, pois se algum robô tiver o backtest em datas diferentes no portfólio, pode haver dados imprecisos ou calculados como média para preencher lacunas.
                  </div>
                </div>
              </div>
            </div>

            {/* Correlation Matrix */}
            {corr && Object.keys(corr).length >= 2 && (
              <div className="card correlation-section" style={{ padding: '1.2rem', marginTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Matriz de Correlação Diária</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: '0.72rem', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '0.4rem 0.6rem' }}></th>
                        {Object.keys(corr).map(n => (
                          <th key={n} title={n} style={{ padding: '0.4rem 0.5rem', color: 'var(--accent-blue)', minWidth: '80px', textAlign: 'center', cursor: 'help' }}>
                            {n.length > 15 ? n.slice(0, 13) + '..' : n}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(corr).map(([rA, row]: any) => (
                        <tr key={rA}>
                          <td title={rA} style={{ padding: '0.4rem 0.6rem', color: 'var(--accent-blue)', fontWeight: '600', cursor: 'help' }}>
                            {rA.length > 15 ? rA.slice(0, 13) + '..' : rA}
                          </td>
                          {Object.entries(row).map(([rB, val]: any) => (
                            <td key={rB} style={{ padding: '0.4rem 0.5rem', textAlign: 'center', background: corrColor(val), color: corrTextColor(val), borderRadius: '3px', margin: '1px', border: '1px solid rgba(255,255,255,0.03)', fontWeight: '600' }}>
                              {val.toFixed(2)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AvailableRobotsList existingIds={existingRobotIds} />

      {showEditPortfolio && (
        <PortfolioFormModal
          existing={portfolio}
          onClose={() => setShowEditPortfolio(false)}
          onSave={handleEditPortfolio}
        />
      )}
      <ConfirmModal
        isOpen={!!confirmDeleteRobot}
        title="Remover Robô"
        message={`Deseja remover o robô "${confirmDeleteRobot?.name}" deste portfólio?`}
        onConfirm={confirmRemoveRobot}
        onCancel={() => setConfirmDeleteRobot(null)}
        confirmLabel="Remover"
      />

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
// ─── Portfolio List ────────────────────────────────────────
const Portfolio = () => {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeletePortfolio, setConfirmDeletePortfolio] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPortfolios(await fetchPortfolios()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: any) => {
    const portfolio = await createPortfolio(data);
    await load();
    navigate(`/portfolio/${portfolio.id}`);
  };

  const handleDeleteRequest = async (e: any, portfolio: any) => {
    e.stopPropagation();
    if (portfolio.locked) {
      alert('Este portfólio está TRAVADO. Abra o portfólio e destrave-o para poder excluir.');
      return;
    }
    setConfirmDeletePortfolio(portfolio);
  };

  const confirmDeletePortfolioAction = async () => {
    if (!confirmDeletePortfolio) return;
    try {
      await deletePortfolio(confirmDeletePortfolio.id);
      setConfirmDeletePortfolio(null);
      navigate('/portfolio');
      load();
    } catch (err: any) {
      alert(`Erro ao excluir portfólio: ${err.message || String(err)}`);
      setConfirmDeletePortfolio(null);
    }
  };

  // If URL has a portfolioId, find and open the detail directly
  const selectedPortfolio = portfolioId ? portfolios.find(p => p.id === portfolioId) : null;

  if (portfolioId && (selectedPortfolio || !loading)) {
    return (
      <PortfolioDetail
        portfolio={selectedPortfolio ?? { id: portfolioId, name: '...', capital: 0, target_dd: 0 }}
        onBack={() => navigate('/portfolio')}
        onRefreshList={load}
      />
    );
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.8rem' }}>
        <h1 className="section-title" style={{ margin: 0, fontSize: '1.2rem' }}>Portfólios</h1>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.8rem' }} onClick={load}><RefreshCw size={13} /> Atualizar</button>
          <button className="btn btn-success" style={{ fontSize: '0.8rem' }} onClick={() => setShowCreate(true)}><Plus size={14} /> Novo Portfólio</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-muted)' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p>Carregando portfólios...</p>
        </div>
      ) : portfolios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <FolderOpen size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p style={{ marginBottom: '1.5rem' }}>Nenhum portfólio criado ainda.</p>
          <button className="btn btn-success" onClick={() => setShowCreate(true)}><Plus size={14} /> Criar Primeiro Portfólio</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {portfolios.map(pf => (
            <div key={pf.id}
              style={{ background: '#13171F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.4rem', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
              onClick={() => navigate(`/portfolio/${pf.id}`)}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: 'var(--accent-blue)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '0.3rem', fontWeight: '600' }}>Fundo</div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {pf.name} {pf.locked && <Lock size={14} style={{ color: 'var(--accent-red)' }} />}
                  </h2>
                </div>
                <button className="btn btn-danger" style={{ padding: '0.3rem 0.4rem', zIndex: 2, opacity: pf.locked ? 0.3 : 1 }} onClick={e => handleDeleteRequest(e, pf)} title={pf.locked ? "Portfólio Travado" : "Excluir"}>
                  <Trash2 size={13} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem', marginTop: '1rem' }}>
                <div style={{ background: 'var(--bg-main)', borderRadius: '6px', padding: '0.6rem 0.8rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Capital</div>
                  <div style={{ color: 'var(--accent-green)', fontWeight: '700', fontSize: '0.9rem' }}>{fmtCurrency(pf.capital)}</div>
                </div>
                <div style={{ background: 'var(--bg-main)', borderRadius: '6px', padding: '0.6rem 0.8rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>DD Alvo</div>
                  <div style={{ color: 'var(--accent-red)', fontWeight: '700', fontSize: '0.9rem' }}>{fmtCurrency(pf.target_dd)}</div>
                </div>
              </div>
              <div style={{ marginTop: '0.8rem', color: 'var(--accent-blue)', fontSize: '0.72rem', textAlign: 'right', opacity: 0.7 }}>
                Clique para abrir → <FolderOpen size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <PortfolioFormModal onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}
      <ConfirmModal
        isOpen={!!confirmDeletePortfolio}
        title="Excluir Portfólio"
        message={`Deseja excluir o portfólio "${confirmDeletePortfolio?.name}"? Todas as alocações de robôs serão removidas.`}
        onConfirm={confirmDeletePortfolioAction}
        onCancel={() => setConfirmDeletePortfolio(null)}
        confirmLabel="Excluir Definitivamente"
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Portfolio;
