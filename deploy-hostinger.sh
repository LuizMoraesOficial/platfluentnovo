#!/bin/bash
# =============================================
# Be Fluent School — Script de Deploy Hostinger
# Execute este script NO SERVIDOR da Hostinger via SSH
# =============================================

set -e

APP_DIR="/home/$(whoami)/domains/seudominio.com.br/public_html"
# OU se usar subdominio: /home/$(whoami)/domains/app.seudominio.com.br/public_html

echo "=== Be Fluent School — Deploy ==="
echo "Diretório: $APP_DIR"

# 1. Entrar no diretório da aplicacao
cd "$APP_DIR"

# 2. Instalar dependencias (produção apenas)
echo ">>> Instalando dependencias backend..."
cd backend && npm install --production && cd ..

# 3. Rodar migrations (somente na primeira vez ou quando houver mudancas)
echo ">>> Rodando migrations..."
cd backend && node scripts/migrate.js && cd ..

# 4. Rodar migration de activity-progress (nova feature)
echo ">>> Rodando migration de progresso..."
cd backend && node scripts/migrate-activity-progress.js && cd ..

echo ""
echo "=== Deploy concluido! ==="
echo "Reinicie o processo Node.js no hPanel."
