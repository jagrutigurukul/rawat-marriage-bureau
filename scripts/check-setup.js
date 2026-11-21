#!/usr/bin/env node
// Pre-deploy check: run  `npm run check`  after filling .env. It tests every setting Vercel will need.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'xiscjfavgynnwqjxovdt';
const U = require('../lib/util');
const A = require('../lib/auth');

let bad = 0, warn = 0;
const ok = (m) => console.log('  ✓ ' + m);
const no = (m, fix) => { bad++; console.log('  ✗ ' + m + (fix ? '\n      → ' + fix : '')); };
const wa = (m) => { warn++; console.log('  ! ' + m); };

function checkUrl(raw) {
  console.log('\n1. DATABASE_URL');
  const { parseDbUrl } = require('../lib/dburl');
  const p = parseDbUrl(raw);
  if (p.masked) console.log('  · read as: ' + p.masked);
  p.fixes && p.fixes.forEach((f) => wa('auto-corrected: ' + f + ' (better to fix it in the value too)'));
  if (p.problems.length) { p.problems.forEach((x) => no(x)); return null; }
  const c = p.config;
  if (/^(localhost|127\.0\.0\.1)$/.test(c.host)) { ok('local database (for testing)'); return c; }
  if (!/pooler\.supabase\.com$/.test(c.host)) wa('host is not a Supabase pooler: ' + c.host); else ok('Supabase pooler host: ' + c.host);
  if (c.port === 6543) ok('port 6543 (transaction pooler — right for Vercel)');
  else if (c.port === 5432) wa('port 5432 is session mode; for Vercel use the Transaction pooler URI (port 6543)');
  if (c.user === 'postgres.' + PROJECT_REF) ok('project: ' + PROJECT_REF);
  else if (c.user.startsWith('postgres.')) wa(`project in URL is "${c.user.slice(9)}", expected "${PROJECT_REF}" — copied from another project?`);
  else no(`user "${c.user}" — pooler user must be "postgres.${PROJECT_REF}"`, 'copy the URI again from Connect → Transaction pooler');
  if (!c.password) no('password missing in the URL');
  else if (/[@#\/?&%:]/.test(c.password)) ok('password has special characters — handled automatically');
  return c;
}

async function checkDb(raw) {
  console.log('\n2. Database connection & data');
  const { q, close } = require('../lib/db');
  try {
    const t0 = Date.now(); await q('select 1'); ok(`connected (${Date.now() - t0} ms)`);
    const tabs = (await q("select tablename, rowsecurity from pg_tables where schemaname='public'")).rows;
    const need = ['users', 'profiles', 'interests', 'notifications', 'audit_log', 'auth_attempts'];
    const miss = need.filter((n) => !tabs.find((r) => r.tablename === n));
    if (miss.length) { no('missing tables: ' + miss.join(', '), 'run supabase/schema.sql in Supabase SQL Editor'); return; }
    ok('all 6 tables exist');
    const noRls = need.filter((n) => !tabs.find((r) => r.tablename === n).rowsecurity);
    noRls.length ? no('Row Level Security OFF on: ' + noRls.join(', '), 'run supabase/schema.sql again') : ok('Row Level Security on for every table');
    const cols = (await q("select column_name from information_schema.columns where table_schema='public' and table_name='profiles'")).rows.map((r) => r.column_name);
    const needCols = ['gotra1', 'gotra4', 'edu_level', 'legacy_ref', 'age_at_import', 'reject_reason'];
    const mc = needCols.filter((c) => !cols.includes(c)); mc.length ? no('profiles table is missing columns: ' + mc.join(', '), 'drop the old table or run the latest supabase/schema.sql') : ok('profiles columns match this version');
    const c = (await q("select count(*)::int n, count(*) filter (where status='Approved')::int a, count(*) filter (where gender='F')::int f, count(*) filter (where gender='M')::int m, count(*) filter (where source='legacy')::int l from profiles")).rows[0];
    if (!c.n) no('profiles table is empty', 'run import_part1/2/3.sql (or npm run migrate -- sheet.xlsx)');
    else ok(`${c.n} profiles (${c.f} brides, ${c.m} grooms, ${c.a} approved, ${c.l} from the old sheet)`);
    if (c.l && c.l !== 545) wa(`expected 545 from the sheet, found ${c.l} — did all 3 import parts run?`);
    const g = (await q("select count(*)::int n from profiles where coalesce(gotra1,'')=''")).rows[0].n; if (g) wa(`${g} profiles have no own gotra (from the sheet) — they still show, gotra check skips them`);
    const s = (await q("select count(*)::int n from users where role='admin' and super_admin and active")).rows[0].n;
    s ? ok(`${s} super admin already in database`) : console.log('  · no super admin yet — it is created on the first visit from SUPERADMIN_PHONE / SUPERADMIN_PASSWORD');
  } catch (e) {
    const m = e.message;
    if (/password authentication failed/i.test(m)) no('wrong database password', 'Supabase → Project Settings → Database → Reset password, then update DATABASE_URL');
    else if (/Tenant or user not found/i.test(m)) no('pooler says "Tenant or user not found"', `user must be postgres.${PROJECT_REF} and the host must be the one shown in YOUR project's Connect screen`);
    else if (/ENOTFOUND|EAI_AGAIN/i.test(m)) no('host not found: ' + m, 'check internet / copy host again');
    else if (/timeout|ETIMEDOUT|ECONNREFUSED/i.test(m)) no('could not reach the database: ' + m, 'project paused? (Supabase dashboard → Restore) or a firewall blocks port 6543');
    else no('database error: ' + m);
  } finally { await close().catch(() => {}); }
}

function checkOthers() {
  console.log('\n3. Login & admin settings');
  const j = process.env.JWT_SECRET || '';
  if (!j) no('JWT_SECRET is empty', 'paste a long random string (64 characters)');
  else if (j.length < 32 || /paste|change/i.test(j)) no('JWT_SECRET is too short or still the example text');
  else ok(`JWT_SECRET set (${j.length} characters)`);
  const ph = process.env.SUPERADMIN_PHONE, pw = process.env.SUPERADMIN_PASSWORD;
  if (!ph && !pw) wa('SUPERADMIN_PHONE / SUPERADMIN_PASSWORD empty — fine only if a super admin already exists');
  else {
    U.validPhone(ph) ? ok('SUPERADMIN_PHONE ' + U.phone10(ph)) : no('SUPERADMIN_PHONE must be a 10-digit Indian mobile');
    const p = A.passwordProblem(pw); p ? no('SUPERADMIN_PASSWORD needs 6+ characters with at least one digit') : ok('SUPERADMIN_PASSWORD ok');
    if (/^ChangeMe/i.test(pw || '')) wa('SUPERADMIN_PASSWORD is still the example — change it');
  }
  process.env.BUREAU_PHONE ? (U.validPhone(process.env.BUREAU_PHONE) ? ok('BUREAU_PHONE ' + process.env.BUREAU_PHONE) : wa('BUREAU_PHONE is not a 10-digit number')) : console.log('  · BUREAU_PHONE empty (optional — hides the "Call the bureau" button)');
}

(async () => {
  console.log(`Rawat Marriage Bureau — setup check (Supabase project ${PROJECT_REF})`);
  const u = checkUrl(process.env.DATABASE_URL);
  if (u && !bad) await checkDb(process.env.DATABASE_URL); else if (u) console.log('\n2. Database connection — skipped (fix DATABASE_URL first)');
  checkOthers();
  console.log(`\n${bad ? `✗ ${bad} problem(s) to fix` : '✓ All good'}${warn ? `, ${warn} warning(s)` : ''}.`);
  if (!bad) console.log('Add the same values in Vercel → Settings → Environment Variables, then deploy.\nAfter deploy open  https://<your-site>.vercel.app/api/health');
  process.exit(bad ? 1 : 0);
})();
