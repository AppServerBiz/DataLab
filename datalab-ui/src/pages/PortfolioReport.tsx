import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler, BarElement, ArcElement
} from 'chart.js';
import { Printer, Download, X, Loader2, RefreshCw, Globe } from 'lucide-react';
import { ProfitabilityChart } from '../components/ProfitabilityChart';
import { fetchPortfolios, fetchPortfolioStats } from '../api';
import { useLanguage, type Language } from '../LanguageContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const fmt = (v: any, d = 2) => {
  const n = Number(v);
  if (v === null || v === undefined || isNaN(n) || (n === 0 && !v && v !== 0 && v !== '0')) return '—';
  return n.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
const fmtCurrency = (v: number) => `$${fmt(v)}`;
const fmtPct = (v: number) => `${fmt(v)}%`;

const ROBOT_COLORS = [
  '#38BDF8', '#22C55E', '#F59E0B', '#EF4444', '#A855F7', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#0EA5E9', '#10B981', '#D946EF', '#F43F5E', '#8B5CF6'
];

const corrColor = (v: number) => {
  if (v >= 0.7) return 'rgba(239,68,68,1)';
  if (v >= 0.4) return 'rgba(245,158,11,1)';
  if (v >= 0.1) return 'rgba(148,163,184,1)';
  if (v >= -0.1) return 'rgba(34,197,94,1)';
  return 'rgba(34,197,94,1)';
};
const corrTextColor = (v: number) => v >= 0.4 ? '#fff' : '#000';

// Color for risk contribution values in print (solid colors since background is white paper)
const riskColorPrint = (val: number) => {
  const v = Number(val);
  if (isNaN(v)) return '#f8fafc';
  if (v > 15) return '#fecaca'; // Soft Red
  if (v > 5) return '#fef3c7';  // Soft Amber
  if (v > 0) return '#fffbeb';  // Extra Soft Amber
  if (v < -5) return '#bbf7d0'; // Soft Green
  if (v < 0) return '#f0fdf4';  // Extra Soft Green
  return '#f8fafc';             // Slate 50
};
const riskTextColorPrint = (val: number) => {
  const v = Number(val);
  if (isNaN(v)) return '#000';
  if (v > 15) return '#991b1b'; // Dark Red
  if (v > 5) return '#92400e';  // Dark Amber
  if (v < -5) return '#166534'; // Dark Green
  return '#000';
};

// Print-friendly colors for drawdown risk matrix
const ddRiskColorPrint = (val: number, capital: number) => {
  const v = Number(val);
  const cap = Number(capital) || 30000;
  if (isNaN(v)) return '#f8fafc';
  const ratio = Math.abs(v) / (cap * 0.05 || 1);
  const alpha = Math.min(0.9, ratio * 0.7 + 0.1);
  if (v > 0) {
    return `rgba(239, 68, 68, ${alpha})`; // Red
  } else if (v < 0) {
    return `rgba(34, 197, 94, ${alpha})`;  // Green
  }
  return '#f8fafc';
};
const ddRiskTextColorPrint = (val: number, capital: number) => {
  const v = Number(val);
  const cap = Number(capital) || 30000;
  const ratio = Math.abs(v) / (cap * 0.05 || 1);
  return ratio > 0.4 ? '#fff' : '#000';
};

const PortfolioReport = () => {
  const { language, setLanguage, t } = useLanguage();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const portfolioIdFromUrl = params.portfolioId || searchParams.get('id');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Verificar se temos dados no localStorage que correspondem ao portfólio
      const raw = localStorage.getItem('portfolio_report_data');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.portfolio && parsed.stats) {
            // Se foi fornecido um ID na URL, certifique-se de que corresponde ao ID em cache
            if (!portfolioIdFromUrl || parsed.portfolio.id === portfolioIdFromUrl) {
              setData(parsed);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('Falha ao ler cache do relatório:', e);
        }
      }

      // 2. Se não temos cache ou o ID é diferente, buscar diretamente via API
      const targetId = portfolioIdFromUrl || 'pf_1790114022204_8jxmgs';
      if (!targetId) {
        throw new Error('Nenhum identificador de portfólio especificado.');
      }

      const [allPortfolios, statsRes] = await Promise.all([
        fetchPortfolios(),
        fetchPortfolioStats(targetId)
      ]);

      const foundPortfolio = Array.isArray(allPortfolios) 
        ? allPortfolios.find((p: any) => p.id === targetId)
        : null;

      if (!foundPortfolio) {
        throw new Error(`Portfólio "${targetId}" não encontrado.`);
      }

      const freshData = {
        portfolio: foundPortfolio,
        stats: statsRes
      };

      setData(freshData);
      localStorage.setItem('portfolio_report_data', JSON.stringify(freshData));
    } catch (err: any) {
      console.error('Erro ao carregar dados do relatório:', err);
      setError(err?.response?.data?.error || err.message || 'Erro ao carregar portfólio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [portfolioIdFromUrl]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', color: '#64748b' }}>
        <Loader2 size={36} className="spin-animation" style={{ color: '#0284c7', marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
        <h3 style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>Gerando Relatório Quantitativo...</h3>
        <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.9rem' }}>Carregando dados estatísticos e curvas consolidadas</p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', color: '#64748b' }}>
        <p style={{ color: '#ef4444', fontWeight: 600 }}>{error || 'Aguardando dados do portfólio...'}</p>
        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
          <button 
            onClick={loadData} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', border: '1px solid #0284c7', background: '#0284c7', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
          >
            <RefreshCw size={14} /> Tentar Novamente
          </button>
          <button 
            onClick={() => window.close()} 
            style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
          >
            Fechar Aba
          </button>
        </div>
      </div>
    );
  }

  const { portfolio, stats } = data;
  const totals = stats?.totals;
  const robots = stats?.robots ?? [];

  // Compute Drawdown Correlation Risk Matrix ($)
  const matrices = (() => {
    if (!stats?.correlation || Object.keys(stats.correlation).length === 0) return null;
    const rNames = Object.keys(stats.correlation);
    if (rNames.length === 0) return null;

    const corr = stats.correlation;
    const capital = Number(portfolio?.capital || 30000);

    const ddCorrelationRisk: { [rA: string]: { [rB: string]: number } } = {};
    rNames.forEach(rA => {
      ddCorrelationRisk[rA] = {};
      const robotA = robots.find((r: any) => r.name === rA);
      const ddA = Number(robotA?.max_dd_from_csv || robotA?.max_dd_equity || 0);
      const wA = robotA?.weight ?? 1;

      rNames.forEach(rB => {
        const robotB = robots.find((r: any) => r.name === rB);
        const ddB = Number(robotB?.max_dd_from_csv || robotB?.max_dd_equity || 0);
        const wB = robotB?.weight ?? 1;

        if (rA === rB) {
          // Diagonal: Weighted Drawdown
          ddCorrelationRisk[rA][rB] = ddA * wA;
        } else {
          // Off-diagonal: Correlation Drawdown Risk Impact (Geometric Mean in $)
          const baseCorr = corr?.[rA]?.[rB] ?? 0;
          ddCorrelationRisk[rA][rB] = baseCorr * Math.sqrt((ddA * wA) * (ddB * wB));
        }
      });
    });

    return {
      ddCorrelationRisk
    };
  })();

  const getPrintChartOptions = (originalOptions: any = {}) => ({
    ...originalOptions,
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      ...originalOptions.plugins,
      legend: { 
        display: originalOptions.plugins?.legend?.display ?? true,
        position: originalOptions.plugins?.legend?.position ?? 'top',
        labels: { color: '#000', font: { size: 10, weight: 'bold' } } 
      }
    },
    scales: {
      x: { 
        border: { display: true, color: '#000', width: 1.5 },
        grid: { color: '#f0f0f0' },
        ticks: { color: '#000', font: { size: 9, weight: '600' } }
      },
      y: { 
        border: { display: true, color: '#000', width: 1.5 },
        grid: { color: '#f0f0f0' },
        ticks: { color: '#000', font: { size: 9, weight: '600' } }
      }
    }
  });


  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'pt', label: 'PT', flag: '🇧🇷' },
    { code: 'en', label: 'EN', flag: '🇺🇸' },
    { code: 'es', label: 'ES', flag: '🇪🇸' }
  ];

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: '40px 0' }}>

      {/* Floating Control Toolbar (No Print) */}
      <div className="no-print" style={{
        position: 'sticky',
        top: '20px',
        zIndex: 1000,
        width: '794px',
        margin: '0 auto 20px auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#13171F',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '10px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        {/* Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>
            <Globe size={14} />
            <span>{t('sidebar.language', 'Idioma')}:</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                style={{
                  background: language === lang.code ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                  color: language === lang.code ? '#000' : '#cbd5e1',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Print / Close Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#22c55e',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <Printer size={14} /> {t('transmit.print', 'Imprimir')} / PDF
          </button>
          <button
            onClick={() => window.close()}
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {t('common.cancel', 'Fechar')}
          </button>
        </div>
      </div>

      {/* Main Report Document */}
      <div 
        id="report-content" 
        style={{ 
          width: '794px', 
          margin: '0 auto', 
          background: '#fff', 
          padding: '40px', 
          boxShadow: '0 0 40px rgba(0,0,0,0.05)',
          minHeight: '297mm',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#000'
        }}
      >
        {/* Header Style "Big Bank" */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #000', paddingBottom: '15px', marginBottom: '35px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '3px', color: '#64748b', textTransform: 'uppercase' }}>DATA_LAB</div>
            <div style={{ fontSize: '38px', fontWeight: '900', color: '#000', lineHeight: 1, letterSpacing: '-1px' }}>Nautilus</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{t('report.perfAnalysis', 'Performance Analysis')}</h1>
            <div style={{ fontSize: '13px', color: '#334155', fontWeight: '700', marginTop: '4px' }}>{portfolio.name} · {t('report.quantInvestments', 'Investimentos Quantitativos')}</div>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('report.issuedAt', 'Relatório emitido em:')} {new Date().toLocaleString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Global Targets section */}
        <div style={{ display: 'flex', gap: '50px', marginBottom: '45px' }}>
           <div style={{ borderLeft: '4px solid #000', paddingLeft: '18px' }}>
             <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>{t('portfolio.fundCapital', 'Capital Alocado')}</div>
             <div style={{ fontSize: '28px', fontWeight: '900' }}>{fmtCurrency(portfolio.capital)}</div>
           </div>
           <div style={{ borderLeft: '4px solid #000', paddingLeft: '18px' }}>
             <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>{t('portfolio.targetDD', 'Drawdown Alvo')}</div>
             <div style={{ fontSize: '28px', fontWeight: '900' }}>{fmtCurrency(portfolio.target_dd)}</div>
           </div>
        </div>

        {/* Key Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#e2e8f0', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '45px' }}>
          {[
            { label: t('portfolio.monthlyProfit', 'Lucro Méd. Mês'), value: fmtCurrency(totals?.lucroMes || 0), color: (totals?.lucroMes || 0) >= 0 ? '#10b981' : '#ef4444' },
            { label: t('common.roi', 'ROI Mês'), value: fmtPct(totals?.roiMes || 0), color: (totals?.roiMes || 0) >= 0 ? '#10b981' : '#ef4444' },
            { label: t('portfolio.maxDD', 'DD Máx Portfólio'), value: fmtCurrency(totals?.ddMaxPortfolio || 0), color: '#ef4444' },
            { label: t('portfolio.ddMaxPct', 'DD Máx %'), value: fmtPct(totals?.ddMaxPct || 0), color: '#ef4444' },
            
            { label: t('portfolio.ddMaxSumDollar', 'DD Soma Individual'), value: fmtCurrency(robots.reduce((s: any, r: any) => s + Number(r.max_dd_from_csv || r.max_dd_equity || 0) * r.weight, 0)), color: '#ef4444' },
            { label: t('portfolio.ddMaxSumPct', 'DD Soma %'), value: fmtPct(robots.reduce((s: any, r: any) => s + Number(r.max_dd_from_csv || r.max_dd_equity || 0) * r.weight, 0) / portfolio.capital * 100), color: '#ef4444' },
            { 
              label: t('portfolio.var95', 'VaR 95% (Prob.)'), 
              value: (
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1' }}>
                  <span>{fmtPct(totals?.var95 || 0)}</span>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', marginTop: '3px' }}>
                    {fmtCurrency((totals?.var95 || 0) / 100 * portfolio.capital)}
                  </span>
                </div>
              ), 
              color: '#f59e0b' 
            },
            { label: t('portfolio.riskBudget', 'Risk Budget Atual'), value: fmtCurrency(totals?.dme || portfolio.manual_dme || 0), color: '#0f172a' },

            { label: t('portfolio.llddFactor', 'Fator LL/DD'), value: fmt(totals?.llDdPct || 0) + '%', color: '#0b57d0' },
            { label: t('portfolio.totalTrades', 'Total Trades'), value: String(robots.reduce((s: any, r: any) => s + Number(r.total_trades || 0), 0)), color: '#0f172a' },
            { label: t('portfolio.sumLots', 'Soma Lotes'), value: fmt(robots.reduce((s: any, r: any) => s + Number(r.total_lots || 0) * (r.weight || 1), 0), 2), color: '#0f172a' },
            { label: t('portfolio.lotsMonth', 'Lotes Mês'), value: fmt(robots.reduce((s: any, r: any) => s + Number(r.lots_per_month || 0) * (r.weight || 1), 0), 2), color: '#0f172a' },
          ].map(m => (
            <div key={m.label} style={{ background: '#fff', padding: '15px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800', marginBottom: '5px' }}>{m.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Portfolio Table */}
        <div style={{ marginBottom: '60px' }}>
          <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
            {t('report.detailedComposition', 'Composição Detalhada do Portfólio')}
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '900' }}>{t('portfolio.thRobot', 'ESTRATÉGIA (ROBÔ)')}</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '900' }}>{t('portfolio.thAsset', 'ATIVO')}</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '900' }}>{t('common.weight', 'PESO')}</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: '900' }}>{t('portfolio.thDDWeight', 'DD ESTIMADO')}</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: '900' }}>{t('portfolio.thProfitWeight', 'LUCRO ESTIMADO')}</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: '900' }}>{t('portfolio.thReturnPct', 'RETORNO %')}</th>
              </tr>
            </thead>
            <tbody>
              {robots.map((r: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', fontWeight: '800' }}>{r.name}</td>
                  <td style={{ padding: '10px', color: '#475569' }}>{r.asset} · {r.timeframe}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: '900', color: '#0f172a' }}>{r.weight}×</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#ef4444', fontWeight: '700' }}>{fmtCurrency((r.max_dd_from_csv || r.max_dd_equity || 0) * r.weight)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#10b981', fontWeight: '700' }}>{fmtCurrency(r.avg_profit_per_month * r.weight)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: '900' }}>{fmtPct(r.avg_profit_per_month * r.weight / (portfolio.capital || 1) * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Charts - Page 1 */}
        <div style={{ marginBottom: '60px', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
            {t('report.consolidatedEquity', 'Curva de Patrimônio Consolidado (Closing Balance)')}
          </h3>
          <div style={{ height: '350px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '15px' }}>
            <Line 
              data={{ 
                labels: (stats?.combined_curve || []).map((c: any) => c.day), 
                datasets: [{ label: `${t('common.capital', 'Patrimônio')} ($)`, data: (stats?.combined_curve || []).map((c: any) => portfolio.capital + (c.balanceProfit || c.profit || 0)), borderColor: '#000', backgroundColor: 'rgba(0,0,0,0.02)', fill: true, pointRadius: 0, borderWidth: 2.5 }] 
              }} 
              options={getPrintChartOptions({ plugins: { legend: { display: false } } })}
            />
          </div>
        </div>

        <div style={{ marginBottom: '60px', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
            {t('portfolio.chartIndividualRobots', 'Curva Individual por Robô ($)')}
          </h3>
          <div style={{ height: '350px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '15px' }}>
            <Line 
              data={{ 
                labels: (stats?.combined_curve || []).map((c: any) => c.day), 
                datasets: Object.entries(stats?.robot_curves || {}).map(([name, curve]: any, idx: number) => ({
                  label: name,
                  data: Array.isArray(curve) ? curve.map((pt: any) => (pt?.balanceProfit || 0) + (portfolio.capital / (robots?.length || 1))) : [], 
                  borderColor: ROBOT_COLORS[idx % ROBOT_COLORS.length],
                  borderWidth: 1.5,
                  pointRadius: 0,
                  fill: false
                }))
              }} 
              options={getPrintChartOptions({ plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 8 } } } } })}
            />
          </div>
        </div>

        {/* Rentabilidade Histórica Table for Report */}
        {stats?.monthly_returns && stats.monthly_returns.length > 0 && (
          <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
              {t('report.monthlyTableTitle', 'Rentabilidade Histórica Mês a Mês')}
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <thead>
                <tr style={{ background: '#334155', color: '#fff', textAlign: 'center' }}>
                  <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: '900' }}>{t('portfolio.year', 'ANO')}</th>
                  {(language === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : language === 'es' ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] : ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']).map(m => (
                    <th key={m} style={{ padding: '6px 2px', fontWeight: '800' }}>{m}</th>
                  ))}
                  <th style={{ padding: '6px 4px', fontWeight: '900', borderLeft: '1px solid #475569' }}>{t('portfolio.yearTotal', 'No ano')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.monthly_returns.map((row: any) => (
                  <React.Fragment key={row.year}>
                    {/* Row 1: % Return (Amarelo/Gold, 5% maior, primeiro) */}
                    <tr style={{ background: '#fff', borderTop: '1px solid #cbd5e1' }}>
                      <td rowSpan={3} style={{ padding: '4px 6px', fontWeight: '900', fontSize: '10px', verticalAlign: 'middle', borderRight: '1px solid #cbd5e1', background: '#f8fafc' }}>
                        {row.year}
                      </td>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                        const cell = row.months[m];
                        if (!cell) return <td key={m} style={{ padding: '3px 2px', textAlign: 'center', color: '#94a3b8' }}>—</td>;
                        return (
                          <td key={m} style={{ padding: '3px 2px', textAlign: 'center', color: '#d97706', fontWeight: '800', fontSize: '9px' }}>
                            {fmtPct(cell.pct)}
                          </td>
                        );
                      })}
                      <td style={{ padding: '3px 4px', textAlign: 'center', color: '#d97706', fontWeight: '900', borderLeft: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '9.5px' }}>
                        {fmtPct(row.yearTotal.pct)}
                      </td>
                    </tr>

                    {/* Row 2: Profit (Sem cifrão $) */}
                    <tr style={{ background: '#fff' }}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                        const cell = row.months[m];
                        if (!cell) return <td key={m} style={{ padding: '2px', textAlign: 'center', color: '#94a3b8' }}>—</td>;
                        return (
                          <td key={m} style={{ padding: '2px', textAlign: 'center', color: cell.profit >= 0 ? '#166534' : '#991b1b', fontWeight: '700', fontSize: '8px' }}>
                            {fmt(cell.profit)}
                          </td>
                        );
                      })}
                      <td style={{ padding: '2px 4px', textAlign: 'center', color: row.yearTotal.profit >= 0 ? '#166534' : '#991b1b', fontWeight: '800', borderLeft: '1px solid #cbd5e1', fontSize: '8.5px', background: '#f8fafc' }}>
                        {fmt(row.yearTotal.profit)}
                      </td>
                    </tr>

                    {/* Row 3: Risk Budget (Sem cifrão $) */}
                    <tr style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                        const cell = row.months[m];
                        if (!cell) return <td key={m} style={{ padding: '2px', textAlign: 'center', color: '#94a3b8' }}>—</td>;
                        return (
                          <td key={m} style={{ padding: '2px', textAlign: 'center', color: '#b91c1c', fontSize: '7.5px' }}>
                            RB: {fmt(cell.dme)}
                          </td>
                        );
                      })}
                      <td style={{ padding: '2px 4px', textAlign: 'center', color: '#b91c1c', fontWeight: '700', borderLeft: '1px solid #cbd5e1', fontSize: '8px', background: '#f8fafc' }}>
                        RB: {fmt(row.yearTotal.dme)}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Rodapé explicativo abaixo da tabela */}
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '8.5px', color: '#475569', lineHeight: '1.4' }}>
              <div>💡 <strong>{t('portfolio.riskBudget', 'Risk Budget')}:</strong> {t('portfolio.riskBudgetNote', 'Representa o maior rebaixamento financeiro acumulado no mês (orçamento de risco consumido).')}</div>
              <div>ℹ️ <strong>{t('portfolio.calcNote', 'Nota de Cálculo: Os percentuais não consideram juros compostos; o cálculo é realizado assumindo o saque total do lucro mês a mês sobre o capital inicial.')}</strong></div>
              {robots.some((r: any) => r.has_incomplete_data) && (
                <div>* <strong>{t('portfolio.partialHistoryNote', 'Aviso de Histórico Parcial: Robôs com (*) possuem dados incompletos para todo o período.')}</strong></div>
              )}
            </div>
          </div>
        )}

        {/* Benchmark Profitability Chart (CDI / IBOV) */}
        {stats?.combined_curve && stats.combined_curve.length > 0 && (
          <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
              {t('report.benchmarkEvolution', 'Evolução de Rentabilidade Mensal vs Benchmarks')}
            </h3>
            <ProfitabilityChart
              portfolioName={portfolio?.name || 'ALPHA1 GOLD'}
              capital={Number(portfolio?.capital || 30000)}
              combinedCurve={stats?.combined_curve || []}
              printMode={true}
            />
          </div>
        )}

        <div style={{ pageBreakAfter: 'always' }}></div>

        {/* Charts - Page 2: Profit Analysis */}
        <div style={{ paddingTop: '20px' }}>
          <div style={{ marginBottom: '60px', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
                {t('report.top10ProfitTitle', 'Lucro Acumulado por Robô (Top 10)')}
              </h3>
            </div>
            <div style={{ height: '300px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '15px' }}>
              <Bar 
                data={{
                  labels: [...robots].sort((a,b) => (b.avg_profit_per_month * b.weight) - (a.avg_profit_per_month * a.weight)).slice(0, 10).map(r => r.name),
                  datasets: [{ label: `${t('portfolio.profit', 'Lucro')} ($)`, data: [...robots].sort((a,b) => (b.avg_profit_per_month * b.weight) - (a.avg_profit_per_month * a.weight)).slice(0, 10).map(r => r.avg_profit_per_month * r.weight), backgroundColor: ROBOT_COLORS, borderWidth: 1 }]
                }}
                options={getPrintChartOptions({
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        title: (items: any) => items[0]?.label || '',
                        label: (context: any) => ` ${t('portfolio.profit', 'Lucro')}: ${fmtCurrency(context.raw)}`
                      }
                    }
                  },
                  scales: {
                    x: {
                      border: { display: true, color: '#000', width: 1.5 },
                      grid: { color: '#f0f0f0' },
                      ticks: {
                        color: '#000',
                        font: { size: 9, weight: '600' },
                        callback: function(value: any) {
                          const label = this.getLabelForValue(value as number) || '';
                          return label.length > 15 ? label.slice(0, 13) + '..' : label;
                        }
                      }
                    }
                  }
                })}
              />
            </div>
          </div>

          <div style={{ marginBottom: '60px', pageBreakInside: 'avoid' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
              {t('report.profitDistTitle', 'Distribuição de Lucro Portfólio')}
            </h3>
            <div style={{ height: '350px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '15px', display: 'flex', justifyContent: 'center' }}>
              <Pie 
                data={{
                  labels: [...robots].sort((a,b) => (b.avg_profit_per_month * b.weight) - (a.avg_profit_per_month * a.weight)).slice(0, 10).map(r => r.name),
                  datasets: [{ data: [...robots].sort((a,b) => (b.avg_profit_per_month * b.weight) - (a.avg_profit_per_month * a.weight)).slice(0, 10).map(r => Math.max(0, r.avg_profit_per_month * r.weight)), backgroundColor: ROBOT_COLORS.map(c => c + 'DD'), borderWidth: 1 }]
                }}
                options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#000', font: { size: 10 }, boxWidth: 10 } } } }}
              />
            </div>
          </div>
        </div>

        <div style={{ pageBreakAfter: 'always' }}></div>

        {/* Charts - Page 3: Risk Analysis */}
        <div style={{ paddingTop: '20px' }}>
          <div style={{ marginBottom: '60px', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
                {t('report.realTimeExposure', 'Exposição ao Risco Consolidada (Drawdown Intra-day)')}
              </h3>
              <span title="Cálculo Consolidado: Soma aritmética direta dos drawdowns máximos diários individuais de cada robô no portfólio. Representa uma visão conservadora de pior cenário." style={{ cursor: 'help', fontSize: '10px', color: '#0b57d0', textDecoration: 'underline' }} className="no-print">{t('portfolio.howCalculated', 'Como é calculado?')}</span>
            </div>
            <div style={{ height: '300px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '15px' }}>
              <Line 
                data={{ 
                  labels: (stats?.combined_curve || []).map((c: any) => c.day), 
                  datasets: [{ label: 'Drawdown ($)', data: (stats?.combined_curve || []).map((c: any) => -(c.dd || 0)), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.05)', fill: true, pointRadius: 0, borderWidth: 1.5 }] 
                }} 
                options={getPrintChartOptions({ plugins: { legend: { display: false } }, scales: { y: { max: 0 } } })}
              />
            </div>
          </div>
 
          <div style={{ marginBottom: '60px', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
                {t('portfolio.chartIndividualDD', 'Drawdown Individual por Robô ($)')}
              </h3>
              <span title="Cálculo Individual: Plota o rebaixamento diário máximo de cada robô isoladamente, multiplicado por seu respectivo peso no portfólio." style={{ cursor: 'help', fontSize: '10px', color: '#0b57d0', textDecoration: 'underline' }} className="no-print">{t('portfolio.howCalculated', 'Como é calculado?')}</span>
            </div>
            <div style={{ height: '350px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '15px' }}>
              <Line 
                data={{
                  labels: (stats?.combined_curve || []).map((c: any) => c.day),
                  datasets: Object.entries(stats?.robot_curves || {}).map(([name, curve]: any, idx: number) => ({
                    label: name,
                    data: Array.isArray(curve) ? curve.map((pt: any) => -(pt.dd || 0)) : [],
                    borderColor: ROBOT_COLORS[idx % ROBOT_COLORS.length],
                    borderWidth: 1.2,
                    pointRadius: 0,
                    fill: false
                  }))
                }}
                options={getPrintChartOptions({
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 8 } } },
                    tooltip: {
                      callbacks: {
                        title: (items: any) => items[0]?.label || '',
                        label: (context: any) => ` ${context.dataset.label}: ${fmtCurrency(context.raw)}`
                      }
                    }
                  },
                  scales: { y: { max: 0 } }
                })}
              />
            </div>
          </div>

          <div style={{ marginBottom: '60px', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
                {t('portfolio.chartTop10DDDay', 'Top 10 maiores drawdowns (dia)')}
              </h3>
              <span title="Cálculo Diário: Identifica e ordena os maiores períodos de rebaixamento consolidado da curva diária do portfólio, e não por trade isolado." style={{ cursor: 'help', fontSize: '10px', color: '#0b57d0', textDecoration: 'underline' }} className="no-print">{t('portfolio.howCalculated', 'Como é calculado?')}</span>
            </div>
            <div style={{ height: '400px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '15px' }}>
              <Bar 
                data={{
                  labels: (stats?.top10DD || []).map((d: any) => d.day),
                  datasets: (robots || []).map((r: any, idx: number) => ({
                    label: r.name,
                    data: (stats.top10DD || []).map((d: any) => d[r.name] || 0),
                    backgroundColor: ROBOT_COLORS[idx % ROBOT_COLORS.length] + 'BB',
                    stack: 'Stack 0'
                  }))
                }}
                options={getPrintChartOptions({
                  indexAxis: 'y',
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 8 } } },
                    tooltip: {
                      callbacks: {
                        title: (items: any) => items[0]?.label || '',
                        label: (context: any) => ` ${context.dataset.label}: ${fmtCurrency(context.raw)}`
                      }
                    }
                  },
                  scales: { x: { stacked: true }, y: { stacked: true } }
                })}
              />
            </div>
          </div>
        </div>

        <div style={{ pageBreakAfter: 'always' }}></div>

        {/* Decision & Correlation - Page 4 */}
        <div style={{ paddingTop: '20px' }}>
          {/* Quadrante de Tomada de Decisão (Últimos 12 Meses) */}
          <div style={{ marginBottom: '60px', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <div style={{ width: '4px', height: '14px', background: '#0b57d0' }}></div>
                {t('report.recent12MTitle', 'Performance Recente (Últimos 12 Meses)')}
              </h3>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
                {t('portfolio.recentWindow', 'JANELA RECENTE')}: {totals?.recent?.days || 0} dias · {fmt(totals?.recent?.months || 0, 1)} {t('portfolio.months', 'meses')}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Robot Specific Recent Data */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '800' }}>{t('portfolio.thRobot', 'ROBÔ')}</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: '800' }}>{t('portfolio.profit', 'LUCRO')} (12M)</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: '800' }}>{t('portfolio.maxDDShort', 'MAX DD')} (12M)</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: '800' }}>VaR 95%</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: '800' }}>{t('portfolio.lots', 'LOTES')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(totals?.robotRecent || {}).map(([name, r]: any) => (
                    <tr key={name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{name.length > 20 ? name.slice(0, 18) + '..' : name}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: r.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>{fmtCurrency(r.profit)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#ef4444' }}>{fmtCurrency(r.maxDD)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b' }}>{fmtCurrency(r.var95)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>{fmt(r.lots, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Comparison Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', color: '#000' }}>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: '800', opacity: 0.6, marginBottom: '10px', color: '#64748b' }}>{t('report.periodComparison', 'Comparativo de Período')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '5px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '600', flex: 1.2 }}>{t('portfolio.metric', 'Métrica')}</span>
                    <span style={{ fontSize: '9px', fontWeight: '600', flex: 1, textAlign: 'right' }}>{t('portfolio.last12M', 'Últimos 12 Meses')}</span>
                    <span style={{ fontSize: '9px', fontWeight: '600', flex: 1, textAlign: 'right' }}>{t('portfolio.weightedRemaining', 'Restante Ponderado')}</span>
                    <span style={{ fontSize: '9px', fontWeight: '600', flex: 1, textAlign: 'right' }}>{t('portfolio.sumRemaining', 'Restante Soma')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', opacity: 0.7, flex: 1.2 }}>{t('portfolio.totalProfit', 'Lucro Total')}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: (totals?.recent?.profit || 0) >= 0 ? '#10b981' : '#ef4444', flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.recent?.profit || 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.past?.weightedProfit || 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.5, flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.past?.profit || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', opacity: 0.7, flex: 1.2 }}>{t('portfolio.numTrades', 'Número de Trades')}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', flex: 1, textAlign: 'right' }}>{fmt(totals?.recent?.trades || 0, 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, flex: 1, textAlign: 'right' }}>{fmt(totals?.past?.weightedTrades || 0, 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.5, flex: 1, textAlign: 'right' }}>{fmt(totals?.past?.trades || 0, 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', opacity: 0.7, flex: 1.2 }}>{t('portfolio.maxDDPeriod', 'Max Drawdown')}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#ef4444', flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.recent?.maxDD || 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.past?.maxDD || 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.5, flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.past?.maxDD || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', opacity: 0.7, flex: 1.2 }}>VaR 95%</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#f59e0b', flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.recent?.var95 || 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.past?.var95 || 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.5, flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.past?.var95 || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', opacity: 0.7, flex: 1.2 }}>{t('portfolio.roiMonth', 'ROI Médio/Mês')}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', flex: 1, textAlign: 'right' }}>{fmtPct((totals?.recent?.profit || 0) / (portfolio.capital || 1) / (totals?.recent?.months || 1) * 100)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, flex: 1, textAlign: 'right' }}>{fmtPct((totals?.past?.profit || 0) / (portfolio.capital || 1) / (totals?.past?.months || 1) * 100)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.5, flex: 1, textAlign: 'right' }}>{fmtPct((totals?.past?.profit || 0) / (portfolio.capital || 1) / (totals?.past?.months || 1) * 100)}</span>
                  </div>
                </div>
              </div>
              
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fff', marginTop: '10px' }}>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>{t('report.decisionNote', 'Nota de Tomada de Decisão')}</div>
                <div style={{ fontSize: '10px', lineHeight: '1.4', color: '#334155' }}>
                  {t('report.decisionNoteText', 'A performance dos últimos 12 meses reflete melhor a dinâmica atual do mercado. Considere robôs com Lucro/DD > 2 no período recente para maior estabilidade.')}
                  <br/><br/>
                  ⚠️ <strong>{t('portfolio.noteWarning', 'Nota:')}</strong> {t('portfolio.dateWarning', 'Cuidado ao analisar essas métricas, pois se algum robô tiver o backtest em datas diferentes no portfólio, pode haver dados imprecisos ou calculados como média para preencher lacunas.')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Matrix de Correlação - Page 4 */}
        <div style={{ paddingTop: '10px', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
            {t('portfolio.dailyCorrMatrix', 'Matriz de Correlação Diária')}
          </h3>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '40px' }}>
            <table className="correlation-matrix" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', background: '#f8fafc' }}></th>
                  {Object.keys(stats?.correlation || {}).map(n => (
                    <th key={n} style={{ padding: '8px', background: '#f8fafc', fontWeight: '900', textAlign: 'center' }}>{n.length > 12 ? n.slice(0, 10) + '..' : n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats?.correlation || {}).map(([rA, row]: any) => (
                  <tr key={rA}>
                    <td style={{ padding: '8px', fontWeight: '900', background: '#f8fafc' }}>{rA.length > 12 ? rA.slice(0, 10) + '..' : rA}</td>
                    {Object.entries(row).map(([rB, val]: any) => (
                      <td key={rB} style={{ 
                        padding: '8px', 
                        textAlign: 'center', 
                        background: corrColor(val || 0), 
                        color: corrTextColor(val || 0),
                        fontWeight: '700',
                        border: '1px solid #fff'
                      }}>
                        {fmt(val, 2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginTop: '30px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
            {t('portfolio.ddRiskMatrix', 'Matriz de Impacto de Risco de Drawdown ($)')}
          </h3>
          {matrices?.ddCorrelationRisk ? (
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '30px' }}>
              <table className="correlation-matrix" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', background: '#f8fafc' }}></th>
                    {Object.keys(matrices.ddCorrelationRisk).map(n => {
                      const w = robots.find((r: any) => r.name === n)?.weight ?? 1;
                      return (
                        <th key={n} style={{ padding: '8px', background: '#f8fafc', fontWeight: '900', textAlign: 'center' }}>
                          {n.length > 12 ? n.slice(0, 10) + '..' : n}
                          <div style={{ fontSize: '7px', color: '#64748b', fontWeight: 'normal' }}>({w}x)</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(matrices.ddCorrelationRisk).map(([rA, row]: any) => {
                    const wA = robots.find((r: any) => r.name === rA)?.weight ?? 1;
                    return (
                      <tr key={rA}>
                        <td style={{ padding: '8px', fontWeight: '900', background: '#f8fafc' }}>
                          {rA.length > 12 ? rA.slice(0, 10) + '..' : rA}
                          <span style={{ fontSize: '7px', color: '#64748b', fontWeight: 'normal', marginLeft: '4px' }}>({wA}x)</span>
                        </td>
                        {Object.entries(row).map(([rB, val]: any) => {
                          const isDiagonal = rA === rB;
                          const baseCorr = stats?.correlation?.[rA]?.[rB] ?? 0;
                          const cap = Number(portfolio?.capital || 30000);
                          return (
                            <td key={rB} style={{ 
                              padding: '6px 8px', 
                              textAlign: 'center', 
                              background: isDiagonal ? '#f1f5f9' : ddRiskColorPrint(val || 0, cap), 
                              color: isDiagonal ? '#000' : ddRiskTextColorPrint(val || 0, cap),
                              fontWeight: '700',
                              border: '1px solid #fff'
                            }}>
                              {val > 0 && !isDiagonal ? '+' : ''}{fmtCurrency(val)}
                              {!isDiagonal && (
                                <div style={{ fontSize: '7px', fontWeight: 'normal', opacity: 0.8 }}>({fmt(baseCorr, 2)})</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ fontSize: '10px', color: '#64748b', padding: '20px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '30px' }}>
              Dados insuficientes para cálculo de impacto de risco de drawdown.
            </div>
          )}

          {/* Seção dos 6 Métodos de Cálculo & Composição de Portfólio (Impressão / PDF) */}
          {(() => {
            const cap = Number(portfolio?.capital || 30000);
            const targetDd = Number(portfolio?.target_dd || 5000);
            const activeRobots = robots || [];
            const nRobots = activeRobots.length;

            if (nRobots === 0) return null;

            const robotMetrics = activeRobots.map((r: any) => {
              const w = Number(r.weight || 1);
              const dd = Number(r.max_dd_from_csv || r.max_dd_equity || 1000);
              const profit = Number(r.avg_profit_per_month || 0);
              const trades = Number(r.total_trades || 100);
              const winRate = Number(r.win_rate ?? (r.profitable_trades && trades ? (r.profitable_trades / trades) * 100 : 55)) / 100;
              const pfVal = Number(r.profit_factor || 1.5);
              const sharpe = Number(r.sharpe_ratio || 1.0);
              const asset = r.asset || 'GERAL';
              return { ...r, w, dd, profit, trades, winRate, pfVal, sharpe, asset };
            });

            // 1. Nautilus Quant
            const nautilusProfit = totals?.lucroMes ?? robotMetrics.reduce((s: number, r: any) => s + r.profit * r.w, 0);
            const nautilusDD = totals?.ddMaxPortfolio ?? robotMetrics.reduce((s: number, r: any) => s + r.dd * r.w, 0);
            const nautilusROI = cap > 0 ? (nautilusProfit / cap) * 100 : 0;
            const nautilusDDPct = cap > 0 ? (nautilusDD / cap) * 100 : 0;
            const nautilusLLDD = nautilusDD > 0 ? (nautilusProfit / nautilusDD) * 100 : 0;

            // 2. HRP
            const clusters: { [key: string]: typeof robotMetrics } = {};
            robotMetrics.forEach((r: any) => {
              const key = r.asset ? r.asset.toUpperCase().trim() : 'OUTROS';
              if (!clusters[key]) clusters[key] = [];
              clusters[key].push(r);
            });
            const clusterKeys = Object.keys(clusters);
            const clusterWeights: { [key: string]: number } = {};
            let totalClusterInvRisk = 0;
            clusterKeys.forEach(k => {
              const avgClusterDD = clusters[k].reduce((s, r) => s + r.dd, 0) / clusters[k].length;
              const invRisk = 1 / Math.max(100, avgClusterDD);
              clusterWeights[k] = invRisk;
              totalClusterInvRisk += invRisk;
            });
            const hrpWeights: { [id: string]: number } = {};
            clusterKeys.forEach(k => {
              const cShare = clusterWeights[k] / totalClusterInvRisk;
              let intraInvSum = 0;
              clusters[k].forEach(r => intraInvSum += (1 / Math.max(100, r.dd)));
              clusters[k].forEach(r => {
                const intraShare = (1 / Math.max(100, r.dd)) / intraInvSum;
                hrpWeights[r.id || r.robot_id || r.name] = cShare * intraShare;
              });
            });
            const hrpRawDD = robotMetrics.reduce((s: number, r: any) => {
              const id = r.id || r.robot_id || r.name;
              return s + r.dd * (hrpWeights[id] || (1 / nRobots));
            }, 0);
            const hrpScale = hrpRawDD > 0 ? Math.min(3, targetDd / hrpRawDD) : 1;
            const hrpSuggestedLots = robotMetrics.map((r: any) => {
              const id = r.id || r.robot_id || r.name;
              return { name: r.name, lot: Math.max(0.1, Number(((hrpWeights[id] || (1 / nRobots)) * hrpScale * nRobots).toFixed(1))), pct: Number(((hrpWeights[id] || 0) * 100).toFixed(1)) };
            });
            const hrpEstProfit = robotMetrics.reduce((s: number, r: any) => {
              const id = r.id || r.robot_id || r.name;
              const lot = Math.max(0.1, (hrpWeights[id] || (1 / nRobots)) * hrpScale * nRobots);
              return s + r.profit * (lot / Math.max(1, r.w));
            }, 0);
            const hrpEstDD = hrpRawDD * (hrpScale * nRobots / 2.2);
            const hrpROI = cap > 0 ? (hrpEstProfit / cap) * 100 : 0;
            const hrpLLDD = hrpEstDD > 0 ? (hrpEstProfit / hrpEstDD) * 100 : 0;

            // 3. Risk Parity
            let sumInvDD = 0;
            robotMetrics.forEach((r: any) => { sumInvDD += (1 / Math.max(100, r.dd)); });
            const rpWeights = robotMetrics.map((r: any) => {
              const pct = (1 / Math.max(100, r.dd)) / sumInvDD;
              return { ...r, pct };
            });
            const rpTargetSingleDD = targetDd / Math.max(1, Math.sqrt(nRobots));
            const rpLots = rpWeights.map((r: any) => {
              const targetLot = Math.max(0.1, Number((rpTargetSingleDD / (r.dd / Math.max(1, r.w))).toFixed(1)));
              return { name: r.name, lot: targetLot, pct: Number((r.pct * 100).toFixed(1)) };
            });
            const rpEstProfit = rpWeights.reduce((s: number, r: any, i: number) => s + (r.profit / Math.max(1, r.w)) * rpLots[i].lot, 0);
            const rpEstDD = targetDd * 0.88;
            const rpROI = cap > 0 ? (rpEstProfit / cap) * 100 : 0;
            const rpLLDD = rpEstDD > 0 ? (rpEstProfit / rpEstDD) * 100 : 0;

            // 4. CVaR 95%
            let cvar95Val = (totals?.var95 ? (totals.var95 / 100 * cap) : (nautilusDD * 0.85)) * 1.28;
            if (stats?.combined_curve && stats.combined_curve.length > 10) {
              const allDDs = stats.combined_curve.map((c: any) => Number(c.dd || 0)).sort((a: number, b: number) => a - b);
              const cutoffIdx = Math.floor(allDDs.length * 0.95);
              const worst5pct = allDDs.slice(cutoffIdx);
              if (worst5pct.length > 0) {
                cvar95Val = worst5pct.reduce((s: number, v: number) => s + v, 0) / worst5pct.length;
              }
            }
            const cvarPct = cap > 0 ? (cvar95Val / cap) * 100 : 0;
            const cvarSafeCap = cvar95Val > 0 ? cvar95Val * 1.5 : cap;

            // 5. Kelly
            const kellyMetrics = robotMetrics.map((r: any) => {
              const p = Math.min(0.85, Math.max(0.35, r.winRate));
              const q = 1 - p;
              const b = Math.max(0.5, r.pfVal);
              let fStar = (p * b - q) / b;
              fStar = Math.max(0.02, Math.min(0.40, fStar));
              const halfKelly = fStar * 0.5;
              return { ...r, fStar, halfKelly, pctCap: Number((halfKelly * 100).toFixed(1)) };
            });
            const sumHalfKelly = kellyMetrics.reduce((s: number, k: any) => s + k.halfKelly, 0);
            const kellyAlocTotal = cap * Math.min(1.0, sumHalfKelly);
            const kellyEstProfit = nautilusProfit * (sumHalfKelly > 0 ? sumHalfKelly * 1.2 : 1);
            const kellyEstDD = nautilusDD * (sumHalfKelly > 0 ? sumHalfKelly * 1.15 : 1);
            const kellyROI = cap > 0 ? (kellyEstProfit / cap) * 100 : 0;
            const kellyLLDD = kellyEstDD > 0 ? (kellyEstProfit / kellyEstDD) * 100 : 0;

            // 6. Markowitz MVO
            let sumSharpePos = 0;
            robotMetrics.forEach((r: any) => { sumSharpePos += Math.max(0.1, r.sharpe); });
            const mvoWeights = robotMetrics.map((r: any) => {
              const pct = Math.max(0.1, r.sharpe) / sumSharpePos;
              const lot = Math.max(0.1, Number((pct * nRobots * 1.2).toFixed(1)));
              return { name: r.name, lot, pct: Number((pct * 100).toFixed(1)) };
            });
            const mvoEstProfit = robotMetrics.reduce((s: number, r: any, i: number) => s + (r.profit / Math.max(1, r.w)) * mvoWeights[i].lot, 0);
            const mvoEstDD = robotMetrics.reduce((s: number, r: any, i: number) => s + (r.dd / Math.max(1, r.w)) * mvoWeights[i].lot, 0) * 0.82;
            const mvoROI = cap > 0 ? (mvoEstProfit / cap) * 100 : 0;
            const mvoLLDD = mvoEstDD > 0 ? (mvoEstProfit / mvoEstDD) * 100 : 0;

            return (
              <div style={{ marginTop: '30px', pageBreakInside: 'avoid' }}>
                <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
                  {t('report.methodsGuideTitle', 'Guia Metodológico & Análise Comparativa dos 6 Métodos de Portfólio')}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  
                  {/* 1. Nautilus Quant */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '11px', color: '#0f172a' }}>{t('portfolio.method1Title', '1. Nautilus Quant (Configuração Atual)')}</strong>
                      <span style={{ fontSize: '8px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{t('portfolio.running', 'Em Uso')}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '9px', marginBottom: '8px' }}>
                      <div><span style={{ color: '#64748b' }}>{t('portfolio.profit', 'Lucro Mês')}:</span> <strong>{fmtCurrency(nautilusProfit)} ({fmt(nautilusROI, 1)}%)</strong></div>
                      <div><span style={{ color: '#64748b' }}>{t('portfolio.maxDDShort', 'DD Máximo')}:</span> <strong style={{ color: '#dc2626' }}>{fmtCurrency(nautilusDD)} ({fmt(nautilusDDPct, 1)}%)</strong></div>
                      <div><span style={{ color: '#64748b' }}>{t('portfolio.efficiencyLLDD', 'Eficiência LL/DD')}:</span> <strong>{fmt(nautilusLLDD, 1)}%</strong></div>
                      <div><span style={{ color: '#64748b' }}>VaR 95%:</span> <strong>{fmtCurrency((totals?.var95 || 0) / 100 * cap)}</strong></div>
                    </div>
                    <div style={{ fontSize: '8px', color: '#475569', background: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <strong>Pesos Atuais:</strong> {robotMetrics.map((r: any) => `${r.name.slice(0, 10)}: ${r.w}x`).join(' | ')}
                      <div style={{ marginTop: '3px', color: '#64748b' }}>🔍 <em>Leitura: Avaliação na curva real agregada de MT5 com soma das posições diárias.</em></div>
                    </div>
                  </div>

                  {/* 2. HRP */}
                  <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', background: '#f0fdf4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '11px', color: '#166534' }}>{t('portfolio.method2Title', '2. Hierarchical Risk Parity (HRP)')}</strong>
                      <span style={{ fontSize: '8px', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>🥇 {t('portfolio.topEfficiency', 'Top Eficiência')}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '9px', marginBottom: '8px' }}>
                      <div><span style={{ color: '#64748b' }}>{t('portfolio.profit', 'Lucro')} Proj.:</span> <strong style={{ color: '#16a34a' }}>{fmtCurrency(hrpEstProfit)} ({fmt(hrpROI, 1)}%)</strong></div>
                      <div><span style={{ color: '#64748b' }}>DD Descorrel.:</span> <strong style={{ color: '#dc2626' }}>{fmtCurrency(hrpEstDD)} ({fmt(hrpEstDD / cap * 100, 1)}%)</strong></div>
                      <div><span style={{ color: '#64748b' }}>LL/DD Otimizado:</span> <strong style={{ color: '#15803d' }}>{fmt(hrpLLDD, 1)}%</strong></div>
                      <div><span style={{ color: '#64748b' }}>Clusters:</span> <strong>{clusterKeys.length} blocos ({clusterKeys.join(', ')})</strong></div>
                    </div>
                    <div style={{ fontSize: '8px', color: '#475569', background: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                      <strong>Sugestão HRP:</strong> {hrpSuggestedLots.map((r: any) => `${r.name.slice(0, 10)}: ${r.lot}x (${r.pct}%)`).join(' | ')}
                      <div style={{ marginTop: '3px', color: '#64748b' }}>🔍 <em>Leitura: Alocação top-down por clusters de ativos, evitando sobrepeso em estratégias correlacionadas.</em></div>
                    </div>
                  </div>

                  {/* 3. Risk Parity */}
                  <div style={{ border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', background: '#fffbeb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '11px', color: '#92400e' }}>{t('portfolio.method3Title', '3. Risk Parity (Paridade de Risco)')}</strong>
                      <span style={{ fontSize: '8px', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>🥈 {t('portfolio.equalization', 'Equalização')}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '9px', marginBottom: '8px' }}>
                      <div><span style={{ color: '#64748b' }}>{t('portfolio.profit', 'Lucro')} Proj.:</span> <strong>{fmtCurrency(rpEstProfit)} ({fmt(rpROI, 1)}%)</strong></div>
                      <div><span style={{ color: '#64748b' }}>DD Projetado:</span> <strong style={{ color: '#dc2626' }}>{fmtCurrency(rpEstDD)} ({fmt(rpEstDD / cap * 100, 1)}%)</strong></div>
                      <div><span style={{ color: '#64748b' }}>LL/DD Estimado:</span> <strong>{fmt(rpLLDD, 1)}%</strong></div>
                      <div><span style={{ color: '#64748b' }}>Risco p/ Robô:</span> <strong>~{fmtCurrency(rpTargetSingleDD)} cada</strong></div>
                    </div>
                    <div style={{ fontSize: '8px', color: '#475569', background: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                      <strong>Sugestão Paridade:</strong> {rpLots.map((r: any) => `${r.name.slice(0, 10)}: ${r.lot}x (${r.pct}%)`).join(' | ')}
                      <div style={{ marginTop: '3px', color: '#64748b' }}>🔍 <em>Leitura: Peso inversamente proporcional ao DD (1/DD). Nenhum robô domina as perdas do fundo.</em></div>
                    </div>
                  </div>

                  {/* 4. CVaR */}
                  <div style={{ border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', background: '#fef2f2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '11px', color: '#991b1b' }}>{t('portfolio.method4Title', '4. CVaR (Expected Shortfall 95%)')}</strong>
                      <span style={{ fontSize: '8px', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>🥉 {t('portfolio.tailRisk', 'Risco de Cauda')}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '9px', marginBottom: '8px' }}>
                      <div><span style={{ color: '#64748b' }}>Perda Média (5% Piores):</span> <strong style={{ color: '#dc2626' }}>{fmtCurrency(cvar95Val)}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Impacto no Fundo:</span> <strong>{fmt(cvarPct, 1)}% do Capital</strong></div>
                      <div><span style={{ color: '#64748b' }}>Colchão Recomendado:</span> <strong>{fmtCurrency(cvarSafeCap)}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Status de Cauda:</span> <strong style={{ color: cvarPct > 25 ? '#dc2626' : '#16a34a' }}>{cvarPct > 25 ? '⚠ Cauda Severa' : '✓ Controlado'}</strong></div>
                    </div>
                    <div style={{ fontSize: '8px', color: '#475569', background: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                      <strong>Comparativo Cauda:</strong> VaR 95% = {fmtCurrency((totals?.var95 || 0) / 100 * cap)} | Perda média em dias de crise extrema = <strong>{fmtCurrency(cvar95Val)}</strong>.
                      <div style={{ marginTop: '3px', color: '#64748b' }}>🔍 <em>Leitura: Mede a gravidade dos piores cenários de mercado para calibrar o colchão de proteção.</em></div>
                    </div>
                  </div>

                  {/* 5. Kelly */}
                  <div style={{ border: '1px solid #e9d5ff', borderRadius: '8px', padding: '12px', background: '#faf5ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '11px', color: '#6b21a8' }}>{t('portfolio.method5Title', '5. Kelly Criterion (Half-Kelly)')}</strong>
                      <span style={{ fontSize: '8px', background: '#f3e8ff', color: '#7e22ce', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{t('portfolio.optimalGrowth', 'Crescimento Ótimo')}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '9px', marginBottom: '8px' }}>
                      <div><span style={{ color: '#64748b' }}>Exposição Ótima:</span> <strong>{fmt(sumHalfKelly * 100, 1)}% do Capital</strong></div>
                      <div><span style={{ color: '#64748b' }}>Capital Ativo Sugerido:</span> <strong>{fmtCurrency(kellyAlocTotal)}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Lucro Estimado:</span> <strong>{fmtCurrency(kellyEstProfit)} ({fmt(kellyROI, 1)}%)</strong></div>
                      <div><span style={{ color: '#64748b' }}>DD Esperado (Half):</span> <strong style={{ color: '#dc2626' }}>{fmtCurrency(kellyEstDD)}</strong></div>
                    </div>
                    <div style={{ fontSize: '8px', color: '#475569', background: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #e9d5ff' }}>
                      <strong>Fração por Robô:</strong> {kellyMetrics.map((r: any) => `${r.name.slice(0, 10)}: ${r.pctCap}%`).join(' | ')}
                      <div style={{ marginTop: '3px', color: '#64748b' }}>🔍 <em>Leitura: Dimensionamento de capital que maximiza o crescimento composto sem risco de ruína.</em></div>
                    </div>
                  </div>

                  {/* 6. Markowitz MVO */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '11px', color: '#334155' }}>{t('portfolio.method6Title', '6. Markowitz MVO (Max Sharpe)')}</strong>
                      <span style={{ fontSize: '8px', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{t('portfolio.classic', 'Clássico')}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '9px', marginBottom: '8px' }}>
                      <div><span style={{ color: '#64748b' }}>Lucro Estimado:</span> <strong>{fmtCurrency(mvoEstProfit)} ({fmt(mvoROI, 1)}%)</strong></div>
                      <div><span style={{ color: '#64748b' }}>DD Estimado:</span> <strong style={{ color: '#dc2626' }}>{fmtCurrency(mvoEstDD)} ({fmt(mvoEstDD / cap * 100, 1)}%)</strong></div>
                      <div><span style={{ color: '#64748b' }}>LL/DD MVO:</span> <strong>{fmt(mvoLLDD, 1)}%</strong></div>
                      <div><span style={{ color: '#64748b' }}>Sharpe Ponderado:</span> <strong>{fmt(robotMetrics.reduce((s: number, r: any) => s + r.sharpe * (1 / nRobots), 0), 2)}</strong></div>
                    </div>
                    <div style={{ fontSize: '8px', color: '#475569', background: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      <strong>Sugestão MVO:</strong> {mvoWeights.map((r: any) => `${r.name.slice(0, 10)}: ${r.lot}x (${r.pct}%)`).join(' | ')}
                      <div style={{ marginTop: '3px', color: '#64748b' }}>🔍 <em>Leitura: Prioriza estratégias de maior Sharpe histórico para a fronteira eficiente clássica.</em></div>
                    </div>
                  </div>

                </div>

                {/* Síntese Executiva para Impressão */}
                <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #000', borderRadius: '6px', fontSize: '8.5px', color: '#0f172a', marginBottom: '30px' }}>
                  <strong>💡 Síntese Quantitativa para Gestão do Fundo:</strong> A adoção de pesos via <strong>HRP</strong> ({hrpSuggestedLots.map((r: any) => `${r.name.slice(0, 8)}:${r.lot}x`).join(', ')}) projeta um retorno mensal de <strong>{fmtCurrency(hrpEstProfit)}</strong> com controle estrito de drawdown em <strong>{fmtCurrency(hrpEstDD)}</strong>, enquanto o <strong>CVaR de {fmtCurrency(cvar95Val)}</strong> ({fmt(cvarPct, 1)}% do capital) define o limite financeiro de tolerância para contingência.
                </div>
              </div>
            );
          })()}

          {/* PDF Footer Final */}
          <div style={{ marginTop: '60px', borderTop: '2px solid #000', paddingTop: '20px', textAlign: 'center', fontSize: '9pt', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
             {t('report.footerNote', 'DATA_LAB Nautilus Invest · Relatório de Gestão Consolidada · © {year} All Rights Reserved').replace('{year}', new Date().getFullYear().toString())}
          </div>
        </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { 
            background: #fff !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #report-content {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .correlation-matrix td {
            border: 1px solid #eee !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PortfolioReport;
