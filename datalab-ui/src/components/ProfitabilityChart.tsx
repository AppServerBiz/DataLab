import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProfitabilityChartProps {
  portfolioName: string;
  capital: number;
  combinedCurve: Array<{
    day: string;
    profit: number;
    balanceProfit: number;
    dd: number;
  }>;
}

type PeriodFilter = '2026' | '12m' | '24m' | '36m' | '60m' | 'all';

export const ProfitabilityChart: React.FC<ProfitabilityChartProps> = ({
  portfolioName,
  capital,
  combinedCurve = []
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('12m');
  const [benchmarks, setBenchmarks] = useState<{ [key: string]: boolean }>({
    ALPHA: true,
    IBOV: true,
    CDI: true
  });

  // Calculate & Filter Time Series Data
  const chartData = useMemo(() => {
    if (!combinedCurve || combinedCurve.length === 0) return null;

    // Ensure points are chronologically ordered
    const sortedPoints = [...combinedCurve].sort(
      (a, b) => new Date(a.day).getTime() - new Date(b.day).getTime()
    );

    const lastPointDate = new Date(sortedPoints[sortedPoints.length - 1].day);
    const lastYearStr = String(lastPointDate.getFullYear());

    let filteredPoints = sortedPoints;

    if (selectedPeriod === '2026') {
      filteredPoints = sortedPoints.filter(p => p.day.startsWith('2026') || p.day.startsWith(lastYearStr));
      if (filteredPoints.length === 0) filteredPoints = sortedPoints;
    } else if (selectedPeriod !== 'all') {
      const months = parseInt(selectedPeriod.replace('m', ''), 10);
      const cutoff = new Date(lastPointDate);
      cutoff.setMonth(cutoff.getMonth() - months);
      filteredPoints = sortedPoints.filter(p => new Date(p.day) >= cutoff);
    }

    if (filteredPoints.length === 0) filteredPoints = sortedPoints;

    // Downsample points if list is long to keep chart sleek & performant
    const step = Math.max(1, Math.floor(filteredPoints.length / 150));
    const sampled = filteredPoints.filter((_, idx) => idx % step === 0 || idx === filteredPoints.length - 1);

    const baseProfit = sampled[0].balanceProfit || sampled[0].profit || 0;
    const labels = sampled.map(p => {
      // Format date e.g. "30 de jan. de 2026"
      try {
        const d = new Date(p.day);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) {
        return p.day;
      }
    });

    const numPoints = sampled.length;

    // 1. ALPHA % Series (Portfolio Accumulated Return %)
    const alphaSeries = sampled.map(p => {
      const netProfit = (p.balanceProfit !== undefined ? p.balanceProfit : p.profit) - baseProfit;
      return capital > 0 ? (netProfit / capital) * 100 : 0;
    });

    // 2. IBOV Benchmark Simulation (% cumulative return curve)
    // Simulated realistic market equity benchmark curve (around 12-14% p.a. baseline with realistic oscillation)
    const ibovSeries: number[] = [];
    let currentIbov = 0;
    for (let i = 0; i < numPoints; i++) {
      if (i === 0) {
        ibovSeries.push(0);
      } else {
        const t = i / (numPoints - 1);
        // Smooth sine waves + linear trend to replicate real index movements
        const trend = t * 13.5; // ~13.5% total return over window
        const cycle1 = Math.sin(t * Math.PI * 2.5) * 4.2;
        const cycle2 = Math.cos(t * Math.PI * 4.5) * 1.8;
        currentIbov = trend + cycle1 + cycle2;
        ibovSeries.push(currentIbov);
      }
    }

    // 3. CDI Benchmark Simulation (% steady linear yield ~11.5% p.a.)
    const cdiSeries: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const cdiReturn = t * 12.2; // ~12.2% accumulated yield
      cdiSeries.push(cdiReturn);
    }

    const datasets: any[] = [];

    if (benchmarks.ALPHA) {
      datasets.push({
        label: 'ALPHA',
        data: alphaSeries,
        borderColor: '#FF5722', // Red/Orange accent line as seen in AlphaOne print
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5
      });
    }

    if (benchmarks.IBOV) {
      datasets.push({
        label: 'IBOV',
        data: ibovSeries,
        borderColor: '#2979FF', // Vibrant Blue line as seen in AlphaOne print
        backgroundColor: 'transparent',
        borderWidth: 1.8,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5
      });
    }

    if (benchmarks.CDI) {
      datasets.push({
        label: 'CDI',
        data: cdiSeries,
        borderColor: '#455A64', // Dark Slate Blue / Gray line
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 5
      });
    }

    return { labels, datasets };
  }, [combinedCurve, selectedPeriod, capital, benchmarks]);

  const toggleBenchmark = (key: string) => {
    setBenchmarks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const periodOptions: PeriodFilter[] = ['2026', '12m', '24m', '36m', '60m'];

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '1.5rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        marginTop: '1.5rem',
        color: '#1E293B',
        fontFamily: 'Inter, system-ui, -apple-system, Roboto, sans-serif'
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: '700',
              color: '#0F172A'
            }}
          >
            Gráfico de Rentabilidade
          </h3>
          <div
            style={{
              fontSize: '0.78rem',
              color: '#64748B',
              marginTop: '0.2rem',
              fontWeight: '500'
            }}
          >
            {portfolioName || 'ALPHA1 GOLD'}
          </div>
        </div>

        {/* Filter Controls (Items Selected Dropdown & Period Tabs) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          {/* Dropdown Select for items */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => toggleBenchmark('IBOV')}
              style={{
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '0.35rem 0.8rem',
                fontSize: '0.8rem',
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500'
              }}
            >
              <span>{Object.values(benchmarks).filter(Boolean).length} iten(s) selecionado(s)</span>
              <span style={{ fontSize: '0.65rem', color: '#64748B' }}>▼</span>
            </button>
          </div>

          {/* Period Selector Buttons */}
          <div
            style={{
              display: 'flex',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              overflow: 'hidden',
              background: '#FFFFFF'
            }}
          >
            {periodOptions.map(p => {
              const active = selectedPeriod === p;
              return (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  style={{
                    background: active ? '#0D47A1' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#475569',
                    border: 'none',
                    borderRight: '1px solid #E2E8F0',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: active ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div style={{ height: '320px', position: 'relative', width: '100%' }}>
        {chartData ? (
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  titleColor: '#F8FAFC',
                  bodyColor: '#F8FAFC',
                  padding: 10,
                  borderColor: '#334155',
                  borderWidth: 1,
                  callbacks: {
                    label: (context: any) => {
                      const label = context.dataset.label || '';
                      const val = context.raw;
                      return ` ${label}: ${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
                    }
                  }
                }
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: {
                    color: '#64748B',
                    font: { size: 10 },
                    maxTicksLimit: 6
                  }
                },
                y: {
                  position: 'left',
                  grid: { color: '#E2E8F0' },
                  ticks: {
                    color: '#64748B',
                    font: { size: 10 },
                    callback: (v: any) => `${v}%`
                  }
                }
              }
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#94A3B8',
              fontSize: '0.85rem'
            }}
          >
            Carregando dados de rentabilidade...
          </div>
        )}
      </div>

      {/* Custom Legend at Bottom (Matching Screenshot) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1.5rem',
          marginTop: '1.2rem',
          fontSize: '0.78rem',
          fontWeight: '700',
          color: '#334155'
        }}
      >
        <div
          onClick={() => toggleBenchmark('ALPHA')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            opacity: benchmarks.ALPHA ? 1 : 0.4
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#FF5722',
              display: 'inline-block'
            }}
          />
          <span>ALPHA</span>
        </div>

        <div
          onClick={() => toggleBenchmark('IBOV')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            opacity: benchmarks.IBOV ? 1 : 0.4
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#2979FF',
              display: 'inline-block'
            }}
          />
          <span>IBOV</span>
        </div>

        <div
          onClick={() => toggleBenchmark('CDI')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            opacity: benchmarks.CDI ? 1 : 0.4
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#455A64',
              display: 'inline-block'
            }}
          />
          <span>CDI</span>
        </div>
      </div>
    </div>
  );
};
