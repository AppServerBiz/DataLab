import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';

const app = express();
const PORT = 3001;

// Link Público do CSV do Google Sheets
app.use(cors());
app.use(express.json()); // Habilita receber JSON via POST

// Banco de dados temporário em memória para as contas remotas
let remoteAccounts = {};

// Link Público do CSV do Google Sheets
const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTkFCQyemfV-QgUweFSbEkNAgttstTsSSpb-yKJYo3S26DblMUbrBIY4Xxq4q-Dm-3fseT-wESYvxxG/pub?gid=2049906666&output=csv';

// Caminho do diretório COMMON_FILES do MetaTrader (Ajustar se necessário)
const dirPath = path.join(process.env.APPDATA, 'MetaQuotes', 'Terminal', 'Common', 'Files');

async function getSheetsData() {
    try {
        const response = await fetch(SHEETS_CSV_URL);
        const csvText = await response.text();
        const records = parse(csvText, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
        return records;
    } catch (e) {
        console.error("Erro ao buscar dados do Google Sheets:", e);
        return [];
    }
}

app.get('/api/data', async (req, res) => {
    try {
        const sheetsData = await getSheetsData();
        let allData = [];

        // 1. Processar Arquivos Locais (Mesmo diretório do servidor)
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath).filter(f => f.startsWith('supervision_data_') && f.endsWith('.json'));
            for (const file of files) {
                const data = fs.readFileSync(path.join(dirPath, file), 'utf8');
                try {
                    let jsonData = JSON.parse(data);
                    // Cruza com Sheets
                    const currentAccNumber = jsonData.account?.split(' ')[0] || '';
                    const sheetMatch = sheetsData.find(row => row.CONTA?.trim() === currentAccNumber.trim());
                    if (sheetMatch) {
                        jsonData.meta = sheetMatch.META || '--';
                        jsonData.dmeMax = parseFloat(sheetMatch.DME) || 100;
                    }
                    allData.push(jsonData);
                } catch (e) { /* ignore parse errors */ }
            }
        }

        // 2. Processar Contas Remotas (Enviadas via POST)
        const now = Date.now();
        Object.keys(remoteAccounts).forEach(accId => {
            const remoteAcc = remoteAccounts[accId];
            // Limpa contas que não enviam dados há mais de 1 minuto (offline)
            if (now - remoteAcc.lastUpdate > 60000) {
                delete remoteAccounts[accId];
                return;
            }

            let jsonData = remoteAcc.data;
            const currentAccNumber = jsonData.account?.split(' ')[0] || '';
            const sheetMatch = sheetsData.find(row => row.CONTA?.trim() === currentAccNumber.trim());
            if (sheetMatch) {
                jsonData.meta = sheetMatch.META || '--';
                jsonData.dmeMax = parseFloat(sheetMatch.DME) || 100;
            }
            allData.push(jsonData);
        });

        res.json(allData);
    } catch (error) {
        console.error("Error reading JSON:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint para os robôs (VPS/PCs remotos) enviarem dados
app.post('/api/update', (req, res) => {
    const data = req.body;
    if (!data || !data.account) {
        return res.status(400).json({ status: 'error', message: 'Invalid data' });
    }

    const accId = data.account.split(' ')[0]; // Usa o número da conta como ID
    remoteAccounts[accId] = {
        lastUpdate: Date.now(),
        data: data
    };

    console.log(`📥 Data received from Remote Account: ${accId}`);
    res.json({ status: 'success' });
});

const ESTRUTURA_GID = '260631111';
const ESTRUTURA_CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTkFCQyemfV-QgUweFSbEkNAgttstTsSSpb-yKJYo3S26DblMUbrBIY4Xxq4q-Dm-3fseT-wESYvxxG/pub?gid=${ESTRUTURA_GID}&output=csv`;

app.get('/api/robots-info', async (req, res) => {
    try {
        const response = await fetch(ESTRUTURA_CSV_URL);
        const csvText = await response.text();
        const records = parse(csvText, {
            columns: false,
            skip_empty_lines: true,
            trim: true
        });

        // Transforma a planilha (que está com robôs nas colunas) em um objeto de fácil acesso por nome de robô
        // Linha 1: INFO (Nomes dos robôs)
        if (records.length < 2) return res.json({});

        const robotNames = records[1].slice(1); // Pula a primeira coluna "INFO"
        const robotData = {};

        robotNames.forEach((name, index) => {
            if (!name) return;
            const colIndex = index + 1;
            robotData[name.trim()] = {
                direcao: records[2][colIndex],
                estilo: records[3][colIndex],
                indicador: records[4][colIndex],
                backtest_period: records[6][colIndex],
                profit_factor: records[7][colIndex],
                drawdown: records[8][colIndex],
                capital: records[9][colIndex],
                lucro_mes: records[10][colIndex],
                roi_mes: records[11][colIndex],
                roi_ano: records[12][colIndex]
            };
        });

        res.json(robotData);
    } catch (e) {
        console.error("Erro ao buscar Estrutura:", e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`📡 Nautilus Bridge Server running at http://localhost:${PORT}`);
    console.log(`📁 Reading data from directory: ${dirPath}`);
    console.log(`📊 Sheets Synchronization: ACTIVE`);
});
