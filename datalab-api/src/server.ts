import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { parseMT5BacktestHTML, parseCSVEquity, decodeBuffer, getRobotNameFromFilename, normalizeRobotName, makeRobotId, ParsedBacktestData, ParsedCSVData } from './parser';
import { getDb } from './database';
import Groq from 'groq-sdk';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3001;
app.use(cors());
app.use(express.json({ limit: '100mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload - upload HTML and/or CSV files
app.post('/api/upload', upload.array('files'), async (req, res) => {
  console.log('Upload request received at /api/upload');
  try {
    const db = await getDb();
    const files = req.files as Express.Multer.File[];
    
    // Group files by normalized robot name
    const htmlFiles = new Map<string, Express.Multer.File>();
    const csvFiles = new Map<string, Express.Multer.File>();

    for (const file of files) {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      const robotName = getRobotNameFromFilename(file.originalname);
      const normName = normalizeRobotName(robotName);
      if (ext === 'html' || ext === 'htm') {
        htmlFiles.set(normName, file);
      } else if (ext === 'csv') {
        csvFiles.set(normName, file);
      }
    }

    const processed: any[] = [];

    // Process all HTML files
    for (const [normName, htmlFile] of htmlFiles) {
      const robotName = getRobotNameFromFilename(htmlFile.originalname);
      const robotId = makeRobotId(robotName);

      const htmlText = decodeBuffer(htmlFile.buffer);
      
      // Look for matching CSV text BEFORE parsing HTML (so we can pass it for monthly DD calc)
      let csvParsed: ParsedCSVData | null = null;
      let csvText: string | null = null;
      if (csvFiles.has(normName)) {
        const csvFile = csvFiles.get(normName)!;
        csvText = decodeBuffer(csvFile.buffer);
        csvParsed = parseCSVEquity(csvText, robotName);
      }

      const parsed = parseMT5BacktestHTML(htmlText, robotName, csvParsed);
      const m = parsed.metrics;

      // Upsert robot record
      await db.run(`
        INSERT INTO robots (
          id, name,
          total_net_profit, max_dd_equity, max_dd_equity_pct, profit_factor,
          total_trades, short_trades, short_win_pct, long_trades, long_win_pct,
          expected_payoff, sharpe_ratio, max_drawdown_abs, initial_deposit,
          gross_profit, gross_loss, recovery_factor, profitable_trades, losing_trades,
          win_rate, avg_win, avg_loss, max_win, max_loss,
          max_consecutive_wins, max_consecutive_losses, avg_trade_duration, quality,
          asset, period, timeframe, date_from, date_to, broker, parameters,
          total_months, avg_profit_per_month, total_lots, lots_per_month, max_lot_exposure, max_entries_per_trade,
          equity_curve, monthly_drawdown, max_dd_from_csv, max_dd_pct_from_csv,
          config_html, raw_html, raw_csv, approved, status, var_95_dd_cap
        ) VALUES (
          ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
        )
        ON CONFLICT(id) DO UPDATE SET
          total_net_profit=excluded.total_net_profit,
          max_dd_equity=excluded.max_dd_equity,
          max_dd_equity_pct=excluded.max_dd_equity_pct,
          profit_factor=excluded.profit_factor,
          total_trades=excluded.total_trades,
          short_trades=excluded.short_trades,
          short_win_pct=excluded.short_win_pct,
          long_trades=excluded.long_trades,
          long_win_pct=excluded.long_win_pct,
          expected_payoff=excluded.expected_payoff,
          sharpe_ratio=excluded.sharpe_ratio,
          max_drawdown_abs=excluded.max_drawdown_abs,
          initial_deposit=excluded.initial_deposit,
          gross_profit=excluded.gross_profit,
          gross_loss=excluded.gross_loss,
          recovery_factor=excluded.recovery_factor,
          profitable_trades=excluded.profitable_trades,
          losing_trades=excluded.losing_trades,
          win_rate=excluded.win_rate,
          avg_win=excluded.avg_win,
          avg_loss=excluded.avg_loss,
          max_win=excluded.max_win,
          max_loss=excluded.max_loss,
          max_consecutive_wins=excluded.max_consecutive_wins,
          max_consecutive_losses=excluded.max_consecutive_losses,
          avg_trade_duration=excluded.avg_trade_duration,
          quality=excluded.quality,
          asset=excluded.asset,
          period=excluded.period,
          timeframe=excluded.timeframe,
          date_from=excluded.date_from,
          date_to=excluded.date_to,
          broker=excluded.broker,
          parameters=excluded.parameters,
          total_months=excluded.total_months,
          avg_profit_per_month=excluded.avg_profit_per_month,
          total_lots=excluded.total_lots,
          lots_per_month=excluded.lots_per_month,
          max_lot_exposure=excluded.max_lot_exposure,
          max_entries_per_trade=excluded.max_entries_per_trade,
          equity_curve=CASE WHEN excluded.equity_curve IS NOT NULL THEN excluded.equity_curve ELSE equity_curve END,
          monthly_drawdown=CASE WHEN excluded.monthly_drawdown IS NOT NULL THEN excluded.monthly_drawdown ELSE monthly_drawdown END,
          max_dd_from_csv=CASE WHEN excluded.max_dd_from_csv > 0 THEN excluded.max_dd_from_csv ELSE max_dd_from_csv END,
          max_dd_pct_from_csv=CASE WHEN excluded.max_dd_pct_from_csv > 0 THEN excluded.max_dd_pct_from_csv ELSE max_dd_pct_from_csv END,
          config_html=excluded.config_html,
          raw_html=CASE WHEN excluded.raw_html IS NOT NULL THEN excluded.raw_html ELSE raw_html END,
          raw_csv=CASE WHEN excluded.raw_csv IS NOT NULL THEN excluded.raw_csv ELSE raw_csv END,
          var_95_dd_cap=excluded.var_95_dd_cap,
          updated_at=CURRENT_TIMESTAMP
      `, [
        robotId, robotName,
        m.total_net_profit, m.max_dd_equity, m.max_dd_equity_pct, m.profit_factor,
        m.total_trades, m.short_trades, m.short_win_pct, m.long_trades, m.long_win_pct,
        m.expected_payoff, m.sharpe_ratio, m.max_drawdown_abs, m.initial_deposit,
        m.gross_profit, m.gross_loss, m.recovery_factor, m.profitable_trades, m.losing_trades,
        m.win_rate, m.avg_win, m.avg_loss, m.max_win, m.max_loss,
        m.max_consecutive_wins, m.max_consecutive_losses, m.avg_trade_duration, m.quality,
        m.asset, m.period, m.timeframe, m.date_from, m.date_to, m.broker, JSON.stringify(m.parameters),
        m.total_months, m.avg_profit_per_month, m.total_lots, m.lots_per_month, m.max_lot_exposure, m.max_entries_per_trade,
        csvParsed ? JSON.stringify(csvParsed.equityCurve) : null,
        m.monthly_drawdown ? JSON.stringify(m.monthly_drawdown) : null,
        csvParsed ? csvParsed.maxDrawdown : 0,
        csvParsed ? csvParsed.maxDrawdownPct : 0,
        parsed.configHtml, htmlText, csvText, 0, 'pending', m.var_95_dd_cap
      ]);

      processed.push({ id: robotId, name: robotName, hasCSV: !!csvParsed });
    }

    res.json({ success: true, processed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/robot/:id/download/:type', async (req, res) => {
  try {
    const { id, type } = req.params;
    const db = await getDb();
    const robot = await db.get(`SELECT name, raw_html, raw_csv FROM robots WHERE id = ?`, [id]);
    if (!robot) return res.status(404).send('Not found');

    if (type === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.send(robot.raw_html);
    } else if (type === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.send(robot.raw_csv);
    } else {
      res.status(400).send('Invalid type');
    }
  } catch (e) { res.status(500).send(String(e)); }
});

app.get('/api/robot/:id/monthly-dd', async (req, res) => {
  try {
    const db = await getDb();
    const row = await db.get('SELECT monthly_drawdown FROM robots WHERE id = ?', [req.params.id]);
    res.json(row?.monthly_drawdown ? JSON.parse(row.monthly_drawdown) : []);
  } catch (e) { res.json([]); }
});

app.get('/api/comparativo', async (req, res) => {
  try {
    const db = await getDb();
    // Exclude heavy columns: raw_html, raw_csv, equity_curve
    const rows = await db.all(`
      SELECT 
        id, name, total_net_profit, max_dd_equity, max_dd_equity_pct, profit_factor,
        total_trades, short_trades, short_win_pct, long_trades, long_win_pct,
        expected_payoff, sharpe_ratio, max_drawdown_abs, initial_deposit,
        win_rate, avg_profit_per_month, total_months, config_html, approved, status,
        asset, period, timeframe, date_from, date_to, broker, parameters,
        max_dd_from_csv, max_dd_pct_from_csv, created_at, var_95_dd_cap, total_lots, lots_per_month,
        max_lot_exposure, max_entries_per_trade
      FROM robots 
      ORDER BY created_at DESC
    `);
    res.json(rows.map(r => ({
      ...r,
      parameters: r.parameters ? JSON.parse(r.parameters) : {},
      equity_curve: null
    })));
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.get('/api/robots', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT 
        id, name, total_net_profit, max_dd_equity, max_dd_equity_pct, profit_factor,
        total_trades, short_trades, short_win_pct, long_trades, long_win_pct,
        expected_payoff, sharpe_ratio, max_drawdown_abs, initial_deposit,
        win_rate, avg_profit_per_month, total_months, config_html, approved, status,
        asset, period, timeframe, date_from, date_to, broker, parameters,
        max_dd_from_csv, max_dd_pct_from_csv, created_at, var_95_dd_cap, total_lots, lots_per_month,
        max_lot_exposure, max_entries_per_trade
      FROM robots 
      WHERE approved = 1 
      ORDER BY total_net_profit DESC
    `);
    res.json(rows.map(r => ({
      ...r,
      parameters: r.parameters ? JSON.parse(r.parameters) : {},
      equity_curve: null
    })));
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.get('/api/robot/:id/equity', async (req, res) => {
  try {
    const db = await getDb();
    const row = await db.get(`SELECT equity_curve, max_dd_from_csv, max_dd_pct_from_csv FROM robots WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({
      equity_curve: row.equity_curve ? JSON.parse(row.equity_curve) : [],
      max_dd_from_csv: row.max_dd_from_csv,
      max_dd_pct_from_csv: row.max_dd_pct_from_csv
    });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.get('/api/robot/:id/info', async (req, res) => {
  try {
    const db = await getDb();
    const row = await db.get(`SELECT config_html, name, asset, period, broker, parameters FROM robots WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ ...row, parameters: row.parameters ? JSON.parse(row.parameters) : {} });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.post('/api/robot/:id/approve', async (req, res) => {
  try {
    const db = await getDb();
    await db.run(`UPDATE robots SET approved = 1, status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.delete('/api/robot/:id', async (req, res) => {
  console.log('DELETE /api/robot/', req.params.id);
  try {
    const db = await getDb();
    await db.run(`DELETE FROM robots WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.delete('/api/comparativo/clear', async (req, res) => {
  console.log('DELETE /api/comparativo/clear');
  try {
    const db = await getDb();
    await db.run(`DELETE FROM robots WHERE approved = 0`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ══════════════════════════════════════════════════════════
// PORTFOLIO ENDPOINTS
// ══════════════════════════════════════════════════════════

// GET /api/portfolios
app.get('/api/portfolios', async (req, res) => {
  try {
    const db = await getDb();
    const portfolios = await db.all(`SELECT * FROM portfolios ORDER BY created_at DESC`);
    res.json(portfolios);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// POST /api/portfolios
app.post('/api/portfolios', async (req, res) => {
  try {
    const db = await getDb();
    const { name, capital, target_dd } = req.body;
    const id = `pf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.run(
      `INSERT INTO portfolios (id, name, capital, target_dd) VALUES (?, ?, ?, ?)`,
      [id, name, capital ?? 30000, target_dd ?? 5000]
    );
    const portfolio = await db.get(`SELECT * FROM portfolios WHERE id = ?`, [id]);
    res.json(portfolio);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// PUT /api/portfolios/:id
app.put('/api/portfolios/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { name, capital, target_dd, manual_dme, locked } = req.body;
    await db.run(
      `UPDATE portfolios SET name = ?, capital = ?, target_dd = ?, manual_dme = ?, locked = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, capital, target_dd, manual_dme, locked ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// DELETE /api/portfolios/:id
app.delete('/api/portfolios/:id', async (req, res) => {
  console.log('DELETE /api/portfolios/', req.params.id);
  try {
    const db = await getDb();
    await db.run(`DELETE FROM portfolio_robots WHERE portfolio_id = ?`, [req.params.id]);
    await db.run(`DELETE FROM portfolios WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// GET /api/portfolios/:id/robots
app.get('/api/portfolios/:id/robots', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT pr.id as pr_id, pr.weight, pr.robot_id,
        r.name, r.asset, r.timeframe, r.avg_profit_per_month, r.initial_deposit,
        r.max_dd_from_csv, r.max_dd_equity, r.profit_factor, r.sharpe_ratio,
        r.total_trades, r.date_from, r.date_to, r.total_months, r.monthly_drawdown, r.parameters,
        r.total_lots, r.lots_per_month, r.var_95_dd_cap,
        r.max_lot_exposure, r.max_entries_per_trade
      FROM portfolio_robots pr
      JOIN robots r ON r.id = pr.robot_id
      WHERE pr.portfolio_id = ?
      ORDER BY pr.created_at ASC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// POST /api/portfolios/:id/robots
app.post('/api/portfolios/:id/robots', async (req, res) => {
  try {
    const db = await getDb();
    const { robot_id, weight } = req.body;
    const id = `pr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.run(
      `INSERT INTO portfolio_robots (id, portfolio_id, robot_id, weight) VALUES (?, ?, ?, ?)`,
      [id, req.params.id, robot_id, weight ?? 1]
    );
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// PUT /api/portfolios/:id/robots/:robotId  — update weight
app.put('/api/portfolios/:id/robots/:robotId', async (req, res) => {
  try {
    const db = await getDb();
    const { weight } = req.body;
    await db.run(
      `UPDATE portfolio_robots SET weight = ? WHERE portfolio_id = ? AND robot_id = ?`,
      [weight, req.params.id, req.params.robotId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// DELETE /api/portfolios/:id/robots/:robotId
app.delete('/api/portfolios/:id/robots/:robotId', async (req, res) => {
  console.log('DELETE robot from portfolio', req.params.id, req.params.robotId);
  try {
    const db = await getDb();
    await db.run(
      `DELETE FROM portfolio_robots WHERE portfolio_id = ? AND robot_id = ?`,
      [req.params.id, req.params.robotId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// GET /api/portfolios/:id/stats  — computed analytics with true combined DD
app.get('/api/portfolios/:id/stats', async (req, res) => {
  try {
    const db = await getDb();
    const pf = await db.get(`SELECT * FROM portfolios WHERE id = ?`, [req.params.id]);
    if (!pf) return res.status(404).json({ error: 'Portfolio not found' });

    const robots = await db.all(`
      SELECT pr.weight, pr.robot_id,
        r.name, r.asset, r.timeframe, r.avg_profit_per_month, r.initial_deposit,
        r.max_dd_from_csv, r.max_dd_equity, r.profit_factor, r.sharpe_ratio,
        r.total_months, r.monthly_drawdown, r.equity_curve, r.total_trades,
        r.total_lots, r.lots_per_month, r.var_95_dd_cap,
        r.max_lot_exposure, r.max_entries_per_trade
      FROM portfolio_robots pr
      JOIN robots r ON r.id = pr.robot_id
      WHERE pr.portfolio_id = ?
    `, [req.params.id]);

    // 1. Group daily data for each robot
    const robotDailyData: Map<string, Map<string, { profit: number, dd: number, balanceProfit: number }>> = new Map();
    const allGlobalDays: Set<string> = new Set();

    for (const r of robots) {
      const curve = JSON.parse(r.equity_curve || '[]');
      if (curve.length === 0) continue;

      const effectiveInitial = curve[0].equity;
      let robotPeak = effectiveInitial;
      const r_daily_group: Map<string, { profit: number, dd: number, balanceProfit: number }> = new Map();

      curve.forEach((pt: any) => {
        const day = pt.date ? pt.date.split(' ')[0] : (pt.timestamp ? pt.timestamp.split(' ')[0] : '2020-01-01');
        if (pt.equity > robotPeak) robotPeak = pt.equity;
        const curDD = (robotPeak - pt.equity);
        const profit = pt.equity - effectiveInitial;
        const balanceProfit = (pt.balance !== undefined ? (pt.balance - effectiveInitial) : (robotPeak - effectiveInitial));

        allGlobalDays.add(day);
        
        // Take the latest state of the day for the robot
        if (!r_daily_group.has(day)) {
          r_daily_group.set(day, { profit, dd: curDD, balanceProfit });
        } else {
          const g = r_daily_group.get(day)!;
          g.profit = profit;
          g.balanceProfit = balanceProfit;
          if (curDD > g.dd) g.dd = curDD;
        }
      });
      robotDailyData.set(r.name, r_daily_group);
    }

    // 2. Build sorted timeline and aggregate with "carry forward"
    const sortedDays = Array.from(allGlobalDays).sort();

    // Pre-calculate average daily profit for each robot to fill gaps
    const robotAverages = new Map<string, { avgProfit: number, avgTrades: number, firstDay: string, lastDay: string, firstProfit: number, lastProfit: number, firstIdx: number, lastIdx: number }>();
    for (const r of robots) {
      const daily = robotDailyData.get(r.name);
      if (!daily || daily.size === 0) continue;
      const days = Array.from(daily.keys()).sort();
      const first = days[0];
      const last = days[days.length - 1];
      const firstData = daily.get(first)!;
      const lastData = daily.get(last)!;
      const totalP = lastData.profit - firstData.profit;
      const numDays = days.length;
      
      robotAverages.set(r.name, {
        avgProfit: totalP / (numDays || 1),
        avgTrades: (r.total_trades || 0) / (numDays || 1),
        firstDay: first,
        lastDay: last,
        firstProfit: firstData.profit,
        lastProfit: lastData.profit,
        firstIdx: sortedDays.indexOf(first),
        lastIdx: sortedDays.indexOf(last)
      });
    }

    const combinedCurve: any[] = [];
    const robotDailyDD: Map<string, Map<string, number>> = new Map(); // For correlation
    
    for (const [dayIdx, day] of sortedDays.entries()) {
      let totalProfit = 0;
      let totalDD = 0;
      let totalBalanceProfit = 0;

      for (const r of robots) {
        const weight = r.weight || 1;
        const avg = robotAverages.get(r.name);
        const dayData = robotDailyData.get(r.name)?.get(day);
        
        let profit = 0;
        let balanceProfit = 0;
        let dd = 0;

        if (dayData) {
          profit = dayData.profit;
          balanceProfit = dayData.balanceProfit;
          dd = dayData.dd;
        } else if (avg) {
          // Gap Filling: Extrapolate using pre-calculated indices
          if (dayIdx > avg.lastIdx) {
            profit = avg.lastProfit + (avg.avgProfit * (dayIdx - avg.lastIdx));
            balanceProfit = profit;
          } else if (dayIdx < avg.firstIdx) {
            profit = avg.firstProfit - (avg.avgProfit * (avg.firstIdx - dayIdx));
            balanceProfit = profit;
          }
        }
        
        totalProfit += profit * weight;
        totalDD += dd * weight;
        totalBalanceProfit += balanceProfit * weight;

        // Track for correlation (only real data)
        if (dayData) {
          if (!robotDailyDD.has(r.name)) robotDailyDD.set(r.name, new Map());
          robotDailyDD.get(r.name)!.set(day, dd * weight);
        }
      }

      combinedCurve.push({ day, profit: totalProfit, dd: totalDD, balanceProfit: totalBalanceProfit });
    }

    const ddMaxPortfolio = combinedCurve.reduce((max, pt) => Math.max(max, pt.dd), 0);

    // Top 10 Drawdown Events
    const ddEvents: { day: string, value: number, pct: number }[] = [];
    let currentPeakProfit = 0;
    let inDrawdown = false;
    let maxDayDD = 0;
    let maxDayDate = '';

    for (const pt of combinedCurve) {
      if (pt.profit >= currentPeakProfit) {
        if (inDrawdown && maxDayDD > 0) {
          const peakEquity = pf.capital + currentPeakProfit;
          ddEvents.push({
            day: maxDayDate,
            value: maxDayDD,
            pct: peakEquity > 0 ? (maxDayDD / peakEquity) * 100 : 0
          });
          inDrawdown = false;
          maxDayDD = 0;
        }
        currentPeakProfit = pt.profit;
      } else {
        inDrawdown = true;
        if (pt.dd > maxDayDD) {
          maxDayDD = pt.dd;
          maxDayDate = pt.day;
        }
      }
    }
    const top10DD = ddEvents.sort((a,b) => b.value - a.value).slice(0, 10);

    // Value at Risk Refined: 95th Percentile of DD series
    let var95 = 0;
    if (combinedCurve.length > 5) {
      const allDDs = combinedCurve.map(c => c.dd);
      const sortedDDs = [...allDDs].sort((a,b) => a - b);
      const idx = Math.floor(sortedDDs.length * 0.95);
      const varDDValue = sortedDDs[idx] || 0;
      var95 = pf.capital > 0 ? (varDDValue / pf.capital) * 100 : 0;
    }

    const totalProfitMes = robots.reduce((s, r) => s + (r.avg_profit_per_month * r.weight), 0);
    const somaIndividualDD = robots.reduce((s, r) => s + (r.max_dd_from_csv * r.weight), 0);
    const roiMes = pf.capital > 0 ? (totalProfitMes / pf.capital) * 100 : 0;
    const roiDiaCash = totalProfitMes / 22; 
    const ddMaxPct = pf.capital > 0 ? (ddMaxPortfolio / pf.capital) * 100 : 0;
    const llDdPct = ddMaxPortfolio > 0 ? (totalProfitMes / ddMaxPortfolio) * 100 : 0;
    const avgSharpe = robots.reduce((s, r) => s + (r.sharpe_ratio || 0), 0) / (robots.length || 1);

    // 3. Trailing 12-Month (TTM) Analytics
    const lastDateStr = sortedDays[sortedDays.length - 1];
    const lastDate = new Date(lastDateStr);
    const date12m = new Date(lastDate);
    date12m.setFullYear(lastDate.getFullYear() - 1);
    const date12mStr = date12m.toISOString().split('T')[0];

    const windowRecent = combinedCurve.filter(c => c.day >= date12mStr);
    const windowPast = combinedCurve.filter(c => c.day < date12mStr);

    const calculateWindowStats = (window: any[]) => {
      if (window.length === 0) return null;
      const startProfit = window[0].profit;
      const endProfit = window[window.length - 1].profit;
      const profit = endProfit - startProfit;
      
      let maxDD = 0;
      let peak = pf.capital + startProfit;
      window.forEach(pt => {
        const equity = pf.capital + pt.profit;
        if (equity > peak) peak = equity;
        const dd = peak - equity;
        if (dd > maxDD) maxDD = dd;
      });

      // VaR 95% for this window
      let windowVar95 = 0;
      if (window.length > 5) {
        const dailyProfits = [];
        for (let i = 1; i < window.length; i++) {
          dailyProfits.push(window[i].profit - window[i-1].profit);
        }
        dailyProfits.sort((a, b) => a - b);
        const idx = Math.floor(dailyProfits.length * 0.05);
        const varValue = Math.abs(dailyProfits[idx] || 0);
        windowVar95 = pf.capital > 0 ? (varValue / pf.capital) * 100 : 0;
      }

      // Trades: sum avg trades for active robots in this window
      let totalTrades = 0;
      for (const r of robots) {
        const avg = robotAverages.get(r.name);
        if (avg) {
          totalTrades += avg.avgTrades * window.length;
        }
      }

      return {
        profit,
        maxDD,
        var95: windowVar95,
        days: window.length,
        months: window.length / 21.5, // Refined business day factor
        trades: totalTrades
      };
    };

    const recentStats = calculateWindowStats(windowRecent);
    const pastStats = calculateWindowStats(windowPast);
    
    // Weighted past profit for 12-month normalized comparison
    if (pastStats) {
      (pastStats as any).weightedProfit = (pastStats.profit / (pastStats.months || 1)) * 12;
      (pastStats as any).weightedTrades = (pastStats.trades / (pastStats.months || 1)) * 12;
    }

    // Per-Robot Recent Stats (Last 12m)
    const robotRecentStats: any = {};
    for (const r of robots) {
      const r_daily = robotDailyData.get(r.name);
      if (!r_daily) continue;
      
      const r_window = sortedDays
        .filter(d => d >= date12mStr && r_daily.has(d))
        .map(d => r_daily.get(d)!);
      
      if (r_window.length === 0) {
        robotRecentStats[r.name] = { profit: 0, maxDD: 0, var95: 0, lots: 0, ddContribution: 0 };
        continue;
      }

      const startP = r_window[0].profit;
      const endP = r_window[r_window.length - 1].profit;
      const profit = (endP - startP) * r.weight;

      let maxDD = 0;
      let peak = r.initial_deposit + (startP * r.weight);
      r_window.forEach(pt => {
        const eq = r.initial_deposit + (pt.profit * r.weight);
        if (eq > peak) peak = eq;
        const dd = peak - eq;
        if (dd > maxDD) maxDD = dd;
      });

      // VaR 95% (Robot level)
      let rVar95 = 0;
      if (r_window.length > 5) {
        const daily = [];
        for (let i = 1; i < r_window.length; i++) {
          daily.push((r_window[i].profit - r_window[i-1].profit) * r.weight);
        }
        daily.sort((a,b) => a-b);
        rVar95 = Math.abs(daily[Math.floor(daily.length * 0.05)] || 0);
      }

      // Lots: Approximate based on average and window length
      const monthsInWindow = r_window.length / 21;
      const lots = r.lots_per_month * monthsInWindow;

      robotRecentStats[r.name] = {
        profit,
        maxDD,
        ddContribution: maxDD, // In window
        var95: pf.capital > 0 ? (rVar95 / pf.capital) * 100 : 0,
        lots
      };
    }

    // Pearson Correlation
    const calculatePearson = (serA: number[], serB: number[]) => {
      const n = serA.length;
      if (n < 2) return 0;
      const meanA = serA.reduce((s, v) => s + v, 0) / n;
      const meanB = serB.reduce((s, v) => s + v, 0) / n;
      let num = 0, denA = 0, denB = 0;
      for (let i = 0; i < n; i++) {
        num += (serA[i] - meanA) * (serB[i] - meanB);
        denA += (serA[i] - meanA) ** 2;
        denB += (serB[i] - meanB) ** 2;
      }
      return denA && denB ? num / Math.sqrt(denA * denB) : 0;
    };

    const correlation: any = {};
    const rNames = [...robotDailyDD.keys()];
    for (const nA of rNames) {
      correlation[nA] = {};
      const mapA = robotDailyDD.get(nA)!;
      for (const nB of rNames) {
        if (nA === nB) correlation[nA][nB] = 1;
        else {
          const mapB = robotDailyDD.get(nB)!;
          const common = sortedDays.filter(d => mapA.has(d) && mapB.has(d));
          const vA = common.map(d => mapA.get(d)!);
          const vB = common.map(d => mapB.get(d)!);
          correlation[nA][nB] = parseFloat(calculatePearson(vA, vB).toFixed(3));
        }
      }
    }

    // Prepare stacked data for top 10 DD
    const top10Stacked: any[] = top10DD.map(event => {
      const breakdown: any = { day: event.day, total: event.value };
      for (const r of robots) {
        breakdown[r.name] = robotDailyDD.get(r.name)?.get(event.day) || 0;
      }
      return breakdown;
    });

    // Robot performance curves (daily weighted profit)
    const robotCurves: any = {};
    for (const r of robots) {
      let lastState = { profit: 0, balanceProfit: 0, dd: 0 };
      robotCurves[r.name] = sortedDays.map(day => {
        const d = robotDailyData.get(r.name)?.get(day);
        if (d) lastState = d;
        return {
          day,
          profit: lastState.profit * (r.weight || 1),
          balanceProfit: lastState.balanceProfit * (r.weight || 1),
          dd: lastState.dd * (r.weight || 1)
        };
      }).filter((_, i) => i % Math.max(1, Math.floor(sortedDays.length / 400)) === 0);
    }

    res.json({
      portfolio: pf,
      robots: robots.map(({ equity_curve: _e, ...rest }) => ({
        ...rest,
        monthly_drawdown: rest.monthly_drawdown ? JSON.parse(rest.monthly_drawdown) : [],
        ll_dd_pct: Number(rest.max_dd_from_csv || rest.max_dd_equity || 0) > 0 ? (rest.avg_profit_per_month / (rest.max_dd_from_csv || rest.max_dd_equity)) * 100 : 0
      })),
      totals: {
        lucroMes: totalProfitMes,
        roiMes,
        roiDiaCash,
        ddMaxPortfolio,
        ddMaxPct,
        dme: (pf.manual_dme !== null && pf.manual_dme !== undefined && pf.manual_dme !== 0) ? pf.manual_dme : ddMaxPortfolio,
        var95, 
        sharpe: avgSharpe,
        llDdPct,
        somaIndividualDD,
        recent: recentStats,
        past: pastStats,
        robotRecent: robotRecentStats
      },
      combined_curve: combinedCurve.filter((_, i) => i % Math.max(1, Math.floor(combinedCurve.length / 400)) === 0),
      robot_curves: robotCurves,
      top10DD: top10Stacked,
      correlation
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/portfolios/:id/export-nautilus - Export daily CSV for Invest Nautilus
app.get('/api/portfolios/:id/export-nautilus', async (req, res) => {
  try {
    const db = await getDb();
    const pf = await db.get(`SELECT name FROM portfolios WHERE id = ?`, [req.params.id]);
    if (!pf) return res.status(404).send('Portfolio not found');

    const robots = await db.all(`
      SELECT pr.weight, r.name, r.equity_curve, r.initial_deposit
      FROM portfolio_robots pr
      JOIN robots r ON r.id = pr.robot_id
      WHERE pr.portfolio_id = ?
    `, [req.params.id]);

    const csvLines: string[] = ['robo,data,lucro,DD Max'];

    for (const r of robots) {
      const curve = JSON.parse(r.equity_curve || '[]');
      const initial = r.initial_deposit || 10000;
      const weight = r.weight || 1;
      
      // Group by day - normalization to match MT5 format YYYY.MM.DD
      const dailyData: Map<string, { points: any[] }> = new Map();
      curve.forEach((pt: any) => {
        const rawDate = pt.date || pt.timestamp || pt.day || '2020.01.01.00.00';
        const day = rawDate.split(' ')[0].replace(/-/g, '.');
        if (!dailyData.has(day)) dailyData.set(day, { points: [] });
        dailyData.get(day)!.points.push(pt);
      });

      const sortedDays = Array.from(dailyData.keys()).sort();
      let prevEquity = initial;
      let globalPeak = initial;

      for (const day of sortedDays) {
        const data = dailyData.get(day)!;
        const lastPt = data.points[data.points.length - 1];
        
        // Lucro Diário = Variação da Equity no dia * Peso
        const dailyProfit = (lastPt.equity - prevEquity) * weight;
        
        // DD Max Diário = O maior Drawdown (Topo Global - Equity Atual) registrado DURANTE o dia * Peso
        let maxDayDD = 0;
        for (const pt of data.points) {
          if (pt.equity > globalPeak) globalPeak = pt.equity;
          const currentDD = globalPeak - pt.equity;
          if (currentDD > maxDayDD) maxDayDD = currentDD;
        }

        csvLines.push(`${r.name},${day},${dailyProfit.toFixed(2)},${(maxDayDD * weight).toFixed(2)}`);
        
        // Update prevEquity to start of next day
        prevEquity = lastPt.equity;
      }
    }

    const csvContent = csvLines.join('\n');
    const filename = `export_nautilus_${pf.name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);

  } catch (err) {
    console.error(err);
    res.status(500).send(String(err));
  }
});

// Groq Support
const API_KEY = process.env.GROQ_API_KEY || '';
console.log('Groq API Key detected:', API_KEY ? `${API_KEY.substring(0, 8)}...` : 'NONE');
const groq = new Groq({ apiKey: API_KEY });
const model = "llama-3.3-70b-versatile";

function formatDailyPerformance(equityCurve: any[]) {
  if (!equityCurve || equityCurve.length === 0) return "Nenhum dado diário disponível.";
  
  const daily: Map<string, { final: number, dd: number, profit: number }> = new Map();
  let peak = 0;

  equityCurve.forEach((pt, i) => {
    // Normalizar data (YYYY.MM.DD HH:MM -> YYYY-MM-DD)
    const rawDate = pt.timestamp || pt.date || pt.day || '2000-01-01';
    const day = rawDate.split(' ')[0].replace(/\./g, '-');
    
    if (pt.equity > peak) peak = pt.equity;
    const curDD = peak - pt.equity;

    if (!daily.has(day)) {
      daily.set(day, { final: pt.equity, dd: curDD, profit: 0 });
    } else {
      const g = daily.get(day)!;
      g.final = pt.equity;
      if (curDD > g.dd) g.dd = curDD;
    }
  });

  const lines = ["Date,Equity,DailyProfit,AccumProfit,MaxDD"];
  let prevFinal = 0;
  let firstTotalFinal = 0;
  let isFirst = true;

  for (const [day, stats] of daily) {
    if (isFirst) {
      prevFinal = stats.final;
      firstTotalFinal = stats.final;
      isFirst = false;
    }
    const dayProfit = stats.final - prevFinal;
    const accumProfit = stats.final - firstTotalFinal;
    lines.push(`${day},${stats.final.toFixed(2)},${dayProfit.toFixed(2)},${accumProfit.toFixed(2)},${stats.dd.toFixed(2)}`);
    prevFinal = stats.final;
  }
  return lines.join('\n');
}

app.get('/api/ia/info/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const db = await getDb();

    if (type === 'robot') {
      const r = await db.get(`SELECT * FROM robots WHERE id = ?`, [id]);
      if (!r) return res.status(404).send('Robot not found');
      
      const curve = JSON.parse(r.equity_curve || '[]');
      const dailyText = formatDailyPerformance(curve);
      
      const stats = `
ROBÔ: ${r.name}
ATIVO: ${r.asset}
TIMEFRAME: ${r.timeframe}
BROKER: ${r.broker}
MÉTRICAS CORE:
- Lucro Líquido: ${r.total_net_profit}
- Profit Factor: ${r.profit_factor}
- Sharpe: ${r.sharpe_ratio}
- Max DD: ${r.max_dd_from_csv || r.max_dd_equity} (${r.max_dd_equity_pct}%)
- Win Rate: ${r.win_rate}%
- Trades Totais: ${r.total_trades}

HISTÓRICO DIÁRIO:
${dailyText}
      `;
      res.json({ context: stats });

    } else if (type === 'portfolio') {
      // Para portfólio, pegamos os dados já agregados (ou geramos)
      const pf = await db.get(`SELECT * FROM portfolios WHERE id = ?`, [id]);
      if (!pf) return res.status(404).send('Portfolio not found');

      // Reutiliza lógica de cálculo de curva combinada (idealmente estaria em uma função pura, mas vamos repetir aqui para rapidez)
      const robots = await db.all(`
        SELECT pr.weight, r.name, r.equity_curve, r.initial_deposit
        FROM portfolio_robots pr JOIN robots r ON r.id = pr.robot_id
        WHERE pr.portfolio_id = ?
      `, [id]);

      const allGlobalDays: Set<string> = new Set();
      const robotDailyData: Map<string, Map<string, { profit: number, dd: number }>> = new Map();

      for (const r of robots) {
        if (curve.length === 0) continue;
        const effectiveInitial = curve[0].equity;
        let peak = effectiveInitial;
        const r_daily: Map<string, { profit: number, dd: number }> = new Map();
        curve.forEach((pt: any) => {
          const day = (pt.date || pt.timestamp).split(' ')[0].replace(/\./g, '-');
          if (pt.equity > peak) peak = pt.equity;
          const dd = peak - pt.equity;
          allGlobalDays.add(day);
          if (!r_daily.has(day)) r_daily.set(day, { profit: pt.equity - effectiveInitial, dd });
          else {
            const g = r_daily.get(day)!;
            g.profit = pt.equity - effectiveInitial;
            if (dd > g.dd) g.dd = dd;
          }
        });
        robotDailyData.set(r.name, r_daily);
      }

      const sorted = Array.from(allGlobalDays).sort();
      const currentState: Map<string, { profit: number, dd: number }> = new Map();
      const combined: any[] = [];
      for (const day of sorted) {
        let tProfit = 0, tDD = 0;
        for (const r of robots) {
          if (robotDailyData.get(r.name)?.has(day)) currentState.set(r.name, robotDailyData.get(r.name)!.get(day)!);
          const s = currentState.get(r.name) || { profit: 0, dd: 0 };
          tProfit += s.profit * (r.weight || 1);
          tDD += s.dd * (r.weight || 1);
        }
        combined.push({ day, equity: (pf.capital || 30000) + tProfit, dd: tDD });
      }

      const dailyText = formatDailyPerformance(combined);
      const context = `
PORTFÓLIO: ${pf.name}
CAPITAL INICIAL: ${pf.capital}
ROBÔS COMPONENTES: ${robots.map(r => `${r.name} (Peso: ${r.weight})`).join(', ')}

HISTÓRICO DIÁRIO COMBINADO:
${dailyText}
      `;
      res.json({ context });
    }
  } catch (err) { res.status(500).send(String(err)); }
});

app.post('/api/ia/chat', async (req, res) => {
  try {
    const { messages, context } = req.body; 
    
    if (!process.env.GROQ_API_KEY) {
      console.error('ERRO: GROQ_API_KEY não encontrada no ambiente.');
      return res.status(400).json({ error: 'A chave Groq (GROQ_API_KEY) não foi configurada no servidor. Por favor, verifique as variáveis de ambiente.' });
    }

    // Convert frontend messages to OpenAI/Groq format
    const groqMessages = messages.map((m: any) => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.parts[0].text
    }));

    const systemPrompt = `Você é o Nautilus AI Expert, um analista de trading quantitativo de elite. 
    Analise os dados históricos fornecidos (formato CSV) de robôs ou portfólios.
    Sua missão é fornecer análises precisas, identificar padrões de lucro/perda e responder dúvidas técnicas sobre o drawdown e métricas de desempenho.
    Seja extremamente preciso com números e datas. Use Markdown para formatar tabelas ou destaques se necessário.
    
    CONTEXTO DA ESTRATÉGIA:
    ${context}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...groqMessages
      ],
      model: model,
      temperature: 0.1,
      max_tokens: 2048,
    });

    res.json({ text: completion.choices[0]?.message?.content || "" });
  } catch (err: any) {
    console.error('Groq API Error:', err?.message || err);
    res.status(500).json({ 
      error: 'Erro na comunicação com a IA', 
      details: err?.message || String(err) 
    });
  }
});

app.listen(port, () => {
  console.log(`API Nautilus DataLab running on port ${port}`);
});
