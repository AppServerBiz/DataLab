import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export async function GET() {
    try {
        const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTkFCQyemfV-QgUweFSbEkNAgttstTsSSpb-yKJYo3S26DblMUbrBIY4Xxq4q-Dm-3fseT-wESYvxxG/pub?gid=2049906666&output=csv';

        const sheetsResponse = await fetch(SHEETS_CSV_URL);
        const csvText = await sheetsResponse.text();
        
        let sheetsData = [];
        if (!csvText.trim().startsWith('<!DOCTYPE html>')) {
            sheetsData = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });
        }

        const isVercel = process.env.VERCEL === '1';
        const localDataDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
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

                    const accountStr = jsonData.account || '';
                    const parts = accountStr.split(' - ');
                    const currentAccNumber = parts[parts.length - 1].trim();
                    const sheetMatch = sheetsData.find(row => row.CONTA?.trim() === currentAccNumber.trim());
                    if (sheetMatch) {
                        jsonData.meta = sheetMatch.META || '--';
                        jsonData.dmeMax = parseFloat(sheetMatch.DME) || 100;
                    }
                    allData.push(jsonData);
                } catch (e) { /* ignore parse errors */ }
            }
        }

        return NextResponse.json(allData);
    } catch (error) {
        console.error("Error reading data:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
