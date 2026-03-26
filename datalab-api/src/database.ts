import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (db) return db;

  const dbPath = path.resolve(__dirname, '..', 'nautilus.db');
  db = await open({ filename: dbPath, driver: sqlite3.Database });
  await db.exec('PRAGMA foreign_keys = ON;');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS robots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      -- 10 Elite Metrics
      total_net_profit REAL DEFAULT 0,
      max_dd_equity REAL DEFAULT 0,
      max_dd_equity_pct REAL DEFAULT 0,
      profit_factor REAL DEFAULT 0,
      total_trades INTEGER DEFAULT 0,
      short_trades INTEGER DEFAULT 0,
      short_win_pct REAL DEFAULT 0,
      long_trades INTEGER DEFAULT 0,
      long_win_pct REAL DEFAULT 0,
      expected_payoff REAL DEFAULT 0,
      sharpe_ratio REAL DEFAULT 0,
      max_drawdown_abs REAL DEFAULT 0,
      initial_deposit REAL DEFAULT 10000,
      -- Extra metrics
      gross_profit REAL DEFAULT 0,
      gross_loss REAL DEFAULT 0,
      recovery_factor REAL DEFAULT 0,
      profitable_trades INTEGER DEFAULT 0,
      losing_trades INTEGER DEFAULT 0,
      win_rate REAL DEFAULT 0,
      avg_win REAL DEFAULT 0,
      avg_loss REAL DEFAULT 0,
      max_win REAL DEFAULT 0,
      max_loss REAL DEFAULT 0,
      max_consecutive_wins TEXT,
      max_consecutive_losses TEXT,
      avg_trade_duration TEXT,
      quality REAL DEFAULT 0,
      -- Config
      asset TEXT,
      period TEXT,
      timeframe TEXT,
      date_from TEXT,
      date_to TEXT,
      broker TEXT,
      parameters TEXT,
      total_months INTEGER DEFAULT 0,
      avg_profit_per_month REAL DEFAULT 0,
      -- More detailed data
      equity_curve TEXT,
      monthly_drawdown TEXT,
      max_dd_from_csv REAL DEFAULT 0,
      max_dd_pct_from_csv REAL DEFAULT 0,
      -- UI state
      config_html TEXT,
      raw_html MEDIUMTEXT,
      raw_csv MEDIUMTEXT,
      approved INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portfolios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      capital REAL DEFAULT 30000,
      target_dd REAL DEFAULT 5000,
      manual_dme REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portfolio_robots (
      id TEXT PRIMARY KEY,
      portfolio_id TEXT NOT NULL,
      robot_id TEXT NOT NULL,
      weight REAL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
      FOREIGN KEY (robot_id) REFERENCES robots(id) ON DELETE CASCADE,
      UNIQUE(portfolio_id, robot_id)
    );
  `);

  return db;
}
