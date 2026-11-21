// Postgres connection (Supabase). One small pool per server instance — right for Vercel functions
// when DATABASE_URL is Supabase's "Transaction pooler" address (port 6543).
const { Pool, types } = require('pg');
const { parseDbUrl } = require('./dburl');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

types.setTypeParser(1082, (v) => v); // DATE stays "YYYY-MM-DD" (no timezone shifts)

let pool;
function getPool() {
  if (pool) return pool;
  const p = parseDbUrl(process.env.DATABASE_URL);
  if (p.problems.length) throw Object.assign(new Error('DATABASE_URL: ' + p.problems.join('; ')), { code: 'DB_URL_INVALID', hint: p.problems.join('; '), masked: p.masked });
  if (p.fixes.length) console.warn('DATABASE_URL auto-corrected:', p.fixes.join(', '));
  pool = new Pool({
    ...p.config,
    max: +(process.env.DB_POOL_MAX || 3),
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000,
    ssl: !p.ssl || process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
  pool.on('error', (e) => console.error('[db pool]', e.message));
  return pool;
}
const q = (text, params) => getPool().query(text, params);
async function tx(fn) {
  const c = await getPool().connect();
  try { await c.query('begin'); const r = await fn(c); await c.query('commit'); return r; }
  catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  finally { c.release(); }
}
async function close() { if (pool) { await pool.end(); pool = null; } }
module.exports = { q, tx, close, getPool };
