const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function check() {
  try {
    const dbPath = path.resolve(__dirname, '..', 'nautilus.db');
    console.log('Checking database at:', dbPath);
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    
    const portfolios = await db.all('SELECT * FROM portfolios');
    console.log('Portfolios count:', portfolios.length);
    console.log('Portfolios:', JSON.stringify(portfolios, null, 2));

    const robots = await db.all('SELECT id, name FROM robots LIMIT 5');
    console.log('Robots sample:', JSON.stringify(robots, null, 2));

    await db.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

check();
