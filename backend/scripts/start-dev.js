import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const backendEnv = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '5000',
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5000,http://127.0.0.1:5173',
};

console.log('\n🚀 Iniciando Be Fluent School em modo desenvolvimento...\n');

// ── Backend ──
const backend = spawn('node', ['--env-file=.env', 'src/index.js'], {
  cwd: path.join(ROOT, 'backend'),
  env: backendEnv,
  stdio: 'inherit',
  shell: false,
});

backend.on('error', (err) => console.error('❌ Erro no backend:', err.message));
backend.on('exit', (code) => {
  if (code !== 0) console.error(`❌ Backend encerrou com código ${code}`);
});

console.log(`✅ Backend iniciado (PID ${backend.pid}) — porta 5000`);
console.log('   Aguardando 8 segundos para iniciar o frontend...\n');

// ── Frontend (após 8s) ──
setTimeout(() => {
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(ROOT, 'frontend'),
    env: process.env,
    stdio: 'inherit',
    shell: true,
  });

  frontend.on('error', (err) => console.error('❌ Erro no frontend:', err.message));
  frontend.on('exit', (code) => {
    if (code !== 0) console.error(`❌ Frontend encerrou com código ${code}`);
  });

  console.log(`\n✅ Frontend iniciado (PID ${frontend.pid}) — porta 5173`);
  console.log('\n════════════════════════════════════');
  console.log('  Sistema rodando!');
  console.log('  Acesse: http://localhost:5173');
  console.log('  Use uma conta válida ou configure ADMIN_EMAIL / ADMIN_PASSWORD ou DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD para bootstrap.');
  console.log('════════════════════════════════════\n');
  console.log('  Pressione Ctrl+C para encerrar tudo.\n');
}, 8000);

// Encerra tudo ao pressionar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\nEncerrando sistema...');
  backend.kill();
  process.exit(0);
});
