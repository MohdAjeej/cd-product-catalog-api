import Fastify       from 'fastify';
import cors          from '@fastify/cors';
import staticPlugin  from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { config }          from './config.js';
import { initPool, getPool, closePool } from './db.js';
import productsPlugin      from './routes/products.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({ logger: true });

  // ── Database pool ──────────────────────────────────────────────────────────
  await initPool();
  app.addHook('onClose', async () => closePool());

  // ── Plugins ────────────────────────────────────────────────────────────────
  await app.register(cors, { origin: config.CORS_ORIGINS });

  // Serve frontend files; wildcard:false stops it capturing API routes
  await app.register(staticPlugin, {
    root:           join(__dirname, '../static'),
    prefix:         '/',
    index:          false,
    wildcard:       false,
    decorateReply:  true,
  });

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.get('/', (_req, reply) => reply.sendFile('index.html'));

  app.get('/health', async (_req, reply) => {
    try {
      await getPool().query('SELECT 1');
      return { status: 'ok', db: 'ok' };
    } catch {
      reply.code(503);
      return { status: 'degraded', db: 'error' };
    }
  });

  await app.register(productsPlugin, { prefix: '/products' });

  // ── Global error handler ───────────────────────────────────────────────────
  app.setErrorHandler((err, _req, reply) => {
    const code = err.statusCode || err.status || 500;
    reply.code(code).send({ error: err.message || 'Internal Server Error' });
  });

  return app;
}
