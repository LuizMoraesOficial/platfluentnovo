import { neon } from "@neondatabase/serverless";
import fs from "fs";

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

const sql = neon(process.env.DATABASE_URL);

const rows = await sql`SELECT id, full_name, email, role FROM profiles WHERE role = 'admin'`;
console.log("Admin profiles found:", rows);

// Fix all admin profiles that have "Isabella" in the name
const toFix = rows.filter(r => r.full_name?.includes('Isabella') || r.full_name?.includes('isabella'));
console.log("Profiles to fix:", toFix);

for (const row of toFix) {
  await sql`UPDATE profiles SET full_name = 'Administrador', updated_at = NOW() WHERE id = ${row.id}`;
  console.log(`✅ Fixed: ${row.id} — "${row.full_name}" → "Administrador"`);
}

// Also update by email just to be safe
await sql`
  UPDATE profiles
  SET full_name = 'Administrador', updated_at = NOW()
  WHERE email = 'befluentschooll@gmail.com'
`;
console.log("✅ Updated by email befluentschooll@gmail.com");

// Show final state
const final = await sql`SELECT id, full_name, email, role FROM profiles WHERE role = 'admin'`;
console.log("Final admin profiles:", final);
