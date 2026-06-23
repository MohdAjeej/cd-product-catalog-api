import Fastify      from 'fastify';
import cors         from '@fastify/cors';
import staticPlugin from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { config }              from './config.js';
import { initDB, getDB, closeDB } from './db.js';
import productsPlugin          from './routes/products.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({ logger: true });

  // ── Supabase client (HTTP — sync init, no await needed) ────────────────────
  initDB();
  app.addHook('onClose', async () => closeDB());

  // ── Plugins ────────────────────────────────────────────────────────────────
  await app.register(cors, { origin: config.CORS_ORIGINS });

  await app.register(staticPlugin, {
    root:          join(__dirname, '../static'),
    prefix:        '/',
    index:         false,
    wildcard:      false,
    decorateReply: true,
  });

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.get('/', (_req, reply) => reply.sendFile('index.html'));

  app.get('/health', async (_req, reply) => {
    try {
      const { error } = await getDB().from('products').select('id').limit(1);
      if (error) throw error;
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
