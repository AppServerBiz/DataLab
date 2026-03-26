import { Backtest, Robot, EquityPoint } from './types';

export interface ParsedBacktestData {
  robot: Omit<Robot, 'created_at' | 'updated_at'>;
  backtest: Omit<Backtest, 'id' | 'robot_id' | 'created_at'>;
  equityCurve: EquityPoint[];
}

/**
 * Parser para relatórios HTML do MetaTrader 5
 * Extrai dados de backtests no formato padrão do MT5
 */
export function parseMT5BacktestHTML(htmlContent: string): ParsedBacktestData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Extrair nome do Expert Advisor
  const expertName = extractValue(doc, 'Expert Advisor (Robô):') ||
    extractValue(doc, 'Expert Advisor:') ||
    'Unknown';

  // Extrair símbolo/ativo
  const symbol = extractValue(doc, 'Ativo:') || 'UNKNOWN';

  // Extrair período/timeframe
  const periodMatch = extractValue(doc, 'Período:')?.match(/\(([^)]+)\)/);
  const period = extractValue(doc, 'Período:');
  const dateRange = periodMatch ? periodMatch[1] : '';
  const [dateFrom, dateTo] = dateRange.split(' - ').map(d => d.trim());

  // Extrair qualidade do histórico
  const quality = parseFloat(extractValue(doc, 'Qualidade do histórico:')?.replace('%', '') || '0');

  // Extrair resultados financeiros
  const totalNetProfit = parseCurrency(extractValue(doc, 'Lucro Líquido Total:'));
  const grossProfit = parseCurrency(extractValue(doc, 'Lucro Bruto:'));
  const grossLoss = parseCurrency(extractValue(doc, 'Perda Bruta:'));

  // Profit Factor
  const profitFactor = parseFloat(extractValue(doc, 'Fator de Lucro:')?.replace(',', '.') || '0');

  // Expected Payoff
  const expectedPayoff = parseFloat(extractValue(doc, 'Retorno Esperado (Payoff):')?.replace(',', '.') || '0');

  // Drawdown
  const maxDDAbs = parseCurrency(extractValue(doc, 'Rebaixamento Absoluto do Saldo:'));
  const maxDDBalanceMatch = extractValue(doc, 'Rebaixamento Máximo do Saldo :')?.match(/([\d.,]+)\s*\(([\d.,]+)%\)/);
  const maxDDBalance = maxDDBalanceMatch ? parseCurrency(maxDDBalanceMatch[1]) : maxDDAbs;
  const maxDDPct = maxDDBalanceMatch ? parseFloat(maxDDBalanceMatch[2].replace(',', '.')) : 0;

  const maxDDEquityMatch = extractValue(doc, 'Rebaixamento Máximo do Capital Líquido:')?.match(/([\d.,]+)\s*\(([\d.,]+)%\)/);
  const maxDDEquity = maxDDEquityMatch ? parseCurrency(maxDDEquityMatch[1]) : maxDDAbs;

  // Recovery Factor
  const recoveryFactor = parseFloat(extractValue(doc, 'Fator de Recuperação:')?.replace(',', '.') || '0');

  // Sharpe Ratio
  const sharpeRatio = parseFloat(extractValue(doc, 'Índice de Sharpe:')?.replace(',', '.') || '0');

  // Trades
  const totalTrades = parseInt(extractValue(doc, 'Total de Negociações:')?.replace(/\./g, '') || '0');
  const profitableTrades = parseInt(extractValue(doc, 'Negociações com Lucro')?.match(/\d+/)?.[0] || '0');
  const losingTrades = parseInt(extractValue(doc, 'Negociações com Perda')?.match(/\d+/)?.[0] || '0');

  // Win rate
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

  // Médias
  const avgWin = parseCurrency(extractValue(doc, 'Média lucro da negociação:'));
  const avgLoss = parseCurrency(extractValue(doc, 'Média perda na Negociação:'));
  const maxWin = parseCurrency(extractValue(doc, 'Maior lucro da negociação:'));
  const maxLoss = parseCurrency(extractValue(doc, 'Maior perda na Negociação:'));

  // Duração média
  const avgTradeDuration = extractValue(doc, 'Tempo médio de duração da posição:');

  // Consecutivas
  const bestConsecutiveWins = extractValue(doc, 'Máximo ganhos consecutivos');
  const bestConsecutiveLosses = extractValue(doc, 'Máximo perdas consecutivas');

  // Extrair parâmetros
  const parameters = extractParameters(doc);

  // Extrair broker
  const broker = extractValue(doc, 'Empresa:');

  // Determinar direção e estilo baseado nos parâmetros
  const { direction, style, mainIndicator } = inferRobotCharacteristics(parameters);

  return {
    robot: {
      id: '',
      name: expertName,
      description: `Robô operando ${symbol} em ${period}`,
      direction,
      style,
      main_indicator: mainIndicator,
      asset: symbol,
      timeframe: period?.split(' ')[0] || 'UNKNOWN',
    },
    backtest: {
      broker,
      symbol,
      period,
      date_from: dateFrom,
      date_to: dateTo,
      quality,
      total_net_profit: totalNetProfit,
      gross_profit: grossProfit,
      gross_loss: grossLoss,
      profit_factor: profitFactor,
      expected_payoff: expectedPayoff,
      max_drawdown_abs: maxDDAbs,
      max_drawdown_pct: maxDDPct,
      max_dd_balance: maxDDBalance,
      max_dd_equity: maxDDEquity,
      recovery_factor: recoveryFactor,
      sharpe_ratio: sharpeRatio,
      total_trades: totalTrades,
      profitable_trades: profitableTrades,
      losing_trades: losingTrades,
      win_rate: winRate,
      avg_win: avgWin,
      avg_loss: avgLoss,
      max_win: maxWin,
      max_loss: maxLoss,
      avg_trade_duration: avgTradeDuration,
      best_consecutive_wins: bestConsecutiveWins,
      best_consecutive_losses: bestConsecutiveLosses,
      parameters,
    },
    equityCurve: [], // Será extraído se houver dados de trades
  };
}

/**
 * Extrai um valor específico do HTML baseado em um label
 */
function extractValue(doc: Document, label: string): string {
  const cells = Array.from(doc.querySelectorAll('td'));

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.textContent?.includes(label)) {
      // O valor geralmente está na célula seguinte ou na mesma célula após o label
      const nextCell = cells[i + 1];
      if (nextCell) {
        return nextCell.textContent?.trim() || '';
      }
      // Tenta extrair da mesma célula
      const parts = cell.textContent?.split(':');
      if (parts && parts.length > 1) {
        return parts[1].trim();
      }
    }
  }

  return '';
}

/**
 * Parse de valores monetários (ex: "9 059.32" ou "9.059,32")
 */
function parseCurrency(value?: string): number {
  if (!value) return 0;

  // Remove espaços e trata formato europeu/brasileiro
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  return parseFloat(cleaned) || 0;
}

/**
 * Extrai parâmetros de entrada do robô
 */
function extractParameters(doc: Document): Record<string, any> {
  const params: Record<string, any> = {};
  const cells = Array.from(doc.querySelectorAll('td'));

  let inParamsSection = false;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const text = cell.textContent?.trim() || '';

    if (text.includes('Parâmetros de entrada:')) {
      inParamsSection = true;
      continue;
    }

    if (inParamsSection) {
      // Verifica se é um parâmetro (formato key=value)
      const match = text.match(/^(\w+)=([^=]+)$/);
      if (match) {
        const [, key, value] = match;
        // Tenta converter para número se possível
        const numValue = parseFloat(value.replace(',', '.'));
        params[key] = isNaN(numValue) ? value : numValue;
      } else if (text && !text.startsWith('---') && text.includes('=')) {
        // Formato alternativo
        const parts = text.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim();
          const numValue = parseFloat(value.replace(',', '.'));
          params[key] = isNaN(numValue) ? value : numValue;
        }
      } else if (text && !text.startsWith('---') && i > 0) {
        // Fim da seção de parâmetros
        if (!text.includes('=') && text.length > 50) {
          break;
        }
      }
    }
  }

  return params;
}

/**
 * Infere características do robô baseado nos parâmetros
 */
function inferRobotCharacteristics(params: Record<string, any>): {
  direction: 'TENDENCIA' | 'CONTRA TENDENCIA';
  style: string;
  mainIndicator: string;
} {
  const paramKeys = Object.keys(params).join(' ').toUpperCase();

  // Inferir direção
  let direction: 'TENDENCIA' | 'CONTRA TENDENCIA' = 'TENDENCIA';
  if (paramKeys.includes('RSI') || paramKeys.includes('ESTOCHASTIC') ||
    paramKeys.includes('CCI') || paramKeys.includes('WILLIAMS')) {
    direction = 'CONTRA TENDENCIA';
  }

  // Inferir estilo
  let style = 'CONTINUO';
  if (paramKeys.includes('TRAIL')) {
    style = 'TRAILING';
  } else if (paramKeys.includes('RETORNO') || paramKeys.includes('MEDIA')) {
    style = 'RETORNO MEDIA';
  } else if (paramKeys.includes('EXAUST') || paramKeys.includes('BOLLINGER')) {
    style = 'EXAUSTAO';
  }

  // Inferir indicador principal
  let mainIndicator = 'VARIOS';
  if (paramKeys.includes('BB') || paramKeys.includes('BOLLINGER')) {
    mainIndicator = 'BOLLINGER';
  } else if (paramKeys.includes('RSI')) {
    mainIndicator = 'RSI';
  } else if (paramKeys.includes('MEDIA') || paramKeys.includes('MOVING AVERAGE')) {
    mainIndicator = 'MEDIA MOVEL MG';
  } else if (paramKeys.includes('TDI')) {
    mainIndicator = 'TDI';
  } else if (paramKeys.includes('VOL')) {
    mainIndicator = 'VOL + DES. PADRAO';
  }

  return { direction, style, mainIndicator };
}

/**
 * Gera um ID único para robô baseado no nome
 */
export function generateRobotId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Gera um ID único para backtest
 */
export function generateBacktestId(robotId: string, dateTo: string): string {
  return `${robotId}-${dateTo.replace(/[^0-9]/g, '')}`;
}
