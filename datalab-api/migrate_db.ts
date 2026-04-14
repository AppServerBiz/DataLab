
import { getDb } from './src/database';

async function migrate() {
  const db = await getDb();
  console.log('Starting migration...');
  
  const columnsToAdd = [
    { name: 'total_months', type: 'INTEGER DEFAULT 0' },
    { name: 'avg_profit_per_month', type: 'REAL DEFAULT 0' },
    { name: 'monthly_drawdown', type: 'TEXT' },
    { name: 'raw_html', type: 'TEXT' },
    { name: 'raw_csv', type: 'TEXT' },
    { name: 'var_95_dd_cap', type: 'REAL DEFAULT 0' }
  ];

  const currentColumns = await db.all("PRAGMA table_info(robots)");
  const currentColumnNames = currentColumns.map(c => c.name);

  for (const col of columnsToAdd) {
    if (!currentColumnNames.includes(col.name)) {
      console.log(`Adding column ${col.name}...`);
      await db.run(`ALTER TABLE robots ADD COLUMN ${col.name} ${col.type}`);
    } else {
      console.log(`Column ${col.name} already exists.`);
    }
  }

  console.log('Migration finished!');
}

migrate().catch(console.error);
