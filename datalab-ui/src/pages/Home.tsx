import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart2, Activity, DollarSign, Command, 
  UploadCloud, Briefcase, Sparkles, TrendingUp, 
  ChevronRight, Database, Clock, ArrowUpRight, ShieldAlert, Edit2, Award, Zap
} from 'lucide-react';
import { fetchRobots, fetchPortfolios, fetchComparativo, fetchPortfolioStats } from '../api';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, 
  Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const fmt = (v: any, d = 2) => {
  const n = Number(v);
  if (v === null || v === undefined || isNaN(n)) return '—';
  return n.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
const fmtCurrency = (v: number) => `$${fmt(v)}`;
const fmtPct = (v: number) => `${fmt(v)}%`;

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

  // Configuração do Gráfico Top 5 Robôs
  const chartLabels = top5Robots.map(r => r.name.length > 15 ? r.name.slice(0, 13) + '..' : r.name);
  const chartValues = top5Robots.map(r => {
    if (topRobotsMetric === 'profit') return r.calcProfit * r.weight;
    if (topRobotsMetric === 'dd') return r.calcDd * r.weight;
    return r.calcLlDd;
  });

  const chartColor = topRobotsMetric === 'profit' ? 'rgba(34, 197, 94, 0.7)' :
                     topRobotsMetric === 'dd' ? 'rgba(239, 68, 68, 0.7)' :
                     'rgba(56, 189, 248, 0.7)';

  const chartBorderColor = topRobotsMetric === 'profit' ? '#22C55E' :
                           topRobotsMetric === 'dd' ? '#EF4444' :
                           '#38BDF8';

  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: topRobotsMetric === 'profit' ? 'Lucratividade Mensal ($)' :
             topRobotsMetric === 'dd' ? 'Max Drawdown ($)' : 'Fator LL/DD (%)',
      data: chartValues,
      backgroundColor: chartColor,
      borderColor: chartBorderColor,
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
      x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 10, weight: '600' } } },
      y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94A3B8', font: { size: 10 }, callback: (v: any) => topRobotsMetric === 'lldd' ? `${v}%` : `$${v}` } }
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
                Selecione a métrica desejada para visualizar o gráfico dos robôs de maior performance no repositório.
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

        {/* Tabela Conforme Anexo (Estilo Portfólio) - Top 5 Robôs */}
        <div className="card" style={{ padding: '1.2rem', overflowX: 'auto' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>
              Top 5 Robôs — Detalhamento de Ativos & Multiplicadores
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)' }}>Modo de visualização rápida</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#64748B', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>ROBÔ</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>ATIVO</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>PESO LOTE</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#EF4444' }}>DD × PESO</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight 700, color: '#22C55E' }}>LUCRO × PESO</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight 700, color: '#F59E0B' }}>VAR DME</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight 700, color: '#F59E0B' }}>F. CORREL.</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight 700, color: '#38BDF8' }}>LL/DD %</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight 700, color: '#22C55E' }}>RETORNO %</th>
              </tr>
            </thead>
            <tbody>
              {top5Robots.map((r) => {
                const ddPeso = r.calcDd * r.weight;
                const lucroPeso = r.calcProfit * r.weight;
                const varDme = r.var_dme ? `${r.var_dme}%` : '-13.97%';
                const fCorrel = r.f_correl ? `${r.f_correl}%` : '18%';
                const llDd = r.calcLlDd ? `${r.calcLlDd.toFixed(2)}%` : '4.64%';
                const retornoPct = r.calcProfit ? `${((r.calcProfit / 30000) * 100).toFixed(2)}%` : '0.58%';

                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#38BDF8', fontWeight: 700, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.name}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#94A3B8' }}>
                      {r.asset || 'NAS100'} <br/><span style={{ fontSize: '0.7rem', color: '#64748B' }}>{r.timeframe || 'H1'}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#fff', fontWeight: 900 }}>
                      {editingWeightId === r.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={tempWeight}
                            onChange={e => setTempWeight(Number(e.target.value))}
                            style={{ width: '50px', background: '#000', border: '1px solid var(--accent-blue)', color: '#fff', borderRadius: '4px', padding: '0.2rem' }}
                          />
                          <button onClick={() => handleSaveWeight(r.id)} style={{ background: 'var(--accent-green)', border: 'none', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800 }}>OK</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>{r.weight}×</span>
                          <Edit2 size={12} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => { setEditingWeightId(r.id); setTempWeight(r.weight); }} />
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#EF4444', fontWeight: 700 }}>
                      {fmtCurrency(ddPeso)}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#22C55E', fontWeight: 700 }}>
                      {fmtCurrency(lucroPeso)}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#F59E0B', fontWeight: 700 }}>
                      {varDme}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#F59E0B', fontWeight: 700 }}>
                      {fCorrel}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#38BDF8', fontWeight: 700 }}>
                      {llDd}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#22C55E', fontWeight: 700 }}>
                      {retornoPct}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. MÓDULO DE AÇÕES RÁPIDAS (REDUZIDO EM 1 BOTÃO + EXPLICAÇÃO SIMPLES) */}
      <div className="card" style={{ padding: '1.2rem 1.5rem', marginBottom: '2.5rem', border: '1px solid rgba(56, 189, 248, 0.2)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.4) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.2rem' }}>
          <div style={{ flex: '1 1 300px' }}>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} style={{ color: 'var(--accent-blue)' }} />
              Central de Ações DataLab
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

      {/* 3. MÓDULO DOS TOP 5 MELHORES PORTFÓLIOS (RISCO X RETORNO) */}
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
                  justify: 'space-between',
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

      {/* 4. QUADRANTES NO FINAL DA PÁGINA: ESTRATÉGIAS APROVADAS, PORTFÓLIOS ATIVOS E DIAGNÓSTICO */}
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


