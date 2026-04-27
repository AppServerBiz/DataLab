
import { getDb } from '../datalab-api/src/database';
import path from 'path';

async function check() {
  process.env.DATABASE_PATH = path.resolve('datalab-api/nautilus.db');
  const db = await getDb();
  const rows = await db.all(`
    SELECT id, name, initial_deposit, json_extract(equity_curve, '$[0].equity') as first_equity 
    FROM robots 
    WHERE ABS(initial_deposit - json_extract(equity_curve, '$[0].equity')) > 1000
    LIMIT 10;
  `);
  console.log(JSON.stringify(rows, null, 2));
}

check().catch(console.error);
