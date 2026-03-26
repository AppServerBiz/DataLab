
import { getDb } from './src/database';

async function check() {
  const db = await getDb();
  const info = await db.all("PRAGMA table_info(robots)");
  console.log(JSON.stringify(info, null, 2));
}
check();
