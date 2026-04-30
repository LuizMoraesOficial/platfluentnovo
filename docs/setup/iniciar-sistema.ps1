$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND = Join-Path $ROOT "backend"
$FRONTEND = Join-Path $ROOT "frontend"

$env_vars = @"
`$env:DATABASE_URL = 'postgresql://neondb_owner:npg_XUxrp9yQ5LRv@ep-broad-meadow-acws98ey.sa-east-1.aws.neon.tech/neondb?sslmode=require'
`$env:SESSION_SECRET = 'be-fluent-super-secret-session-key-minimum-32-chars-2024'
`$env:NODE_ENV = 'development'
`$env:PORT = '5000'
`$env:CORS_ALLOWED_ORIGINS = 'http://localhost:5173,http://localhost:5000,http://127.0.0.1:5173'
Set-Location '$BACKEND'
Write-Host '🚀 Backend iniciando...' -ForegroundColor Green
node src/index.js
"@

$frontend_cmd = @"
Set-Location '$FRONTEND'
Write-Host '🎨 Frontend iniciando...' -ForegroundColor Cyan
npm run dev
"@

# Inicia Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", $env_vars -WindowStyle Normal

Write-Host "Aguardando backend (8s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Inicia Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontend_cmd -WindowStyle Normal

Write-Host ""
Write-Host "✅ Sistema iniciado!" -ForegroundColor Green
Write-Host "   Acesse: http://localhost:5173" -ForegroundColor Cyan
Write-Host "   E-mail: befluentschooll@gmail.com" -ForegroundColor White
Write-Host "   Senha:  Netinhoss2!" -ForegroundColor White
Start-Sleep -Seconds 3
