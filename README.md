# Product Catalog API

High-performance product browsing backend built with **Node.js + Fastify + PostgreSQL**.

- Cursor-based pagination — no duplicates, no gaps, survives real-time inserts
- 200 000-row seed via PostgreSQL `unnest()` bulk insert
- Composite indexes for O(log n) page fetches at any scale
- Alpine.js + Tailwind frontend served from the same process

---

## Project structure

```
product-catalog-api/
├── src/
│   ├── server.js            — Entry point (listen)
│   ├── app.js               — Fastify setup, plugins, routes
│   ├── config.js            — Environment variable validation
│   ├── db.js                — pg connection pool
│   ├── cursor.js            — Cursor encode / decode (base64url JSON)
│   └── routes/
│       └── products.js      — GET /products, /categories, /:id
├── scripts/
│   ├── migrate.js           — Create table + indexes (idempotent)
│   └── seed.js              — Bulk-insert 200 k products via unnest()
├── static/
│   └── index.html           — Frontend (Alpine.js + Tailwind)
├── package.json
├── Dockerfile
├── render.yaml
└── .env.example
```

---

## Database schema

```sql
CREATE TABLE products (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255)    NOT NULL,
    category    VARCHAR(100)    NOT NULL,
    price       NUMERIC(10, 2)  NOT NULL CHECK (price > 0),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Pagination: newest first, id as stable tie-breaker
CREATE INDEX idx_products_updated_at_id
    ON products (updated_at DESC, id DESC);

-- Category filter
CREATE INDEX idx_products_category
    ON products (category);

-- Combined index for filtered pagination (index-only scan)
CREATE INDEX idx_products_category_updated_at_id
    ON products (category, updated_at DESC, id DESC);
```

---

## Local setup

### 1. Prerequisites

- Node.js 18+
- A PostgreSQL database (Neon, Supabase, or local)

### 2. Install

```bash
cd product-catalog-api
npm install
```

### 3. Configure

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL at minimum
```

### 4. Migrate

```bash
npm run migrate
```

### 5. Seed (200 000 products)

```bash
npm run seed

# Custom options:
node scripts/seed.js --count 500000 --batch 20000
```

### 6. Run

```bash
npm run dev       # hot-reload with --watch
npm start         # production
```

- Frontend: `http://localhost:8000`
- Swagger-style docs: Fastify doesn't bundle Swagger by default; add `@fastify/swagger` if needed.
- Health check: `http://localhost:8000/health`

---

## API

See **API_DOCS.md** for full reference.

```
GET /products?limit=20&cursor=<token>&category=Electronics
GET /products/categories
GET /products/:id
GET /health
```

---

## How cursor pagination works

```
Sort key: (updated_at DESC, id DESC)

Cursor = base64url( JSON { "u": "<ISO timestamp>", "i": "<uuid>" } )

Next-page query (uses the composite index):
  WHERE (updated_at < cursor_ts)
     OR (updated_at = cursor_ts AND id < cursor_id)
  ORDER BY updated_at DESC, id DESC
  LIMIT n
```

Inserting 50 new products while a user browses does **not** shift their cursor.
New rows have a newer `updated_at`, which sorts before the cursor point, so the
user simply sees them on the first page of their next session — not injected
into the middle of their current scroll.

---

## Deployment

### Database — Supabase

#### 1. Create a project
- Go to [supabase.com](https://supabase.com) → New Project
- Choose a region close to your users
- Set a strong database password and save it

#### 2. Get your connection string
Dashboard → **Project Settings** → **Database** → scroll to **Connection string**

| Use case | Mode | Port | Recommended? |
|---|---|---|---|
| Local dev & seed script | Direct | 5432 | ✅ Yes |
| Production API (Render) | Supavisor session | 5432 | ✅ Yes |
| Production API (high concurrency) | Supavisor transaction | 6543 | ✅ Advanced |

Copy the string and replace `[YOUR-PASSWORD]` with your actual password.

#### 3. Set it in `.env`
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

> **Note:** SSL is handled automatically — no extra config needed.

#### 4. Run migration & seed
```bash
npm run migrate   # creates table + indexes in your Supabase DB
npm run seed      # inserts 200 000 products (takes ~1–3 min over the network)
```

#### Free tier limits
- 500 MB database storage
- 2 direct connections by default (use the pooler for the API)
- For production, set `DB_MAX_CONNECTIONS=10` in your env

---

### Backend — Render

**Option A — render.yaml (recommended)**

1. Push this repo to GitHub
2. Render → New → Blueprint → connect repo (reads `render.yaml`)
3. Set `DATABASE_URL` in the Render environment dashboard
4. After first deploy, open the Render shell:
   ```bash
   npm run migrate
   npm run seed
   ```

**Option B — Docker**

```bash
docker build -t product-catalog-api .
docker run -p 8000:8000 -e DATABASE_URL="..." product-catalog-api
```

---

## Performance notes

| Technique | Effect |
|---|---|
| `pg` Pool | Reuses TCP connections across requests |
| `unnest()` bulk insert | One round-trip per 10k rows — ~40–80k rows/s |
| Fetch `limit + 1` | Detects next page without a separate `COUNT(*)` |
| Composite index `(category, updated_at DESC, id DESC)` | Category-filtered pages are index-only scans |
| Fastify JSON Schema | Response serialisation is 2–3× faster than JSON.stringify |
