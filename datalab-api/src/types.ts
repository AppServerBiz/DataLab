export interface Robot {
  id: string;
  name: string;
  description: string;
  direction: string;
  style: string;
  main_indicator: string;
  asset: string;
  timeframe: string;
  created_at?: string;
  updated_at?: string;
}

export interface Backtest {
  id?: string;
  robot_id?: string;
  broker: string;
  symbol: string;
  period: string;
  date_from: string;
  date_to: string;
  quality: number;
  total_net_profit: number;
  gross_profit: number;
  gross_loss: number;
  profit_factor: number;
  expected_payoff: number;
  max_drawdown_abs: number;
  max_drawdown_pct: number;
  max_dd_balance: number;
  max_dd_equity: number;
  recovery_factor: number;
  sharpe_ratio: number;
  total_trades: number;
  profitable_trades: number;
  losing_trades: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  max_win: number;
  max_loss: number;
  avg_trade_duration: string;
  best_consecutive_wins: string;
  best_consecutive_losses: string;
  parameters: Record<string, any>;
  created_at?: string;
}

export interface EquityPoint {
  x: number;
  y: number;
}
