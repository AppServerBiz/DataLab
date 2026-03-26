export interface Robot {
  id: string;
  name: string;
  description: string;
  direction: string;
  style: string;
  main_indicator: string;
  asset: string;
  timeframe: string;
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
  max_drawdown_abs: number;
  max_drawdown_pct: number;
  max_dd_balance: number;
  recovery_factor: number;
  sharpe_ratio: number;
  total_trades: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
}
