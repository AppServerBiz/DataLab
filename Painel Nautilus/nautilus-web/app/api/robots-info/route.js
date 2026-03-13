import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';

export async function GET() {
    try {
        const ESTRUTURA_GID = '260631111';
        const ESTRUTURA_CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTkFCQyemfV-QgUweFSbEkNAgttstTsSSpb-yKJYo3S26DblMUbrBIY4Xxq4q-Dm-3fseT-wESYvxxG/pub?gid=${ESTRUTURA_GID}&output=csv`;

        const response = await fetch(ESTRUTURA_CSV_URL);
        const csvText = await response.text();

        if (csvText.trim().startsWith('<!DOCTYPE html>')) {
            console.warn("⚠️ Estrutura URL returned HTML instead of CSV.");
            return NextResponse.json({});
        }

        const records = parse(csvText, {
            columns: false,
            skip_empty_lines: true,
            trim: true
        });

        if (records.length < 2) return NextResponse.json({});

        const robotNames = records[1].slice(1);
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

        return NextResponse.json(robotData);
    } catch (e) {
        console.error("Erro ao buscar Estrutura:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
