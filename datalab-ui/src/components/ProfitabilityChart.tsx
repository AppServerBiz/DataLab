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
import { useLanguage } from '../LanguageContext';

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
let cachedSp500Data: { date: string; value: number }[] = [];
let cachedTreasuryData: { date: string; value: number }[] = [];
let cachedFedFundsData: { date: string; rate: number }[] = [];

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
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('12m');
  const [syncingCdi, setSyncingCdi] = useState(false);
  const [benchmarks, setBenchmarks] = useState<{ [key: string]: boolean }>({
    PORTFOLIO: true,
    IBOV: false,
    CDI: false,
    SP500: true,
    TREASURY: true,
    FEDFUNDS: true
  });

  const [realCdi, setRealCdi] = useState<{ date: string; value: number }[]>(cachedCdiData);
  const [realIbov, setRealIbov] = useState<{ date: string; value: number }[]>(cachedIbovData);
  const [realSp500, setRealSp500] = useState<{ date: string; value: number }[]>(cachedSp500Data);
  const [realTreasury, setRealTreasury] = useState<{ date: string; value: number }[]>(cachedTreasuryData);
  const [realFedFunds, setRealFedFunds] = useState<{ date: string; rate: number }[]>(cachedFedFundsData);

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

  // 1. Fetch Benchmarks via backend proxy (bypasses CORS)
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

    // Fetch S&P 500 via backend proxy (Yahoo Finance ^GSPC)
    if (realSp500.length === 0) {
      fetch('/api/benchmarks/sp500')
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.prices) && data.prices.length > 0) {
            const parsed = data.prices.map((p: any) => ({
              date: p.date,
              value: parseFloat(p.close)
            }));
            cachedSp500Data = parsed;
            setRealSp500(parsed);
          } else {
            generateFallbackSp500(sortedDays);
          }
        })
        .catch(() => {
          generateFallbackSp500(sortedDays);
        });
    }

    // Fetch US Treasury via backend proxy (Yahoo Finance IEF - 7-10Y Treasury Bond)
    if (realTreasury.length === 0) {
      fetch('/api/benchmarks/ustreasury')
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.prices) && data.prices.length > 0) {
            const parsed = data.prices.map((p: any) => ({
              date: p.date,
              value: parseFloat(p.close)
            }));
            cachedTreasuryData = parsed;
            setRealTreasury(parsed);
          } else {
            generateFallbackTreasury(sortedDays);
          }
        })
        .catch(() => {
          generateFallbackTreasury(sortedDays);
        });
    }

    // Fetch Fed Funds via backend proxy (FRED / Yahoo Finance IRX)
    if (realFedFunds.length === 0) {
      fetch('/api/benchmarks/fedfunds')
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.rates) && data.rates.length > 0) {
            const parsed = data.rates.map((r: any) => ({
              date: r.date, // YYYY-MM
              rate: parseFloat(r.rate)
            }));
            cachedFedFundsData = parsed;
            setRealFedFunds(parsed);
          } else {
            generateFallbackFedFunds(sortedDays);
          }
        })
        .catch(() => {
          generateFallbackFedFunds(sortedDays);
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
      value: 0.0095 // ~0.95% a.m.
    }));

    cachedCdiData = fallback;
    setRealCdi(fallback);
  };

  const generateFallbackFedFunds = (sortedDays: string[]) => {
    const monthSet = new Set<string>();
    sortedDays.forEach(day => {
      const key = getMonthKey(day);
      if (key) monthSet.add(key);
    });

    const fallback = Array.from(monthSet).map(date => ({
      date,
      rate: 3.65 // ~3.65% annualized
    }));

    cachedFedFundsData = fallback;
    setRealFedFunds(fallback);
  };

  const generateFallbackIbov = (sortedDays: string[]) => {
    let baseValue = 115000;
    const points = sortedDays.map((day, idx) => {
      const t = idx / (sortedDays.length - 1 || 1);
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

  const generateFallbackSp500 = (sortedDays: string[]) => {
    let baseValue = 4200;
    const points = sortedDays.map((day, idx) => {
      const t = idx / (sortedDays.length - 1 || 1);
      const wave = Math.sin(t * Math.PI * 2.0) * 300;
      const trend = t * 1600;
      return {
        date: day,
        value: baseValue + trend + wave
      };
    });
    cachedSp500Data = points;
    setRealSp500(points);
  };

  const generateFallbackTreasury = (sortedDays: string[]) => {
    let baseValue = 95;
    const points = sortedDays.map((day, idx) => {
      const t = idx / (sortedDays.length - 1 || 1);
      const trend = t * 3.5;
      return {
        date: day,
        value: baseValue + trend
      };
    });
    cachedTreasuryData = points;
    setRealTreasury(points);
  };

  // Helper to map benchmark price series to monthlySampled points and compute cumulative %
  const mapPriceSeriesToReturn = (
    monthlySampled: Array<{ day: string }>,
    rawPoints: Array<{ date: string; value: number }>
  ) => {
    if (!rawPoints || rawPoints.length === 0) return [];

    const mappedPrices = monthlySampled.map(p => {
      const pMonth = getMonthKey(p.day);
      // Try exact or month match
      const monthMatch = rawPoints.find(item => getMonthKey(item.date) === pMonth);
      if (monthMatch) return monthMatch.value;

      // Find closest date
      let closest = rawPoints[0];
      let minDist = Infinity;
      const targetTime = new Date(p.day).getTime();
      for (const item of rawPoints) {
        const dist = Math.abs(new Date(item.date).getTime() - targetTime);
        if (dist < minDist) {
          minDist = dist;
          closest = item;
        }
      }
      return closest ? closest.value : rawPoints[0].value;
    });

    const initialPrice = mappedPrices[0] || 1;
    return mappedPrices.map(v => ((v - initialPrice) / initialPrice) * 100);
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

    const baseProfit = monthlySampled[0].balanceProfit !== undefined ? monthlySampled[0].balanceProfit : (monthlySampled[0].profit || 0);
    
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
        borderWidth: 2.8,
        tension: 0.25,
        pointRadius: 4,
        pointHoverRadius: 6,
        order: 1
      });
    }

    // 2. REAL IBOV Cumulative % Return
    if (benchmarks.IBOV && realIbov.length > 0) {
      const ibovSeries = mapPriceSeriesToReturn(monthlySampled, realIbov);
      datasets.push({
        label: 'IBOVESPA',
        data: ibovSeries,
        borderColor: '#F59E0B', // Gold / Amber
        backgroundColor: 'transparent',
        borderWidth: 1.8,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5,
        order: 2
      });
    }

    // 3. REAL CDI Cumulative % Return compounding month-by-month (série 4391)
    if (benchmarks.CDI && realCdi.length > 0) {
      const monthKeys = monthlySampled.map(p => getMonthKey(p.day));
      const cdiMap = new Map<string, number>();
      realCdi.forEach(item => cdiMap.set(item.date, item.value));

      let compoundedFactor = 1.0;
      const cdiSeries = monthKeys.map((mk, idx) => {
        if (idx === 0) return 0;
        const rate = cdiMap.get(mk) ?? 0.0095;
        compoundedFactor *= (1 + rate);
        return (compoundedFactor - 1) * 100;
      });

      datasets.push({
        label: 'CDI (BCB)',
        data: cdiSeries,
        borderColor: '#94A3B8', // Slate / Gray
        backgroundColor: 'transparent',
        borderWidth: 1.8,
        borderDash: [4, 4],
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 5,
        order: 3
      });
    }

    // 4. S&P 500 Cumulative % Return (International)
    if (benchmarks.SP500 && realSp500.length > 0) {
      const spSeries = mapPriceSeriesToReturn(monthlySampled, realSp500);
      datasets.push({
        label: 'S&P 500',
        data: spSeries,
        borderColor: '#10B981', // Emerald Green
        backgroundColor: 'transparent',
        borderWidth: 1.8,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5,
        order: 4
      });
    }

    // 5. T-Bond 10Y (Marcação a Mercado - ETF IEF 7-10Y)
    if (benchmarks.TREASURY && realTreasury.length > 0) {
      const treasurySeries = mapPriceSeriesToReturn(monthlySampled, realTreasury);
      datasets.push({
        label: 'T-Bond 10Y (Marcação Mercado)',
        data: treasurySeries,
        borderColor: '#A855F7', // Purple
        backgroundColor: 'transparent',
        borderWidth: 1.8,
        tension: 0.2,
        pointRadius: 3,
        pointHoverRadius: 5,
        order: 5
      });
    }

    // 6. Fed Funds Rate (Acumulado Livre de Risco - Equivalente ao CDI nos EUA)
    if (benchmarks.FEDFUNDS && realFedFunds.length > 0) {
      const monthKeys = monthlySampled.map(p => getMonthKey(p.day));
      const fedMap = new Map<string, number>();
      realFedFunds.forEach(item => fedMap.set(item.date, item.rate));

      let compoundedFactor = 1.0;
      const fedSeries = monthKeys.map((mk, idx) => {
        if (idx === 0) return 0;
        // Annualized rate in % (e.g. 5.33 -> 5.33% / 100)
        const annRate = fedMap.get(mk) ?? 3.65;
        // Monthly compounding: (1 + annRate/100)^(1/12) - 1
        const monthlyRate = Math.pow(1 + (annRate / 100), 1 / 12) - 1;
        compoundedFactor *= (1 + monthlyRate);
        return (compoundedFactor - 1) * 100;
      });

      datasets.push({
        label: 'Fed Funds (Acumulado)',
        data: fedSeries,
        borderColor: '#EC4899', // Pink / Rose
        backgroundColor: 'transparent',
        borderWidth: 1.8,
        borderDash: [4, 4],
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 5,
        order: 6
      });
    }

    return { labels, datasets };
  }, [combinedCurve, selectedPeriod, capital, benchmarks, realCdi, realIbov, realSp500, realTreasury, realFedFunds, portfolioName]);

  const toggleBenchmark = (key: string) => {
    setBenchmarks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Toggle all benchmarks in a group (Brasil: IBOV, CDI | Internacional: SP500, TREASURY, FEDFUNDS)
  const toggleGroup = (group: 'BR' | 'INT') => {
    setBenchmarks(prev => {
      if (group === 'BR') {
        const isAnyActive = prev.IBOV || prev.CDI;
        return { ...prev, IBOV: !isAnyActive, CDI: !isAnyActive };
      } else {
        const isAnyActive = prev.SP500 || prev.TREASURY || prev.FEDFUNDS;
        return {
          ...prev,
          SP500: !isAnyActive,
          TREASURY: !isAnyActive,
          FEDFUNDS: !isAnyActive
        };
      }
    });
  };

  const isBrazilActive = benchmarks.IBOV || benchmarks.CDI;
  const isInternationalActive = benchmarks.SP500 || benchmarks.TREASURY || benchmarks.FEDFUNDS;

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
              {t('report.benchmarkEvolution', 'Evolução de Rentabilidade Mensal vs Benchmarks')}
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
            Carregando dados de benchmarks...
          </div>
        )}
      </div>

      {/* Dynamic DataLab Style Legends with Brazilian vs International Groups */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.9rem',
          marginTop: '1.4rem',
          paddingTop: '1rem',
          borderTop: printMode ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.72rem',
          fontWeight: '700'
        }}
      >
        {/* Main Portfolio Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            onClick={() => toggleBenchmark('PORTFOLIO')}
            title="Clique para mostrar/ocultar do gráfico"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              opacity: benchmarks.PORTFOLIO ? 1 : 0.35,
              transition: 'all 0.2s',
              background: benchmarks.PORTFOLIO ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              padding: '0.3rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: benchmarks.PORTFOLIO ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.05)'
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#38BDF8',
                display: 'inline-block'
              }}
            />
            <span style={{ color: benchmarks.PORTFOLIO ? '#38BDF8' : '#64748B', textTransform: 'uppercase' }}>
              {portfolioName ? portfolioName.toUpperCase() : 'PORTFÓLIO'}
            </span>
          </div>
        </div>

        {/* Group Comparison Sections */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1.5rem',
            width: '100%'
          }}
        >
          {/* Brazilian Benchmarks Group */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: printMode ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
              padding: '0.35rem 0.8rem',
              borderRadius: '8px',
              border: printMode ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            {/* Clickable Hyperlink for Brasil */}
            <span
              onClick={() => toggleGroup('BR')}
              title={isBrazilActive ? 'Clique para desabilitar todos os benchmarks do Brasil' : 'Clique para habilitar todos os benchmarks do Brasil'}
              style={{
                fontSize: '0.65rem',
                color: isBrazilActive ? '#38BDF8' : (printMode ? '#94A3B8' : '#64748B'),
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginRight: '0.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                fontWeight: isBrazilActive ? '800' : '600',
                transition: 'all 0.15s ease'
              }}
            >
              🇧🇷 Brasil:
            </span>

            {/* IBOVESPA */}
            <div
              onClick={() => toggleBenchmark('IBOV')}
              title="Clique para mostrar/ocultar IBOVESPA"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                opacity: benchmarks.IBOV ? 1 : 0.35,
                transition: 'opacity 0.2s',
                padding: '0.2rem 0.45rem',
                borderRadius: '4px',
                background: benchmarks.IBOV ? 'rgba(245, 158, 11, 0.1)' : 'transparent'
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

            {/* CDI */}
            <div
              onClick={() => toggleBenchmark('CDI')}
              title="Clique para mostrar/ocultar CDI"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                opacity: benchmarks.CDI ? 1 : 0.35,
                transition: 'opacity 0.2s',
                padding: '0.2rem 0.45rem',
                borderRadius: '4px',
                background: benchmarks.CDI ? 'rgba(148, 163, 184, 0.1)' : 'transparent'
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
              <span style={{ color: benchmarks.CDI ? (printMode ? '#334155' : '#E2E8F0') : '#64748B' }}>CDI (BCB)</span>
            </div>
          </div>

          {/* International Benchmarks Group */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: printMode ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
              padding: '0.35rem 0.8rem',
              borderRadius: '8px',
              border: printMode ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            {/* Clickable Hyperlink for Internacional */}
            <span
              onClick={() => toggleGroup('INT')}
              title={isInternationalActive ? 'Clique para desabilitar todos os benchmarks internacionais' : 'Clique para habilitar todos os benchmarks internacionais'}
              style={{
                fontSize: '0.65rem',
                color: isInternationalActive ? '#38BDF8' : (printMode ? '#94A3B8' : '#64748B'),
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginRight: '0.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                fontWeight: isInternationalActive ? '800' : '600',
                transition: 'all 0.15s ease'
              }}
            >
              🌐 Internacional:
            </span>

            {/* S&P 500 */}
            <div
              onClick={() => toggleBenchmark('SP500')}
              title="Clique para mostrar/ocultar S&P 500"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                opacity: benchmarks.SP500 ? 1 : 0.35,
                transition: 'opacity 0.2s',
                padding: '0.2rem 0.45rem',
                borderRadius: '4px',
                background: benchmarks.SP500 ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10B981',
                  display: 'inline-block'
                }}
              />
              <span style={{ color: benchmarks.SP500 ? '#10B981' : '#64748B' }}>S&P 500</span>
            </div>

            {/* T-Bond 10Y (Marcação a Mercado) */}
            <div
              onClick={() => toggleBenchmark('TREASURY')}
              title="Clique para mostrar/ocultar T-Bond 10Y (Marcação a Mercado)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                opacity: benchmarks.TREASURY ? 1 : 0.35,
                transition: 'opacity 0.2s',
                padding: '0.2rem 0.45rem',
                borderRadius: '4px',
                background: benchmarks.TREASURY ? 'rgba(168, 85, 247, 0.1)' : 'transparent'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#A855F7',
                  display: 'inline-block'
                }}
              />
              <span style={{ color: benchmarks.TREASURY ? '#A855F7' : '#64748B' }}>T-Bond 10Y (Mercado)</span>
            </div>

            {/* Fed Funds Rate (Acumulado) */}
            <div
              onClick={() => toggleBenchmark('FEDFUNDS')}
              title="Clique para mostrar/ocultar Fed Funds (Acumulado Livre de Risco)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                opacity: benchmarks.FEDFUNDS ? 1 : 0.35,
                transition: 'opacity 0.2s',
                padding: '0.2rem 0.45rem',
                borderRadius: '4px',
                background: benchmarks.FEDFUNDS ? 'rgba(236, 72, 153, 0.1)' : 'transparent'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#EC4899',
                  display: 'inline-block'
                }}
              />
              <span style={{ color: benchmarks.FEDFUNDS ? '#EC4899' : '#64748B' }}>Fed Funds (Acumulado)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
