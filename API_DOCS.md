# Product Catalog API — Documentation

Base URL: `https://<your-app>.onrender.com`  (or `http://localhost:8000` locally)

---

## Endpoints

### `GET /products`

Return paginated products sorted by `updated_at DESC, id DESC`.

#### Query Parameters

| Param      | Type    | Default | Description                                              |
|------------|---------|---------|----------------------------------------------------------|
| `limit`    | integer | `20`    | Items per page (1–100)                                   |
| `cursor`   | string  | —       | Opaque cursor from a previous response's `next_cursor`   |
| `category` | string  | —       | Filter to a single category (case-sensitive)             |

#### Response `200 OK`

```json
{
  "products": [
    {
      "id":         "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name":       "Ultra TechPro Widget 42",
      "category":   "Electronics",
      "price":      "299.99",
      "created_at": "2024-03-01T10:00:00Z",
      "updated_at": "2024-06-15T14:22:00Z"
    }
  ],
  "next_cursor": "eyJ1IjoiMjAyNC0wNi0xNVQxNDoyMjowMFoiLCJpIjoiM2ZhODVmNjQtNTcxNy00NTYyLWIzZmMtMmM5NjNmNjZhZmE2In0=",
  "count": 20,
  "has_more": true
}
```

When `has_more` is `false`, `next_cursor` is `null` — you have reached the last page.

#### Pagination flow

```
GET /products?limit=20
  → { products: [...], next_cursor: "ABC", has_more: true }

GET /products?limit=20&cursor=ABC
  → { products: [...], next_cursor: "DEF", has_more: true }

GET /products?limit=20&cursor=DEF
  → { products: [...], next_cursor: null, has_more: false }
```

The cursor is **opaque** — never parse or modify it.  It is safe to bookmark
and replay: if 50 new products are inserted between requests the cursor still
points to the exact same position in the sorted result set, so no rows are
duplicated or skipped.

---

### `GET /products/categories`

Return every distinct category.

#### Response `200 OK`

```json
{ "categories": ["Automotive","Beauty","Books","Clothing","Electronics","Food","Health","Home","Sports","Toys"] }
```

---

### `GET /products/{id}`

Fetch a single product by UUID.

#### Response `200 OK`

```json
{
  "id":         "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name":       "Ultra TechPro Widget 42",
  "category":   "Electronics",
  "price":      "299.99",
  "created_at": "2024-03-01T10:00:00Z",
  "updated_at": "2024-06-15T14:22:00Z"
}
```

#### Response `404 Not Found`

```json
{ "detail": "Product not found" }
```

---

### `GET /health`

Liveness + DB connectivity check used by Render's health checker.

#### Response `200 OK`

```json
{ "status": "ok", "db": "ok" }
```

---

## Error Responses

| Status | Cause                        |
|--------|------------------------------|
| `400`  | Invalid cursor value         |
| `422`  | Validation error (bad param) |
| `404`  | Product not found            |
| `500`  | Unhandled server error       |

---

## Interactive docs

FastAPI auto-generates OpenAPI docs at:
- **Swagger UI** — `/docs`
- **ReDoc**       — `/redoc`
