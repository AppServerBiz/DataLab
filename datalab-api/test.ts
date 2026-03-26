import fs from 'fs';
import path from 'path';
import { parseMT5BacktestHTML, parseCSVEquity, decodeBuffer, getRobotNameFromFilename, makeRobotId, normalizeRobotName } from './src/parser';
import { getDb } from './src/database';

async function main() {
  const db = await getDb();
  
  const htmlFile = path.resolve('..', 'Exemplos', 'Break G 1.5.158.html');
  const csvFile = path.resolve('..', 'Exemplos', 'break g 1.5.158.csv');
  
  const htmlBuffer = fs.readFileSync(htmlFile);
  const htmlText = decodeBuffer(htmlBuffer);
  const robotName = getRobotNameFromFilename('Break G 1.5.158.html');
  const robotId = makeRobotId(robotName);
  
  const parsed = parseMT5BacktestHTML(htmlText, robotName);
  console.log('Parsed HTML:', robotName, '| Net Profit:', parsed.metrics.total_net_profit, '| Trades:', parsed.metrics.total_trades);
  
  const csvBuffer = fs.readFileSync(csvFile);
  const csvText = decodeBuffer(csvBuffer);
  const csvParsed = parseCSVEquity(csvText, robotName);
  console.log('CSV rows:', csvParsed.equityCurve.length, '| MaxDD CSV:', csvParsed.maxDrawdown.toFixed(2));
  
  const m = parsed.metrics;
  
  await db.run(`
    INSERT OR REPLACE INTO robots (
      id, name, total_net_profit, max_dd_equity, max_dd_equity_pct, profit_factor,
      total_trades, short_trades, short_win_pct, long_trades, long_win_pct,
      expected_payoff, sharpe_ratio, max_drawdown_abs, initial_deposit,
      gross_profit, gross_loss, recovery_factor, profitable_trades, losing_trades,
      win_rate, avg_win, avg_loss, max_win, max_loss,
      max_consecutive_wins, max_consecutive_losses, avg_trade_duration, quality,
      asset, period, timeframe, date_from, date_to, broker, parameters,
      equity_curve, max_dd_from_csv, max_dd_pct_from_csv, config_html, approved, status
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `, [
    robotId, robotName,
    m.total_net_profit, m.max_dd_equity, m.max_dd_equity_pct, m.profit_factor,
    m.total_trades, m.short_trades, m.short_win_pct, m.long_trades, m.long_win_pct,
    m.expected_payoff, m.sharpe_ratio, m.max_drawdown_abs, m.initial_deposit,
    m.gross_profit, m.gross_loss, m.recovery_factor, m.profitable_trades, m.losing_trades,
    m.win_rate, m.avg_win, m.avg_loss, m.max_win, m.max_loss,
    m.max_consecutive_wins, m.max_consecutive_losses, m.avg_trade_duration, m.quality,
    m.asset, m.period, m.timeframe, m.date_from, m.date_to, m.broker, JSON.stringify(m.parameters),
    JSON.stringify(csvParsed.equityCurve), csvParsed.maxDrawdown, csvParsed.maxDrawdownPct,
    parsed.configHtml, 0, 'pending'
  ]);
  
  const row = await db.get('SELECT * FROM robots WHERE id = ?', [robotId]);
  console.log('\n=== DB VERIFICATION ===');
  console.log('Name:', row.name);
  console.log('Net Profit:', row.total_net_profit);
  console.log('Max DD Equity:', row.max_dd_equity, '/', row.max_dd_equity_pct + '%');
  console.log('Max DD CSV:', row.max_dd_from_csv, '/', row.max_dd_pct_from_csv + '%');
  console.log('Profit Factor:', row.profit_factor);
  console.log('Total Trades:', row.total_trades);
  console.log('Short:', row.short_trades, row.short_win_pct + '% win');
  console.log('Long:', row.long_trades, row.long_win_pct + '% win');
  console.log('Sharpe:', row.sharpe_ratio);
  console.log('Payoff:', row.expected_payoff);
  console.log('DD Abs:', row.max_drawdown_abs);
  console.log('Equity curve rows:', JSON.parse(row.equity_curve).length);
  console.log('\n✅ All metrics verified!');
  process.exit(0);
}

main();
