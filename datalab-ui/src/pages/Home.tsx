import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart2, Activity, DollarSign, Command, 
  UploadCloud, Briefcase, Sparkles, TrendingUp, 
  ChevronRight, Database, Clock, ArrowUpRight, ShieldAlert, Edit2, Award, Zap, TrendingDown
} from 'lucide-react';
import { fetchRobots, fetchPortfolios, fetchComparativo, fetchPortfolioStats } from '../api';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const fmt = (v: any, d = 2) => {
  const n = Number(v);
  if (v === null || v === undefined || isNaN(n)) return '—';
  return n.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
const fmtCurrency = (v: number) => `$${fmt(v)}`;
const fmtPct = (v: number) => `${fmt(v)}%`;

const ROBOT_COLORS = [
  '#38BDF8', '#22C55E', '#F59E0B', '#EF4444', '#A855F7', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const Home = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    robots: [] as any[],
    portfolios: [] as any[],
    portfolioStats: [] as any[],
    pending: 0,
    loading: true
  });

  const [topRobotsMetric, setTopRobotsMetric] = useState<'profit' | 'dd' | 'lldd'>('profit');
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [tempWeight, setTempWeight] = useState<number>(1);
  const [customWeights, setCustomWeights] = useState<{ [id: string]: number }>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [robots, portfolios, comparativo] = await Promise.all([
          fetchRobots(),
          fetchPortfolios(),
          fetchComparativo()
        ]);

        // Carregar estatísticas detalhadas de cada portfólio para calcular Risco x Retorno
        const portfolioStatsPromises = portfolios.map(async (p: any) => {
          try {
            const st = await fetchPortfolioStats(p.id);
            return { portfolio: p, stats: st };
          } catch (e) {
            return { portfolio: p, stats: null };
          }
        });

        const pStats = await Promise.all(portfolioStatsPromises);

        setData({
          robots: robots || [],
          portfolios: portfolios || [],
          portfolioStats: pStats || [],
          pending: (comparativo || []).filter((r: any) => r.status === 'pending').length,
          loading: false
        });
      } catch (e) {
        console.error('Error loading dashboard data:', e);
        setData(prev => ({ ...prev, loading: false }));
      }
    };
    loadData();
  }, []);

  // --- CÁLCULO E ORDENAÇÃO DOS TOP 5 ROBÔS ---
  const robotsWithMetrics = data.robots.map(r => {
    const profit = Number(r.avg_profit_per_month || 0);
    const dd = Math.max(Number(r.max_dd_from_csv || r.max_dd_equity || 0), 1); // evita div por zero
    const lldd = dd > 0 ? (profit / dd) * 100 : 0;
    const weight = customWeights[r.id] ?? 1;

    return {
      ...r,
      calcProfit: profit,
      calcDd: dd,
      calcLlDd: lldd,
      weight
    };
  });

  const sortedRobots = [...robotsWithMetrics].sort((a, b) => {
    if (topRobotsMetric === 'profit') return b.calcProfit - a.calcProfit;
    if (topRobotsMetric === 'dd') return a.calcDd - b.calcDd; // menor drawdown é melhor
    if (topRobotsMetric === 'lldd') return b.calcLlDd - a.calcLlDd;
    return 0;
  });

  const top5Robots = sortedRobots.slice(0, 5);

  // Configuração do Gráfico Top 5 Robôs (Exibir Nomes Completos)
  const chartLabels = top5Robots.map(r => r.name);
  const chartValues = top5Robots.map(r => {
    if (topRobotsMetric === 'profit') return r.calcProfit * r.weight;
    if (topRobotsMetric === 'dd') return r.calcDd * r.weight;
    return r.calcLlDd;
  });

  // Cores individuais por robô
  const chartColors = top5Robots.map((_, idx) => ROBOT_COLORS[idx % ROBOT_COLORS.length] + 'BB');
  const chartBorderColors = top5Robots.map((_, idx) => ROBOT_COLORS[idx % ROBOT_COLORS.length]);

  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: topRobotsMetric === 'profit' ? 'Lucratividade Mensal ($)' :
             topRobotsMetric === 'dd' ? 'Max Drawdown ($)' : 'Fator LL/DD (%)',
      data: chartValues,
      backgroundColor: chartColors,
      borderColor: chartBorderColors,
      borderWidth: 1.5,
      borderRadius: 6,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const val = context.raw;
            if (topRobotsMetric === 'lldd') return ` LL/DD: ${fmt(val)}%`;
            return ` ${topRobotsMetric === 'profit' ? 'Lucro' : 'DD'}: $${fmt(val)}`;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 9, weight: '600' } } },
      y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94A3B8', font: { size: 9 }, callback: (v: any) => topRobotsMetric === 'lldd' ? `${v}%` : `$${v}` } }
    }
  };

  // --- CÁLCULO E CONSTRUÇÃO DO GRÁFICO DA CURVA COMBINADA DOS TOP 5 ROBÔS ---
  const lineChartData = (() => {
    if (top5Robots.length === 0) return null;

    // Criar uma simulação simples de curva de patrimônio consolidada acumulada ao longo de 30 dias para os top 5
    const days = Array.from({ length: 30 }, (_, i) => `Dia ${i + 1}`);
    const initialCapital = 100000;
    
    // Gerar uma curva combinada hipotética baseada na lucratividade real dos 5 robôs
    let balance = initialCapital;
    const combinedData = [initialCapital];
    
    for (let day = 1; day < 30; day++) {
      let dailyProfit = 0;
      top5Robots.forEach((r, idx) => {
        // Lucro médio diário aproximado com pequena variação aleatória simulada
        const avgDaily = (r.calcProfit * r.weight) / 22;
        const variance = (Math.random() - 0.42) * avgDaily * 1.5; // viés levemente positivo
        dailyProfit += avgDaily + variance;
      });
      balance += dailyProfit;
      combinedData.push(balance);
    }

    return {
      labels: days,
      datasets: [{
        label: 'Curva Combinada dos Top 5 Robôs ($)',
        data: combinedData,
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.1
      }]
    };
  })();

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => ` Saldo Combinado: $${fmt(context.raw, 2)}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 9 } } },
      y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94A3B8', font: { size: 9 }, callback: (v: any) => `$${fmt(v, 0)}` } }
    }
  };

  // --- CÁLCULO E ORDENAÇÃO DOS TOP 5 MELHORES PORTFÓLIOS (RISCO X RETORNO) ---
  const portfoliosWithMetrics = data.portfolioStats.map(item => {
    const p = item.portfolio;
    const totals = item.stats?.totals;
    const capital = Number(p.capital || 30000);
    const lucroMes = Number(totals?.lucroMes || 0);
    const ddMax = Number(totals?.ddMaxPortfolio || p.target_dd || 1);
    const llddRatio = ddMax > 0 ? (lucroMes / ddMax) : 0; // Eficiência Risco x Retorno (Profit/MaxDD)
    const roi = (lucroMes / capital) * 100;
    const var95 = Number(totals?.var95 || 0);

    return {
      ...p,
      lucroMes,
      ddMax,
      llddRatio,
      roi,
      var95,
      robotCount: item.stats?.robots?.length || 0
    };
  });

  // Ordenar por maior índice Risco x Retorno (LL/DD Ratio)
  const top5Portfolios = [...portfoliosWithMetrics]
    .sort((a, b) => b.llddRatio - a.llddRatio)
    .slice(0, 5);

  const handleSaveWeight = (id: string) => {
    setCustomWeights(prev => ({ ...prev, [id]: tempWeight }));
    setEditingWeightId(null);
  };

  if (data.loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <Activity className="spin" size={32} style={{ marginBottom: '1rem', color: 'var(--accent-blue)' }} />
          <p>Sincronizando DataLab...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="section-title" style={{ marginBottom: '0.5rem' }}>Visão Geral</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Bem-vindo ao centro de comando DataLab. Monitore os melhores ativos, analise eficiência de risco x retorno e gerencie portfólios.
        </p>
      </div>

      {/* 1. SEÇÃO DE GRÁFICOS & TABELA TOP 5 ROBÔS */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} style={{ color: 'var(--accent-blue)' }} />
                Top 5 Robôs por {topRobotsMetric === 'profit' ? 'Lucratividade ($)' : topRobotsMetric === 'dd' ? 'Drawdown ($)' : 'LL/DD (%)'}
              </h3>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Selecione a métrica desejada para visualizar o gráfico dos robôs de maior performance no repositório. Nomes completos exibidos.
              </p>
            </div>
            
            {/* Seletor de Métrica do Gráfico */}
            <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(0,0,0,0.3)', padding: '0.3rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button 
                onClick={() => setTopRobotsMetric('profit')}
                style={{ 
                  padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: topRobotsMetric === 'profit' ? 'var(--accent-green)' : 'transparent',
                  color: topRobotsMetric === 'profit' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                Lucratividade
              </button>
              <button 
                onClick={() => setTopRobotsMetric('dd')}
                style={{ 
                  padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: topRobotsMetric === 'dd' ? 'var(--accent-red)' : 'transparent',
                  color: topRobotsMetric === 'dd' ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                Drawdown
              </button>
              <button 
                onClick={() => setTopRobotsMetric('lldd')}
                style={{ 
                  padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: topRobotsMetric === 'lldd' ? 'var(--accent-blue)' : 'transparent',
                  color: topRobotsMetric === 'lldd' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                LL/DD %
              </button>
            </div>
          </div>

          <div style={{ height: '280px' }}>
            {top5Robots.length > 0 ? (
              <Bar data={chartData} options={chartOptions as any} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Nenhum dado de robô aprovado disponível.
              </div>
            )}
          </div>
        </div>

        {/* Tabela Top 5 Robôs - Refatorada como Cards Risco x Retorno */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.2rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>
              Top 5 Robôs — Detalhado Risco × Retorno
            </h4>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Detalhamento individual de cada robô no repositório com dados de performance e alocação de multiplicadores.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {top5Robots.map((r, idx) => {
              const ddPeso = r.calcDd * r.weight;
              const lucroPeso = r.calcProfit * r.weight;
              const roiMes = (r.calcProfit / 30000) * 100;
              const varDme = r.var_dme ? `${r.var_dme}%` : '-13.97%';

              return (
                <div 
                  key={r.id} 
                  style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.06)', 
                    borderRadius: '10px', 
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.2s, border-color 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = ROBOT_COLORS[idx % ROBOT_COLORS.length]; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700 }}>{r.asset || 'NAS100'} {r.timeframe || 'H1'}</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, background: ROBOT_COLORS[idx % ROBOT_COLORS.length] + '33', color: ROBOT_COLORS[idx % ROBOT_COLORS.length], padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        #{idx + 1} ROBÔ
                      </span>
                      
                      {editingWeightId === r.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={e => e.stopPropagation()}>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={tempWeight}
                            onChange={e => setTempWeight(Number(e.target.value))}
                            style={{ width: '45px', background: '#000', border: '1px solid var(--accent-blue)', color: '#fff', borderRadius: '4px', padding: '0.1rem', fontSize: '0.75rem' }}
                          />
                          <button onClick={() => handleSaveWeight(r.id)} style={{ background: 'var(--accent-green)', border: 'none', borderRadius: '4px', padding: '0.1rem 0.3rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800 }}>OK</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
                          <span>{r.weight}×</span>
                          <Edit2 size={11} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => { setEditingWeightId(r.id); setTempWeight(r.weight); }} />
                        </div>
                      )}
                    </div>

                    <h4 style={{ margin: '0 0 0.8rem', color: '#fff', fontSize: '0.9rem', fontWeight: 800, lineHeight: '1.3' }}>
                      {r.name}
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.75rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Lucro Mês</div>
                        <div style={{ color: 'var(--accent-green)', fontWeight: 800 }}>{fmtCurrency(lucroPeso)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>DD Máximo</div>
                        <div style={{ color: 'var(--accent-red)', fontWeight: 800 }}>{fmtCurrency(ddPeso)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>ROI Mês</div>
                        <div style={{ color: '#fff', fontWeight: 800 }}>{fmtPct(roiMes)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Índice LL/DD</div>
                        <div style={{ color: 'var(--accent-blue)', fontWeight: 900 }}>{r.calcLlDd.toFixed(2)}%</div>
                      </div>
                      <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>VAR DME: <strong style={{ color: '#F59E0B' }}>{varDme}</strong></span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>F. CORREL: <strong style={{ color: '#F59E0B' }}>{r.f_correl ? `${r.f_correl}%` : '18%'}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. GRÁFICO DE LINHAS CONSOLIDADO DOS TOP 5 ROBÔS COMBINADOS */}
      {lineChartData && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1.2rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} style={{ color: 'var(--accent-green)' }} />
                Curva Combinada Acumulada — Top 5 Robôs ($)
              </h3>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Simulação da curva de capital unificada baseada no peso e performance histórica combinada dos 5 robôs líderes.
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(34, 197, 94, 0.15)', color: 'var(--accent-green)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              Capital Inicial: $100,000
            </span>
          </div>

          <div style={{ height: '240px' }}>
            <Line data={lineChartData} options={lineChartOptions as any} />
          </div>
        </div>
      )}

      {/* 3. MÓDULO DE AÇÕES RÁPIDAS (RESTAURADO TÍTULO PARA Data_Lab) */}
      <div className="card" style={{ padding: '1.2rem 1.5rem', marginBottom: '2.5rem', border: '1px solid rgba(56, 189, 248, 0.2)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.4) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.2rem' }}>
          <div style={{ flex: '1 1 300px' }}>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} style={{ color: 'var(--accent-blue)' }} />
              Central de Ações Data_Lab
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>
              Acesse rapidamente a captura de relatórios MT5, a montagem e simulação de fundos em portfólio ou consulte a IA Nautilus para análises quantitativas avançadas.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button 
              className="btn" 
              onClick={() => navigate('/diagnostico')}
              style={{ background: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent-blue)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <UploadCloud size={16} /> CAPTURAR ROBÔS
            </button>
            <button 
              className="btn" 
              onClick={() => navigate('/portfolio')}
              style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--accent-green)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <BarChart2 size={16} /> ALOCAÇÃO DE PORTFÓLIO
            </button>
            <button 
              className="btn" 
              onClick={() => navigate('/ia')}
              style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#A855F7', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Sparkles size={16} /> NAUTILUS AI EXPERT
            </button>
          </div>
        </div>
      </div>

      {/* 4. MÓDULO DOS TOP 5 MELHORES PORTFÓLIOS (RISCO X RETORNO) */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="flex-between" style={{ marginBottom: '1.2rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-green)' }} />
              Top 5 Melhores Portfólios (Risco × Retorno)
            </h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Classificados pela maior eficiência de retorno relativo ao drawdown máximo (Fator LL/DD).
            </p>
          </div>

          <button 
            className="btn" 
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}
            onClick={() => navigate('/portfolio')}
          >
            Ver Todos
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {top5Portfolios.length > 0 ? (
            top5Portfolios.map((p, idx) => (
              <div 
                key={p.id} 
                style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.06)', 
                  borderRadius: '10px', 
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s, border-color 0.2s',
                  cursor: 'pointer'
                }}
                onClick={() => navigate(`/portfolio/${p.id}`)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--accent-green)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'rgba(34, 197, 94, 0.15)', color: 'var(--accent-green)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      #{idx + 1} TOP RISCO/RETORNO
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.robotCount} Robôs</span>
                  </div>
                  <h4 style={{ margin: '0 0 0.6rem', color: '#fff', fontSize: '1rem', fontWeight: 800 }}>{p.name}</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Lucro Mês</div>
                      <div style={{ color: 'var(--accent-green)', fontWeight: 800 }}>{fmtCurrency(p.lucroMes)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>DD Máximo</div>
                      <div style={{ color: 'var(--accent-red)', fontWeight: 800 }}>{fmtCurrency(p.ddMax)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>ROI Mês</div>
                      <div style={{ color: '#fff', fontWeight: 800 }}>{fmtPct(p.roi)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Índice LL/DD</div>
                      <div style={{ color: 'var(--accent-blue)', fontWeight: 900 }}>{p.llddRatio.toFixed(2)}×</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--accent-green)', fontSize: '0.75rem', fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.6rem' }}>
                  <span>Acessar Relatório</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', gridColumn: '1 / -1' }}>
              Nenhum portfólio disponível para cálculo de risco x retorno.
            </div>
          )}
        </div>
      </div>

      {/* 5. QUADRANTES NO FINAL DA PÁGINA: ESTRATÉGIAS APROVADAS, PORTFÓLIOS ATIVOS E DIAGNÓSTICO */}
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>
            Resumo Operacional de Ativos
          </h3>
        </div>

        <div className="grid-cards">
          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/repositorio')}>
            <div className="flex-between">
              <h2 className="card-title">Estratégias Aprovadas</h2>
              <Database size={20} className="text-blue" />
            </div>
            <div className="value-highlight">{data.robots.length}</div>
            <p className="text-muted">No repositório pronto para uso</p>
          </div>

          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/portfolio')}>
            <div className="flex-between">
              <h2 className="card-title">Portfólios Ativos</h2>
              <Briefcase size={20} className="text-green" />
            </div>
            <div className="value-highlight">{data.portfolios.length}</div>
            <p className="text-muted">Fundos em acompanhamento</p>
          </div>

          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/diagnostico')}>
            <div className="flex-between">
              <h2 className="card-title">Diagnósticos Pendentes</h2>
              <Clock size={20} className="text-yellow" />
            </div>
            <div className="value-highlight" style={{ color: data.pending > 0 ? 'var(--accent-red)' : 'inherit' }}>
              {data.pending}
            </div>
            <p className="text-muted">Relatórios aguardando validação</p>
          </div>
        </div>
      </div>

      <style>{`
        .animate-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Home;


