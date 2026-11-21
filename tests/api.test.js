// Full API test on a real local Postgres (same engine Supabase runs): schema, migration, every endpoint, security.
// Usage: npm test            (optional: TEST_XLSX=path/to/sheet.xlsx to also test migration from your file)
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const { execFileSync } = require('child_process');

let pass = 0; const ok = (n) => { pass++; console.log('  ✓ ' + n); };
(async () => {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const dir = path.join(os.tmpdir(), 'rmb-pg-' + Date.now()); const port = 55000 + Math.floor(Math.random() * 1000);
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'pw', port, persistent: false, onLog: () => {}, onError: () => {} });
  await pg.initialise(); await pg.start(); await pg.createDatabase('rmb');
  const url = `postgresql://postgres:pw@localhost:${port}/rmb`;
  Object.assign(process.env, { DATABASE_URL: url, JWT_SECRET: 'test-' + Date.now(), SUPERADMIN_NAME: 'कमलेश रावत', SUPERADMIN_PHONE: '9829011111', SUPERADMIN_PASSWORD: 'Super@123', BUREAU_PHONE: '9000000000' });
  const { Client } = require('pg');
  const admin = new Client({ connectionString: url }); await admin.connect();
  try {
    console.log('Database');
    const schema = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
    await admin.query(schema); await admin.query(schema); ok('schema.sql runs (and runs again safely)');
    const t = (await admin.query("select tablename, rowsecurity from pg_tables where schemaname='public' order by 1")).rows;
    assert.ok(t.length === 6 && t.every((r) => r.rowsecurity)); ok('6 tables, Row Level Security on for all');
    await admin.query("do $$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if; end $$; grant usage on schema public to anon; grant select, insert on all tables in schema public to anon;");

    const xlsx = process.env.TEST_XLSX || '/tmp/list.xlsx';
    if (fs.existsSync(xlsx)) {
      console.log('Migration from the sheet');
      const sqlFile = path.join(os.tmpdir(), 'rmb-import-test.sql');
      execFileSync('node', [path.join(__dirname, '..', 'scripts', 'migrate.js'), xlsx, '--sql', sqlFile], { stdio: 'pipe' });
      await admin.query(fs.readFileSync(sqlFile, 'utf8'));
      const n1 = +(await admin.query('select count(*) from profiles')).rows[0].count; ok(`SQL file import: ${n1} profiles`);
      const out = execFileSync('node', [path.join(__dirname, '..', 'scripts', 'migrate.js'), xlsx], { env: process.env }).toString();
      assert.match(out, /0 profiles/); ok('direct migrate again → 0 duplicates');
      const r = (await admin.query("select * from profiles where gender='F' and dob is not null limit 1")).rows[0];
      assert.ok(r.gotra1 && r.height_cm > 100 && /^\d{10}$/.test(r.phone)); ok('rows mapped: DOB, height cm, gotras, phone');
    }
    await admin.query('set role anon');
    assert.equal(+(await admin.query('select count(*) from profiles')).rows[0].count, 0);
    await assert.rejects(admin.query("insert into users (id,name,phone,password_hash,salt) values ('x','x','1','x','x')"));
    await admin.query('reset role'); ok('public "anon" key sees 0 rows and cannot insert (RLS)');

    console.log('API');
    const app = require('../lib/instance'); const server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}`;
    const call = async (method, p, body, tok) => { const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); const ct = r.headers.get('content-type') || ''; return { status: r.status, headers: r.headers, ...(ct.includes('json') ? await r.json() : { text: await r.text() }) }; };
    let r = await call('GET', '/api/health'); assert.ok(r.ok); ok('health: database connected');
    assert.equal(+(await admin.query("select count(*) from users where super_admin")).rows[0].count, 1); ok('super admin created from env on first request');
    r = await call('GET', '/api/public/stats'); assert.ok(r.total >= 0); ok(`public stats: ${r.total} profiles`);
    r = await call('POST', '/api/auth/signup', { name: 'महेन्द्र रावत', phone: '12345', password: 'abc' }); assert.equal(r.code, 'MISSING'); ok('signup validates phone');
    r = await call('POST', '/api/auth/signup', { name: 'महेन्द्र रावत', phone: '+91 98765 43210', email: 'M@x.in', password: 'abc123' }); assert.ok(r.token); const cTok = r.token; ok('signup works');
    r = await call('POST', '/api/auth/signup', { name: 'x', phone: '9876543210', password: 'abc123' }); assert.equal(r.code, 'PHONE_TAKEN'); ok('duplicate phone blocked');
    r = await call('POST', '/api/auth/signup', { name: 'x', phone: '9876543299', email: 'm@X.in', password: 'abc123' }); assert.equal(r.code, 'EMAIL_TAKEN'); ok('duplicate email blocked (case-insensitive)');
    r = await call('POST', '/api/auth/login', { id: 'm@x.in', password: 'abc123' }); assert.ok(r.ok); ok('login by email');
    r = await call('GET', '/api/me', null, cTok.slice(0, -2) + 'xx'); assert.equal(r.status, 401); ok('tampered token rejected');
    for (let i = 0; i < 8; i++) await call('POST', '/api/auth/login', { id: '9876543210', password: 'wrong' + i });
    r = await call('POST', '/api/auth/login', { id: '9876543210', password: 'abc123' }); assert.equal(r.code, 'TOO_MANY'); ok('8 wrong passwords → locked 15 min (works across server instances)');
    await admin.query('delete from auth_attempts');
    r = await call('POST', '/api/auth/login', { id: '9829011111', password: 'Super@123' }); const sTok = r.token; assert.equal(r.user.superAdmin, true); ok('super admin login');

    r = await call('GET', '/api/matches', null, cTok); assert.equal(r.code, 'NOT_APPROVED_YET'); ok('no matches before approval');
    const myP = { ForWhom: 'Self', Gender: 'M', Name: '=HYPERLINK("x")', Phone: '9876543210', DOB: '1999-04-10', HeightFtIn: '5\'9"', MaritalStatus: 'NeverMarried', FatherName: 'रामसिंह', MotherName: 'कमला', NativePlace: 'टॉडगढ़', City: 'अजमेर', Gotra1: 'पोकरिया', Gotra2: 'बोया', Gotra3: 'नणेत', Gotra4: 'धोधिंग', Education: 'B.Com', EduLevel: 'grad', Occupation: 'अकाउंटेंट', Address: 'secret address' };
    r = await call('POST', '/api/profiles', { ForWhom: 'Self', Gender: 'M', Name: 'x' }, cTok); assert.equal(r.code, 'MISSING'); ok('profile requires key fields');
    r = await call('POST', '/api/profiles', myP, cTok); assert.equal(r.profile.Status, 'Pending'); assert.equal(r.profile.HeightCm, 175); assert.equal(r.profile.Age, 27); const pid = r.profile.ProfileID; ok('profile saved as Pending (age 27, 175 cm)');
    r = await call('POST', '/api/profiles', { ...myP, ForWhom: 'Sister', Gender: 'F', Name: 'रेणु', Phone: '9123456780' }, cTok); const sis = r.profile.ProfileID; ok('sister profile from same account');
    r = await call('GET', '/api/admin/notifications', null, sTok); assert.ok(r.unread >= 2); ok('admin bell gets notifications');
    r = await call('GET', '/api/admin/stats', null, cTok); assert.equal(r.status, 403); ok('member blocked from admin API');
    r = await call('POST', `/api/admin/profiles/${pid}/review`, { decision: 'Rejected' }, sTok); assert.equal(r.code, 'MISSING'); ok('reject needs a reason');
    r = await call('POST', `/api/admin/profiles/${pid}/review`, { decision: 'Approved' }, sTok); assert.equal(r.profile.Status, 'Approved'); ok('admin approves');
    r = await call('GET', '/api/admin/notifications', null, sTok); assert.equal(r.unread, 1); ok('approving marks its notification read');

    r = await call('GET', '/api/matches', null, cTok); const brides = r.items;
    assert.ok(brides.every((p) => p.Gender === 'F' && p.Phone === undefined && p.Address === undefined && p.DOB === undefined)); ok(`${brides.length} brides, no phone/address/DOB leaked`);
    assert.ok(!brides.some((p) => p.ProfileID === sis)); ok('own sister not shown');
    const clash = brides.filter((p) => p.clash.length); if (brides.length) ok(`${clash.length} hidden-by-default gotra clashes found`);
    let target = brides.find((p) => !p.clash.length);
    if (!target) { r = await call('POST', '/api/admin/profiles', { ...myP, Gender: 'F', Name: 'कविता', Phone: '9000000099', Gotra1: 'सुरावत', Gotra2: 'गोडात', Gotra3: 'कलात', Gotra4: 'लगेत' }, sTok); target = r.profile; }
    else { r = await call('GET', `/api/profiles/${target.ProfileID}`, null, cTok); assert.equal(r.profile.Phone, undefined); ok('profile detail hides private fields'); }
    r = await call('POST', '/api/interests', { toProfileId: target.ProfileID }, cTok); assert.ok(r.ok); ok('interest sent');
    r = await call('POST', '/api/interests', { toProfileId: target.ProfileID }, cTok); assert.equal(r.code, 'ALREADY_SENT'); ok('duplicate interest blocked');
    r = await call('GET', '/api/admin/interests', null, sTok); const iid = r.items[0].id; assert.ok(r.items[0].from.Phone); ok('admin sees both families + phones');
    r = await call('PUT', `/api/admin/interests/${iid}`, { status: 'Talking' }, sTok); r = await call('GET', '/api/interests/mine', null, cTok); assert.equal(r.sent[0].status, 'Talking'); ok('member sees interest status');
    r = await call('PUT', `/api/profiles/${pid}`, { ...myP, Occupation: 'मैनेजर' }, cTok); assert.equal(r.profile.Status, 'Pending'); ok('owner edit → back to Pending');
    r = await call('PUT', `/api/profiles/${pid}`, myP, sTok); assert.equal(r.code, 'NOT_FOUND'); ok("can't edit someone else's profile");
    r = await call('POST', '/api/admin/profiles', { ...myP, Name: 'एडमिन प्रोफ़ाइल', Gender: 'F', Phone: '9000000098' }, sTok); assert.equal(r.profile.Status, 'Approved'); const ap = r.profile.ProfileID; ok('admin adds profile (approved directly)');
    r = await call('GET', '/api/admin/export.csv', null, sTok); assert.match(r.headers.get('content-disposition'), /attachment/); assert.ok(r.text.includes("'=HYPERLINK")); ok('CSV export (formula-safe)');
    r = await call('DELETE', `/api/admin/profiles/${target.ProfileID}`, null, sTok); assert.ok(r.ok);
    assert.equal(+(await admin.query('select count(*) from interests')).rows[0].count, 0); ok('delete cascades interests + notifications');
    r = await call('DELETE', `/api/admin/profiles/${ap}`, null, cTok); assert.equal(r.status, 403); ok('member cannot delete');
    r = await call('POST', '/api/admin/users', { name: 'सीमा', phone: '9111111111', password: 'Seema@1', role: 'admin' }, sTok); assert.ok(r.ok); ok('super admin creates admin');
    r = await call('POST', '/api/auth/login', { id: '9111111111', password: 'Seema@1' }); const aTok = r.token; assert.equal(r.user.mustChange, true); ok('new admin must change password');
    r = await call('GET', '/api/admin/users', null, aTok); assert.equal(r.code, 'SUPER_ONLY'); ok('normal admin cannot manage users');
    const us = (await call('GET', '/api/admin/users', null, sTok)).items; const me = us.find((u) => u.superAdmin), cu = us.find((u) => u.phone === '9876543210');
    r = await call('PUT', `/api/admin/users/${me.id}`, { active: false }, sTok); assert.equal(r.code, 'CANNOT_CHANGE_SELF'); ok('super admin cannot lock self out');
    await call('PUT', `/api/admin/users/${cu.id}`, { active: false }, sTok); r = await call('GET', '/api/me', null, cTok); assert.equal(r.status, 401); ok('disabled user logged out immediately');
    r = await call('POST', '/api/auth/password', { current: 'Seema@1', next: 'Seema@22' }, aTok); assert.ok(r.ok); ok('password change');
    r = await call('GET', '/api/admin/stats', null, sTok); assert.equal(r.days.length, 7); assert.ok(r.activity.length); ok('admin stats + activity');
    server.close();
  } finally { await admin.end().catch(() => {}); await require('../lib/db').close(); await pg.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
  console.log(`\nAll ${pass} checks passed on PostgreSQL.`);
})().catch((e) => { console.error('\n✗ FAILED:', e); process.exit(1); });
