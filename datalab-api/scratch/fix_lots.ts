import { getDb } from '../src/database';
import { parseMT5BacktestHTML, parseCSVEquity } from '../src/parser';

async function fixLots() {
  const db = await getDb();
  const robots = await db.all('SELECT id, name, raw_html, raw_csv, total_months, total_net_profit FROM robots');
  
  console.log(`Checking ${robots.length} robots...`);
  
  for (const r of robots) {
    if (!r.raw_html) {
      console.log(`Skipping ${r.name} - no raw_html`);
      continue;
    }
    
    let csvParsed = null;
    if (r.raw_csv) {
      csvParsed = parseCSVEquity(r.raw_csv, r.name);
    }
    
    const parsed = parseMT5BacktestHTML(r.raw_html, r.name, csvParsed);
    const m = parsed.metrics;
    
    console.log(`Robot: ${r.name} | Parsed Lots: ${m.total_lots} | Months: ${m.total_months}`);
    
    await db.run(
      'UPDATE robots SET total_lots = ?, lots_per_month = ? WHERE id = ?',
      [m.total_lots, m.lots_per_month, r.id]
    );
  }
  
  console.log('Finished fixing lots.');
  process.exit(0);
}

fixLots().catch(err => {
  console.error(err);
  process.exit(1);
});
