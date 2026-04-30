import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {}

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const { neon } = await import('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

console.log('Running migration: activity_progress, exams...');

// Enums
await sql`DO $$ BEGIN CREATE TYPE activity_status AS ENUM ('not_started','in_progress','completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
await sql`DO $$ BEGIN CREATE TYPE exam_type AS ENUM ('theoretical','performatic'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
await sql`DO $$ BEGIN CREATE TYPE exam_status AS ENUM ('pending','in_progress','completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
console.log('✓ enums created');

// New columns on profiles
await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_activity integer DEFAULT 1`;
await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS english_cefr text`;
console.log('✓ profiles: current_activity, english_cefr added');

// activity_progress
await sql`
  CREATE TABLE IF NOT EXISTS activity_progress (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id varchar NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    module_id text NOT NULL,
    activity_number integer NOT NULL,
    status activity_status NOT NULL DEFAULT 'not_started',
    classes_used integer NOT NULL DEFAULT 0,
    started_at timestamptz,
    completed_at timestamptz,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(student_id, module_id, activity_number)
  )
`;
console.log('✓ activity_progress table created');

// exams
await sql`
  CREATE TABLE IF NOT EXISTS exams (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id varchar NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    teacher_id varchar REFERENCES profiles(id) ON DELETE SET NULL,
    module_id text NOT NULL,
    triggered_by_activity integer NOT NULL,
    exam_type exam_type NOT NULL,
    status exam_status NOT NULL DEFAULT 'pending',
    score integer,
    max_score integer DEFAULT 100,
    feedback text,
    form_link text,
    triggered_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`;
console.log('✓ exams table created');

console.log('Migration completed successfully!');
