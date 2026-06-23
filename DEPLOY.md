# Step-by-step Deployment Guide

## Prerequisites (all free, no credit card)
- [Supabase](https://supabase.com) account
- [GitHub](https://github.com) account
- [Render](https://render.com) account

---

## Step 1 — Supabase database

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Give it any name, pick a region, set a strong password → **Create new project** (wait ~1 min)
3. Once ready: **Project Settings** (gear icon) → **Database** tab
4. Scroll to **Connection string** → choose **URI** tab
5. Copy the string — looks like:
   ```
   postgresql://postgres:yourpassword@db.abcxyz.supabase.co:5432/postgres
   ```

---

## Step 2 — Local .env setup

Edit the `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:yourpassword@db.abcxyz.supabase.co:5432/postgres
DB_MAX_CONNECTIONS=10
DB_MIN_CONNECTIONS=2
CORS_ORIGINS=*
PORT=8000
```

Replace the URL with your real one from Step 1.

---

## Step 3 — Create table + seed 200,000 products

Open a terminal in the project folder and run:

```bash
npm run migrate
```
Expected output:
```
Migration complete.
```

Then seed:
```bash
npm run seed
```
Expected output (takes 1–3 min over network):
```
Seeding 200,000 products in 20 batch(es) of 10,000…
  [1/20]  10,000 rows  |  8,432 rows/s  |  1.2s
  [2/20]  20,000 rows  |  9,102 rows/s  |  2.2s
  ...
  [20/20] 200,000 rows | 8,900 rows/s  | 22.5s

Done. 200,000 products inserted in 22.5s.
```

---

## Step 4 — Test locally

```bash
npm start
```

Open these URLs in your browser:
- `http://localhost:8000` → Frontend UI
- `http://localhost:8000/health` → `{"status":"ok","db":"ok"}`
- `http://localhost:8000/products?limit=5` → First 5 products
- `http://localhost:8000/products?category=Electronics&limit=5` → Filtered
- `http://localhost:8000/products/categories` → All categories

---

## Step 5 — Push to GitHub

1. Create a new repo at [github.com/new](https://github.com/new)
   - Name it `product-catalog-api`
   - Leave it **Public** (Render's free tier requires public repos)
   - Do NOT add README/gitignore (we already have them)

2. In your terminal:
```bash
git remote add origin https://github.com/YOUR-USERNAME/product-catalog-api.git
git branch -M main
git push -u origin main
```

---

## Step 6 — Deploy on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub account → select `product-catalog-api`
3. Render auto-detects the settings from `render.yaml`. Confirm:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `node src/server.js`
4. Click **Advanced** → **Add Environment Variable**:
   - Key: `DATABASE_URL`
   - Value: paste your Supabase connection string
5. Click **Create Web Service**

Render will build and deploy (takes ~2 min). Once done you'll get a live URL like:
```
https://product-catalog-api-xxxx.onrender.com
```

---

## Step 7 — Verify live deployment

```
https://your-app.onrender.com/health
https://your-app.onrender.com/products?limit=5
https://your-app.onrender.com/products?category=Electronics
https://your-app.onrender.com/
```

---

## Troubleshooting

| Error | Fix |
|---|---|
| `Invalid URL` | DATABASE_URL in .env has placeholder values — replace with real Supabase URL |
| `ECONNREFUSED` | Database not reachable — check Supabase project is active |
| `relation "products" does not exist` | Run `npm run migrate` first |
| `0 products returned` | Run `npm run seed` |
| Render deploy fails | Check Render logs — most likely DATABASE_URL not set in Render env vars |
