import Papa from 'papaparse';

export interface TradeMetric {
  date: string;
  balance: number;
  equity: number;
  drawdown: number;
}

export interface ParseResult {
  robotName: string;
  metrics: TradeMetric[];
  stats: {
    maxDrawdown: number;
    totalProfit: number;
    initialBalance: number;
  };
}

export async function parseMT5Csv(csvText: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<string[]>) => {
        const data = results.data;
        if (data.length < 2) {
          reject("Arquivo vazio ou inválido");
          return;
        }

        // Find header row and column indices
        const headerRow = data.find(row => row.join('').includes('<DATE>'));
        if (!headerRow) {
          reject("Formato MT5 não reconhecido (cabeçalho não encontrado)");
          return;
        }

        const balanceIdx = headerRow.findIndex(h => h.toUpperCase().includes('BALANCE'));
        const equityIdx = headerRow.findIndex(h => h.toUpperCase().includes('EQUITY'));

        if (balanceIdx === -1 || equityIdx === -1) {
          reject("Colunas Balance ou Equity não encontradas");
          return;
        }

        let initialBalance = 0;
        let maxDD = 0;
        const metrics: TradeMetric[] = [];

        data.forEach((row) => {
            // Skip rows that don't have enough data or look like headers
            if (row.length <= Math.max(balanceIdx, equityIdx) || row[0].includes('<DATE>')) return;
            
            // Validate date format (YYYY.MM.DD)
            if (!row[0].includes('.')) return;

            const date = row[0];
            const balance = parseFloat(row[balanceIdx].replace(',', ''));
            const equity = parseFloat(row[equityIdx].replace(',', ''));

            if (isNaN(balance) || isNaN(equity)) return;

            if (metrics.length === 0) initialBalance = balance;

            const dd = balance - equity;
            if (dd > maxDD) maxDD = dd;

            metrics.push({
              date,
              balance,
              equity,
              drawdown: dd
            });
        });

        if (metrics.length === 0) {
          reject("Nenhum dado de trade válido encontrado após o processamento");
          return;
        }

        const totalProfit = metrics[metrics.length - 1].balance - initialBalance;

        resolve({
          robotName: "Relatório MT5",
          metrics,
          stats: {
            maxDrawdown: maxDD,
            totalProfit,
            initialBalance
          }
        });
      },
      error: (error: any) => reject(error)
    });
  });
}
