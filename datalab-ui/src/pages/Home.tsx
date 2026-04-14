import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart2, Activity, DollarSign, Command, 
  UploadCloud, Briefcase, Sparkles, TrendingUp, 
  ChevronRight, Database, Clock, ArrowUpRight
} from 'lucide-react';
import { fetchRobots, fetchPortfolios, fetchComparativo } from '../api';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, 
  Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const fmt = (v: any) => {
  const n = Number(v);
  if (isNaN(n)) return '0';
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const Home = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    robots: [] as any[],
    portfolios: [] as any[],
    pending: 0,
    loading: true
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [robots, portfolios, comparativo] = await Promise.all([
          fetchRobots(),
          fetchPortfolios(),
          fetchComparativo()
        ]);
        
        setData({
          robots,
          portfolios,
          pending: comparativo.filter((r: any) => r.status === 'pending').length,
          loading: false
        });
      } catch (e) {
        console.error('Error loading dashboard data:', e);
        setData(prev => ({ ...prev, loading: false }));
      }
    };
    loadData();
  }, []);

  const totalMonthlyProfit = data.robots.reduce((sum, r) => sum + (r.avg_profit_per_month || 0), 0);
  const topRobots = [...data.robots]
    .sort((a, b) => (b.avg_profit_per_month || 0) - (a.avg_profit_per_month || 0))
    .slice(0, 5);

  const chartData = {
    labels: topRobots.map(r => r.name.length > 12 ? r.name.slice(0, 10) + '..' : r.name),
    datasets: [{
      label: 'Lucro Mensal ($)',
      data: topRobots.map(r => r.avg_profit_per_month || 0),
      backgroundColor: 'rgba(56, 189, 248, 0.6)',
      borderColor: 'var(--accent-blue)',
      borderWidth: 1,
      borderRadius: 4,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => ` $${fmt(context.raw)}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748B', font: { size: 10 }, callback: (v: any) => `$${v}` } }
    }
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
    <div className="animate-in">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="section-title" style={{ marginBottom: '0.5rem' }}>Visão Geral</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Bem-vindo ao centro de comando DataLab. Monitore suas estratégias e gerencie ativos de forma integrada.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid-cards" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="flex-between">
            <h2 className="card-title">Estratégias Aprovadas</h2>
            <Database size={20} className="text-blue" />
          </div>
          <div className="value-highlight">{data.robots.length}</div>
          <p className="text-muted">No repositório</p>
        </div>

        <div className="card">
          <div className="flex-between">
            <h2 className="card-title">Portfólios Ativos</h2>
            <Briefcase size={20} className="text-green" />
          </div>
          <div className="value-highlight">{data.portfolios.length}</div>
          <p className="text-muted">Total gerido</p>
        </div>

        <div className="card">
          <div className="flex-between">
            <h2 className="card-title">Diagnósticos Pendentes</h2>
            <Clock size={20} className="text-yellow" />
          </div>
          <div className="value-highlight" style={{ color: data.pending > 0 ? 'var(--accent-red)' : 'inherit' }}>
            {data.pending}
          </div>
          <p className="text-muted">Aguardando validação</p>
        </div>

        <div className="card">
          <div className="flex-between">
            <h2 className="card-title">Lucro Médio Estimado</h2>
            <TrendingUp size={20} className="text-green" />
          </div>
          <div className="value-highlight text-profit">${fmt(totalMonthlyProfit)}</div>
          <p className="text-muted">Total/mês (Repositório)</p>
        </div>
      </div>

      {/* Action Center */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.2rem', marginBottom: '2.5rem' }}>
        <div className="card action-card" onClick={() => navigate('/diagnostico')} style={{ cursor: 'pointer', border: '1px solid rgba(56, 189, 248, 0.1)', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(0,0,0,0) 100%)' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.2rem' }}>
            <UploadCloud className="text-blue" size={24} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#fff' }}>Capturar Robôs</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '1rem' }}>Inicie o diagnóstico de novos relatórios MT5 (HTML/CSV).</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-blue)', fontSize: '0.8rem', fontWeight: 700 }}>
            ABRIR DIAGNÓSTICO <ChevronRight size={14} />
          </div>
        </div>

        <div className="card action-card" onClick={() => navigate('/portfolio')} style={{ cursor: 'pointer', border: '1px solid rgba(34, 197, 94, 0.1)', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(0,0,0,0) 100%)' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.2rem' }}>
            <BarChart2 className="text-green" size={24} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#fff' }}>Alocação de Portfólio</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '1rem' }}>Crie portfólios robustos e simule curvas de capital combinadas.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-green)', fontSize: '0.8rem', fontWeight: 700 }}>
            GERENCIAR FUNDOS <ChevronRight size={14} />
          </div>
        </div>

        <div className="card action-card" onClick={() => navigate('/ia')} style={{ cursor: 'pointer', border: '1px solid rgba(168, 85, 247, 0.1)', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(0,0,0,0) 100%)' }}>
          <div style={{ background: 'rgba(168, 85, 247, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.2rem' }}>
            <Sparkles style={{ color: '#A855F7' }} size={24} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#fff' }}>Nautilus AI Expert</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '1rem' }}>Análise quantitativa profunda via IA para insights imediatos.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#A855F7', fontSize: '0.8rem', fontWeight: 700 }}>
            CONSULTAR IA <ChevronRight size={14} />
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '1.5rem' }}>
        
        {/* Performance Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Top 5 Robôs por Performance ($)</h3>
            <ArrowUpRight size={18} className="text-blue" />
          </div>
          <div style={{ height: '300px' }}>
            {data.robots.length > 0 ? (
              <Bar data={chartData} options={chartOptions as any} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Nenhum dado disponível.
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity / Portfolios */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Últimas Atividades / Portfólios</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {data.portfolios.length > 0 ? (
              data.portfolios.slice(0, 5).map(p => (
                <div key={p.id} className="flex-between" style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.2rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Capital: ${fmt(p.capital)}</div>
                  </div>
                  <button className="btn" style={{ fontSize: '0.7rem', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.05)' }} onClick={() => navigate(`/portfolio/${p.id}`)}>
                    Ver Detalhes
                  </button>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                Nenhum portfólio criado ainda.
              </div>
            )}
            
            {data.portfolios.length > 0 && (
              <button 
                className="btn" 
                style={{ width: '100%', marginTop: '0.5rem', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(56, 189, 248, 0.2)' }}
                onClick={() => navigate('/portfolio')}
              >
                Ver Todos os Portfólios
              </button>
            )}
          </div>
        </div>

      </div>

      <style>{`
        .action-card {
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .action-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,0.15);
        }
        .animate-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
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

