// Passwords: scrypt with per-user salt. Sessions: signed, expiring tokens (HMAC-SHA256).
const crypto = require('crypto');

function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pw), salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return { hash, salt };
}
function checkPassword(pw, hash, salt) {
  if (!hash || !salt) return false;
  const h = Buffer.from(hashPassword(pw, salt).hash, 'hex'); const x = Buffer.from(hash, 'hex');
  return h.length === x.length && crypto.timingSafeEqual(h, x);
}
const b64 = (s) => Buffer.from(s).toString('base64url');
function signToken(payload, secret, days) {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + days * 864e5 }));
  return body + '.' + crypto.createHmac('sha256', secret).update(body).digest('base64url');
}
function verifyToken(tok, secret) {
  const [body, sig] = String(tok || '').split('.'); if (!body || !sig) return null;
  const good = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > Date.now() ? p : null; } catch { return null; }
}
function passwordProblem(pw) {
  pw = String(pw || '');
  if (pw.length < 6) return 'PW_SHORT';
  if (!/\d/.test(pw)) return 'PW_DIGIT';
  if (pw.length > 100) return 'PW_LONG';
  return null;
}
module.exports = { hashPassword, checkPassword, signToken, verifyToken, passwordProblem };
