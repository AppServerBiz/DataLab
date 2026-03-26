import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

export interface EliteMetrics {
  // 10 Elite Metrics
  total_net_profit: number;
  max_dd_equity: number;
  max_dd_equity_pct: number;
  profit_factor: number;
  total_trades: number;
  short_trades: number;
  short_win_pct: number;
  long_trades: number;
  long_win_pct: number;
  expected_payoff: number;
  sharpe_ratio: number;
  max_drawdown_abs: number;
  initial_deposit: number;
  // Extra metrics
  gross_profit: number;
  gross_loss: number;
  recovery_factor: number;
  profitable_trades: number;
  losing_trades: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  max_win: number;
  max_loss: number;
  max_consecutive_wins: string;
  max_consecutive_losses: string;
  avg_trade_duration: string;
  quality: number;
  // Config / robot info 
  asset: string;
  period: string;
  timeframe: string;
  date_from: string;
  date_to: string;
  broker: string;
  parameters: Record<string, any>;
  // Calculated
  total_months: number;
  avg_profit_per_month: number;
  monthly_drawdown: { month: string, maxDD: number, maxDDPct: number }[];
}

export interface ParsedBacktestData {
  robotName: string; // from filename
  metrics: EliteMetrics;
  configHtml: string; // first section raw html
}

export interface EquityPoint {
  timestamp: string;
  balance: number;
  equity: number;
}

export interface ParsedCSVData {
  robotName: string; // from filename
  equityCurve: EquityPoint[];
  maxDrawdown: number;
  maxDrawdownPct: number;
}

/**
 * Decode a UTF-16LE buffer (typical MT5 output) to string
 */
export function decodeBuffer(buffer: Buffer): string {
  // Check for UTF-16 LE BOM (0xFF 0xFE)
  if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return iconv.decode(buffer, 'utf-16le');
  }
  // Fallback: try UTF-8
  const utf8 = buffer.toString('utf8');
  if (utf8.includes('<html') || utf8.includes('<HTML')) return utf8;
  // Last resort: try utf16le anyway
  return iconv.decode(buffer, 'utf-16le');
}

/**
 * Parse a number from a Portuguese-pt string like "9 059,32" or "9059.32"
 */
function parseNum(s: string | undefined): number {
  if (!s) return 0;
  // Remove spaces, handle comma as decimal (PT format)
  // MT5 uses "9 059,32" or "9059.32" (EN format in some files) or "9 059.32"
  const cleaned = s.trim()
    .replace(/\s/g, '')       // remove all spaces
    .replace(/\.(?=\d{3}(?:[,.]|$))/g, '') // remove thousands dots
    .replace(',', '.');        // normalize decimal
  return parseFloat(cleaned) || 0;
}

/**
 * Parse the MT5 backtest HTML.
 * Key insight: rows have label td with colspan=3, then value td with <b> tag.
 * Multiple label-value pairs may be in the same <tr>.
 */
export function parseMT5BacktestHTML(html: string, robotName: string, csvParsed?: ParsedCSVData | null): ParsedBacktestData {
  const $ = cheerio.load(html);

  // Build flat map of ALL label->value pairs by scanning all trs
  const labelValueMap = new Map<string, string>();
  const paramsList: string[] = [];
  let inParams = false;
  let inResults = false;
  let configHtmlRows: string[] = [];
  let configEnded = false;

  $('tr').each((_, tr) => {
    const rowText = $(tr).text().trim();
    
    // Detect section transitions
    if (rowText.includes('Configura') && !rowText.includes('Lucro')) {
      // Start of config section
    }
    if (rowText.includes('Resultados') && !configEnded) {
      configEnded = true;
      inResults = true;
    }

    // Extract all td pairs in this row  
    const tds = $(tr).find('td');
    let i = 0;
    const tdArr = tds.toArray();

    while (i < tdArr.length) {
      const td = $(tdArr[i]);
      const tdText = td.text().trim();

      if (!tdText) { i++; continue; }

      // Detect parameters section
      if (tdText.includes('Parâmetros de entrada') || tdText.includes('Parmetros de entrada')) {
        inParams = true;
        i++;
        continue;
      }

      // If we're in params, look at the bold text in next td
      if (inParams && !inResults) {
        const bTag = td.find('b');
        if (bTag.length) {
          const paramText = bTag.text().trim();
          if (paramText.includes('=')) {
            paramsList.push(paramText);
          }
        }
        i++;
        continue;
      }

      // Grab label-value pairs: label ends with ':', next td has the value in <b>
      if (tdText.endsWith(':') && i + 1 < tdArr.length) {
        const nextTd = $(tdArr[i + 1]);
        const bEl = nextTd.find('b');
        let val = '';
        if (bEl.length) {
          val = bEl.text().trim();
        } else {
          val = nextTd.text().trim();
        }
        if (val && !val.endsWith(':')) {
          labelValueMap.set(tdText, val);
        }
        i += 2;
        continue;
      }

      // Also check for inline "Label: Value" format in single td
      if (tdText.includes(':') && !tdText.endsWith(':')) {
        const colonIdx = tdText.indexOf(':');
        const key = tdText.substring(0, colonIdx + 1).trim();
        const val = tdText.substring(colonIdx + 1).trim();
        if (key && val) labelValueMap.set(key, val);
      }

      i++;
    }
  });

  // Build params map
  const parameters: Record<string, any> = {};
  for (const p of paramsList) {
    const eqIdx = p.indexOf('=');
    if (eqIdx > 0) {
      const key = p.substring(0, eqIdx).trim();
      const val = p.substring(eqIdx + 1).trim();
      const num = parseFloat(val.replace(',', '.'));
      parameters[key] = isNaN(num) ? val : num;
    }
  }

  // Helper to get value by partial label key
  function get(keyword: string): string {
    for (const [k, v] of labelValueMap) {
      if (k.toLowerCase().includes(keyword.toLowerCase())) return v;
    }
    return '';
  }

  // Extract all 10 elite metrics
  const total_net_profit = parseNum(get('Lucro L'));
  const gross_profit = parseNum(get('Lucro Bruto'));
  const gross_loss = parseNum(get('Perda Bruta'));
  const profit_factor = parseNum(get('Fator de Lucro'));
  const expected_payoff = parseNum(get('Retorno Esperado'));
  const recovery_factor = parseNum(get('Fator de Recupera'));
  const sharpe_ratio = parseNum(get('ndice de Sharpe'));
  const quality = parseNum(get('Qualidade'));

  const max_drawdown_abs_raw = get('Rebaixamento Absoluto do Saldo');
  const max_drawdown_abs = parseNum(max_drawdown_abs_raw);

  // Equity drawdown  
  const maxDDEquityRaw = get('Rebaixamento M') !== '' 
    ? get('Rebaixamento Máximo do Capital') || get('ndice Capital L') || ''
    : '';
  
  // Parse "989.80 (5.82%)" or "989,80 (5,82%)"
  const maxDDEquityFull = get('Rebaixamento') ? (() => {
    for (const [k, v] of labelValueMap) {
      if (k.includes('Capital L') && k.includes('ximo')) return v;
      if (k.includes('Capital') && k.includes('ximo')) return v;
    }
    return get('Rebaixamento Máximo');
  })() : '';

  const ddEquityMatch = maxDDEquityFull.match(/([\d\s.,]+)\s*\(([\d.,]+)%\)/);
  const max_dd_equity = ddEquityMatch ? parseNum(ddEquityMatch[1]) : 0;
  const max_dd_equity_pct = ddEquityMatch ? parseNum(ddEquityMatch[2]) : 0;

  // Trades
  const total_trades_raw = get('Total de Negocia');
  const total_trades = parseInt(total_trades_raw.replace(/\D/g, '')) || 0;

  const short_raw = get('Posi') ? ( () => {
    for (const [k, v] of labelValueMap) {
      if (k.includes('Vendidas') || k.includes('endidas')) return v;
    }
    return '';
  })() : '';
  const long_raw = (() => {
    for (const [k, v] of labelValueMap) {
      if (k.includes('Compradas') || k.includes('ompradas')) return v;
    }
    return '';
  })();

  const shortMatch = short_raw.match(/^(\d+)\s*\(([\d.,]+)%\)/);
  const short_trades = shortMatch ? parseInt(shortMatch[1]) : 0;
  const short_win_pct = shortMatch ? parseNum(shortMatch[2]) : 0;

  const longMatch = long_raw.match(/^(\d+)\s*\(([\d.,]+)%\)/);
  const long_trades = longMatch ? parseInt(longMatch[1]) : 0;
  const long_win_pct = longMatch ? parseNum(longMatch[2]) : 0;

  const profitableTrades_raw = (() => {
    for (const [k, v] of labelValueMap) {
      if (k.includes('com Lucro') || k.includes('Lucro (')) return v;
    }
    return '';
  })();
  const profitable_m = profitableTrades_raw.match(/^(\d+)/);
  const profitable_trades = profitable_m ? parseInt(profitable_m[1]) : 0;
  const losing_trades = total_trades - profitable_trades;
  const win_rate = total_trades > 0 ? (profitable_trades / total_trades) * 100 : 0;

  const max_win = parseNum(get('Maior lucro'));
  const max_loss = parseNum(get('Maior perda'));
  const avg_win = parseNum(get('dia lucro'));
  const avg_loss = parseNum(get('dia perda') || get('dia Perda'));
  const avg_trade_duration = get('Tempo m');

  const maxConsecWinsRaw = (() => {
    for (const [k, v] of labelValueMap) {
      if ((k.includes('ganhos') || k.includes('Ganhos')) && k.includes('ximo')) return v;
    }
    return '';
  })();
  const maxConsecLossesRaw = (() => {
    for (const [k, v] of labelValueMap) {
      if ((k.includes('perdas') || k.includes('Perdas')) && k.includes('ximo')) return v;
    }
    return '';
  })();

  // Config info - exact key matches to avoid false positives
  const asset = (() => {
    for (const [k, v] of labelValueMap) {
      if (k.trim() === 'Ativo:') return v;
    }
    return get('Ativo:');
  })().replace(/<[^>]+>/g, '').trim();

  // Period: exact key match for "Período:" (with accents) or "Período:"
  const period_full = (() => {
    for (const [k, v] of labelValueMap) {
      if (k.includes('odo:') || k.includes('riodo:') || k.includes('Período')) return v;
    }
    return '';
  })();
  const periodMatch = period_full.match(/([A-Z][A-Z0-9]*)\s*\((\d{4}\.\d{2}\.\d{2})\s*-\s*(\d{4}\.\d{2}\.\d{2})\)/);
  const timeframe = periodMatch ? periodMatch[1] : period_full.split(' ')[0] || 'UNKNOWN';
  const date_from = periodMatch ? periodMatch[2] : '';
  const date_to = periodMatch ? periodMatch[3] : '';

  // Calculate Total Months and Avg Profit
  let total_months = 0;
  let avg_profit_per_month = 0;
  if (date_from && date_to) {
    const d1 = new Date(date_from.replace(/\./g, '-'));
    const d2 = new Date(date_to.replace(/\./g, '-'));
    total_months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    if (total_months > 0) {
      avg_profit_per_month = total_net_profit / total_months;
    }
  }

  const broker = (() => {
    for (const [k, v] of labelValueMap) {
      if (k.includes('mpresa') || k.includes('Empresa') || k.includes('Corretora')) return v;
    }
    return '';
  })();

  // Initial deposit: first balance in CSV; use 10000 as typical default if not present  
  const initial_deposit = 10000;

  // Build config HTML focusing only on top settings and params
  const configHtml = buildConfigHtml($, labelValueMap, paramsList);

  // Max Monthly DD calculation
  const monthlyDD: { month: string, maxDD: number, maxDDPct: number }[] = [];
  if (csvParsed?.equityCurve?.length) {
    const curve = csvParsed.equityCurve;
    const months: { [key: string]: any[] } = {};
    curve.forEach(p => {
      const m = p.timestamp.substring(0, 7); // "YYYY.MM"
      if (!months[m]) months[m] = [];
      months[m].push(p);
    });

    let peak = 0;
    Object.keys(months).sort().forEach(mKey => {
      let maxMonthDD = 0;
      let maxMonthDDPct = 0;
      months[mKey].forEach(p => {
        if (p.equity > peak) peak = p.equity;
        const dd = peak - p.equity;
        if (dd > maxMonthDD) {
          maxMonthDD = dd;
          maxMonthDDPct = peak > 0 ? (dd / peak) * 100 : 0;
        }
      });
      monthlyDD.push({ month: mKey, maxDD: maxMonthDD, maxDDPct: maxMonthDDPct });
    });
  }

  return {
    robotName,
    metrics: {
      total_net_profit,
      max_dd_equity,
      max_dd_equity_pct,
      profit_factor,
      total_trades,
      short_trades,
      short_win_pct,
      long_trades,
      long_win_pct,
      expected_payoff,
      sharpe_ratio,
      max_drawdown_abs,
      initial_deposit,
      gross_profit,
      gross_loss,
      recovery_factor,
      profitable_trades,
      losing_trades,
      win_rate,
      avg_win,
      avg_loss,
      max_win,
      max_loss,
      max_consecutive_wins: maxConsecWinsRaw,
      max_consecutive_losses: maxConsecLossesRaw,
      avg_trade_duration,
      quality,
      asset,
      period: period_full,
      timeframe,
      date_from,
      date_to,
      broker,
      parameters,
      total_months,
      avg_profit_per_month,
      monthly_drawdown: monthlyDD,
    },
    configHtml,
  };
}

function buildConfigHtml($: cheerio.CheerioAPI, labelValueMap: Map<string, string>, paramsList: string[]): string {
  const rows: string[] = [];
  
  // Clean labelValueMap from noise (timestamps, etc)
  const cleanMap = new Map<string, string>();
  for (const [k, v] of labelValueMap) {
    // Labels MUST end in : to be standard MT5 settings. Noise/Dates don't usually have it in the label cell.
    if (!k.endsWith(':')) continue; 
    // Filter out results metrics
    const resultsKeys = ['Lucro L', 'Fator de Lucro', 'Rebaixamento', 'Negocia', 'Sharpe', 'Payoff', 'Recupera', 'AHPR', 'GHPR', 'LR', 'Barras', 'Ticks', 'Posi'];
    if (resultsKeys.some(rk => k.includes(rk))) continue;

    // Filter out rows starting with date patterns (optimization timestamps)
    if (/^\d{4}\.\d{2}\.\d{2}/.test(k)) continue;

    cleanMap.set(k, v);
  }

  for (const [label, value] of cleanMap) {
    rows.push(`
      <tr>
        <td class="cfg-label">${label}</td>
        <td class="cfg-value">${value}</td>
      </tr>
    `);
  }

  const paramRows = paramsList.map(p => {
    const [k, ...vParts] = p.split('=');
    return `
      <tr>
        <td class="cfg-label" style="padding-left:1.5rem">⚙ ${k}</td>
        <td class="cfg-value">${vParts.join('=')}</td>
      </tr>
    `;
  }).join('');

  return `
    <table class="config-info-table" style="width:100%; border-collapse: collapse;">
      <tbody>
        ${rows.join('')}
        <tr><td colspan="2" class="cfg-section-header" style="background: rgba(255,255,255,0.04); color: var(--accent-blue); padding: 0.8rem; font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;">⚙ Parâmetros de Entrada</td></tr>
        ${paramRows}
      </tbody>
    </table>
  `;
}

/**
 * Parse MT5 CSV equity file (UTF-16LE).
 * Format: <DATE>\t<BALANCE>\t<EQUITY>\t<DEPOSIT_LOAD>
 */
export function parseCSVEquity(csvContent: string, robotName: string): ParsedCSVData {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim() !== '');
  
  const equityCurve: EquityPoint[] = [];
  let initialBalance = 0;
  let minEquity = Infinity;
  let maxBalance = 0;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  let peakBalance = 0;

  for (const line of lines) {
    // Skip header lines like "<DATE>\t<BALANCE>..."
    if (line.startsWith('<') || line.startsWith('?<') || line.trim() === '') continue;

    const parts = line.split('\t');
    if (parts.length < 3) continue;

    const timestamp = parts[0].trim();
    // Handle Portuguese comma decimals (10000,5 -> 10000.5)
    const balance = parseFloat(parts[1].replace(',', '.').replace(/\s/g, ''));
    const equity = parseFloat(parts[2].replace(',', '.').replace(/\s/g, ''));

    if (isNaN(balance) || isNaN(equity)) continue;

    if (equityCurve.length === 0) {
      initialBalance = balance;
      peakBalance = balance;
    }

    equityCurve.push({ timestamp, balance, equity });

    if (equity > peakBalance) peakBalance = equity;
    
    const dd = peakBalance - equity;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPct = peakBalance > 0 ? (dd / peakBalance) * 100 : 0;
    }
  }

  return {
    robotName,
    equityCurve,
    maxDrawdown,
    maxDrawdownPct,
  };
}

export function getRobotNameFromFilename(filename: string): string {
  // Remove extension, normalize
  return filename.replace(/\.(html|csv)$/i, '').trim();
}

export function normalizeRobotName(name: string): string {
  return name.toLowerCase().trim();
}

export function makeRobotId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
}
