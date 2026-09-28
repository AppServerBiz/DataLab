import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string | number;
  isPositive?: boolean;
  tooltip?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  isPositive,
  tooltip,
  icon
}) => {
  return (
    <div className="card card-kpi" data-tooltip={tooltip}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h2 className="card-title" style={{ margin: 0 }}>{title}</h2>
        {icon && <div style={{ color: 'var(--accent-blue)', opacity: 0.8 }}>{icon}</div>}
      </div>

      <div className="value-highlight" style={{
        color: isPositive !== undefined ? (isPositive ? 'var(--accent-green)' : 'var(--accent-red)') : '#FFFFFF'
      }}>
        {value}
      </div>

      {(subtitle || change !== undefined) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
          {subtitle && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{subtitle}</span>}
          {change !== undefined && (
            <span className={`badge ${isPositive ? 'badge-profit' : 'badge-loss'}`}>
              {isPositive ? '+' : ''}{change}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export interface QuantBadgeProps {
  type?: 'profit' | 'loss' | 'blue' | 'neutral';
  children: React.ReactNode;
}

export const QuantBadge: React.FC<QuantBadgeProps> = ({ type = 'blue', children }) => {
  const badgeClass = {
    profit: 'badge badge-profit',
    loss: 'badge badge-loss',
    blue: 'badge badge-blue',
    neutral: 'badge'
  }[type];

  return <span className={badgeClass}>{children}</span>;
};

export interface MatrixCellProps {
  value: number;
  min?: number;
  max?: number;
  formatter?: (val: number) => string;
}

/**
 * Célula de Matriz de Correlação / Risco Quant
 */
export const CorrelationCell: React.FC<MatrixCellProps> = ({ value, formatter }) => {
  // -1 a +1
  const getColor = (v: number) => {
    if (v >= 0.7) return 'rgba(239, 68, 68, 0.85)';  // Alto risco / Alta correlação positiva
    if (v >= 0.4) return 'rgba(245, 158, 11, 0.7)';  // Moderado
    if (v >= 0.1) return 'rgba(148, 163, 184, 0.2)'; // Baixa correlação
    return 'rgba(34, 197, 94, 0.6)';                 // Descorrelação / Hedge (Verde)
  };

  const bg = getColor(value);
  const textColor = Math.abs(value) >= 0.4 ? '#FFFFFF' : '#CBD5E1';

  return (
    <div style={{
      background: bg,
      color: textColor,
      padding: '8px',
      borderRadius: '4px',
      textAlign: 'center',
      fontWeight: 600,
      fontSize: '0.82rem',
      fontFamily: 'var(--font-main)'
    }}>
      {formatter ? formatter(value) : value.toFixed(2)}
    </div>
  );
};
