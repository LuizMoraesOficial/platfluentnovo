# Be Fluent School

Este projeto é organizado como um monorepo npm com duas pastas principais:

- `backend/` — servidor Node.js, banco de dados, scripts de migração e lógica do negócio.
- `frontend/` — aplicação React + Vite para a interface do usuário.

## Estrutura atual

- `package.json` na raiz
  - controla o workspace npm
  - permite rodar comandos como `npm run dev:backend`, `npm run dev:frontend` e `npm run build:frontend`
- `package-lock.json` na raiz
  - bloqueia as dependências do workspace completo
- `node_modules/` na raiz
  - necessário para o workspace npm funcionar corretamente

## O que foi reorganizado

- `shared/` foi movido para `backend/shared/`
  - contém o schema compartilhado usado pelo backend e pelas ferramentas de banco de dados
- `scripts/start-dev.js` foi movido para `backend/scripts/start-dev.js`
  - script de desenvolvimento que inicializa backend e frontend juntos
- `.venv/` foi movido para `backend/.venv/`
  - ambiente Python local de suporte, não parte do código fonte principal

## Por que `node_modules` permanece na raiz

Em um projeto npm workspace, `node_modules` deve ficar no nível da raiz do workspace para que o npm resolva dependências de todos os pacotes (`backend` e `frontend`).

Mover `node_modules` para dentro de `frontend/` ou `backend/` quebraria o gerenciamento de dependências.

## Arquivos e pastas de ferramenta

- `.claude/` e `.agents/`
  - são metadados de ferramenta/agent local
  - não pertencem ao app e foram removidos do repositório
- `skills-lock.json`
  - arquivo de lock de skill toolchain; também foi removido

## Como rodar

1. Instale dependências na raiz:
   ```bash
   npm install
   ```
2. Inicie o backend em desenvolvimento:
   ```bash
   npm run dev:backend
   ```
3. Inicie o frontend em desenvolvimento:
   ```bash
   npm run dev:frontend
   ```

> Alternativamente, use `npm run start:dev` para iniciar o backend e o frontend juntos via `backend/scripts/start-dev.js`.

## Deploy em servidor barato

Este projeto é um backend Node.js que serve o frontend React buildado em produção.

### Requisitos mínimos

- Node.js 18+ (recomendado Node.js 20)
- npm
- PostgreSQL ou Neon/Database compatível
- Servidor VPS barato ou instância de nuvem (Hostinger compartilhado comum pode não suportar Node + PostgreSQL)

### Passos de deploy

1. Suba o servidor VPS ou instância de nuvem.
2. Instale Git, Node.js e npm.
3. Clone o repositório e instale dependências na raiz:
   ```bash
   git clone <seu-repo> .
   npm install
   ```
   Use `backend/.env.example` como modelo para criar `backend/.env`.
4. Crie o build do frontend:
   ```bash
   npm run build:frontend
   ```
5. Configure as variáveis de ambiente necessárias no servidor, por exemplo:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `SESSION_SECURE=true`
   - `STRIPE_SECRET_KEY`
   - `SENDGRID_API_KEY`
   - `DEFAULT_ADMIN_EMAIL`
   - `DEFAULT_ADMIN_PASSWORD`
   - `CORS_ALLOWED_ORIGINS`
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` (para `create-admin.js`)
6. Inicie o backend em modo produção:
   ```bash
   npm run start
   ```

### Notas importantes

- O backend serve o build do frontend a partir de `frontend/dist` quando `NODE_ENV=production`.
- Se quiser, use um processo de gerenciamento como `pm2`, `systemd` ou `forever` para manter o servidor no ar.
- Para um deploy mais barato e estável, prefira um VPS básico (DigitalOcean, Vultr, Cloudflare R2 + Workers não é apropriado aqui) ou um serviço de servidor Node como Render / Railway com PostgreSQL.
- `node_modules/` deve permanecer na raiz durante o deploy; não mova para `frontend/` ou `backend/`.

### Serviço de banco de dados

- O backend usa PostgreSQL e `connect-pg-simple` para sessões.
- Em produção, mantenha o banco de dados em um serviço gerenciado ou em uma instância separada para melhor confiabilidade.
