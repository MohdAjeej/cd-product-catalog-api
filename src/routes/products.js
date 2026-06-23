import { getDB }                      from '../db.js';
import { encodeCursor, decodeCursor } from '../cursor.js';

const MAX_LIMIT = 100;

const PRODUCT_SCHEMA = {
  type: 'object',
  properties: {
    id:         { type: 'string' },
    name:       { type: 'string' },
    category:   { type: 'string' },
    price:      { type: 'string' },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
  },
};

function dbError(err) {
  const e = new Error(err.message || 'Database error');
  e.statusCode = 500;
  return e;
}

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
    const supabase = getDB();

    // Build query incrementally
    let query = supabase
      .from('products')
      .select('id, name, category, price, created_at, updated_at');

    // Optional category filter
    if (category) query = query.eq('category', category);

    // Cursor condition:
    //   (updated_at < cursor_ts) OR (updated_at = cursor_ts AND id < cursor_id)
    // PostgREST supports nested and() inside or() for exactly this pattern.
    if (cursor) {
      const { updatedAt, id } = decodeCursor(cursor);
      const ts = updatedAt.toISOString();
      query = query.or(`updated_at.lt.${ts},and(updated_at.eq.${ts},id.lt.${id})`);
    }

    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .order('id',         { ascending: false })
      .limit(limit + 1);           // fetch one extra to detect has_more

    if (error) throw dbError(error);

    const hasMore = data.length > limit;
    const page    = data.slice(0, limit);

    let nextCursor = null;
    if (hasMore && page.length > 0) {
      const last = page[page.length - 1];
      nextCursor = encodeCursor(new Date(last.updated_at), last.id);
    }

    return { products: page, next_cursor: nextCursor, count: page.length, has_more: hasMore };
  });

  // ── GET /products/categories ───────────────────────────────────────────────
  // Uses a PostgreSQL function (created by migrate.js) via RPC so we get
  // DISTINCT in one query without fetching all 200k rows.
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
    const { data, error } = await getDB().rpc('get_distinct_categories');
    if (error) throw dbError(error);
    return { categories: data.map((r) => r.category) };
  });

  // ── GET /products/:id ──────────────────────────────────────────────────────
  app.get('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      response: { 200: PRODUCT_SCHEMA },
    },
  }, async (req, reply) => {
    const { data, error } = await getDB()
      .from('products')
      .select('id, name, category, price, created_at, updated_at')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw dbError(error);
    if (!data) { reply.code(404); return { error: 'Product not found' }; }
    return data;
  });
}
