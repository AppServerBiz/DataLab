/**
 * Nautilus Quant Design System - Chart Presets & Configurations
 * Optimized for Chart.js 4.x / React-Chartjs-2
 */

import { NAUTILUS_TOKENS } from '../tokens';

export const NAUTILUS_CHART_THEMES = {
  dark: {
    backgroundColor: '#181C25',
    gridColor: 'rgba(255, 255, 255, 0.05)',
    textColor: '#64748B',
    tickColor: '#E2E8F0',
    tooltipBg: 'rgba(24, 28, 37, 0.95)',
    tooltipBorder: 'rgba(255, 255, 255, 0.1)',
    fontFamily: "'JetBrains Mono', monospace"
  },
  print: {
    backgroundColor: '#FFFFFF',
    gridColor: '#F1F5F9',
    textColor: '#475569',
    tickColor: '#0F172A',
    tooltipBg: '#0F172A',
    tooltipBorder: '#CBD5E1',
    fontFamily: "'JetBrains Mono', monospace"
  }
};

/**
 * Cria a configuração padrão para a curva de Equity (Lucro acumulado)
 */
export function getEquityChartOptions(mode: 'dark' | 'print' = 'dark') {
  const theme = NAUTILUS_CHART_THEMES[mode];

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: mode === 'dark',
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: theme.tickColor,
          font: { family: theme.fontFamily, size: 11, weight: 'bold' as const },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        borderWidth: 1,
        titleColor: '#FFFFFF',
        bodyColor: '#E2E8F0',
        padding: 10,
        titleFont: { family: theme.fontFamily, size: 12, weight: 'bold' as const },
        bodyFont: { family: theme.fontFamily, size: 11 },
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += `$${Number(context.parsed.y).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: theme.gridColor },
        ticks: { color: theme.textColor, font: { family: theme.fontFamily, size: 10 } },
        border: { color: theme.gridColor }
      },
      y: {
        grid: { color: theme.gridColor },
        ticks: {
          color: theme.textColor,
          font: { family: theme.fontFamily, size: 10 },
          callback: (value: any) => `$${Number(value).toLocaleString('en-US')}`
        },
        border: { color: theme.gridColor }
      }
    }
  };
}

/**
 * Cria a configuração padrão para o gráfico de Drawdown Subaquático (Underwater Plot)
 */
export function getUnderwaterDrawdownOptions(mode: 'dark' | 'print' = 'dark') {
  const base = getEquityChartOptions(mode);
  return {
    ...base,
    scales: {
      ...base.scales,
      y: {
        ...base.scales.y,
        ticks: {
          color: mode === 'dark' ? '#EF4444' : '#DC2626',
          font: { family: NAUTILUS_CHART_THEMES[mode].fontFamily, size: 10 },
          callback: (val: any) => `${Number(val).toFixed(1)}%`
        }
      }
    }
  };
}

/**
 * Cria dataset de curva de Equity gradiente padrão do portal
 */
export function createEquityDataset(label: string, data: number[], color = NAUTILUS_TOKENS.colors.accentBlue) {
  return {
    label,
    data,
    borderColor: color,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    fill: true,
    tension: 0.1,
    backgroundColor: (context: any) => {
      const ctx = context.chart.ctx;
      const gradient = ctx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, `${color}33`); // 20% opacity
      gradient.addColorStop(1, `${color}00`); // 0% opacity
      return gradient;
    }
  };
}
