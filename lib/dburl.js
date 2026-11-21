// Reads DATABASE_URL tolerantly. Supabase passwords often contain @ # / ? % which break normal URL parsing,
// and copy-paste adds quotes, spaces or the [ ] around the password. We split the parts by hand instead.
function parseDbUrl(raw) {
  const problems = [], fixes = [];
  let s = String(raw || '').trim();
  if (!s) return { problems: ['DATABASE_URL is empty'] };
  if (/^DATABASE_URL\s*=/i.test(s)) { s = s.replace(/^DATABASE_URL\s*=\s*/i, ''); fixes.push('removed "DATABASE_URL=" pasted into the value'); }
  if (/\s/.test(s)) { s = s.replace(/\s+/g, ''); fixes.push('removed spaces / line breaks'); }
  if (/^["'].*["']$/.test(s)) { s = s.slice(1, -1); fixes.push('removed quotes around the value'); }
  const m = s.match(/^(postgres(?:ql)?):\/\/([^:@\/]+):(.*)@([^@\/:?#]+)(?::(\d+))?\/([^?\/#]*)(\?.*)?$/);
  if (!m) {
    if (!/^postgres(ql)?:\/\//.test(s)) problems.push('must start with postgresql://');
    else if (!/@/.test(s)) problems.push('no "@" — the user:password@host part is missing');
    else problems.push('could not read the URL — copy the URI again from Supabase → Connect → Transaction pooler');
    return { problems, fixes, masked: mask(s) };
  }
  let [, , user, password, host, port, database, query] = m;
  if (/^\[.*\]$/.test(password)) { password = password.slice(1, -1); fixes.push('removed [ ] around the password'); }
  if (/YOUR-PASSWORD/i.test(password)) problems.push('password is still the placeholder [YOUR-PASSWORD]');
  if (/[<>]|pooler-host/i.test(host)) problems.push('host is still the placeholder <pooler-host> — copy the full URI from Supabase → Connect → Transaction pooler');
  if (/%[0-9a-f]{2}/i.test(password)) { try { password = decodeURIComponent(password); } catch { /* keep as typed */ } }
  if (/^db\..*\.supabase\.co$/.test(host)) problems.push('this is the DIRECT connection (db.….supabase.co); on Vercel use the Transaction pooler URI (…pooler.supabase.com:6543)');
  const ssl = !/^(localhost|127\.0\.0\.1)$/.test(host) && !/sslmode=disable/.test(query || '');
  return { config: { user: decodeURIComponent(user), password, host, port: +(port || 5432), database: decodeURIComponent(database || 'postgres') }, ssl, problems, fixes,
    masked: `${m[1]}://${user}:${password ? '****' : '(none)'}@${host}:${port || 5432}/${database}` };
}
function mask(s) { return String(s).replace(/(:\/\/[^:\/]+:)(.*)@/, '$1****@').slice(0, 200); }
module.exports = { parseDbUrl };
