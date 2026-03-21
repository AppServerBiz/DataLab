import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req) {
    try {
        const data = await req.json();
        if (!data || !data.account) {
            return NextResponse.json({ status: 'error', message: 'Invalid data' }, { status: 400 });
        }

        const accountStr = data.account || 'unknown';
        
        // Tenta encontrar o número da conta (5 ou mais dígitos)
        const match = accountStr.match(/\d{5,}/);
        const accId = match ? match[0] : 'unknown';
        
        const filename = `supervision_data_${accId}.json`;
        
        const isVercel = process.env.VERCEL === '1';
        const localDataDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
        
        if (!fs.existsSync(localDataDir)) {
            fs.mkdirSync(localDataDir, { recursive: true });
        }

        const filePath = path.join(localDataDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

        console.log(`📥 Data received and saved locally for Account: ${accId}`);
        return NextResponse.json({ status: 'success' });
    } catch (e) {
        console.error(`Erro ao salvar dados:`, e);
        return NextResponse.json({ status: 'error', message: 'Failed to save data' }, { status: 500 });
    }
}
