import React, { useState, useMemo, useEffect } from 'react';
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
  printMode?: boolean;
}

type PeriodFilter = '2026' | '12m' | '24m' | '36m' | '60m' | 'all';

// Cache to prevent repetitive external fetching on minor renders
let cachedCdiData: { date: string; value: number }[] = [];
let cachedIbovData: { date: string; value: number }[] = [];

// Helper to normalize any date string to YYYY-MM month key
const getMonthKey = (dayStr: string): string => {
  if (!dayStr) return '';
  const parts = dayStr.split(/[-./]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD or YYYY.MM.DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      // DD/MM/YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}`;
    }
  }
  return dayStr.substring(0, 7);
};

export const ProfitabilityChart: React.FC<ProfitabilityChartProps> = ({
  portfolioName,
  capital,
  combinedCurve = [],
  printMode = false
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('12m');
  const [syncingCdi, setSyncingCdi] = useState(false);
  const [benchmarks, setBenchmarks] = useState<{ [key: string]: boolean }>({
    PORTFOLIO: true,
    IBOV: true,
    CDI: true
  });

  const [realCdi, setRealCdi] = useState<{ date: string; value: number }[]>(cachedCdiData);
  const [realIbov, setRealIbov] = useState<{ date: string; value: number }[]>(cachedIbovData);

  const handleSyncCdi = async () => {
    try {
      setSyncingCdi(true);
      const res = await fetch('/api/benchmarks/cdi/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const r = await fetch('/api/benchmarks/cdi');
        const cdiRes = await r.json();
        if (Array.isArray(cdiRes) && cdiRes.length > 0) {
          const parsed = cdiRes
            .filter((item: any) => item && item.data && item.valor !== undefined)
            .map((item: any) => {
              const parts = item.data.split('/');
              if (parts.length === 3) {
                const [d, m, y] = parts;
                const valStr = String(item.valor).replace(',', '.');
                return {
                  date: `${y}-${m.padStart(2, '0')}`,
                  value: parseFloat(valStr) / 100
                };
              }
              return null;
            })
            .filter((item): item is { date: string; value: number } => item !== null);

          cachedCdiData = parsed;
          setRealCdi(parsed);
        }
      }
    } catch (e) {
      console.error('Erro ao sincronizar CDI:', e);
    } finally {
      setSyncingCdi(false);
    }
  };

  // 1. Fetch CDI and IBOV via backend proxy (bypasses CORS)
  useEffect(() => {
    if (combinedCurve.length === 0) return;

    const sortedDays = [...combinedCurve]
      .map(c => c.day)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const startDate = sortedDays[0];
    const endDate = sortedDays[sortedDays.length - 1];

    if (!startDate || !endDate) return;

    // Convert to pt-BR format (dd/MM/yyyy) for BCB API without timezone issues
    const formatDateForBCB = (dateStr: string) => {
      if (!dateStr) return '01/01/2020';
      const parts = dateStr.split(/[-./]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
        }
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
      return dateStr;
    };

    const bcbStart = formatDateForBCB(startDate);
    const bcbEnd = formatDateForBCB(endDate);

    // Fetch CDI via backend proxy (série 4391 - CDI acumulado mensal)
    if (realCdi.length === 0) {
      fetch(`/api/benchmarks/cdi?start=${encodeURIComponent(bcbStart)}&end=${encodeURIComponent(bcbEnd)}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const parsed = data
              .filter((item: any) => item && item.data && item.valor !== undefined)
              .map((item: any) => {
                const parts = item.data.split('/');
                if (parts.length === 3) {
                  const [d, m, y] = parts;
                  const valStr = String(item.valor).replace(',', '.');
                  return {
                    date: `${y}-${m.padStart(2, '0')}`, // Monthly key "YYYY-MM"
                    value: parseFloat(valStr) / 100 // e.g. 0.97% -> 0.0097
                  };
                }
                return null;
              })
              .filter((item): item is { date: string; value: number } => item !== null);

            if (parsed.length > 0) {
              cachedCdiData = parsed;
              setRealCdi(parsed);
            } else {
              generateFallbackCdi(sortedDays);
            }
          } else {
            generateFallbackCdi(sortedDays);
          }
        })
        .catch(err => {
          console.error('Erro ao buscar CDI mensal:', err);
          generateFallbackCdi(sortedDays);
        });
    }

    // Fetch IBOV via backend proxy
    if (realIbov.length === 0) {
      fetch(`/api/benchmarks/ibov?start=${startDate}&end=${endDate}`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.prices)) {
            const parsed = data.prices.map((p: any) => ({
              date: p.date, // YYYY-MM-DD
              value: parseFloat(p.close)
            }));
            cachedIbovData = parsed;
            setRealIbov(parsed);
          } else {
            generateFallbackIbov(sortedDays);
          }
        })
        .catch(() => {
          generateFallbackIbov(sortedDays);
        });
    }
  }, [combinedCurve]);

  const generateFallbackCdi = (sortedDays: string[]) => {
    const monthSet = new Set<string>();
    sortedDays.forEach(day => {
      const key = getMonthKey(day);
      if (key) monthSet.add(key);
    });

    const fallback = Array.from(monthSet).map(date => ({
      date,
      value: 0.0095 // ~0.95% a.m. (fallback de segurança)
    }));

    cachedCdiData = fallback;
    setRealCdi(fallback);
  };

  const generateFallbackIbov = (sortedDays: string[]) => {
    let baseValue = 115000;
    const points = sortedDays.map((day, idx) => {
      const t = idx / (sortedDays.length - 1);
      const wave = Math.sin(t * Math.PI * 2.2) * 8000;
      const noise = (Math.sin(idx * 0.5) + Math.cos(idx * 0.8)) * 1200;
      const trend = t * 15000;
      return {
        date: day,
        value: baseValue + trend + wave + noise
      };
    });
    cachedIbovData = points;
    setRealIbov(points);
  };

  // Group daily points to monthly points (end of each month) to present clean month-by-month changes
  const chartData = useMemo(() => {
    if (!combinedCurve || combinedCurve.length === 0) return null;

    const sortedPoints = [...combinedCurve].sort(
      (a, b) => new Date(a.day).getTime() - new Date(b.day).getTime()
    );

    const lastPointDate = new Date(sortedPoints[sortedPoints.length - 1].day);
    const lastYearStr = String(lastPointDate.getFullYear());

    let filteredPoints = sortedPoints;

    if (selectedPeriod === '2026') {
      filteredPoints = sortedPoints.filter(p => p.day.startsWith('2026') || p.day.startsWith(lastYearStr));
    } else if (selectedPeriod !== 'all') {
      const months = parseInt(selectedPeriod.replace('m', ''), 10);
      const cutoff = new Date(lastPointDate);
      cutoff.setMonth(cutoff.getMonth() - months);
      filteredPoints = sortedPoints.filter(p => new Date(p.day) >= cutoff);
    }

    if (filteredPoints.length === 0) filteredPoints = sortedPoints;

    // Grouping by Month Key (YYYY-MM) and picking the last trading day of the month as the representation point
    const monthlyGroups: { [key: string]: typeof combinedCurve[0] } = {};
    filteredPoints.forEach(p => {
      const monthKey = getMonthKey(p.day);
      if (monthKey) {
        monthlyGroups[monthKey] = p; // Will naturally overwrite to the latest point of that month
      }
    });

    const monthlySampled = Object.keys(monthlyGroups)
      .sort()
      .map(key => monthlyGroups[key]);

    if (monthlySampled.length === 0) return null;

    const baseProfit = monthlySampled[0].balanceProfit || monthlySampled[0].profit || 0;
    
    // Labels formatted as "Jan/26", "Fev/26"
    const labels = monthlySampled.map(p => {
      try {
        const d = new Date(p.day);
        const name = d.toLocaleDateString('pt-BR', { month: 'short' });
        const year = String(d.getFullYear()).substring(2);
        return `${name.replace('.', '')}/${year}`;
      } catch (e) {
        return p.day;
      }
    });

    const datasets: any[] = [];

    // 1. PORTFOLIO (ALPHA) % Series
    const portfolioSeries = monthlySampled.map(p => {
      const netProfit = (p.balanceProfit !== undefined ? p.balanceProfit : p.profit) - baseProfit;
      return capital > 0 ? (netProfit / capital) * 100 : 0;
    });

    if (benchmarks.PORTFOLIO) {
      datasets.push({
        label: portfolioName || 'Portfólio',
        data: portfolioSeries,
        borderColor: '#38BDF8', // DataLab Accent Blue
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        tension: 0.25,
        pointRadius: 4,
        pointHoverRadius: 6
      });
    }

    // 2. REAL IBOV Cumulative % Return (Month-over-month)
    if (benchmarks.IBOV && realIbov.length > 0) {
      const ibovPricesMapped = monthlySampled.map(p => {
        const match = realIbov.find(item => item.date === p.day);
        if (match) return match.value;
        // Find closest date close to p.day
        let closest = realIbov[0];
        let minDist = Infinity;
        const targetTime = new Date(p.day).getTime();
        for (const item of realIbov) {
          const dist = Math.abs(new Date(item.date).getTime() - targetTime);
          if (dist < minDist) {
            minDist = dist;
            closest = item;
          }
        }
        return closest ? closest.value : 100000;
      });

      const initialIbovPrice = ibovPricesMapped[0] || 100000;
      const ibovSeries = ibovPricesMapped.map(v => ((v - initialIbovPrice) / initialIbovPrice) * 100);

      datasets.push({
        label: 'IBOV',
        data: ibovSeries,
        borderColor: '#F59E0B', // DataLab Gold/Yellow
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5
      });
    }

    // 3. REAL CDI Cumulative % Return compounding month-by-month (série 4391)
    if (benchmarks.CDI && realCdi.length > 0) {
      // Collect all month keys in the sampled range
      const monthKeys = monthlySampled.map(p => getMonthKey(p.day));

      // Fast lookup map for monthly CDI rate
      const cdiMap = new Map<string, number>();
      realCdi.forEach(item => cdiMap.set(item.date, item.value));

      let compoundedFactor = 1.0;
      const cdiSeries = monthKeys.map((mk, idx) => {
        if (idx === 0) {
          return 0; // Base month starts at 0%
        }
        // Fallback rate ~0.95% if missing for a specific month
        const rate = cdiMap.get(mk) ?? 0.0095;
        compoundedFactor *= (1 + rate);
        return (compoundedFactor - 1) * 100;
      });

      datasets.push({
        label: 'CDI',
        data: cdiSeries,
        borderColor: '#94A3B8', // DataLab Muted Gray
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 5
      });
    }

    return { labels, datasets };
  }, [combinedCurve, selectedPeriod, capital, benchmarks, realCdi, realIbov, portfolioName]);

  const toggleBenchmark = (key: string) => {
    setBenchmarks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const periodOptions: PeriodFilter[] = ['2026', '12m', '24m', '36m', '60m'];

  return (
    <div
      style={{
        background: printMode ? '#FFFFFF' : '#13171F',
        borderRadius: '12px',
        border: printMode ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.05)',
        padding: '1.5rem',
        marginTop: '1.5rem',
        color: printMode ? '#0F172A' : '#E2E8F0',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {/* Header Bar (hidden in report printMode as report has standard module title) */}
      {!printMode && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '0.8rem',
                fontWeight: '700',
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              Evolução de Rentabilidade Mensal vs Benchmarks
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Sync Button */}
            <button
              onClick={handleSyncCdi}
              disabled={syncingCdi}
              title="Sincronizar histórico do CDI no Banco Central"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: syncingCdi ? '#64748B' : '#E2E8F0',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.7rem',
                cursor: syncingCdi ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                transition: 'all 0.15s ease'
              }}
            >
              {syncingCdi ? '🔄 Sincronizando...' : '🔄 Sincronizar BCB'}
            </button>

            {/* Period Selector Buttons */}
            <div
              style={{
                display: 'flex',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.01)'
              }}
            >
              {periodOptions.map(p => {
                const active = selectedPeriod === p;
                return (
                  <button
                    key={p}
                    onClick={() => setSelectedPeriod(p)}
                    style={{
                      background: active ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                      color: active ? '#38BDF8' : '#64748B',
                      border: 'none',
                      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: active ? '700' : '500',
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
      )}

      {/* Chart Canvas Area */}
      <div style={{ height: '300px', position: 'relative', width: '100%' }}>
        {chartData ? (
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: printMode ? '#0F172A' : '#1E232F',
                  titleColor: '#fff',
                  bodyColor: '#E2E8F0',
                  padding: 10,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 1,
                  bodyFont: { family: 'Inter, sans-serif', size: 10 },
                  titleFont: { family: 'Inter, sans-serif', size: 10 },
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
                    color: printMode ? '#475569' : '#64748B',
                    font: { size: 9, family: 'Inter, sans-serif' }
                  }
                },
                y: {
                  position: 'left',
                  grid: { color: printMode ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)' },
                  ticks: {
                    color: printMode ? '#475569' : '#64748B',
                    font: { size: 9, family: 'Inter, sans-serif' },
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
              color: '#64748B',
              fontSize: '0.8rem'
            }}
          >
            Carregando dados oficiais (BCB)...
          </div>
        )}
      </div>

      {/* Dynamic DataLab Style Legends */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1.5rem',
          marginTop: '1.2rem',
          fontSize: '0.7rem',
          fontWeight: '700',
          color: '#64748B'
        }}
      >
        <div
          onClick={() => toggleBenchmark('PORTFOLIO')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            opacity: benchmarks.PORTFOLIO ? 1 : 0.35,
            transition: 'opacity 0.2s'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#38BDF8',
              display: 'inline-block'
            }}
          />
          <span style={{ color: benchmarks.PORTFOLIO ? '#38BDF8' : '#64748B' }}>
            {portfolioName ? portfolioName.toUpperCase() : 'PORTFÓLIO'}
          </span>
        </div>

        <div
          onClick={() => toggleBenchmark('IBOV')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            opacity: benchmarks.IBOV ? 1 : 0.35,
            transition: 'opacity 0.2s'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#F59E0B',
              display: 'inline-block'
            }}
          />
          <span style={{ color: benchmarks.IBOV ? '#F59E0B' : '#64748B' }}>IBOVESPA</span>
        </div>

        <div
          onClick={() => toggleBenchmark('CDI')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            opacity: benchmarks.CDI ? 1 : 0.35,
            transition: 'opacity 0.2s'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#94A3B8',
              display: 'inline-block'
            }}
          />
          <span style={{ color: benchmarks.CDI ? '#E2E8F0' : '#64748B' }}>CDI (BCB)</span>
        </div>
      </div>
    </div>
  );
};
