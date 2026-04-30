import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from 'ws';
import bcrypt from 'bcrypt';
import * as schema from '../shared/schema.js';

neonConfig.webSocketConstructor = ws;

const DEFAULT_USERS = [
  {
    username: process.env.DEFAULT_TEACHER_EMAIL,
    password: process.env.DEFAULT_TEACHER_PASSWORD,
    role: 'teacher',
    fullName: process.env.DEFAULT_TEACHER_NAME,
    email: process.env.DEFAULT_TEACHER_EMAIL
  },
  {
    username: process.env.DEFAULT_ADMIN_EMAIL,
    password: process.env.DEFAULT_ADMIN_PASSWORD,
    role: 'admin',
    fullName: process.env.DEFAULT_ADMIN_NAME,
    email: process.env.DEFAULT_ADMIN_EMAIL
  }
].filter((user) => user.username && user.password && user.fullName && user.email);

async function runMigration() {
  console.log('🚀 Starting database migration...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('💡 Please set DATABASE_URL in your environment variables');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });

  try {
    console.log('📡 Connecting to database...');
    
    const testResult = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Database connection successful!\n');

    console.log('📋 Creating tables from schema...\n');

    const createEnumsSQL = `
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('admin', 'student', 'teacher');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE student_level AS ENUM ('beginner', 'elementary', 'pre_intermediate', 'intermediate', 'upper_intermediate', 'advanced', 'proficiency');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE class_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE reschedule_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'overdue');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE feedback_type AS ENUM ('teacher', 'student', 'class', 'general');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE feedback_status AS ENUM ('sent', 'responded', 'resolved');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE campaign_type AS ENUM ('email', 'sms', 'push', 'social', 'display');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE email_sequence_type AS ENUM ('welcome', 'onboarding', 'nurturing', 'trial', 'reactivation', 'upgrade', 'promotional');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE event_type AS ENUM ('page_view', 'button_click', 'form_submit', 'file_download', 'video_play', 'email_open', 'email_click', 'trial_signup', 'payment', 'class_booking', 'profile_update', 'login', 'logout');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE lead_score_tier AS ENUM ('cold', 'warm', 'hot', 'qualified');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE ab_test_status AS ENUM ('draft', 'running', 'completed', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE segmentation_criteria AS ENUM ('student_level', 'payment_status', 'activity_level', 'signup_date', 'trial_user', 'location', 'age_group', 'engagement_score');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE suppression_reason AS ENUM ('unsubscribe', 'bounce', 'spam', 'invalid', 'manual');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE payment_provider AS ENUM ('asaas');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `;

    await db.execute(sql.raw(createEnumsSQL));
    console.log('✅ Enum types created/verified\n');

    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        password_reset_token TEXT,
        password_reset_expires TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        role user_role NOT NULL DEFAULT 'student',
        student_level student_level,
        is_active BOOLEAN NOT NULL DEFAULT true,
        cpf TEXT,
        birth_date TIMESTAMP WITH TIME ZONE,
        address TEXT,
        monthly_fee INTEGER,
        payment_due_date INTEGER,
        current_payment_status payment_status DEFAULT 'pending',
        last_payment_date TIMESTAMP WITH TIME ZONE,
        asaas_customer_id TEXT,
        asaas_subscription_id TEXT,
        teacher_type TEXT,
        hourly_rate INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      -- Add missing columns to existing profiles table
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS teacher_type TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hourly_rate INTEGER DEFAULT 0;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;

      CREATE TABLE IF NOT EXISTS teacher_availability (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        UNIQUE(teacher_id, day_of_week, start_time, end_time)
      );

      CREATE TABLE IF NOT EXISTS classes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        teacher_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        meet_link TEXT,
        status class_status NOT NULL DEFAULT 'scheduled',
        topic TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS class_reschedules (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id VARCHAR NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        original_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
        new_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
        reason TEXT NOT NULL,
        status reschedule_status NOT NULL DEFAULT 'pending',
        requested_by VARCHAR NOT NULL REFERENCES profiles(id),
        approved_by VARCHAR REFERENCES profiles(id),
        admin_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        due_date TIMESTAMP WITH TIME ZONE NOT NULL,
        paid_date TIMESTAMP WITH TIME ZONE,
        status payment_status NOT NULL DEFAULT 'pending',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS feedback (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        from_user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        to_user_id VARCHAR REFERENCES profiles(id) ON DELETE CASCADE,
        class_id VARCHAR REFERENCES classes(id) ON DELETE SET NULL,
        type feedback_type NOT NULL,
        rating INTEGER,
        content TEXT NOT NULL,
        response TEXT,
        status feedback_status NOT NULL DEFAULT 'sent',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        target_role user_role,
        is_urgent BOOLEAN NOT NULL DEFAULT false,
        created_by VARCHAR NOT NULL REFERENCES profiles(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE
      );
      
      -- Add is_urgent column if it doesn't exist (for existing databases)
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'is_urgent') THEN
          ALTER TABLE announcements ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT false;
        END IF;
        -- Remove is_active if it exists (legacy column)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'is_active') THEN
          ALTER TABLE announcements DROP COLUMN is_active;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS forum_posts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        author_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        is_pinned BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS forum_comments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id VARCHAR NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
        author_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS study_materials (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        file_url TEXT NOT NULL,
        file_type TEXT NOT NULL,
        category TEXT,
        target_level student_level,
        uploaded_by VARCHAR NOT NULL REFERENCES profiles(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS learning_paths (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        target_level student_level,
        progress INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        active_provider payment_provider NOT NULL DEFAULT 'asaas',
        asaas_api_token TEXT,
        asaas_sandbox BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_by VARCHAR REFERENCES profiles(id)
      );

      CREATE TABLE IF NOT EXISTS site_settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT,
        setting_type TEXT NOT NULL DEFAULT 'text',
        category TEXT NOT NULL DEFAULT 'general',
        label TEXT NOT NULL,
        description TEXT,
        updated_by VARCHAR REFERENCES profiles(id),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
    `;

    await db.execute(sql.raw(createTablesSQL));
    console.log('✅ Core tables created/verified\n');

    console.log('👤 Creating/updating default users...\n');

    for (const user of DEFAULT_USERS) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      
      const existingUser = await db.execute(
        sql`SELECT id FROM users WHERE username = ${user.username}`
      );

      if (existingUser.rows.length > 0) {
        await db.execute(
          sql`UPDATE users SET password = ${hashedPassword} WHERE username = ${user.username}`
        );
        console.log(`   🔄 Updated password for ${user.role}: ${user.email}`);
        continue;
      }

      const userResult = await db.execute(
        sql`INSERT INTO users (username, password) 
            VALUES (${user.username}, ${hashedPassword}) 
            RETURNING id`
      );

      const userId = userResult.rows[0].id;

      if (user.role === 'student') {
        await db.execute(
          sql`INSERT INTO profiles (user_id, full_name, email, role, student_level, is_active, monthly_fee, payment_due_date) 
              VALUES (${userId}, ${user.fullName}, ${user.email}, ${user.role}, ${user.studentLevel}, true, 35000, 10)`
        );
      } else {
        await db.execute(
          sql`INSERT INTO profiles (user_id, full_name, email, role, is_active) 
              VALUES (${userId}, ${user.fullName}, ${user.email}, ${user.role}, true)`
        );
      }

      console.log(`   ✅ Created ${user.role}: ${user.email}`);
    }

    console.log('\n📊 Tables in database:');
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    tableCheck.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    if (DEFAULT_USERS.length > 0) {
      console.log('\n👥 Default users created or updated:');
      DEFAULT_USERS.forEach((user) => {
        console.log(`   - ${user.role}: ${user.email}`);
      });
    } else {
      console.log('\n⚠ No default admin/teacher accounts were configured.');
      console.log('   To seed default accounts, set the following environment variables:');
      console.log('     DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_NAME');
      console.log('     DEFAULT_TEACHER_EMAIL, DEFAULT_TEACHER_PASSWORD, DEFAULT_TEACHER_NAME');
    }

    console.log('\n✨ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
