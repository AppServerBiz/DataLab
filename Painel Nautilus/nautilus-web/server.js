import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const PORT = 3001;

nextApp.prepare().then(() => {
    const app = express();

    app.use(cors());
    app.use(express.json()); // Habilita receber JSON via POST

    // Link Público do CSV do Google Sheets
    const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTkFCQyemfV-QgUweFSbEkNAgttstTsSSpb-yKJYo3S26DblMUbrBIY4Xxq4q-Dm-3fseT-wESYvxxG/pub?gid=2049906666&output=csv';

    // Caminho do diretório LOCAL para salvar os dados (dentro do projeto)
    const localDataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(localDataDir)) {
        fs.mkdirSync(localDataDir, { recursive: true });
    }

    async function getSheetsData() {
        try {
            const response = await fetch(SHEETS_CSV_URL);
            const csvText = await response.text();

            if (csvText.trim().startsWith('<!DOCTYPE html>')) {
                console.warn("⚠️ Google Sheets URL returned HTML instead of CSV (Possible sign-in required or invalid link).");
                return [];
            }

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

            // 1. Processar Arquivos Locais (Diretório 'data' do projeto)
            if (fs.existsSync(localDataDir)) {
                const files = fs.readdirSync(localDataDir).filter(f => f.startsWith('supervision_data_') && f.endsWith('.json'));
                for (const file of files) {
                    try {
                        const filePath = path.join(localDataDir, file);

                        // Opcional: Ignorar arquivos modificados há mais de 5 minutos (offline)
                        const stats = fs.statSync(filePath);
                        const now = Date.now();
                        if (now - stats.mtimeMs > 300000) { // 5 minutos
                            continue;
                        }

                        const data = fs.readFileSync(filePath, 'utf8');
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
        const filename = `supervision_data_${accId}.json`;
        const filePath = path.join(localDataDir, filename);

        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`📥 Data received and saved for Account: ${accId}`);
            res.json({ status: 'success' });
        } catch (e) {
            console.error(`Erro ao salvar dados da conta ${accId}:`, e);
            res.status(500).json({ status: 'error', message: 'Failed to save data' });
        }
    });

    const ESTRUTURA_GID = '260631111';
    const ESTRUTURA_CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTkFCQyemfV-QgUweFSbEkNAgttstTsSSpb-yKJYo3S26DblMUbrBIY4Xxq4q-Dm-3fseT-wESYvxxG/pub?gid=${ESTRUTURA_GID}&output=csv`;

    app.get('/api/robots-info', async (req, res) => {
        try {
            const response = await fetch(ESTRUTURA_CSV_URL);
            const csvText = await response.text();

            if (csvText.trim().startsWith('<!DOCTYPE html>')) {
                console.warn("⚠️ Estrutura URL returned HTML instead of CSV.");
                return res.json({});
            }

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

    // Next.js fallback
    app.use((req, res) => {
        return handle(req, res);
    });

    app.listen(PORT, () => {
        console.log(`📡 Nautilus Bridge Server & Next.js running at http://localhost:${PORT}`);
        console.log(`📁 Local Data Directory: ${localDataDir}`);
        console.log(`📊 Sheets Synchronization: ACTIVE`);
    });
});
