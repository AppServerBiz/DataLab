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


    // Caminho do diretório LOCAL para salvar os dados (dentro do projeto)
    const localDataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(localDataDir)) {
        fs.mkdirSync(localDataDir, { recursive: true });
    }

    // Caminho para os arquivos de configuração
    const usersFilePath = path.join(localDataDir, 'users.json');

    // Inicializa usuários padrão se não existirem
    if (!fs.existsSync(usersFilePath)) {
        const defaultUsers = [
            { username: 'Alpha1', accounts: ['ALPHA_1', 'ALPHA_2', 'ALPHA_3', 'ALPHA_4'] }
        ];
        fs.writeFileSync(usersFilePath, JSON.stringify(defaultUsers, null, 2));
    }


    app.get('/api/users', (req, res) => {
        try {
            if (fs.existsSync(usersFilePath)) {
                const data = fs.readFileSync(usersFilePath, 'utf8');
                res.json(JSON.parse(data));
            } else {
                res.json([]);
            }
        } catch (e) {
            res.status(500).json({ error: 'Failed to read users' });
        }
    });

    app.post('/api/users', (req, res) => {
        try {
            fs.writeFileSync(usersFilePath, JSON.stringify(req.body, null, 2), 'utf8');
            res.json({ status: 'success' });
        } catch (e) {
            res.status(500).json({ error: 'Failed to save users' });
        }
    });

    app.get('/api/data', (req, res) => {
        let allData = [];

        if (fs.existsSync(localDataDir)) {
            const files = fs.readdirSync(localDataDir).filter(f => f.startsWith('supervision_data_') && f.endsWith('.json'));
            for (const file of files) {
                try {
                    const filePath = path.join(localDataDir, file);
                    const stats = fs.statSync(filePath);
                    const now = Date.now();
                    
                    // Solo arquivos atualizados nos últimos 5 minutos
                    if (now - stats.mtimeMs > 300000) continue;

                    const data = fs.readFileSync(filePath, 'utf8');
                    let jsonData = JSON.parse(data);
                    allData.push(jsonData);
                } catch (e) { /* ignore parse errors */ }
            }
        }

        res.json(allData);
    });

    // Endpoint para os robôs (VPS/PCs remotos) enviarem dados
    app.post('/api/update', (req, res) => {
        const data = req.body;
        if (!data || !data.account) {
            return res.status(400).json({ status: 'error', message: 'Invalid data' });
        }

        const match = data.account.match(/\d{5,}/);
        const accId = match ? match[0] : 'unknown';
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


    // Next.js fallback
    app.use((req, res) => {
        return handle(req, res);
    });

    app.listen(PORT, () => {
        console.log(`📡 Nautilus Bridge Server & Next.js running at http://localhost:${PORT}`);
        console.log(`📁 Local Data Directory: ${localDataDir}`);
    });
});
