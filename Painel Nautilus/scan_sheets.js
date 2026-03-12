import fetch from 'node-fetch';

const SPREADSHEET_ID = '2PACX-1vTkFCQyemfV-QgUweFSbEkNAgttstTsSSpb-yKJYo3S26DblMUbrBIY4Xxq4q-Dm-3fseT-wESYvxxG';
const GIDS = [
  { name: 'Estrutura', gid: '260631111' },
  { name: 'ALPHA1 Gold', gid: '299170164' },
  { name: 'ALPHA1 Titanium', gid: '1992215399' },
  { name: 'ALPHA1 Platinium', gid: '1060590758' },
  { name: 'Platinum ALPHA1', gid: '2050007420' },
  { name: 'ALPHA1 Diamond', gid: '1658490353' },
  { name: 'ALPHA1 Diamond Prime', gid: '1533877319' },
  { name: 'ADOLFO 3%', gid: '343645607' },
  { name: 'ADOLFO 5%', gid: '1362860197' },
  { name: 'ADOLFO 7%', gid: '161955398' },
  { name: 'Portifolio 2%', gid: '1387759474' },
  { name: 'Tech APEX 3%', gid: '1378426048' },
  { name: 'Tech APEX 5%', gid: '82535428' },
  { name: 'Tech APEX 7%', gid: '775790618' },
  { name: 'Tech APEX 10%', gid: '2072559687' },
  { name: 'Portifolio 1M 3%', gid: '855760310' },
  { name: 'Portifolio 1M 5%', gid: '1054734507' },
  { name: 'Portifólio 1M 7%', gid: '416944240' }
];

async function scan() {
  for (const item of GIDS) {
    console.log(`--- Tab: ${item.name} (GID: ${item.gid}) ---`);
    const url = `https://docs.google.com/spreadsheets/d/e/${SPREADSHEET_ID}/pub?gid=${item.gid}&output=csv`;
    try {
      const resp = await fetch(url);
      const text = await resp.text();
      console.log(text.split('\n').slice(0, 5).join('\n'));
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

scan();
