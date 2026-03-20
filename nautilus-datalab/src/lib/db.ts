import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'nautilus.db');
const db = new Database(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS robots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    stats TEXT,
    json_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS portfolios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    robot_ids TEXT, -- Comma separated or JSON array
    lots TEXT,      -- JSON object of robot_id: lot
    stats TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    permissions TEXT -- 'alpha' or 'all'
  );

  -- Insert default users
  INSERT OR IGNORE INTO users (username, permissions) VALUES ('Alpha1', 'alpha');
  INSERT OR IGNORE INTO users (username, permissions) VALUES ('Naut1lus', 'all');
`);

export default db;

export interface RobotDB {
  id: string;
  name: string;
  stats: any;
  json_data: any;
}

export function saveRobot(robot: RobotDB) {
  const stmt = db.prepare(`
    INSERT INTO robots (id, name, stats, json_data)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      stats = excluded.stats,
      json_data = excluded.json_data
  `);
  stmt.run(robot.id, robot.name, JSON.stringify(robot.stats), JSON.stringify(robot.json_data));
}

export function getAllRobots(): RobotDB[] {
  const robots = db.prepare('SELECT * FROM robots ORDER BY created_at DESC').all() as any[];
  return robots.map(r => ({
    ...r,
    stats: JSON.parse(r.stats),
    json_data: JSON.parse(r.json_data)
  }));
}

export function savePortfolio(portfolio: any) {
  const stmt = db.prepare(`
    INSERT INTO portfolios (id, name, robot_ids, lots, stats)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      robot_ids = excluded.robot_ids,
      lots = excluded.lots,
      stats = excluded.stats
  `);
  stmt.run(
    portfolio.id, 
    portfolio.name, 
    JSON.stringify(portfolio.robotIds), 
    JSON.stringify(portfolio.lots), 
    JSON.stringify(portfolio.stats)
  );
}

export function getAllPortfolios(): any[] {
  const portfolios = db.prepare('SELECT * FROM portfolios ORDER BY created_at DESC').all() as any[];
  return portfolios.map(p => ({
    ...p,
    robotIds: JSON.parse(p.robot_ids),
    lots: JSON.parse(p.lots),
    stats: JSON.parse(p.stats)
  }));
}
