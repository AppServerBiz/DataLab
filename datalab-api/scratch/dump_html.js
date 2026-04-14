const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

async function dumpHtml() {
  const db = await open({ filename: 'nautilus.db', driver: sqlite3.Database });
  const robots = await db.all('SELECT name, raw_html FROM robots');
  for (const r of robots) {
      if (r.raw_html) {
          const filename = path.join('scratch', `dump_${r.name.replace(/[^a-z0-9]/gi, '_')}.html`);
          fs.writeFileSync(filename, r.raw_html);
          console.log(`Dumped HTML to ${filename}`);
      }
  }
}
dumpHtml();
