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

const index = text.indexOf('Ordens');
if (index !== -1) {
    console.log('Structure around Ordens:');
    console.log(text.substring(index - 100, index + 2000));
}
