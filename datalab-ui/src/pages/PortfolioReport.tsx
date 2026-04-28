import { useEffect, useState } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler, BarElement, ArcElement
} from 'chart.js';
import { Printer, Download, X } from 'lucide-react';

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

const PortfolioReport = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem('portfolio_report_data');
    if (raw) {
      try {
        setData(JSON.parse(raw));
      } catch (e) {
        console.error('Falha ao ler dados do relatório:', e);
      }
    }
  }, []);

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', color: '#64748b' }}>
        <p>Aguardando dados do portfólio...</p>
        <button onClick={() => window.close()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Fechar Aba</button>
      </div>
    );
  }

  const { portfolio, stats } = data;
  const totals = stats?.totals;
  const robots = stats?.robots ?? [];

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


  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: '40px 0' }}>

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
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Performance Analysis</h1>
            <div style={{ fontSize: '13px', color: '#334155', fontWeight: '700', marginTop: '4px' }}>{portfolio.name} · Investimentos Quantitativos</div>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Relatório emitido em: {new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Global Targets section */}
        <div style={{ display: 'flex', gap: '50px', marginBottom: '45px' }}>
           <div style={{ borderLeft: '4px solid #000', paddingLeft: '18px' }}>
             <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Capital Alocado</div>
             <div style={{ fontSize: '28px', fontWeight: '900' }}>{fmtCurrency(portfolio.capital)}</div>
           </div>
           <div style={{ borderLeft: '4px solid #000', paddingLeft: '18px' }}>
             <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Drawdown Alvo</div>
             <div style={{ fontSize: '28px', fontWeight: '900' }}>{fmtCurrency(portfolio.target_dd)}</div>
           </div>
        </div>

        {/* Key Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#e2e8f0', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '45px' }}>
          {[
            { label: 'Lucro Mês', value: fmtCurrency(totals?.lucroMes || 0), color: (totals?.lucroMes || 0) >= 0 ? '#10b981' : '#ef4444' },
            { label: 'ROI Mês', value: fmtPct(totals?.roiMes || 0), color: (totals?.roiMes || 0) >= 0 ? '#10b981' : '#ef4444' },
            { label: 'DD Máx Portfólio', value: fmtCurrency(totals?.ddMaxPortfolio || 0), color: '#ef4444' },
            { label: 'DD Máx %', value: fmtPct(totals?.ddMaxPct || 0), color: '#ef4444' },
            
            { label: 'DD Soma Individual', value: fmtCurrency(robots.reduce((s: any, r: any) => s + Number(r.max_dd_from_csv || r.max_dd_equity || 0) * r.weight, 0)), color: '#ef4444' },
            { label: 'DD Soma %', value: fmtPct(robots.reduce((s: any, r: any) => s + Number(r.max_dd_from_csv || r.max_dd_equity || 0) * r.weight, 0) / portfolio.capital * 100), color: '#ef4444' },
            { label: 'VaR 95% (Prob.)', value: fmtPct(totals?.var95 || 0), color: '#f59e0b' },
            { label: 'DME Atual', value: fmtCurrency(totals?.dme || portfolio.manual_dme || 0), color: '#0f172a' },

            { label: 'Fator LL/DD', value: fmt(totals?.llDdPct || 0) + '%', color: '#0b57d0' },
            { label: 'Total Trades', value: String(robots.reduce((s: any, r: any) => s + Number(r.total_trades || 0), 0)), color: '#0f172a' },
            { label: 'Soma Lotes', value: fmt(robots.reduce((s: any, r: any) => s + Number(r.total_lots || 0), 0), 2), color: '#0f172a' },
            { label: 'Lotes Mês', value: fmt(robots.reduce((s: any, r: any) => s + Number(r.lots_per_month || 0), 0), 2), color: '#0f172a' },
            { label: 'Max Lote Exposto', value: fmt(Math.max(...robots.map((r: any) => Number(r.max_lot_exposure || 0) * Number(r.weight || 1)), 0), 2), color: '#7c3aed' },
            { label: 'Max Entradas/Trade', value: String(Math.max(...robots.map((r: any) => Number(r.max_entries_per_trade || 0)), 0)), color: '#d97706' },
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
            Composição Detalhada do Portfólio
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '900' }}>ESTRATÉGIA (ROBÔ)</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '900' }}>ATIVO</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '900' }}>PESO</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: '900' }}>DD ESTIMADO</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: '900' }}>LUCRO ESTIMADO</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: '900' }}>RETORNO %</th>
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
            Curva de Patrimônio Consolidado (Closing Balance)
          </h3>
          <div style={{ height: '350px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '15px' }}>
            <Line 
              data={{ 
                labels: (stats?.combined_curve || []).map((c: any) => c.day), 
                datasets: [{ label: 'Patrimônio ($)', data: (stats?.combined_curve || []).map((c: any) => portfolio.capital + (c.balanceProfit || c.profit || 0)), borderColor: '#000', backgroundColor: 'rgba(0,0,0,0.02)', fill: true, pointRadius: 0, borderWidth: 2.5 }] 
              }} 
              options={getPrintChartOptions({ plugins: { legend: { display: false } } })}
            />
          </div>
        </div>

        <div style={{ marginBottom: '60px', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
            Curva Individual por Robô ($)
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

        <div style={{ pageBreakAfter: 'always' }}></div>

        {/* Charts - Page 2 */}
        <div style={{ paddingTop: '20px' }}>
          <div style={{ marginBottom: '60px', pageBreakInside: 'avoid' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
              Exposição ao Risco Consolidada (Drawdown Intra-day)
            </h3>
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
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
              Drawdown Individual por Robô ($)
            </h3>
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
                options={getPrintChartOptions({ plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 8 } } } }, scales: { y: { max: 0 } } })}
              />
            </div>
          </div>
        </div>

        <div style={{ pageBreakAfter: 'always' }}></div>

        {/* Charts - Page 3 */}
        <div style={{ paddingTop: '20px' }}>
          <div style={{ marginBottom: '60px', pageBreakInside: 'avoid' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
              Top 10 Maiores Drawdowns (Histórico Agregado)
            </h3>
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
                  plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 7 } } } },
                  scales: { x: { stacked: true }, y: { stacked: true } }
                })}
              />
            </div>
          </div>

          <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '15px' }}>Lucro Acumulado por Robô (Top 10)</h3>
            <div style={{ height: '300px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '15px' }}>
              <Bar 
                data={{
                  labels: [...robots].sort((a,b) => (b.avg_profit_per_month * b.weight) - (a.avg_profit_per_month * a.weight)).slice(0, 10).map(r => r.name.slice(0,12)),
                  datasets: [{ label: 'Lucro ($)', data: [...robots].sort((a,b) => (b.avg_profit_per_month * b.weight) - (a.avg_profit_per_month * a.weight)).slice(0, 10).map(r => r.avg_profit_per_month * r.weight), backgroundColor: ROBOT_COLORS, borderWidth: 1 }]
                }}
                options={getPrintChartOptions({ plugins: { legend: { display: false } } })}
              />
            </div>
          </div>

          <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '15px' }}>Distribuição de Lucro Portfólio</h3>
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

        {/* Quadrante de Tomada de Decisão (Últimos 12 Meses) */}
        <div style={{ marginBottom: '60px', pageBreakInside: 'avoid' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <div style={{ width: '4px', height: '14px', background: '#0b57d0' }}></div>
              Performance Recente (Últimos 12 Meses)
            </h3>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
              WINDOW: {totals?.recent?.days || 0} dias · {fmt(totals?.recent?.months || 0, 1)} meses
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            {/* Robot Specific Recent Data */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '800' }}>ROBÔ</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: '800' }}>LUCRO (12M)</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: '800' }}>DD (12M)</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: '800' }}>VAR 95%</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: '800' }}>LOTES</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(totals?.robotRecent || {}).map(([name, r]: any) => (
                    <tr key={name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{name.length > 20 ? name.slice(0, 18) + '..' : name}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: r.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>{fmtCurrency(r.profit)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#ef4444' }}>{fmtCurrency(r.maxDD)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b' }}>{fmtPct(r.var95)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>{fmt(r.lots, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Comparison Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ background: '#0f172a', borderRadius: '8px', padding: '15px', color: '#fff' }}>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: '800', opacity: 0.7, marginBottom: '10px' }}>Comparativo de Período</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '600', flex: 1.2 }}>Métrica</span>
                    <span style={{ fontSize: '9px', fontWeight: '600', flex: 1, textAlign: 'right' }}>Últ. 12M</span>
                    <span style={{ fontSize: '9px', fontWeight: '600', flex: 1, textAlign: 'right' }}>Rest. Pond.</span>
                    <span style={{ fontSize: '9px', fontWeight: '600', flex: 1, textAlign: 'right' }}>Rest. Soma</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', opacity: 0.8, flex: 1.2 }}>Lucro Total</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: (totals?.recent?.profit || 0) >= 0 ? '#4ade80' : '#fb7185', flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.recent?.profit || 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.past?.weightedProfit || 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.6, flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.past?.profit || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', opacity: 0.8, flex: 1.2 }}>Max Drawdown</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#fb7185', flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.recent?.maxDD || 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, flex: 1, textAlign: 'right' }}>{fmtCurrency(totals?.past?.maxDD || 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.6, flex: 1, textAlign: 'right' }}>—</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', opacity: 0.8, flex: 1.2 }}>VaR 95%</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#fbbf24', flex: 1, textAlign: 'right' }}>{fmtPct(totals?.recent?.var95 || 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, flex: 1, textAlign: 'right' }}>{fmtPct(totals?.past?.var95 || 0)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.6, flex: 1, textAlign: 'right' }}>—</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', opacity: 0.8, flex: 1.2 }}>ROI Médio/Mês</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', flex: 1, textAlign: 'right' }}>{fmtPct((totals?.recent?.profit || 0) / (portfolio.capital || 1) / (totals?.recent?.months || 1) * 100)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, flex: 1, textAlign: 'right' }}>{fmtPct((totals?.past?.profit || 0) / (portfolio.capital || 1) / (totals?.past?.months || 1) * 100)}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.6, flex: 1, textAlign: 'right' }}>—</span>
                  </div>
                </div>
              </div>
              
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fff' }}>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>Nota de Tomada de Decisão</div>
                <div style={{ fontSize: '10px', lineHeight: '1.4', color: '#334155' }}>
                  A performance dos últimos 12 meses reflete melhor a dinâmica atual do mercado. 
                  Considere robôs com Lucro/DD {'>'} 2 no período recente para maior estabilidade.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Matrix de Correlação - Page 4 */}
        <div style={{ paddingTop: '10px', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '14px', background: '#000' }}></div>
            Matriz de Correlação Diária
          </h3>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
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
                        background: corrColor(val), 
                        color: corrTextColor(val),
                        fontWeight: '700',
                        border: '1px solid #fff'
                      }}>
                        {val.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PDF Footer Final */}
          <div style={{ marginTop: '100px', borderTop: '2px solid #000', paddingTop: '20px', textAlign: 'center', fontSize: '9pt', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
             DATA_LAB Nautilus Invest · Relatório de Gestão Consolidada · © {new Date().getFullYear()} All Rights Reserved
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
