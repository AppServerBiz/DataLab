import * as cheerio from 'cheerio';

export interface ParsedStrategyContext {
  setParams: Record<string, string>;
  activeFeatures: string[];
  backtestMetrics?: {
    initialDeposit?: string;
    totalNetProfit?: string;
    profitFactor?: string;
    recoveryFactor?: string;
    sharpeRatio?: string;
    maxBalanceDrawdown?: string;
    maxEquityDrawdown?: string;
    totalTrades?: string;
    winRate?: string;
  };
  mqlSummary?: string;
  docSummary?: string;
  rawSetText?: string;
}

export function parseSetContent(content: string): { params: Record<string, string>, activeFeatures: string[], raw: string } {
  const params: Record<string, string> = {};
  const activeFeatures: string[] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;

    if (trimmed.includes('=')) {
      const parts = trimmed.split('=');
      const key = parts[0];
      const rawVal = parts[1];
      if (!key || rawVal === undefined) continue;

      const k = key.trim();
      const val = rawVal.split('||')[0]?.trim() || '';
      
      params[k] = val;

      // Detect relevant non-default features
      if (val !== '0' && val !== '0.0' && val !== '0.000000' && val !== 'false' && val !== '' && val !== '-999.0' && val !== '-1' && val !== 'auto') {
        if (k.toLowerCase().includes('martingail') || k.toLowerCase().includes('martingale')) {
          activeFeatures.push(`Grid/Martingale: ${k} = ${val}`);
        } else if (k.toLowerCase().includes('takeprofit') || k.toLowerCase().includes('stoploss')) {
          activeFeatures.push(`Alvo/Stop: ${k} = ${val}`);
        } else if (k.toLowerCase().includes('filter') || k.toLowerCase().includes('indicator') || k.toLowerCase().includes('ma_') || k.toLowerCase().includes('rsi') || k.toLowerCase().includes('macd')) {
          activeFeatures.push(`Indicador/Filtro: ${k} = ${val}`);
        } else if (k.toLowerCase().includes('lot') || k.toLowerCase().includes('partialclose')) {
          activeFeatures.push(`Manejo de Lote: ${k} = ${val}`);
        } else if (k.toLowerCase().includes('direction') || k.toLowerCase().includes('timeframe')) {
          activeFeatures.push(`Estrutura: ${k} = ${val}`);
        }
      }
    }
  }

  return { params, activeFeatures, raw: content };
}

export function parseHtmlBacktest(htmlContent: string): ParsedStrategyContext['backtestMetrics'] {
  try {
    const $ = cheerio.load(htmlContent);
    const metrics: ParsedStrategyContext['backtestMetrics'] = {};

    $('tr').each((_, el) => {
      const cells = $(el).find('td, th').map((__, c) => $(c).text().trim()).get();
      
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]?.toLowerCase() || '';
        const nextCell = cells[i + 1] || '';

        if (cell.includes('depósito inicial') || cell.includes('initial deposit')) metrics.initialDeposit = nextCell;
        if (cell.includes('lucro líquido total') || cell.includes('total net profit')) metrics.totalNetProfit = nextCell;
        if (cell.includes('fator de lucro') || cell.includes('profit factor')) metrics.profitFactor = nextCell;
        if (cell.includes('fator de recuperação') || cell.includes('recovery factor')) metrics.recoveryFactor = nextCell;
        if (cell.includes('índice de sharpe') || cell.includes('sharpe ratio')) metrics.sharpeRatio = nextCell;
        if (cell.includes('rebaixamento máximo do capital líquido') || cell.includes('maximal drawdown')) metrics.maxEquityDrawdown = nextCell;
        if (cell.includes('rebaixamento máximo do saldo') || cell.includes('balance drawdown')) metrics.maxBalanceDrawdown = nextCell;
        if (cell.includes('total de negociações') || cell.includes('total trades')) metrics.totalTrades = nextCell;
        if (cell.includes('negociações com lucro') || cell.includes('profit trades')) metrics.winRate = nextCell;
      }
    });

    return metrics;
  } catch (e) {
    console.error('Error parsing backtest HTML:', e);
    return undefined;
  }
}

export function buildStrategyPromptContext(data: {
  robotName?: string;
  parsedSet?: { params: Record<string, string>, activeFeatures: string[], raw: string } | undefined;
  backtestMetrics?: ParsedStrategyContext['backtestMetrics'] | undefined;
  mqlCode?: string;
  docText?: string;
  userRational?: string;
}): string {
  let ctx = `=== STRATEGY DOSSIER: ${data.robotName || 'Robô Sob Análise'} ===\n\n`;

  if (data.userRational) {
    ctx += `📌 RACIONAL INFORMADO PELO USUÁRIO:\n${data.userRational}\n\n`;
  }

  if (data.backtestMetrics) {
    ctx += `📊 MÉTRICAS DE PERFORMANCE DO BACKTEST:\n`;
    if (data.backtestMetrics.initialDeposit) ctx += `- Depósito Inicial: ${data.backtestMetrics.initialDeposit}\n`;
    if (data.backtestMetrics.totalNetProfit) ctx += `- Lucro Líquido: ${data.backtestMetrics.totalNetProfit}\n`;
    if (data.backtestMetrics.profitFactor) ctx += `- Fator de Lucro (PF): ${data.backtestMetrics.profitFactor}\n`;
    if (data.backtestMetrics.recoveryFactor) ctx += `- Fator de Recuperação (RF): ${data.backtestMetrics.recoveryFactor}\n`;
    if (data.backtestMetrics.sharpeRatio) ctx += `- Sharpe Ratio: ${data.backtestMetrics.sharpeRatio}\n`;
    if (data.backtestMetrics.maxEquityDrawdown) ctx += `- Drawdown Máximo de Equidade: ${data.backtestMetrics.maxEquityDrawdown}\n`;
    if (data.backtestMetrics.maxBalanceDrawdown) ctx += `- Drawdown Máximo de Saldo: ${data.backtestMetrics.maxBalanceDrawdown}\n`;
    if (data.backtestMetrics.totalTrades) ctx += `- Total de Negociações: ${data.backtestMetrics.totalTrades}\n`;
    if (data.backtestMetrics.winRate) ctx += `- Taxa de Acerto: ${data.backtestMetrics.winRate}\n`;
    ctx += `\n`;
  }

  if (data.parsedSet) {
    ctx += `⚙️ PRINCIPAIS PARÂMETROS IDENTIFICADOS NO ARQUIVO .SET:\n`;
    data.parsedSet.activeFeatures.forEach(f => ctx += `- ${f}\n`);
    ctx += `\n`;
  }

  if (data.docText) {
    ctx += `📖 DOCUMENTAÇÃO / REGRAS DE REFERÊNCIA:\n${data.docText.slice(0, 3000)}\n\n`;
  }

  if (data.mqlCode) {
    ctx += `💻 TRECHOS RELEVANTES DE CÓDIGO MQL5:\n${data.mqlCode.slice(0, 4000)}\n\n`;
  }

  return ctx;
}
