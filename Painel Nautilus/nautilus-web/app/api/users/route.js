import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const isVercel = process.env.VERCEL === '1';
const localDataDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
const USERS_FILE = path.join(localDataDir, 'users.json');

function ensureFile() {
    if (!fs.existsSync(localDataDir)) {
        fs.mkdirSync(localDataDir, { recursive: true });
    }
    
    // Se no Vercel e o arquivo no /tmp não existe, tenta copiar o arquivo estático do projeto
    if (isVercel && !fs.existsSync(USERS_FILE)) {
        const staticUsersPath = path.join(process.cwd(), 'data', 'users.json');
        if (fs.existsSync(staticUsersPath)) {
            fs.copyFileSync(staticUsersPath, USERS_FILE);
        } else {
            fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
        }
    } else if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
    }
}

export async function GET() {
    try {
        ensureFile();
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return NextResponse.json(JSON.parse(data));
    } catch (e) {
        return NextResponse.json([]);
    }
}

export async function POST(req) {
    try {
        ensureFile();
        const users = await req.json();
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        return NextResponse.json({ status: 'success' });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
