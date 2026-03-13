# Script de Deploy para Vercel
Write-Host "🚀 Iniciando Build Local para Teste..." -ForegroundColor Cyan

# Verifica se o diretório data existe para evitar erros de compilação se houver referência estática
if (!(Test-Path "data")) {
    New-Item -ItemType Directory -Force -Path "data"
}

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no Build! Deploy cancelado." -ForegroundColor Red
    exit
}

Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
Write-Host "📦 Enviando para Vercel..." -ForegroundColor Yellow

# Tenta rodar o vercel login se necessário
npx vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host "🚀 Deploy realizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Se o comando 'vercel' não foi encontrado, instale com: npm install -g vercel" -ForegroundColor Yellow
    Write-Host "❌ Falha no deploy via CLI." -ForegroundColor Red
}
