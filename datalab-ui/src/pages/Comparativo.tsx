import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { 
  fetchComparativo, approveRobot, deleteRobot, clearComparativo, 
  fetchEquityCurve, fetchRobotInfo, uploadFiles 
} from '../api';
import { 
  Check, X, TrendingDown, Info, Trash2, RefreshCw, 
  FileText, Table, UploadCloud, Loader, CheckCircle, AlertTriangle 
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const fmt = (v: number, decimals = 2) => {
  if (!v && v !== 0) return '—';
  return v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
const fmtCurrency = (v: number) => `$${fmt(v)}`;

const StatBox = ({ label, value, color }: any) => (
  <div style={{ background: 'var(--bg-main)', borderRadius: '8px', padding: '0.8rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
    <div style={{ color: 'var(--text-muted)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.3rem' }}>{label}</div>
    <div style={{ color, fontSize: '0.95rem', fontWeight: '800' }}>{value}</div>
  </div>
);

// ────────────────────────────── DD Modal ──────────────────────────────
export const DDModal = ({ robot, onClose }: { robot: any; onClose: () => void }) => {
  const [data, setData] = useState<any>(null);
  const [monthlyDD, setMonthlyDD] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [e, m] = await Promise.all([
          fetchEquityCurve(robot.id),
          axios.get(`http://127.0.0.1:3001/api/robot/${robot.id}/monthly-dd`).then(r => r.data)
        ]);
        setData(e);
        setMonthlyDD(m || []);
      } catch (err) {
        console.error('Error loading DD data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [robot.id]);

  const buildChartData = () => {
    if (!data?.equity_curve?.length) return null;
    const curve = data.equity_curve;
    const step = Math.max(1, Math.floor(curve.length / 500));
    const sampled = curve.filter((_: any, i: number) => i % step === 0);
    let peak = 0;
    const ddValue = sampled.map((p: any) => {
      if (p.equity > peak) peak = p.equity;
      return -(peak - p.equity);
    });
    return {
      labels: sampled.map((p: any) => p.timestamp.split(' ')[0]),
      equityData: sampled.map((p: any) => p.equity),
      ddData: ddValue,
    };
  };

  const chartData = data ? buildChartData() : null;

  const chartOptions = (title: string, isDD = false): any => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { labels: { color: '#94A3B8', font: { size: 9 } } },
      title: { display: true, text: title, color: '#E2E8F0', font: { size: 11 } },
      tooltip: { mode: 'index' as const, intersect: false, callbacks: { label: (c: any) => `${c.dataset.label}: ${isDD || c.dataset.label.includes('$') || c.dataset.label.includes('Equity') ? '$' : ''}${fmt(c.parsed.y)}${title.includes('%') ? '%' : ''}` } }
    },
    scales: {
      x: { ticks: { color: '#64748B', maxTicksLimit: 12, font: { size: 8 } }, grid: { color: 'rgba(255,255,255,0.02)' } },
      y: { ticks: { color: '#64748B', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,0.02)' }, ...(isDD ? { max: 0 } : {}) },
    },
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#13171F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', width: '100%', maxWidth: '1050px', maxHeight: '95vh', overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', letterSpacing: '0.5px' }}>Análise de Drawdown — {robot.name}</h2>
            <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Séries temporais e distribuição de risco mensal</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.8rem' }} onClick={() => window.open(`http://127.0.0.1:3001/api/robot/${robot.id}/download/csv`)}><Table size={13} /> CSV Original</button>
            <button className="btn btn-danger" onClick={onClose} style={{ fontSize: '0.8rem' }}><X size={13} /> Fechar</button>
          </div>
        </div>

        {!loading ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <StatBox label="Max DD Equity" value={fmtCurrency(robot.max_dd_equity)} color="var(--accent-red)" />
              <StatBox label="Max DD CSV" value={fmtCurrency(data?.max_dd_from_csv)} color="#F59E0B" />
              <StatBox label="Pontos Totais" value={String(data?.equity_curve?.length || 0)} color="var(--accent-blue)" />
              <StatBox label="Período" value={String(monthlyDD.length) + ' Meses'} color="var(--accent-green)" />
            </div>

            <div style={{ height: '280px', marginBottom: '1.2rem', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
              {chartData && <Line data={{ labels: chartData.labels, datasets: [{ label: 'Equity', data: chartData.equityData, borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.05)', borderWidth: 2, fill: true, pointRadius: 0 }] }} options={chartOptions('Curva de Capital (Equity)')} />}
            </div>

            <div style={{ height: '200px', marginBottom: '1.2rem', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
              {chartData && <Line data={{ labels: chartData.labels, datasets: [{ label: 'Drawdown $', data: chartData.ddData, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1.5, fill: true, pointRadius: 0 }] }} options={chartOptions('Exposição Financeira em Real-Time', true)} />}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.2rem' }}>
              <div style={{ height: '200px', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
                <Bar data={{ labels: monthlyDD.map(m => m.month), datasets: [{ label: 'DD $ Mensal', data: monthlyDD.map(m => -m.maxDD), backgroundColor: 'rgba(239,68,68,0.5)', borderColor: '#EF4444', borderWidth: 1 }] }} options={chartOptions('Série Mensal ($)', true)} />
              </div>
              <div style={{ height: '200px', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
                <Bar data={{ labels: monthlyDD.map(m => m.month), datasets: [{ label: 'DD % Mensal', data: monthlyDD.map(m => -m.maxDDPct), backgroundColor: 'rgba(245,158,11,0.5)', borderColor: '#F59E0B', borderWidth: 1 }] }} options={chartOptions('Série Mensal (%)', true)} />
              </div>
            </div>

            <div style={{ height: '280px', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
              {chartData && <Line data={{ 
                labels: chartData.labels, 
                datasets: [
                  { label: 'Equity', data: chartData.equityData, borderColor: '#22C55E', borderWidth: 2, fill: false, pointRadius: 0, yAxisID: 'y' },
                  { label: 'Drawdown', data: chartData.ddData, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1.5, fill: true, pointRadius: 0, yAxisID: 'y1' }
                ] 
              }} options={{
                ...chartOptions('Equity vs Drawdown Diário'),
                scales: {
                  x: { ticks: { color: '#64748B', maxTicksLimit: 12, font: { size: 8 } }, grid: { color: 'rgba(255,255,255,0.02)' } },
                  y: { position: 'left' as const, ticks: { color: '#64748B', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,0.02)' } },
                  y1: { position: 'right' as const, ticks: { color: '#EF4444', font: { size: 8 } }, grid: { display: false }, max: 0 }
                }
              }} />}
            </div>
          </>
        ) : <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-muted)' }}>Sincronizando modelos estatísticos...</div>}
      </div>
    </div>
  );
};

// ────────────────────────────── Info Modal ──────────────────────────────
export const InfoModal = ({ robot, onClose }: { robot: any; onClose: () => void }) => {
  const [info, setInfo] = useState<any>(null);
  useEffect(() => { fetchRobotInfo(robot.id).then(d => setInfo(d)); }, [robot.id]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#13171F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Configurações — {robot.name}</h2>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button className="btn" style={{ background: 'rgba(56,189,248,0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(56,189,248,0.2)', fontSize: '0.8rem' }} onClick={() => window.open(`http://127.0.0.1:3001/api/robot/${robot.id}/download/html`)}><FileText size={13} /> HTML ORIGINAL</button>
            <button className="btn btn-danger" onClick={onClose} style={{ fontSize: '0.8rem' }}><X size={13} /> Fechar</button>
          </div>
        </div>
        {!info ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Carregando dados...</div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <StatBox label="Ativo" value={info.asset || '—'} color="var(--accent-blue)" />
              <StatBox label="Corretora / Broker" value={info.broker || '—'} color="var(--accent-green)" />
              <StatBox label="Período" value={info.period || '—'} color="var(--text-muted)" />
            </div>
            <div style={{ background: 'var(--bg-main)', borderRadius: '8px', padding: '0.8rem', maxHeight: '550px', overflow: 'auto', border: '1px solid rgba(255,255,255,0.02)' }}>
              <div dangerouslySetInnerHTML={{ __html: info.config_html }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ────────────────────────────── Main Component ──────────────────────────────
const Comparativo = () => {
  const [robots, setRobots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ddRobot, setDdRobot] = useState<any>(null);
  const [infoRobot, setInfoRobot] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await fetchComparativo(); setRobots(data); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const data = await uploadFiles(files);
      setUploadResult(data);
      setTimeout(() => {
        setUploadResult(null);
        load();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Erro no upload. Verifique se a API está rodando!');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.csv')
    );
    processFiles(files);
  }, []);

  const handleApprove = async (robot: any) => {
    setActionLoading(robot.id);
    try { await approveRobot(robot.id); setRobots(prev => prev.map(r => r.id === robot.id ? { ...r, status: 'approved' } : r)); } finally { setActionLoading(null); }
  };

  const handleDelete = async (robot: any) => {
    setConfirmDelete(robot);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const robot = confirmDelete;
    setActionLoading(robot.id + '_del');
    try {
      await deleteRobot(robot.id);
      setRobots(prev => prev.filter(r => r.id !== robot.id));
    } catch (err: any) {
      alert(`Erro ao excluir robô: ${err.message || String(err)}`);
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  const pending = robots.filter(r => r.status === 'pending');
  const approved = robots.filter(r => r.status === 'approved');

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.8rem' }}>
        <h1 className="section-title" style={{ margin: 0, fontSize: '1.2rem' }}>Diagnóstico Estratégico</h1>
        <div className="flex-gap">
          <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.8rem' }} onClick={load}><RefreshCw size={13} /> Atualizar</button>
          {pending.length > 0 && <button className="btn btn-danger" style={{ fontSize: '0.8rem' }} onClick={() => clearComparativo().then(load)}><Trash2 size={13} /> Limpar Diagnóstico</button>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2.5rem', padding: '1.2rem', border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 className="card-title" style={{ fontSize: '0.9rem', marginBottom: '0.2rem' }}>Capturar Novos Dados MT5</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Arraste arquivos HTML/CSV para processar novos robôs</p>
          </div>
          <button className="btn btn-success" style={{ fontSize: '0.75rem' }} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
             {uploading ? 'Processando...' : <><UploadCloud size={14} /> Selecionar Arquivos</>}
          </button>
        </div>

        <div
          className={`file-drop-area ${dragOver ? 'dragover' : ''}`}
          style={{ padding: '2rem', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'all 0.2s' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
              <Loader size={32} className="text-blue" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--accent-blue)', fontSize: '0.85rem' }}>Analisando relatórios...</p>
            </div>
          ) : uploadResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
              <CheckCircle size={32} style={{ color: 'var(--accent-green)' }} />
              <p style={{ color: 'var(--accent-green)', fontSize: '0.85rem' }}>{uploadResult.processed?.length} robô(s) capturado(s)!</p>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Arraste os arquivos aqui para iniciar a captura
            </p>
          )}
          <input ref={fileInputRef} type="file" multiple accept=".html,.htm,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p>Sincronizando estratégias...</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ color: 'var(--accent-blue)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '0.8rem' }}>Sessão de Diagnóstico</h2>
              <RobotTable robots={pending} onApprove={handleApprove} onDelete={handleDelete} onDD={setDdRobot} onInfo={setInfoRobot} actionLoading={actionLoading} />
            </section>
          )}

          {approved.length > 0 && (
            <section>
              <h2 style={{ color: 'var(--accent-green)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '0.8rem' }}>Diagnósticos Aprovados</h2>
              <RobotTable robots={approved} onApprove={handleApprove} onDelete={handleDelete} onDD={setDdRobot} onInfo={setInfoRobot} actionLoading={actionLoading} showApproveBtn={false} />
            </section>
          )}
        </>
      )}

      {ddRobot && <DDModal robot={ddRobot} onClose={() => setDdRobot(null)} />}
      {infoRobot && <InfoModal robot={infoRobot} onClose={() => setInfoRobot(null)} />}
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Remover Robô"
        message={`Deseja remover definitivamente "${confirmDelete?.name}"? Todas as alocações em portfólios serão removidas.`}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
        confirmLabel="Excluir"
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .file-drop-area.dragover { background: rgba(56, 189, 248, 0.05); border-color: var(--accent-blue); }
      `}</style>
    </div>
  );
};

export const RobotTable = ({ robots, onApprove, onDelete, onDD, onInfo, actionLoading, showApproveBtn = true }: any) => (
  <div className="table-container" style={{ overflowX: 'auto' }}>
    <table className="oakmont-table" style={{ fontSize: '0.75rem' }}>
      <thead>
        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.70rem' }}>ROBO</th>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.70rem' }}>LUCRO LIQUIDO</th>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.70rem' }}>MAX DD</th>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.70rem' }}>F. LUCRO</th>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.70rem' }}>TRADES</th>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.70rem' }}>LL/DD</th>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.70rem' }}>COMPRAS</th>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.70rem' }}>VENDAS</th>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.70rem' }}>PAYOFF</th>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.70rem' }}>SHARPE</th>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.62rem' }}>DEPÓSITO</th>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.70rem' }}>PERÍODO</th>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.70rem' }}>MÉDIA LL MÊS</th>
          <th style={{ padding: '0.6rem 0.4rem', fontSize: '0.70rem' }}>AÇÕES</th>
        </tr>
      </thead>
      <tbody>
        {robots.map((r: any) => (
          <tr className="oakmont-row" key={r.id}>
            <td style={{ cursor: 'pointer', padding: '0.6rem 0.4rem' }} onClick={() => onInfo(r)}>
              <div className="val-stack">
                <span className="ticker-name" style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: '700' }}>{r.name}</span>
                <span className="company-name" style={{ fontSize: '0.65rem' }}>{r.asset} · {r.timeframe}</span>
              </div>
            </td>
            <td style={{ fontWeight: '800', color: r.total_net_profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{fmtCurrency(r.total_net_profit)}</td>
            <td>
              <span style={{ color: 'var(--accent-red)', fontWeight: '700' }}>{r.max_dd_from_csv > 0 ? `$${fmt(r.max_dd_from_csv)}` : `$${fmt(r.max_dd_equity)}`}</span>
              {r.max_dd_from_csv > 0 && <span style={{ display: 'block', fontSize: '0.6rem', color: '#F59E0B' }}>Pelo CSV</span>}
            </td>
            <td style={{ fontWeight: '800' }}>{fmt(r.profit_factor)}</td>
            <td style={{ fontWeight: '700' }}>{r.total_trades}</td>
            <td style={{ fontWeight: '800', color: 'var(--accent-blue)' }}>{fmt(r.avg_profit_per_month / (r.max_dd_from_csv || r.max_dd_equity || 1))}</td>
            <td style={{ color: 'var(--accent-green)' }}>{r.long_trades} <small style={{fontSize:'0.6rem'}}>({fmt(r.long_win_pct)}%)</small></td>
            <td style={{ color: 'var(--accent-red)' }}>{r.short_trades} <small style={{fontSize:'0.6rem'}}>({fmt(r.short_win_pct)}%)</small></td>
            <td>{fmtCurrency(r.expected_payoff)}</td>
            <td style={{ fontWeight: '800' }}>{fmt(r.sharpe_ratio)}</td>
            <td style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>${fmt(r.initial_deposit ?? 10000, 0)}</td>
            <td style={{ fontSize: '0.68rem', lineHeight: '1.2' }}>{r.date_from}<br/><span style={{color:'var(--text-muted)'}}>{r.date_to}</span></td>
            <td style={{ fontWeight: '700', color: r.avg_profit_per_month >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{fmtCurrency(r.avg_profit_per_month)}</td>
            <td>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button title="Drawdown" className="btn" style={{ padding: '0.3rem 0.4rem', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)' }} onClick={() => onDD(r)}><TrendingDown size={13} /></button>
                <button title="Configurações" className="btn" style={{ padding: '0.3rem 0.4rem', background: 'rgba(56,189,248,0.1)', color: 'var(--accent-blue)' }} onClick={(e) => { e.stopPropagation(); onInfo(r); }}><Info size={13} /></button>
                {showApproveBtn && <button title="Confirmar" className="btn btn-success" style={{ padding: '0.3rem 0.4rem' }} onClick={(e) => { e.stopPropagation(); onApprove(r); }} disabled={!!actionLoading && actionLoading.includes(r.id)}>{(actionLoading && actionLoading.includes(r.id)) ? '...' : <Check size={13} />}</button>}
                <button title="Excluir" className="btn btn-danger" style={{ padding: '0.3rem 0.4rem' }} onClick={(e) => { e.stopPropagation(); onDelete(r); }} disabled={!!actionLoading && actionLoading.includes(r.id)}><Trash2 size={13} /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default Comparativo;
