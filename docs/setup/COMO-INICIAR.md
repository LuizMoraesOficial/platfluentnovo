# Como iniciar o sistema em desenvolvimento

## Opção 1 — Terminal do VS Code (RECOMENDADO)

Abra o terminal integrado do VS Code (Ctrl + `) e rode:

```
npm run start:dev
```

## Opção 2 — PowerShell manual

Abra o PowerShell e cole este bloco inteiro:

```powershell
$ROOT = "C:\Users\usuario\Downloads\Area-de-Membros-Be-Fluent-School-2 (1)\Area-de-Membros-Be-Fluent-School-2"
$env:DATABASE_URL = '<sua_database_url>'
$env:SESSION_SECRET = '<sua_chave_secreta_com_pelo_menos_32_chars>'
$env:NODE_ENV = 'development'; $env:PORT = '5000'
$env:CORS_ALLOWED_ORIGINS = 'http://localhost:5173,http://localhost:5000'
Start-Process node -ArgumentList "src/index.js" -WorkingDirectory "$ROOT\backend"
Start-Sleep 8
Start-Process cmd -ArgumentList "/k npm run dev" -WorkingDirectory "$ROOT\frontend"
```

## Acesso

- URL: http://localhost:5173
- E-mail: `<seu_email>`
- Senha: `<sua_senha>`
