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
  FileText, Table, UploadCloud, Loader, CheckCircle
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const fmt = (v: any, decimals = 2) => {
  const n = Number(v);
  if (isNaN(n) || (!v && v !== 0)) return '—';
  return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
          axios.get(`/api/robot/${robot.id}/monthly-dd`).then(r => r.data)
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
            <button className="btn" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.8rem' }} onClick={() => window.open(`/api/robot/${robot.id}/download/csv`)}><Table size={13} /> CSV Original</button>
            <button className="btn btn-danger" onClick={onClose} style={{ fontSize: '0.8rem' }}><X size={13} /> Fechar</button>
          </div>
        </div>

        {!loading ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <StatBox label="Max DD Equity" value={fmtCurrency(robot.max_dd_equity)} color="var(--accent-red)" />
              <StatBox label="VaR DME" value={fmt(robot.var_95_dd_cap * 100) + '%'} color="#F59E0B" />
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

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.8rem', marginBottom: '1.2rem' }}>
              <div style={{ height: '300px', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
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
              <div style={{ height: '300px', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
                {data?.equity_curve && (
                  <Bar 
                    data={{ 
                      labels: ['100', '200', '300', '400', '500', '1k', '2k', '3k', '4k', '5k'], 
                      datasets: [{ 
                        label: 'Ocorrências', 
                        data: (() => {
                          const curve = data.equity_curve;
                          const thresholds = [100, 200, 300, 400, 500, 1000, 2000, 3000, 4000, 5000];
                          const counts = Array(thresholds.length).fill(0);
                          const active = Array(thresholds.length).fill(false);
                          if (!curve.length) return counts;
                          let peak = curve[0].equity;
                          curve.forEach((p: any) => {
                            if (p.equity > peak) peak = p.equity;
                            const dd = peak - p.equity;
                            thresholds.forEach((t, i) => {
                              if (dd > t) {
                                if (!active[i]) { counts[i]++; active[i] = true; }
                              } else { active[i] = false; }
                            });
                          });
                          return counts;
                        })(), 
                        backgroundColor: 'rgba(239, 68, 68, 0.6)', 
                        borderColor: '#EF4444', 
                        borderWidth: 1 
                      }] 
                    }} 
                    options={chartOptions('Frequência de Drawdown (Eventos)')} 
                  />
                )}
              </div>
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
            <button className="btn" style={{ background: 'rgba(56,189,248,0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(56,189,248,0.2)', fontSize: '0.8rem' }} onClick={() => window.open(`/api/robot/${robot.id}/download/html`)}><FileText size={13} /> HTML ORIGINAL</button>
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
const Diagnostico = () => {
  const [robots, setRobots] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('nautilus_diagnostico_cache_v2');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [loading, setLoading] = useState(robots.length === 0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [ddRobot, setDdRobot] = useState<any>(null);
  const [infoRobot, setInfoRobot] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const [comparisonIds, setComparisonIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nautilus_diagnostico_comparison');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const saveComparison = (ids: string[]) => {
    setComparisonIds(ids);
    localStorage.setItem('nautilus_diagnostico_comparison', JSON.stringify(ids));
  };


  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent && robots.length === 0) setLoading(true);
    setIsSyncing(true);
    try { 
      console.log('Fetching Comparativo data...');
      const data = await fetchComparativo(); 
      setRobots(data);
      console.log('Comparativo data loaded. Saving to cache...');
      localStorage.setItem('nautilus_diagnostico_cache_v2', JSON.stringify(data));
      setLoading(false);
    } catch (e) {
      console.error('Error fetching comparativo:', e);
    } finally { 
      setIsSyncing(false);
      setLoading(false);
    }
  }, [robots.length]);

  useEffect(() => { 
    console.log('Diagnostico mounted. Robots count:', robots.length);
    load(robots.length > 0); 
  }, [load, robots.length]);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const data = await uploadFiles(files);
      setUploadResult(data);
      setTimeout(() => {
        setUploadResult(null);
        load(true);
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
          <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.8rem' }} onClick={() => load()}>
            <RefreshCw size={13} className={isSyncing ? 'spin' : ''} /> {isSyncing ? 'Sincronizando...' : 'Atualizar'}
          </button>
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

          <RobotComparisonModule
            comparisonIds={comparisonIds}
            robots={robots}
            onRemoveRobot={(id) => {
              saveComparison(comparisonIds.filter(cid => cid !== id));
            }}
            onClear={() => {
              saveComparison([]);
            }}
            onDropRobot={(id) => {
              if (comparisonIds.includes(id)) return;
              if (comparisonIds.length >= 10) {
                alert('Limite máximo de 10 robôs no comparativo atingido!');
                return;
              }
              saveComparison([...comparisonIds, id]);
            }}
          />


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
        .spin { animation: spin 1s linear infinite; }
        .file-drop-area.dragover { background: rgba(56, 189, 248, 0.05); border-color: var(--accent-blue); }
      `}</style>
    </div>
  );
};

export const RobotTable = ({ robots, onApprove, onDelete, onDD, onInfo, actionLoading, showApproveBtn = true }: any) => {
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const sortedRobots = [...robots].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let valA = a[key];
    let valB = b[key];

    if (key === 'll_dd') {
      valA = a.avg_profit_per_month / (a.max_dd_from_csv || a.max_dd_equity || 1);
      valB = b.avg_profit_per_month / (b.max_dd_from_csv || b.max_dd_equity || 1);
    } else if (key === 'max_dd') {
      valA = a.max_dd_from_csv > 0 ? a.max_dd_from_csv : a.max_dd_equity;
      valB = b.max_dd_from_csv > 0 ? b.max_dd_from_csv : b.max_dd_equity;
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return ' ↕';
    return sortConfig.direction === 'desc' ? ' ↓' : ' ↑';
  };

  const thStyle = { padding: '0.6rem 0.2rem', fontSize: '0.70rem', cursor: 'pointer', whiteSpace: 'nowrap' } as any;

  return (
    <div className="table-container" style={{ overflowX: 'auto' }}>
      <table className="oakmont-table" style={{ fontSize: '0.75rem' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
            <th 
              style={{ ...thStyle, minWidth: '20ch' }} 
              onClick={() => requestSort('name')}
              data-tooltip="Identificação da estratégia. Exibe o nome do robô, o ativo operado e o tempo gráfico (timeframe)."
            >
              ROBO{getSortIcon('name')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('total_net_profit')}
              data-tooltip="Lucro Líquido Total. Resultado financeiro final após descontar todos os prejuízos no período do backtest."
            >
              LUCRO LIQ{getSortIcon('total_net_profit')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('max_dd')}
              data-tooltip="Drawdown Máximo. A maior queda de saldo (pico ao vale) ocorrida no período. Representa o risco histórico máximo."
            >
              MAX DD{getSortIcon('max_dd')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('profit_factor')}
              data-tooltip="Profit Factor (Fator de Lucro). Razão entre o lucro bruto e o prejuízo bruto. Cálculo: Lucro Bruto / Prejuízo Bruto. Valores acima de 1.0 indicam lucratividade."
            >
              FATOR{getSortIcon('profit_factor')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('total_trades')}
              data-tooltip="Número total de operações executadas durante o período do backtest."
            >
              TRADES{getSortIcon('total_trades')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('total_lots')}
              data-tooltip="Volume Total em Lotes. Soma de todos os lotes operados em todas as entradas e saídas."
            >
              LOTES{getSortIcon('total_lots')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('lots_per_month')}
              data-tooltip="Lotes por Mês. Médio de volume operado mensalmente. Cálculo: Volume Total / Meses de duração do backtest."
            >
              L.MES{getSortIcon('lots_per_month')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('max_lot_exposure')}
              data-tooltip="Exposição Máxima de Lote. O maior volume (em lotes) aberto simultaneamente em um único ciclo de operação."
            >
              MAX L.{getSortIcon('max_lot_exposure')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('max_entries_per_trade')}
              data-tooltip="Máximo de Entradas. O maior número de execuções (parciais ou preço médio) realizadas dentro de uma única jornada de trade."
            >
              ENT.{getSortIcon('max_entries_per_trade')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('ll_dd')}
              data-tooltip="Razão Risco/Retorno (Eficiência). Cálculo: (Lucro Médio Mensal / Drawdown Máximo) * 100. Indica a porcentagem do risco máximo recuperada mensalmente."
            >
              LL/DD{getSortIcon('ll_dd')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('avg_profit_per_month')}
              data-tooltip="Lucro Líquido Médio Mensal. Cálculo: Lucro Líquido Total / Número de meses no período analisado."
            >
              LL MÊS{getSortIcon('avg_profit_per_month')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('var_95_dd_cap')}
              data-tooltip="Value at Risk (DME - Drawdown Máximo Esperado). Estatística que define, com 95% de confiança, o risco provável com base na volatilidade histórica."
            >
              VaR DME{getSortIcon('var_95_dd_cap')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('long_trades')}
              data-tooltip="Estatísticas de Compras (Long). Quantidade total e porcentagem de acertos das operações compradas."
            >
              COMPRAS{getSortIcon('long_trades')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('short_trades')}
              data-tooltip="Estatísticas de Vendas (Short). Quantidade total e porcentagem de acertos das operações vendidas."
            >
              VENDAS{getSortIcon('short_trades')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('expected_payoff')}
              data-tooltip="Expected Payoff. Expectativa matemática média de ganho por trade. Cálculo: Lucro Líquido / Total de Trades."
            >
              PAYOFF{getSortIcon('expected_payoff')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('sharpe_ratio')}
              data-tooltip="Índice Sharpe. Avalia o retorno da estratégia em relação à sua volatilidade. Valores maiores indicam maior estabilidade e eficiência."
            >
              SHARPE{getSortIcon('sharpe_ratio')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('initial_deposit')}
              data-tooltip="Depósito Inicial. Capital base utilizado no MetaTrader para a realização do backtest."
            >
              DEP.{getSortIcon('initial_deposit')}
            </th>
            <th 
              style={thStyle} 
              onClick={() => requestSort('date_from')}
              data-tooltip="Janela Temporal. Data de início e término dos dados históricos processados no relatório MT5."
            >
              PER.{getSortIcon('date_from')}
            </th>
            <th style={{ padding: '0.6rem 0.2rem', fontSize: '0.70rem' }}>AÇÕES</th>
          </tr>
        </thead>
        <tbody>
          {sortedRobots.map((r: any) => (
            <tr 
              className="oakmont-row" 
              key={r.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('compareRobotId', r.id);
              }}
              style={{ cursor: 'grab' }}
            >
              <td style={{ cursor: 'pointer', padding: '0.6rem 0.2rem' }} onClick={() => onInfo(r)}>
                <div className="val-stack">
                  <span className="ticker-name" style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: '700' }}>
                    {r.name && r.name.length > 30 ? r.name.slice(0, 27) + '...' : r.name}
                  </span>
                  <span className="company-name" style={{ fontSize: '0.65rem' }}>{r.asset} · {r.timeframe}</span>
                </div>
              </td>
              <td style={{ fontWeight: '800', color: r.total_net_profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', padding: '0.6rem 0.2rem' }}>{fmtCurrency(r.total_net_profit)}</td>
              <td style={{ padding: '0.6rem 0.2rem' }}>
                <span style={{ color: 'var(--accent-red)', fontWeight: '700' }}>{r.max_dd_from_csv > 0 ? `$${fmt(r.max_dd_from_csv)}` : `$${fmt(r.max_dd_equity)}`}</span>
                {r.max_dd_from_csv > 0 && <span style={{ display: 'block', fontSize: '0.6rem', color: '#F59E0B' }}>Pelo CSV</span>}
              </td>
              <td style={{ fontWeight: '800', padding: '0.6rem 0.2rem' }}>{fmt(r.profit_factor)}</td>
              <td style={{ fontWeight: '700', padding: '0.6rem 0.2rem' }}>{r.total_trades}</td>
              <td style={{ fontWeight: '700', color: 'var(--accent-blue)', padding: '0.6rem 0.2rem' }}>{fmt(r.total_lots, 0)}</td>
              <td style={{ fontWeight: '700', padding: '0.6rem 0.2rem' }}>{fmt(r.lots_per_month, 0)}</td>
              <td style={{ fontWeight: '800', color: '#A855F7', padding: '0.6rem 0.2rem' }}>{fmt(r.max_lot_exposure, 2)}</td>
              <td style={{ fontWeight: '700', color: '#F59E0B', padding: '0.6rem 0.2rem' }}>{r.max_entries_per_trade || '—'}</td>
              <td style={{ fontWeight: '800', color: 'var(--accent-blue)', padding: '0.6rem 0.2rem' }}>{fmt((r.avg_profit_per_month / (r.max_dd_from_csv || r.max_dd_equity || 1)) * 100)}%</td>
              <td style={{ fontWeight: '700', color: r.avg_profit_per_month >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', padding: '0.6rem 0.2rem' }}>{fmtCurrency(r.avg_profit_per_month)}</td>
              <td style={{ fontWeight: '800', color: '#F59E0B', padding: '0.6rem 0.2rem' }}>{fmt(r.var_95_dd_cap * 100)}%</td>
              <td style={{ color: 'var(--accent-green)', padding: '0.6rem 0.2rem' }}>
                {r.long_trades} 
                <div style={{fontSize:'0.6rem', opacity: 0.8}}>{fmt(r.long_win_pct)}%</div>
              </td>
              <td style={{ color: 'var(--accent-red)', padding: '0.6rem 0.2rem' }}>
                {r.short_trades}
                <div style={{fontSize:'0.6rem', opacity: 0.8}}>{fmt(r.short_win_pct)}%</div>
              </td>
              <td style={{ padding: '0.6rem 0.2rem' }}>{fmtCurrency(r.expected_payoff)}</td>
              <td style={{ fontWeight: '800', padding: '0.6rem 0.2rem' }}>{fmt(r.sharpe_ratio)}</td>
              <td style={{ color: 'var(--text-muted)', fontSize: '0.62rem', padding: '0.6rem 0.2rem' }}>${fmt(r.initial_deposit ?? 10000, 0)}</td>
              <td style={{ fontSize: '0.61rem', lineHeight: '1.2', padding: '0.6rem 0.2rem' }}>{r.date_from}<br/><span style={{color:'var(--text-muted)'}}>{r.date_to}</span></td>
              <td style={{ padding: '0.6rem 0.2rem' }}>
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
};


// ────────────────────────────── Robot Comparison Module ──────────────────────────────
export const RobotComparisonModule = ({ 
  comparisonIds, 
  robots, 
  onRemoveRobot, 
  onClear, 
  onDropRobot 
}: { 
  comparisonIds: string[]; 
  robots: any[]; 
  onRemoveRobot: (id: string) => void; 
  onClear: () => void;
  onDropRobot: (id: string) => void;
}) => {
  const [dragOver, setDragOver] = useState(false);

  // Map IDs to actual robot objects
  const compRobots = comparisonIds
    .map(id => robots.find(r => r.id === id))
    .filter(Boolean) as any[];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData('compareRobotId');
    if (id) {
      onDropRobot(id);
    }
  };

  if (compRobots.length === 0) {
    return (
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ color: 'var(--accent-blue)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '0.8rem' }}>
          Comparativo de Robôs
        </h2>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            padding: '2.5rem',
            border: dragOver ? '2px dashed var(--accent-blue)' : '2px dashed rgba(255,255,255,0.08)',
            borderRadius: '12px',
            textAlign: 'center',
            background: dragOver ? 'rgba(56,189,248,0.05)' : 'rgba(255,255,255,0.01)',
            transition: 'all 0.2s',
            cursor: 'default'
          }}
        >
          <div style={{ color: dragOver ? 'var(--accent-blue)' : 'var(--text-muted)', fontSize: '0.85rem' }}>
            💡 <strong>Módulo de Comparação Drag & Drop</strong>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem' }}>
              Arraste até 10 robôs das tabelas de diagnóstico acima ou abaixo e solte aqui para comparar todos os dados históricos, calcular deltas automáticos (2 robôs) e destacar vencedores por coluna (2+ robôs)!
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Define metrics with metadata
  const METRICS = [
    { label: '🏆 Troféus Vencidos', key: 'wins_count', isCurrency: false, lowerIsBetter: false, decimals: 0, isNeutral: true, isWins: true },
    { label: 'Lucro Líquido', key: 'total_net_profit', isCurrency: true, lowerIsBetter: false },
    { label: 'Max DD', key: 'max_dd', isCurrency: true, lowerIsBetter: true },
    { label: 'Profit Factor', key: 'profit_factor', isCurrency: false, lowerIsBetter: false },
    { label: 'Total Trades', key: 'total_trades', isCurrency: false, lowerIsBetter: false, decimals: 0 },
    { label: 'Lotes Totais', key: 'total_lots', isCurrency: false, lowerIsBetter: false, decimals: 0 },
    { label: 'Lotes/Mês', key: 'lots_per_month', isCurrency: false, lowerIsBetter: false, decimals: 0 },
    { label: 'Max Lote Exp.', key: 'max_lot_exposure', isCurrency: false, lowerIsBetter: true },
    { label: 'Max Entradas', key: 'max_entries_per_trade', isCurrency: false, lowerIsBetter: true, decimals: 0 },
    { label: 'LL/DD %', key: 'll_dd', isPct: true, lowerIsBetter: false },
    { label: 'LL MÊS', key: 'avg_profit_per_month', isCurrency: true, lowerIsBetter: false },
    { label: 'VaR DME %', key: 'var_95_dd_cap', isPct: true, scale100: true, lowerIsBetter: true },
    { label: 'Compras (win%)', key: 'long_win_pct', isPct: true, lowerIsBetter: false },
    { label: 'Vendas (win%)', key: 'short_win_pct', isPct: true, lowerIsBetter: false },
    { label: 'Expected Payoff', key: 'expected_payoff', isCurrency: true, lowerIsBetter: false },
    { label: 'Sharpe Ratio', key: 'sharpe_ratio', isCurrency: false, lowerIsBetter: false },
    { label: 'Depósito Inicial', key: 'initial_deposit', isCurrency: true, lowerIsBetter: false, decimals: 0, isNeutral: true },
  ];

  const getMetricValue = (robot: any, key: string) => {
    if (key === 'wins_count') {
      const idx = compRobots.findIndex(cr => cr.id === robot.id);
      return idx !== -1 ? getRobotWins(idx) : 0;
    }
    if (key === 'max_dd') {
      return Number(robot.max_dd_from_csv > 0 ? robot.max_dd_from_csv : robot.max_dd_equity) || 0;
    }
    if (key === 'll_dd') {
      const maxDD = Number(robot.max_dd_from_csv > 0 ? robot.max_dd_from_csv : robot.max_dd_equity) || 1;
      return (Number(robot.avg_profit_per_month) / maxDD) * 100;
    }
    return Number(robot[key]) || 0;
  };

  // Logic to calculate best indices when compRobots.length >= 2
  const getBestIndices = () => {
    if (compRobots.length < 2) return {} as any;

    const bestMap: { [key: string]: number[] } = {};

    METRICS.forEach(m => {
      if (m.isNeutral) return;

      const values = compRobots.map(r => getMetricValue(r, m.key));
      const uniqueVals = new Set(values);

      // Only highlight if there is a difference between robots
      if (uniqueVals.size > 1) {
        const extremeVal = m.lowerIsBetter ? Math.min(...values) : Math.max(...values);
        const indices: number[] = [];
        values.forEach((v, idx) => {
          if (v === extremeVal) {
            indices.push(idx);
          }
        });
        bestMap[m.key] = indices;
      }
    });

    return bestMap;
  };

  const bestIndicesMap = getBestIndices();

  const isBest = (robotIdx: number, key: string) => {
    return bestIndicesMap[key]?.includes(robotIdx) || false;
  };

  // Dynamically calculate trophies count after bestIndicesMap is built
  const getRobotWins = (robotIdx: number) => {
    let wins = 0;
    METRICS.forEach(m => {
      if (m.isNeutral || m.isWins) return;
      if (bestIndicesMap[m.key]?.includes(robotIdx)) {
        wins++;
      }
    });
    return wins;
  };

  const isWinsLeader = (robotIdx: number) => {
    if (compRobots.length < 2) return false;
    const winsArray = compRobots.map((_, idx) => getRobotWins(idx));
    const maxWins = Math.max(...winsArray);
    if (maxWins === 0) return false;
    return winsArray[robotIdx] === maxWins;
  };

  const renderDeltaValue = (metric: any, val1: number, val2: number) => {
    const delta = val1 - val2;
    const absDelta = Math.abs(delta);
    if (absDelta === 0) return <span style={{ color: 'var(--text-muted)' }}>0.00 (igual)</span>;

    const sign = delta > 0 ? '+' : '-';
    const isBetter = metric.lowerIsBetter ? delta < 0 : delta > 0;
    const color = isBetter ? 'var(--accent-green)' : 'var(--accent-red)';

    let formatted = '';
    if (metric.isWins) {
      formatted = `${sign}${absDelta} ${absDelta === 1 ? 'troféu' : 'troféus'}`;
    } else if (metric.isCurrency) {
      formatted = `${sign}$${fmt(absDelta, metric.decimals ?? 2)}`;
    } else if (metric.isPct) {
      const scale = metric.scale100 ? 100 : 1;
      formatted = `${sign}${fmt(absDelta * scale, metric.decimals ?? 2)}%`;
    } else {
      formatted = `${sign}${fmt(absDelta, metric.decimals ?? 2)}`;
    }

    return (
      <span style={{ color, fontWeight: '800' }}>
        {formatted}
      </span>
    );
  };

  // Helper for formatting standard values
  const renderStandardValue = (r: any, m: any, rIdx: number) => {
    if (m.isWins) {
      const wins = getRobotWins(rIdx);
      const isLeader = isWinsLeader(rIdx);
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
          {isLeader && <span title="Vencedor do comparativo">⭐</span>}
          <span style={isLeader ? { color: '#F59E0B', fontWeight: '800' } : { fontWeight: '700' }}>
            {wins} {wins === 1 ? 'troféu' : 'troféus'}
          </span>
        </div>
      );
    }

    const val = getMetricValue(r, m.key);
    const best = isBest(rIdx, m.key);

    let formatted = '';
    if (m.key === 'long_win_pct') {
      formatted = `${r.long_trades} (${fmt(r.long_win_pct)}%)`;
    } else if (m.key === 'short_win_pct') {
      formatted = `${r.short_trades} (${fmt(r.short_win_pct)}%)`;
    } else if (m.isCurrency) {
      formatted = fmtCurrency(val);
    } else if (m.isPct) {
      const scale = m.scale100 ? 100 : 1;
      formatted = `${fmt(val * scale, m.decimals ?? 2)}%`;
    } else {
      formatted = fmt(val, m.decimals ?? 2);
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
        {best && <span title="Melhor resultado" style={{ fontSize: '0.9rem' }}>🏆</span>}
        <span style={best ? { color: 'var(--accent-green)', fontWeight: '800' } : {}}>{formatted}</span>
      </div>
    );
  };

  const getCellStyle = (rIdx: number, key: string) => {
    const best = isBest(rIdx, key);
    return {
      padding: '0.6rem 0.4rem',
      background: best ? 'rgba(34,197,94,0.08)' : 'transparent',
      fontWeight: best ? '800' as any : 'normal' as any
    };
  };

  const thStyle = { padding: '0.6rem 0.4rem', fontSize: '0.70rem', textAlign: 'center', whiteSpace: 'nowrap' } as any;

  return (
    <section 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ 
        marginBottom: '2.5rem',
        border: dragOver ? '2px dashed var(--accent-blue)' : '2px solid rgba(255,255,255,0.05)',
        borderRadius: '12px',
        background: 'rgba(24, 28, 37, 0.4)',
        padding: '1.2rem',
        position: 'relative'
      }}
    >
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--accent-blue)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.2px', margin: 0 }}>
            Comparativo de Robôs ({compRobots.length}/10)
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Arrastar robôs adicionais atualiza os dados em tempo real. Solte aqui para adicionar.
          </p>
        </div>
        <button 
          className="btn btn-danger" 
          style={{ fontSize: '0.72rem', padding: '0.4rem 0.8rem' }}
          onClick={onClear}
        >
          <Trash2 size={12} /> Limpar Comparação
        </button>
      </div>

      {/* VERSION A: ROBOTS AS ROWS */}
      <div style={{ marginBottom: '2.1rem' }}>
        <h3 style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.3rem' }}>
          Visualização em Linhas (Robô por Linha)
        </h3>
        <div className="table-container" style={{ overflowX: 'auto', marginBottom: '1rem' }}>
          <table className="oakmont-table" style={{ fontSize: '0.75rem', textAlign: 'center' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ ...thStyle, textAlign: 'left', minWidth: '22ch' }}>ROBÔ</th>
                <th style={thStyle}>🏆 VENCEU</th>
                <th style={thStyle}>LUCRO LIQ</th>
                <th style={thStyle}>MAX DD</th>
                <th style={thStyle}>FATOR</th>
                <th style={thStyle}>TRADES</th>
                <th style={thStyle}>LOTES</th>
                <th style={thStyle}>L.MES</th>
                <th style={thStyle}>MAX L.</th>
                <th style={thStyle}>ENT.</th>
                <th style={thStyle}>LL/DD%</th>
                <th style={thStyle}>LL MÊS</th>
                <th style={thStyle}>VaR DME</th>
                <th style={thStyle}>COMPRAS</th>
                <th style={thStyle}>VENDAS</th>
                <th style={thStyle}>PAYOFF</th>
                <th style={thStyle}>SHARPE</th>
              </tr>
            </thead>
            <tbody>
              {compRobots.map((r, rIdx) => (
                <tr className="oakmont-row" key={r.id}>
                  <td style={{ textAlign: 'left', padding: '0.6rem 0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div className="val-stack">
                        <span className="ticker-name" style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: '700' }}>
                          {r.name && r.name.length > 25 ? r.name.slice(0, 22) + '...' : r.name}
                        </span>
                        <span className="company-name" style={{ fontSize: '0.65rem' }}>{r.asset} · {r.timeframe}</span>
                      </div>
                      <button
                        onClick={() => onRemoveRobot(r.id)}
                        className="btn"
                        style={{
                          padding: '0.15rem 0.3rem',
                          background: 'rgba(239,68,68,0.1)',
                          color: 'var(--accent-red)',
                          minWidth: 'auto',
                          borderRadius: '4px'
                        }}
                        title="Remover"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '0.6rem 0.4rem', background: isWinsLeader(rIdx) ? 'rgba(245,158,11,0.04)' : 'transparent' }}>
                    {renderStandardValue(r, METRICS[0], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'total_net_profit')}>
                    {renderStandardValue(r, METRICS[1], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'max_dd')}>
                    {renderStandardValue(r, METRICS[2], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'profit_factor')}>
                    {renderStandardValue(r, METRICS[3], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'total_trades')}>
                    {renderStandardValue(r, METRICS[4], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'total_lots')}>
                    {renderStandardValue(r, METRICS[5], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'lots_per_month')}>
                    {renderStandardValue(r, METRICS[6], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'max_lot_exposure')}>
                    {renderStandardValue(r, METRICS[7], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'max_entries_per_trade')}>
                    {renderStandardValue(r, METRICS[8], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'll_dd')}>
                    {renderStandardValue(r, METRICS[9], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'avg_profit_per_month')}>
                    {renderStandardValue(r, METRICS[10], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'var_95_dd_cap')}>
                    {renderStandardValue(r, METRICS[11], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'long_win_pct')}>
                    {renderStandardValue(r, METRICS[12], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'short_win_pct')}>
                    {renderStandardValue(r, METRICS[13], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'expected_payoff')}>
                    {renderStandardValue(r, METRICS[14], rIdx)}
                  </td>
                  <td style={getCellStyle(rIdx, 'sharpe_ratio')}>
                    {renderStandardValue(r, METRICS[15], rIdx)}
                  </td>
                </tr>
              ))}

              {/* DELTA ROW (Exactly 2 robots) */}
              {compRobots.length === 2 && (
                <tr style={{ background: 'rgba(56,189,248,0.04)', borderTop: '1px solid rgba(56,189,248,0.2)' }}>
                  <td style={{ textAlign: 'left', padding: '0.6rem 0.4rem', fontWeight: '800', color: 'var(--accent-blue)' }}>
                    Diferença (R1 - R2)
                  </td>
                  {METRICS.slice(0, 16).map(m => {
                    const val1 = getMetricValue(compRobots[0], m.key);
                    const val2 = getMetricValue(compRobots[1], m.key);
                    return (
                      <td key={m.key} style={{ padding: '0.6rem 0.4rem' }}>
                        {renderDeltaValue(m, val1, val2)}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VERSION B: ROBOTS AS COLUMNS (ESPELHO) */}
      <div>
        <h3 style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.3rem' }}>
          Visualização em Colunas (Robô por Coluna)
        </h3>
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="oakmont-table" style={{ fontSize: '0.75rem', textAlign: 'center' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ ...thStyle, textAlign: 'left', minWidth: '150px' }}>MÉTRICA</th>
                {compRobots.map((r, rIdx) => (
                  <th key={r.id} style={thStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: '700' }}>
                          R{rIdx + 1}: {r.name && r.name.length > 20 ? r.name.slice(0, 17) + '...' : r.name}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{r.asset} · {r.timeframe}</div>
                      </div>
                      <button
                        onClick={() => onRemoveRobot(r.id)}
                        className="btn"
                        style={{
                          padding: '0.15rem 0.3rem',
                          background: 'rgba(239,68,68,0.1)',
                          color: 'var(--accent-red)',
                          minWidth: 'auto',
                          borderRadius: '4px'
                        }}
                        title="Remover"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </th>
                ))}
                {compRobots.length === 2 && (
                  <th style={{ ...thStyle, color: 'var(--accent-blue)', fontWeight: '800' }}>Diferença (R1 - R2)</th>
                )}
              </tr>
            </thead>
            <tbody>
              {METRICS.map(m => {
                return (
                  <tr className="oakmont-row" key={m.key}>
                    <td style={{ textAlign: 'left', fontWeight: '600', color: 'var(--text-main)', padding: '0.6rem 0.8rem', borderRight: '1px solid rgba(255,255,255,0.03)' }}>
                      {m.label}
                    </td>
                    {compRobots.map((r, rIdx) => {
                      const val = getMetricValue(r, m.key);
                      const best = isBest(rIdx, m.key);
                      return (
                        <td 
                          key={r.id} 
                          style={{ 
                            padding: '0.6rem 0.8rem', 
                            background: m.isWins && isWinsLeader(rIdx) ? 'rgba(245,158,11,0.04)' : (best ? 'rgba(34,197,94,0.08)' : 'transparent')
                          }}
                        >
                          {renderStandardValue(r, m, rIdx)}
                        </td>
                      );
                    })}
                    {compRobots.length === 2 && (
                      <td style={{ padding: '0.6rem 0.8rem', background: 'rgba(56,189,248,0.02)' }}>
                        {renderDeltaValue(m, getMetricValue(compRobots[0], m.key), getMetricValue(compRobots[1], m.key))}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default Diagnostico;


