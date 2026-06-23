/**
 * Cursor encoding for keyset pagination on (updated_at DESC, id DESC).
 *
 * The cursor is a base64url-encoded JSON object containing the sort key
 * values of the last item returned.  The next-page WHERE clause is:
 *
 *   WHERE updated_at < cursor_updated_at
 *      OR (updated_at = cursor_updated_at AND id < cursor_id)
 *
 * This gives a stable, gap-free, duplicate-free page sequence even
 * when rows are inserted between requests.
 */

/**
 * @param {Date}   updatedAt
 * @param {string} id  UUID string
 * @returns {string}   opaque cursor token
 */
export function encodeCursor(updatedAt, id) {
  const payload = JSON.stringify({ u: updatedAt.toISOString(), i: id });
  return Buffer.from(payload).toString('base64url');
}

/**
 * @param {string} cursor
 * @returns {{ updatedAt: Date, id: string }}
 * @throws {Error} statusCode 400 if malformed
 */
export function decodeCursor(cursor) {
  try {
    const raw  = Buffer.from(cursor, 'base64url').toString('utf8');
    const data = JSON.parse(raw);
    if (!data.u || !data.i) throw new Error('missing fields');
    return { updatedAt: new Date(data.u), id: data.i };
  } catch {
    const err = new Error('Invalid cursor value');
    err.statusCode = 400;
    throw err;
  }
}
