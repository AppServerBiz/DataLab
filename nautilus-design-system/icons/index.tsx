import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  className?: string;
}

/**
 * Nautilus Logo / Spiral Shell Symbol
 */
export const IconNautilus: React.FC<IconProps> = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5" />
    <path d="M12 6a6 6 0 0 0-6 6c0 2.65 1.72 4.9 4.1 5.7" />
    <path d="M12 10a2 2 0 0 0-2 2c0 .88.57 1.63 1.37 1.9" />
    <circle cx="12" cy="12" r="0.5" fill={color} />
  </svg>
);

/**
 * Quant Candlestick Icon
 */
export const IconCandlestick: React.FC<IconProps> = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 3v4" />
    <rect x="6" y="7" width="6" height="8" rx="1" />
    <path d="M9 15v6" />
    <path d="M17 5v2" />
    <rect x="14" y="7" width="6" height="11" rx="1" />
    <path d="M17 18v3" />
  </svg>
);

/**
 * Quant Equity Growth Curve Icon
 */
export const IconEquityCurve: React.FC<IconProps> = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 20h18" />
    <path d="M3 17l6-6 4 4 8-10" />
    <polyline points="15 5 21 5 21 11" />
  </svg>
);

/**
 * Quant Drawdown / Risk Icon
 */
export const IconDrawdown: React.FC<IconProps> = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 4h18" />
    <path d="M3 7l6 6 4-4 8 10" />
    <polyline points="21 13 21 19 15 19" />
  </svg>
);

/**
 * Robot Strategy / Algorithmic Core Icon
 */
export const IconRobot: React.FC<IconProps> = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="4" y="8" width="16" height="12" rx="2" />
    <path d="M12 4v4" />
    <circle cx="9" cy="13" r="1" fill={color} />
    <circle cx="15" cy="13" r="1" fill={color} />
    <path d="M9 17h6" />
  </svg>
);

/**
 * Quant Matrix / Heatmap Icon
 */
export const IconMatrix: React.FC<IconProps> = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);

/**
 * Report PDF / Tear Sheet Export Icon
 */
export const IconReport: React.FC<IconProps> = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

/**
 * Sharpe Ratio / Target Gauge Icon
 */
export const IconSharpeGauge: React.FC<IconProps> = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 21a9 9 0 1 1 9-9" />
    <path d="M12 12l5-5" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const NAUTILUS_ICONS = {
  Nautilus: IconNautilus,
  Candlestick: IconCandlestick,
  EquityCurve: IconEquityCurve,
  Drawdown: IconDrawdown,
  Robot: IconRobot,
  Matrix: IconMatrix,
  Report: IconReport,
  SharpeGauge: IconSharpeGauge
};
