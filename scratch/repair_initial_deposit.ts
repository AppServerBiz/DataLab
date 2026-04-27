
import { getDb } from '../datalab-api/src/database';
import path from 'path';

async function repair() {
  process.env.DATABASE_PATH = path.resolve('datalab-api/nautilus.db');
  const db = await getDb();
  
  const robots = await db.all("SELECT id, name, initial_deposit, equity_curve FROM robots");
  console.log(`Checking ${robots.length} robots...`);
  
  for (const r of robots) {
    if (!r.equity_curve) continue;
    const curve = JSON.parse(r.equity_curve);
    if (curve.length === 0) continue;
    
    const firstEquity = curve[0].equity;
    const firstBalance = curve[0].balance;
    const actualStart = firstBalance || firstEquity;
    
    // If initial_deposit is significantly different from the curve start (e.g. 10000 default vs 1000 actual)
    if (Math.abs(r.initial_deposit - actualStart) > 1) {
      console.log(`Repairing robot ${r.name}: initial_deposit ${r.initial_deposit} -> ${actualStart}`);
      await db.run("UPDATE robots SET initial_deposit = ? WHERE id = ?", [actualStart, r.id]);
    }
  }
  console.log("Repair completed.");
}

repair().catch(console.error);
