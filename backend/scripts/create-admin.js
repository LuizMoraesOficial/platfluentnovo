/**
 * Script para criar o usuário admin do sistema.
 *
 * Uso:
 *   1. Certifique-se de que o arquivo .env existe na raiz do backend com DATABASE_URL
 *   2. Execute: node backend/scripts/create-admin.js
 */

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import fs from "fs";

// Load .env from backend root
try {
  const envPath = new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch (_) {}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não definida. Crie o arquivo .env com a variável DATABASE_URL.");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_NAME) {
  console.error("❌ ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_NAME must be defined in environment variables.");
  process.exit(1);
}

async function createAdmin() {
  try {
    console.log("🔍 Verificando se o usuário já existe...");

    const existing = await sql`
      SELECT u.id, p.email FROM users u
      JOIN profiles p ON p.user_id = u.id
      WHERE u.username = ${ADMIN_EMAIL}
      LIMIT 1
    `;

    if (existing.length > 0) {
      console.log("⚠️  Usuário já existe. Atualizando senha...");
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await sql`
        UPDATE users SET password = ${hashedPassword}
        WHERE username = ${ADMIN_EMAIL}
      `;
      console.log("✅ Senha atualizada com sucesso!");
      console.log(`   E-mail: ${ADMIN_EMAIL}`);
      console.log(`   Senha:  ${ADMIN_PASSWORD}`);
      return;
    }

    console.log("✨ Criando novo usuário admin...");
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const userId = randomUUID();
    const profileId = randomUUID();

    await sql`
      INSERT INTO users (id, username, password, created_at)
      VALUES (${userId}, ${ADMIN_EMAIL}, ${hashedPassword}, NOW())
    `;

    await sql`
      INSERT INTO profiles (id, user_id, full_name, email, role, is_active, created_at, updated_at)
      VALUES (${profileId}, ${userId}, ${ADMIN_NAME}, ${ADMIN_EMAIL}, 'admin', true, NOW(), NOW())
    `;

    console.log("✅ Admin criado com sucesso!");
    console.log(`   E-mail: ${ADMIN_EMAIL}`);
    console.log(`   Senha:  ${ADMIN_PASSWORD}`);
    console.log(`   Role:   admin`);

  } catch (error) {
    console.error("❌ Erro ao criar admin:", error.message);
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error("   As tabelas não existem ainda. Execute primeiro: npm run db:push");
    }
    process.exit(1);
  }
}

createAdmin();
