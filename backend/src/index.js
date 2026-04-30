import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import compression from 'compression';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { db } from './database/index.js';
import { registerRoutes } from './routes.js';
import { configManager } from './config/index.js';
import { setupProductionMiddleware, setupProductionEndpoints, initializeBackgroundServices, performStartupHealthCheck, sendStartupNotification } from './runtime/production.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const appConfig = configManager.getApp();
const securityConfig = configManager.getSecurity();
const sessionConfigFrom = configManager.getSession();
const PORT = appConfig.port;
const isDevelopment = appConfig.environment === 'development';

// Trust proxy for production environments behind load balancers / proxies.
if (!isDevelopment) {
  app.set('trust proxy', 1);
}

// ===== SECURITY =====
if (securityConfig.helmetEnabled) {
  app.use(helmet({
    contentSecurityPolicy: securityConfig.contentSecurityPolicy
      ? { directives: securityConfig.contentSecurityPolicyDirectives }
      : false,
    crossOriginEmbedderPolicy: false,
    hsts: securityConfig.hstsEnabled
      ? {
          maxAge: securityConfig.hstsMaxAge,
          includeSubDomains: securityConfig.hstsIncludeSubDomains,
        }
      : false,
  }));
}

app.use(compression());

const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    if (!securityConfig.corsEnabled) {
      return callback(new Error('CORS is disabled by server configuration'));
    }

    const allowedOrigins = configManager.getCorsAllowedOrigins();
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS policy does not allow this origin.'));
  },
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const sessionConfig = {
  secret: sessionConfigFrom.secret,
  name: sessionConfigFrom.name,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: sessionConfigFrom.secure,
    httpOnly: sessionConfigFrom.httpOnly,
    sameSite: sessionConfigFrom.sameSite,
    maxAge: sessionConfigFrom.maxAge,
  },
};

const databaseUrl = configManager.getDatabase().url;
if (!isDevelopment && databaseUrl) {
  const PgSession = connectPgSimple(session);
  const poolOptions = {
    connectionString: databaseUrl,
  };

  if (process.env.DATABASE_SSL !== 'false') {
    poolOptions.ssl = { rejectUnauthorized: true };
  }

  const pool = new pg.Pool(poolOptions);
  sessionConfig.store = new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  });
  console.log('✓ PostgreSQL session store configured');
}

app.use(session(sessionConfig));

// ===== DATABASE =====
async function initializeDatabase() {
  try {
    if (db.init) {
      await db.init();
    }
    console.log('✓ Database initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// ===== FRONT CONFIG =====
async function setupFront() {
  if (isDevelopment) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
    console.log('✓ Vite dev server initialized');
  } else {
    const distPath = path.join(__dirname, '../../frontend/dist');

    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        }
      }
    }));

    app.get('*', (req, res, next) => {
      const skipRoutes = ['/health', '/ready', '/live', '/metrics'];
      const isMonitoringRoute = skipRoutes.some((route) => req.path === route || req.path.startsWith(`${route}/`));

      if (req.path.startsWith('/api') || req.path.startsWith('/api/monitoring') || isMonitoringRoute) {
        return next();
      }

      const indexFile = path.join(distPath, 'index.html');
      if (!fs.existsSync(indexFile)) {
        console.error('❌ Frontend build não encontrado em:', indexFile);
        return res.status(500).send('Frontend build não encontrado');
      }

      res.sendFile(indexFile);
    });

    console.log('✓ Static files served from:', distPath);
  }
}

// ===== START =====
async function start() {
  try {
    await initializeDatabase();

    setupProductionMiddleware(app);
    await registerRoutes(app);
    console.log('✓ API routes registered');

    await setupFront();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📍 Mode: ${isDevelopment ? 'development' : appConfig.environment}`);
    });

    setupProductionEndpoints(app, server);

    const healthData = await performStartupHealthCheck();
    if (healthData && healthData.status === 'unhealthy') {
      console.error('Startup health check failed:', healthData);
      process.exit(1);
    }

    initializeBackgroundServices();
    await sendStartupNotification();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
