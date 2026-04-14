const fs = require('fs');
const iconv = require('iconv-lite');

function decodeBuffer(buffer) {
  if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return iconv.decode(buffer, 'utf-16le');
  }
  return buffer.toString('utf8');
}

const buf = fs.readFileSync('scratch/dump_Obi_wan_Kenobi_vX25___Nasdaq_H1___Bizuco.html');
const text = decodeBuffer(buf);

console.log('Text length:', text.length);
console.log('Contains Ordens:', text.includes('Ordens'));
console.log('Contains Orders:', text.includes('Orders'));
console.log('Contains Volume:', text.includes('Volume'));

const index = text.indexOf('Ordens');
if (index !== -1) {
    console.log('Ordens found at:', index);
    console.log('Snippet:', text.substring(index, index + 500));
} else {
    const i2 = text.indexOf('Orders');
    if (i2 !== -1) {
        console.log('Orders found at:', i2);
        console.log('Snippet:', text.substring(i2, i2 + 500));
    }
}
