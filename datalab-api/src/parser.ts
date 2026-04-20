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
  total_lots: number;
  lots_per_month: number;
  max_lot_exposure: number;
  max_entries_per_trade: number;
  monthly_drawdown: { month: string, maxDD: number, maxDDPct: number }[];
  var_95_dd_cap: number;
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
  var95: number; // VaR 95% on initial capital
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
  
  // Parse Lots from "Ordens" or "Negociações" table (often a row in a giant table)
  // Also track lot exposure per trade for risk management
  let total_lots = 0;
  let max_lot_exposure = 0;  // Max simultaneous lot exposure in a single position
  let max_entries_per_trade = 0;  // Max number of entries (preço médio) in a single trade
  try {
    const ordensSearch = $('b:contains("Ordens"), div:contains("Ordens"), b:contains("Orders"), div:contains("Orders"), b:contains("Negocia"), div:contains("Negocia"), b:contains("Deals"), div:contains("Deals")').filter((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      return text === 'ordens' || text === 'orders' || text.includes('negocia') || text === 'deals';
    }).last();

    if (ordensSearch.length) {
      const headerRow = ordensSearch.closest('tr');
      let currentRow = headerRow.next();
      
      // Skip the column header row
      if (currentRow.text().toLowerCase().includes('volume')) {
        currentRow = currentRow.next();
      } else if (currentRow.next().text().toLowerCase().includes('volume')) {
          currentRow = currentRow.next().next();
      }

      // Track open positions per symbol to calculate lot exposure
      // Key: symbol, Value: { lots: accumulated lot size, entries: number of entries }
      const openPositions: Map<string, { lots: number, entries: number, direction: string }> = new Map();

      while (currentRow.length) {
        const tds = currentRow.find('td');
        const text = currentRow.text().toLowerCase();
        
        // If we hit another section header, stop
        if (tds.first().attr('colspan') && parseInt(tds.first().attr('colspan') || '0') > 5) break;
        if (text.includes('transações') || text.includes('deals')) break;
        if (tds.length < 4) {
            currentRow = currentRow.next();
            continue;
        }

        // Extract deal details: Type (buy/sell/in/out), Volume, Symbol
        let volumeText = '';
        let dealType = '';
        let dealSymbol = '';
        const tdArr = tds.toArray();
        
        tdArr.forEach((td, idx) => {
          const t = $(td).text().trim();
          // Typically: Time | Ticket | Symbol | Type | Direction | Volume | Price | S/L | T/P | Time | Commission | Swap | Profit | Balance
          // or:       Time | Ticket | Symbol | Type | Volume | Price | Order | Commission | Fee | Swap | Profit | Balance | Comment
          if (idx === 2 || idx === 3) {
            // Symbol is usually position 2 or 3
            if (t.match(/^[A-Z]/i) && !t.match(/^(buy|sell|in|out|balance|credit)/i)) {
              if (!dealSymbol) dealSymbol = t;
            }
          }
          // Detect deal type (buy/sell, in/out)
          const tLow = t.toLowerCase();
          if (tLow === 'buy' || tLow === 'sell' || tLow === 'compra' || tLow === 'venda') {
            dealType = tLow.startsWith('b') || tLow.startsWith('c') ? 'buy' : 'sell';
          }
          // Volume
          if (t.includes('/') || (/^\d+[\.,]\d+$/.test(t))) {
            if (!volumeText) volumeText = t;
          }
        });

        // Also check the full row text for "in" vs "out" direction
        const rowContent = currentRow.text().toLowerCase();
        const isEntry = rowContent.includes(' in') || rowContent.includes('entrada') || rowContent.includes('entry');
        const isExit = rowContent.includes(' out') || rowContent.includes('saída') || rowContent.includes('exit') || rowContent.includes('sa\u00edda');

        if (volumeText) {
          let dealVolume = 0;
          if (volumeText.includes('/')) {
            const parts = volumeText.split('/');
            dealVolume = parseFloat(parts[1].trim().replace(',', '.'));
          } else {
            dealVolume = parseFloat(volumeText.replace(',', '.'));
          }
          if (!isNaN(dealVolume) && dealVolume > 0) {
            total_lots += dealVolume;

            // Track lot exposure per position
            const posKey = dealSymbol || 'UNKNOWN';
            
            if (isExit) {
              // Closing or partial close: reduce position
              const pos = openPositions.get(posKey);
              if (pos) {
                pos.lots = Math.max(0, pos.lots - dealVolume);
                if (pos.lots <= 0.001) { // Essentially closed (floating point tolerance)
                  // Record stats before clearing
                  if (pos.entries > max_entries_per_trade) max_entries_per_trade = pos.entries;
                  openPositions.delete(posKey);
                }
              }
            } else {
              // Entry or addition to position
              const pos = openPositions.get(posKey) || { lots: 0, entries: 0, direction: dealType };
              
              // Check if it's the same direction (adding to position = preço médio)
              if (pos.direction === dealType || pos.lots === 0) {
                pos.lots += dealVolume;
                pos.entries += 1;
                pos.direction = dealType;
              } else {
                // Direction reversed — close old and open new
                if (pos.entries > max_entries_per_trade) max_entries_per_trade = pos.entries;
                pos.lots = dealVolume;
                pos.entries = 1;
                pos.direction = dealType;
              }
              
              openPositions.set(posKey, pos);
              
              // Track max exposure
              if (pos.lots > max_lot_exposure) {
                max_lot_exposure = pos.lots;
              }
              if (pos.entries > max_entries_per_trade) {
                max_entries_per_trade = pos.entries;
              }
            }
          }
        }
        currentRow = currentRow.next();
      }

      // Final check for any remaining open positions
      for (const [, pos] of openPositions) {
        if (pos.entries > max_entries_per_trade) max_entries_per_trade = pos.entries;
      }
    }
  } catch (e) {
    console.warn("Error parsing lots from Ordens table:", e);
  }

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
  const total_net_profit = parseNum(get('Lucro L') || get('Net Profit'));
  const gross_profit = parseNum(get('Lucro Bruto') || get('Gross Profit'));
  const gross_loss = parseNum(get('Perda Bruta') || get('Gross Loss'));
  const profit_factor = parseNum(get('Fator de Lucro') || get('Profit Factor'));
  const expected_payoff = parseNum(get('Retorno Esperado') || get('Expected Payoff'));
  const recovery_factor = parseNum(get('Fator de Recupera') || get('Recovery Factor'));
  const sharpe_ratio = parseNum(get('ndice de Sharpe') || get('Sharpe Ratio'));
  const quality = parseNum(get('Qualidade') || get('History Quality'));

  const max_drawdown_abs_raw = get('Rebaixamento Absoluto do Saldo') || get('Balance Drawdown Absolute');
  const max_drawdown_abs = parseNum(max_drawdown_abs_raw);

  // Equity drawdown  
  const maxDDEquityRaw = get('Rebaixamento M') !== '' 
  ? get('Rebaixamento Máximo do Capital') || get('ndice Capital L') || get('Equity Drawdown Maximum') || ''
  : '';
  
  // Parse "989.80 (5.82%)" or "989,80 (5,82%)"
  const maxDDEquityFull = get('Rebaixamento') || get('Drawdown') ? (() => {
    for (const [k, v] of labelValueMap) {
      if ((k.includes('Capital L') || k.includes('Equity')) && (k.includes('ximo') || k.includes('Maximum'))) return v;
      if (k.includes('Capital') && (k.includes('ximo') || k.includes('Maximum'))) return v;
    }
    return get('Rebaixamento Máximo') || get('Equity Drawdown Maximum');
  })() : '';

  const ddEquityMatch = maxDDEquityFull.match(/([\d\s.,]+)\s*\(([\d.,]+)%\)/);
  const max_dd_equity = ddEquityMatch ? parseNum(ddEquityMatch[1]) : 0;
  const max_dd_equity_pct = ddEquityMatch ? parseNum(ddEquityMatch[2]) : 0;

  // Trades
  const total_trades_raw = get('Total de Negocia') || get('Total Trades');
  const total_trades = parseInt(total_trades_raw.replace(/\D/g, '')) || 0;

  const short_raw = (get('Posi') || get('Positions')) ? ( () => {
    for (const [k, v] of labelValueMap) {
      if (k.includes('Vendidas') || k.includes('endidas') || k.includes('Short')) return v;
    }
    return '';
  })() : '';
  const long_raw = (() => {
    for (const [k, v] of labelValueMap) {
      if (k.includes('Compradas') || k.includes('ompradas') || k.includes('Long')) return v;
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
      if (k.includes('com Lucro') || k.includes('Lucro (') || k.includes('Profit Trades')) return v;
    }
    return '';
  })();
  const profitable_m = profitableTrades_raw.match(/^(\d+)/);
  const profitable_trades = profitable_m ? parseInt(profitable_m[1]) : 0;
  const losing_trades = total_trades - profitable_trades;
  const win_rate = total_trades > 0 ? (profitable_trades / total_trades) * 100 : 0;

  const max_win = parseNum(get('Maior lucro') || get('Largest profit trade'));
  const max_loss = parseNum(get('Maior perda') || get('Largest loss trade'));
  const avg_win = parseNum(get('dia lucro') || get('Average profit trade'));
  const avg_loss = parseNum(get('dia perda') || get('dia Perda') || get('Average loss trade'));
  const avg_trade_duration = get('Tempo m') || get('Average duration');

  const maxConsecWinsRaw = (() => {
    for (const [k, v] of labelValueMap) {
      if ((k.includes('ganhos') || k.includes('Ganhos') || k.includes('wins')) && (k.includes('ximo') || k.includes('maximal'))) return v;
    }
    return '';
  })();
  const maxConsecLossesRaw = (() => {
    for (const [k, v] of labelValueMap) {
      if ((k.includes('perdas') || k.includes('Perdas') || k.includes('losses')) && (k.includes('ximo') || k.includes('maximal'))) return v;
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
  const lots_per_month = total_months > 0 ? total_lots / total_months : 0;

  const broker = (() => {
    for (const [k, v] of labelValueMap) {
      if (k.includes('mpresa') || k.includes('Empresa') || k.includes('Corretora')) return v;
    }
    return '';
  })();

  // Initial deposit: exact key match for "Depósito inicial:" or "Balance:" first row
  const initial_deposit = parseNum(get('Depósito inicial') || get('Initial Deposit')) || 10000;

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
      total_lots,
      lots_per_month,
      max_lot_exposure,
      max_entries_per_trade,
      monthly_drawdown: monthlyDD,
      var_95_dd_cap: (() => {
        const base = csvParsed ? csvParsed.equityCurve[0]?.balance : initial_deposit;
        const curve = csvParsed?.equityCurve;
        if (!base || base <= 0 || !curve?.length) return 0;
        
        // Calculate daily profits
        const daily: Map<string, number> = new Map();
        let prevEquity = curve[0].equity;
        curve.forEach(p => {
          const day = p.timestamp.split(' ')[0];
          const profit = p.equity - prevEquity;
          daily.set(day, (daily.get(day) || 0) + profit);
          prevEquity = p.equity;
        });

        const profits = Array.from(daily.values());
        if (profits.length < 5) return 0;

        // VaR on deposit
        const returns = profits.map(p => p / base);
        returns.sort((a, b) => a - b);
        const idx = Math.floor(returns.length * 0.05);
        return returns[idx] || 0;
      })(),
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

  // Calculate VaR 95% on initial deposit
  let var95 = 0;
  if (equityCurve.length > 10) {
    const daily: Map<string, number> = new Map();
    let prevE = equityCurve[0].equity;
    equityCurve.forEach(p => {
      const d = p.timestamp.split(' ')[0];
      const pr = p.equity - prevE;
      daily.set(d, (daily.get(d) || 0) + pr);
      prevE = p.equity;
    });
    const profits = Array.from(daily.values());
    if (profits.length >= 5) {
      const returns = profits.map(p => p / (initialBalance || 10000));
      returns.sort((a,b) => a - b);
      var95 = returns[Math.floor(returns.length * 0.05)] || 0;
    }
  }

  return {
    robotName,
    equityCurve,
    maxDrawdown,
    maxDrawdownPct,
    var95
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
