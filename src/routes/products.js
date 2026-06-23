import { getPool }            from '../db.js';
import { encodeCursor, decodeCursor } from '../cursor.js';

const MAX_LIMIT = 100;

// Shared JSON Schema fragment for a single product
const PRODUCT_SCHEMA = {
  type: 'object',
  properties: {
    id:         { type: 'string' },
    name:       { type: 'string' },
    category:   { type: 'string' },
    price:      { type: 'string' },           // pg returns NUMERIC as string
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
  },
};

/** @type {import('fastify').FastifyPluginAsync} */
export default async function productsPlugin(app) {

  // ── GET /products ──────────────────────────────────────────────────────────
  app.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          cursor:   { type: 'string' },
          limit:    { type: 'integer', minimum: 1, maximum: MAX_LIMIT, default: 20 },
          category: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            products:    { type: 'array', items: PRODUCT_SCHEMA },
            next_cursor: { type: 'string', nullable: true },
            count:       { type: 'integer' },
            has_more:    { type: 'boolean' },
          },
        },
      },
    },
  }, async (req) => {
    const { cursor, limit = 20, category } = req.query;
    const pool = getPool();

    let rows;

    if (cursor) {
      const { updatedAt, id } = decodeCursor(cursor);
      const { rows: r } = await pool.query(
        `SELECT id, name, category, price, created_at, updated_at
         FROM   products
         WHERE  ($1::TEXT IS NULL OR category = $1)
           AND  (
                  updated_at < $2
               OR (updated_at = $2 AND id < $3::UUID)
                )
         ORDER  BY updated_at DESC, id DESC
         LIMIT  $4`,
        [category ?? null, updatedAt, id, limit + 1],
      );
      rows = r;
    } else {
      const { rows: r } = await pool.query(
        `SELECT id, name, category, price, created_at, updated_at
         FROM   products
         WHERE  ($1::TEXT IS NULL OR category = $1)
         ORDER  BY updated_at DESC, id DESC
         LIMIT  $2`,
        [category ?? null, limit + 1],
      );
      rows = r;
    }

    const hasMore = rows.length > limit;
    const page    = rows.slice(0, limit);

    let nextCursor = null;
    if (hasMore && page.length > 0) {
      const last  = page[page.length - 1];
      nextCursor  = encodeCursor(last.updated_at, last.id);
    }

    return { products: page, next_cursor: nextCursor, count: page.length, has_more: hasMore };
  });

  // ── GET /products/categories ───────────────────────────────────────────────
  // Must be registered BEFORE /:id so Fastify treats it as a static segment
  app.get('/categories', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            categories: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  }, async () => {
    const { rows } = await getPool().query(
      'SELECT DISTINCT category FROM products ORDER BY category',
    );
    return { categories: rows.map((r) => r.category) };
  });

  // ── GET /products/:id ──────────────────────────────────────────────────────
  app.get('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      response: {
        200: PRODUCT_SCHEMA,
      },
    },
  }, async (req, reply) => {
    const { rows } = await getPool().query(
      'SELECT id, name, category, price, created_at, updated_at FROM products WHERE id = $1',
      [req.params.id],
    );
    if (rows.length === 0) {
      reply.code(404);
      return { error: 'Product not found' };
    }
    return rows[0];
  });
}
