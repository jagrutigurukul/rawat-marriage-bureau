// HTTP API (Express). On Vercel it runs inside index.js as one function; locally via dev.js.
// Every response is JSON: { ok: true, ... } or { ok: false, code, fields? } — codes are translated in the browser.
const express = require('express');
const helmet = require('helmet');
const S = require('./store');
const U = require('./util');
const A = require('./auth');

const FOR_WHOM = ['Self', 'Brother', 'Sister', 'Son', 'Daughter', 'Relative'];
const MARITAL = ['NeverMarried', 'Divorced', 'Widowed', 'Remarriage'];
const EDU = ['school', 'grad', 'pg', 'pro'];
const INTEREST_STATUS = ['New', 'Talking', 'FamiliesMet', 'Settled', 'Closed'];
const PROFILE_INPUT = ['ForWhom', 'Gender', 'Name', 'Phone', 'Phone2', 'DOB', 'BirthTime', 'BirthPlace', 'HeightFtIn', 'Weight', 'Complexion', 'MaritalStatus', 'Manglik', 'FatherName', 'FatherJob', 'MotherName', 'MotherJob', 'Brothers', 'Sisters', 'NativePlace', 'City', 'Address', 'Gotra1', 'Gotra2', 'Gotra3', 'Gotra4', 'Education', 'Occupation', 'JobPlace', 'Income', 'About'];
const PROFILE_REQUIRED = ['ForWhom', 'Gender', 'Name', 'Phone', 'DOB', 'HeightFtIn', 'MaritalStatus', 'FatherName', 'MotherName', 'NativePlace', 'City', 'Gotra1', 'Gotra2', 'Gotra3', 'Gotra4', 'Education', 'Occupation'];
// Never sent to other members.
const PRIVATE = ['Phone', 'Phone2', 'Address', 'DOB', 'BirthTime', 'OwnerUserID', 'AdminNote', 'ReviewedBy', 'LegacyRef', 'RejectReason', 'Source', 'AgeAtImport'];

class HttpError extends Error { constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra; } }
const fail = (status, code, extra) => { throw new HttpError(status, code, extra); };
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Turns database errors into a code + plain-language fix. Never includes the password.
function dbProblem(e) {
  const m = String(e && e.message || ''), ref = process.env.SUPABASE_PROJECT_REF || 'xiscjfavgynnwqjxovdt';
  const r = (code, hint) => ({ code, hint, ...(e && e.masked ? { databaseUrl: e.masked } : {}) });
  if (e && e.code === 'DB_URL_INVALID') return r('DB_URL_INVALID', e.hint);
  if (e && e.code === 'NO_DB') return r('CONFIG_MISSING', 'DATABASE_URL is not set in Vercel → Settings → Environment Variables');
  if (e && e.code === 'ERR_INVALID_URL') return r('DB_URL_INVALID', 'DATABASE_URL cannot be read — copy the Transaction pooler URI again');
  if (/password authentication failed/i.test(m)) return r('DB_PASSWORD_WRONG', 'Wrong database password. Supabase → Project Settings → Database → Reset database password, then update DATABASE_URL and redeploy');
  if (/Tenant or user not found/i.test(m)) return r('DB_USER_WRONG', `User must be "postgres.${ref}" and the host must be exactly the one in Supabase → Connect → Transaction pooler`);
  if (/ENOTFOUND|EAI_AGAIN/i.test(m)) return r('DB_HOST_WRONG', 'Database host not found — copy the host from Supabase → Connect → Transaction pooler');
  if (/timeout|ETIMEDOUT|ECONNREFUSED|ECONNRESET/i.test(m)) return r('DB_UNREACHABLE', 'Database not reachable — is the Supabase project paused? (Dashboard → Restore). Use port 6543');
  if (/relation .* does not exist/i.test(m)) return r('DB_NO_TABLES', 'Tables missing — run supabase/schema.sql in Supabase SQL Editor');
  if (/self.signed|certificate|SSL/i.test(m)) return r('DB_SSL', 'SSL problem connecting to Supabase: ' + m.slice(0, 120));
  return r('SERVER_ERROR', m.slice(0, 160));
}

function createApp(cfg) {
  const app = express();
  app.set('trust proxy', true);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(express.json({ limit: '200kb' }));
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  // First super admin from environment variables (only when none exists yet).
  let ready = null;
  const ensureReady = () => (ready = ready || (async () => {
    if (await S.users.superCount()) return;
    const phone = U.phone10(process.env.SUPERADMIN_PHONE), pw = process.env.SUPERADMIN_PASSWORD;
    if (!U.validPhone(phone) || !pw || A.passwordProblem(pw)) { console.warn('No super admin yet: set SUPERADMIN_PHONE and SUPERADMIN_PASSWORD (6+ chars with a digit).'); return; }
    const ex = await S.users.byPhone(phone); const { hash, salt } = A.hashPassword(pw);
    if (ex) await S.users.update(ex.UserID, { Role: 'admin', SuperAdmin: true, Active: true, PasswordHash: hash, Salt: salt });
    else await S.users.insert({ UserID: U.id('U'), Name: process.env.SUPERADMIN_NAME || 'Super Admin', Phone: phone, Email: (process.env.SUPERADMIN_EMAIL || '').toLowerCase(), Role: 'admin', SuperAdmin: true, Active: true, PasswordHash: hash, Salt: salt, MustChangePassword: false, CreatedBy: 'setup' });
    console.log('Super admin ready:', phone);
  })().catch((e) => { ready = null; throw e; }));
  // These two work even when the database is not reachable, so problems can be diagnosed.
  app.get('/api/public/config', (req, res) => res.json({ ok: true, bureauPhone: process.env.BUREAU_PHONE || '' }));
  app.get('/api/health', async (req, res) => {
    try { await S.users.superCount(); await ensureReady(); res.json({ ok: true, db: 'connected', time: U.now() }); }
    catch (e) { const d = dbProblem(e); console.error('[health]', d.code, d.hint); res.status(503).json({ ok: false, ...d }); }
  });
  app.use('/api', wrap(async (req, res, next) => { await ensureReady(); next(); }));

  /* ---------- helpers ---------- */
  const pubUser = (u) => ({ id: u.UserID, name: u.Name, phone: u.Phone, email: u.Email, role: u.Role, superAdmin: !!u.SuperAdmin, mustChange: !!u.MustChangePassword });
  const audit = (u, action, target = '', details = '') => S.audit.add({ UserID: u ? u.UserID : '', UserName: u ? u.Name : '', Action: action, Target: target, Details: String(details).slice(0, 300) }).catch((e) => console.error('audit', e.message));
  const notify = (Type, ProfileID, Title, Message) => S.notifs.insert({ NotifID: U.id('N'), Type, ProfileID, Title, Message, Read: false }).catch((e) => console.error('notify', e.message));
  const gotras = (p) => [p.Gotra1, p.Gotra2, p.Gotra3, p.Gotra4];
  const ip = (req) => String(req.ip || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  async function throttle(key, max, minutes) { if (await S.attempts.count(key, minutes) >= max) fail(429, 'TOO_MANY'); }

  function score(me, p) {
    const groom = me.Gender === 'M' ? me : p, bride = me.Gender === 'M' ? p : me;
    const d = (+groom.Age || 0) - (+bride.Age || 0);
    let s = 72 + (d >= 0 && d <= 6 ? 14 : -Math.min(14, Math.abs(d) * 2));
    if (me.City && p.City && U.normGotra(me.City) === U.normGotra(p.City)) s += 7;
    if ((me.EduLevel || U.eduLevel(me.Education)) === (p.EduLevel || U.eduLevel(p.Education))) s += 6;
    return Math.max(40, Math.min(99, s));
  }
  function publicProfile(p, me) {
    const o = {}; for (const k of Object.keys(p)) if (!PRIVATE.includes(k)) o[k] = p[k];
    o.EduLevel = p.EduLevel || U.eduLevel(p.Education);
    if (me) { o.clash = U.gotraClash(me, p); o.score = score(me, p); }
    return o;
  }
  const listRow = (p) => ({ ProfileID: p.ProfileID, Status: p.Status, Name: p.Name, Gender: p.Gender, Age: p.Age, City: p.City, Gotra1: p.Gotra1, Education: p.Education, Occupation: p.Occupation, ForWhom: p.ForWhom, Source: p.Source, OwnerUserID: p.OwnerUserID, CreatedAt: p.CreatedAt, Phone: p.Phone });

  function readProfile(body, { partial = false } = {}) {
    const p = {};
    for (const k of PROFILE_INPUT) if (body[k] !== undefined) p[k] = U.clean(body[k], k === 'Address' || k === 'About' ? 600 : 120, k === 'Address' || k === 'About');
    if (p.ForWhom && !FOR_WHOM.includes(p.ForWhom)) p.ForWhom = 'Relative';
    if (p.Gender && !['F', 'M'].includes(p.Gender)) fail(400, 'BAD_GENDER', { fields: ['Gender'] });
    if (p.MaritalStatus && !MARITAL.includes(p.MaritalStatus)) p.MaritalStatus = 'NeverMarried';
    if (p.Phone !== undefined) { if (!U.validPhone(p.Phone)) fail(400, 'BAD_PHONE', { fields: ['Phone'] }); p.Phone = U.phone10(p.Phone); }
    if (p.Phone2) { if (!U.validPhone(p.Phone2)) fail(400, 'BAD_PHONE', { fields: ['Phone2'] }); p.Phone2 = U.phone10(p.Phone2); }
    if (p.DOB) { const iso = U.isoDate(p.DOB); const a = U.ageFrom(p.DOB); if (!iso || a < 18 || a > 70) fail(400, 'BAD_DOB', { fields: ['DOB'] }); p.DOB = iso; }
    else if (p.DOB === '') p.DOB = null;
    if (p.HeightFtIn) { p.HeightFtIn = U.heightLabel(p.HeightFtIn); p.HeightCm = U.heightCm(p.HeightFtIn); }
    if (body.EduLevel !== undefined && body.EduLevel !== '') p.EduLevel = EDU.includes(body.EduLevel) ? body.EduLevel : U.eduLevel(p.Education);
    else if (p.Education) p.EduLevel = U.eduLevel(p.Education);
    if (!partial) { const miss = PROFILE_REQUIRED.filter((k) => !p[k]); if (miss.length) fail(400, 'MISSING', { fields: miss }); }
    return p;
  }

  /* ---------- auth middleware ---------- */
  const authed = wrap(async (req, res, next) => {
    const tok = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const p = A.verifyToken(tok, cfg.JWT_SECRET); if (!p) fail(401, 'LOGIN_REQUIRED');
    const u = await S.users.byId(p.uid);
    if (!u || !u.Active) fail(401, 'ACCOUNT_DISABLED');
    req.user = u; req.isAdmin = u.Role === 'admin'; req.isSuper = req.isAdmin && !!u.SuperAdmin; next();
  });
  const admin = (req, res, next) => (req.isAdmin ? next() : next(new HttpError(403, 'ADMIN_ONLY')));
  const superOnly = (req, res, next) => (req.isSuper ? next() : next(new HttpError(403, 'SUPER_ONLY')));

  /* ---------- public ---------- */
  app.get('/api/public/stats', wrap(async (req, res) => {
    const rows = await S.profiles.counts(); const sum = (f) => rows.filter(f).reduce((a, r) => a + r.n, 0);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ ok: true, total: sum(() => true), approved: sum((r) => r.status === 'Approved'), brides: sum((r) => r.status === 'Approved' && r.gender === 'F'), grooms: sum((r) => r.status === 'Approved' && r.gender === 'M') });
  }));
  app.get('/api/public/featured', wrap(async (req, res) => {
    const pick = await S.profiles.featured(8);
    res.set('Cache-Control', 'public, max-age=120');
    // Public page: first name, age, city, education only.
    res.json({ ok: true, items: pick.map((p) => ({ id: p.ProfileID, first: String(p.Name).split(/\s+/)[0], gender: p.Gender, age: p.Age, city: p.City, education: p.Education, eduLevel: p.EduLevel || U.eduLevel(p.Education) })) });
  }));

  /* ---------- auth ---------- */
  app.post('/api/auth/signup', wrap(async (req, res) => {
    await throttle('signup:' + ip(req), 10, 60);
    const name = U.clean(req.body.name, 80), phone = U.phone10(req.body.phone), email = U.clean(req.body.email, 120).toLowerCase(), pw = String(req.body.password || '');
    const bad = []; if (!name) bad.push('name'); if (!U.validPhone(phone)) bad.push('phone'); if (email && !U.validEmail(email)) bad.push('email');
    if (bad.length) fail(400, 'MISSING', { fields: bad });
    const pp = A.passwordProblem(pw); if (pp) fail(400, pp, { fields: ['password'] });
    if (await S.users.byPhone(phone)) fail(409, 'PHONE_TAKEN', { fields: ['phone'] });
    if (email && await S.users.byEmail(email)) fail(409, 'EMAIL_TAKEN', { fields: ['email'] });
    const { hash, salt } = A.hashPassword(pw);
    let u;
    try { u = await S.users.insert({ UserID: U.id('U'), Name: name, Phone: phone, Email: email, Role: 'customer', SuperAdmin: false, Active: true, PasswordHash: hash, Salt: salt, MustChangePassword: false, CreatedBy: 'self-signup', LastLogin: U.now() }); }
    catch (e) { if (e.code === '23505') fail(409, /email/.test(e.constraint || '') ? 'EMAIL_TAKEN' : 'PHONE_TAKEN'); throw e; }
    await S.attempts.add('signup:' + ip(req)); audit(u, 'SIGNUP', u.UserID);
    res.json({ ok: true, token: A.signToken({ uid: u.UserID }, cfg.JWT_SECRET, cfg.TOKEN_DAYS), user: pubUser(u) });
  }));
  app.post('/api/auth/login', wrap(async (req, res) => {
    const idv = String(req.body.id || '').trim().toLowerCase(), pw = String(req.body.password || '');
    if (!idv || !pw) fail(400, 'MISSING', { fields: ['id', 'password'] });
    const ph = U.phone10(idv); const key = 'login:' + (ph.length === 10 ? ph : idv);
    await throttle(key, 8, 15); await throttle('ip:' + ip(req), 40, 15);
    const u = ph.length === 10 && /^[\d\s+()-]+$/.test(idv) ? await S.users.byPhone(ph) : await S.users.byEmail(idv);
    if (!u || !A.checkPassword(pw, u.PasswordHash, u.Salt)) { await S.attempts.add(key); await S.attempts.add('ip:' + ip(req)); fail(401, 'BAD_LOGIN'); }
    if (!u.Active) fail(403, 'ACCOUNT_DISABLED');
    await S.attempts.clear(key); S.users.update(u.UserID, { LastLogin: U.now() }).catch(() => {});
    if (Math.random() < 0.05) S.attempts.prune().catch(() => {});
    res.json({ ok: true, token: A.signToken({ uid: u.UserID }, cfg.JWT_SECRET, cfg.TOKEN_DAYS), user: pubUser(u) });
  }));
  app.get('/api/me', authed, wrap(async (req, res) => res.json({ ok: true, user: pubUser(req.user), profiles: await S.profiles.byOwner(req.user.UserID) })));
  app.post('/api/auth/password', authed, wrap(async (req, res) => {
    const { current, next } = req.body || {};
    if (!A.checkPassword(current, req.user.PasswordHash, req.user.Salt)) fail(400, 'BAD_CURRENT_PW', { fields: ['current'] });
    const pp = A.passwordProblem(next); if (pp) fail(400, pp, { fields: ['next'] });
    const { hash, salt } = A.hashPassword(next);
    await S.users.update(req.user.UserID, { PasswordHash: hash, Salt: salt, MustChangePassword: false });
    audit(req.user, 'PASSWORD_CHANGE', req.user.UserID); res.json({ ok: true });
  }));

  /* ---------- member: profiles ---------- */
  app.get('/api/profiles/mine', authed, wrap(async (req, res) => res.json({ ok: true, items: await S.profiles.byOwner(req.user.UserID) })));
  app.post('/api/profiles', authed, wrap(async (req, res) => {
    if (await S.profiles.ownerCount(req.user.UserID) >= 10) fail(400, 'TOO_MANY_PROFILES');
    const p = await S.profiles.insert({ ...readProfile(req.body), ProfileID: U.id('P'), Status: 'Pending', OwnerUserID: req.user.UserID, Source: 'site' });
    await notify('NEW_PROFILE', p.ProfileID, 'नई प्रोफ़ाइल जमा हुई', `${p.Name}, ${p.Age}, ${p.City}`);
    audit(req.user, 'PROFILE_CREATE', p.ProfileID, p.Name); res.json({ ok: true, profile: p });
  }));
  app.put('/api/profiles/:id', authed, wrap(async (req, res) => {
    const cur = await S.profiles.byId(req.params.id);
    if (!cur || cur.OwnerUserID !== req.user.UserID) fail(404, 'NOT_FOUND');
    const p = await S.profiles.update(cur.ProfileID, { ...readProfile(req.body), Status: 'Pending', RejectReason: '', UpdatedAt: U.now() });
    await notify('PROFILE_UPDATED', p.ProfileID, 'प्रोफ़ाइल में बदलाव', `${p.Name} ने प्रोफ़ाइल बदली — दोबारा जाँचें`);
    audit(req.user, 'PROFILE_EDIT', p.ProfileID); res.json({ ok: true, profile: p });
  }));
  async function viewerProfile(req, pid) {
    const mine = (await S.profiles.byOwner(req.user.UserID)).filter((p) => p.Status === 'Approved');
    if (!mine.length) fail(403, 'NOT_APPROVED_YET');
    return mine.find((p) => p.ProfileID === pid) || mine[0];
  }
  app.get('/api/matches', authed, wrap(async (req, res) => {
    const me = await viewerProfile(req, req.query.for);
    const items = (await S.profiles.approved()).filter((p) => p.Gender && p.Gender !== me.Gender && p.OwnerUserID !== req.user.UserID).map((p) => publicProfile(p, me));
    res.json({ ok: true, for: { ProfileID: me.ProfileID, Name: me.Name, Gender: me.Gender, gotras: gotras(me) }, items });
  }));
  app.get('/api/profiles/:id', authed, wrap(async (req, res) => {
    const p = await S.profiles.byId(req.params.id); if (!p) fail(404, 'NOT_FOUND');
    if (req.isAdmin) return res.json({ ok: true, profile: p });
    if (p.OwnerUserID === req.user.UserID) return res.json({ ok: true, profile: p, own: true });
    if (p.Status !== 'Approved') fail(404, 'NOT_FOUND');
    const me = await viewerProfile(req, req.query.for);
    res.json({ ok: true, profile: publicProfile(p, me), for: { ProfileID: me.ProfileID, Name: me.Name, gotras: gotras(me) }, sent: await S.interests.exists(me.ProfileID, p.ProfileID) });
  }));

  /* ---------- member: interests ---------- */
  app.post('/api/interests', authed, wrap(async (req, res) => {
    const me = await viewerProfile(req, req.body.fromProfileId);
    const to = await S.profiles.byId(req.body.toProfileId);
    if (!to || to.Status !== 'Approved' || to.Gender === me.Gender) fail(404, 'NOT_FOUND');
    const i = await S.interests.insert({ InterestID: U.id('I'), FromUserID: req.user.UserID, FromProfileID: me.ProfileID, ToProfileID: to.ProfileID, Status: 'New' });
    if (!i) fail(409, 'ALREADY_SENT');
    await notify('INTEREST', to.ProfileID, 'नई रुचि (Interest)', `${me.Name} → ${to.Name}`);
    audit(req.user, 'INTEREST_SEND', i.InterestID, `${me.ProfileID} -> ${to.ProfileID}`); res.json({ ok: true, interest: i });
  }));
  app.get('/api/interests/mine', authed, wrap(async (req, res) => {
    const mine = await S.profiles.byOwner(req.user.UserID); const ids = mine.map((p) => p.ProfileID); const set = new Set(ids);
    const list = ids.length ? await S.interests.forProfiles(ids) : [];
    const need = [...new Set(list.flatMap((i) => [i.FromProfileID, i.ToProfileID]))];
    const byId = Object.fromEntries((await Promise.all(need.map((id) => S.profiles.byId(id)))).filter(Boolean).map((p) => [p.ProfileID, p]));
    const card = (p) => (p ? { ProfileID: p.ProfileID, Name: p.Name, Gender: p.Gender, Age: p.Age, City: p.City, Education: p.Education, Occupation: p.Occupation } : null);
    res.json({ ok: true,
      sent: list.filter((i) => set.has(i.FromProfileID)).map((i) => ({ id: i.InterestID, status: i.Status, at: i.CreatedAt, from: card(byId[i.FromProfileID]), other: card(byId[i.ToProfileID]) })).filter((x) => x.other),
      received: list.filter((i) => set.has(i.ToProfileID)).map((i) => ({ id: i.InterestID, status: i.Status, at: i.CreatedAt, to: card(byId[i.ToProfileID]), other: card(byId[i.FromProfileID]) })).filter((x) => x.other) });
  }));

  /* ---------- admin ---------- */
  app.get('/api/admin/stats', authed, admin, wrap(async (req, res) => {
    const [st, activity] = await Promise.all([S.stats(), S.audit.recent(12)]);
    res.json({ ok: true, ...st, activity });
  }));
  app.get('/api/admin/profiles', authed, admin, wrap(async (req, res) => {
    let items = await S.profiles.all(); const st = req.query.status, q = U.clean(req.query.q, 60).toLowerCase();
    const counts = { all: items.length, Pending: 0, Approved: 0, Rejected: 0 }; items.forEach((p) => { if (counts[p.Status] !== undefined) counts[p.Status]++; });
    if (st && st !== 'all') items = items.filter((p) => p.Status === st);
    if (q) items = items.filter((p) => [p.Name, p.City, p.Phone, p.Occupation, p.Gotra1, p.FatherName].join(' ').toLowerCase().includes(q));
    res.json({ ok: true, counts, items: items.map(listRow) });
  }));
  app.get('/api/admin/export.csv', authed, admin, wrap(async (req, res) => {
    const items = await S.profiles.all(); const cols = Object.keys(S.MAP.profiles).filter((k) => k !== 'AgeAtImport').concat('Age');
    const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [cols.join(','), ...items.map((p) => cols.map((c) => cell(p[c])).join(','))].join('\r\n');
    audit(req.user, 'EXPORT', 'profiles', items.length + ' rows');
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="rawat-profiles-${new Date().toISOString().slice(0, 10)}.csv"` }).send(csv);
  }));
  app.get('/api/admin/profiles/:id', authed, admin, wrap(async (req, res) => {
    const p = await S.profiles.byId(req.params.id); if (!p) fail(404, 'NOT_FOUND');
    const owner = p.OwnerUserID ? await S.users.byId(p.OwnerUserID) : null;
    res.json({ ok: true, profile: p, owner: owner ? { name: owner.Name, phone: owner.Phone, email: owner.Email } : null });
  }));
  app.post('/api/admin/profiles', authed, admin, wrap(async (req, res) => {
    const approve = req.body.approve !== false && req.body.approve !== 'false';
    const p = await S.profiles.insert({ ...readProfile(req.body), ProfileID: U.id('P'), Status: approve ? 'Approved' : 'Pending', OwnerUserID: null, Source: 'admin', ReviewedBy: approve ? req.user.Name : '', ReviewedAt: approve ? U.now() : null });
    audit(req.user, 'ADMIN_PROFILE_CREATE', p.ProfileID, p.Name); res.json({ ok: true, profile: p });
  }));
  app.put('/api/admin/profiles/:id', authed, admin, wrap(async (req, res) => {
    const p = await S.profiles.update(req.params.id, { ...readProfile(req.body, { partial: true }), UpdatedAt: U.now() }); if (!p) fail(404, 'NOT_FOUND');
    audit(req.user, 'ADMIN_PROFILE_EDIT', p.ProfileID); res.json({ ok: true, profile: p });
  }));
  app.post('/api/admin/profiles/:id/review', authed, admin, wrap(async (req, res) => {
    const d = req.body.decision; if (!['Approved', 'Rejected'].includes(d)) fail(400, 'BAD_DECISION');
    const reason = U.clean(req.body.reason, 200); if (d === 'Rejected' && !reason) fail(400, 'MISSING', { fields: ['reason'] });
    const p = await S.profiles.update(req.params.id, { Status: d, RejectReason: d === 'Rejected' ? reason : '', AdminNote: U.clean(req.body.note, 500, true), ReviewedBy: req.user.Name, ReviewedAt: U.now(), UpdatedAt: U.now() });
    if (!p) fail(404, 'NOT_FOUND');
    await S.notifs.markForProfile(p.ProfileID);
    audit(req.user, d === 'Approved' ? 'APPROVE' : 'REJECT', p.ProfileID, reason); res.json({ ok: true, profile: p });
  }));
  app.delete('/api/admin/profiles/:id', authed, admin, wrap(async (req, res) => {
    const p = await S.profiles.byId(req.params.id); if (!p) fail(404, 'NOT_FOUND');
    await S.profiles.remove(p.ProfileID); // interests + notifications go with it (ON DELETE CASCADE)
    audit(req.user, 'DELETE', p.ProfileID, p.Name); res.json({ ok: true });
  }));
  app.get('/api/admin/notifications', authed, admin, wrap(async (req, res) => {
    const [items, unread] = await Promise.all([S.notifs.recent(40), S.notifs.unread()]);
    res.json({ ok: true, unread, items });
  }));
  app.post('/api/admin/notifications/read', authed, admin, wrap(async (req, res) => {
    if (req.body.all) await S.notifs.markAll(); else await S.notifs.markRead((req.body.ids || []).map(String).slice(0, 100));
    res.json({ ok: true });
  }));
  app.get('/api/admin/interests', authed, admin, wrap(async (req, res) => {
    const ints = await S.interests.all();
    const need = [...new Set(ints.flatMap((i) => [i.FromProfileID, i.ToProfileID]))];
    const P = Object.fromEntries((await Promise.all(need.map((id) => S.profiles.byId(id)))).filter(Boolean).map((p) => [p.ProfileID, p]));
    const card = (p) => (p ? { ProfileID: p.ProfileID, Name: p.Name, Gender: p.Gender, Age: p.Age, City: p.City, Occupation: p.Occupation, Phone: p.Phone } : null);
    res.json({ ok: true, items: ints.map((i) => ({ id: i.InterestID, status: i.Status, note: i.AdminNote, at: i.CreatedAt, from: card(P[i.FromProfileID]), to: card(P[i.ToProfileID]) })).filter((x) => x.from && x.to) });
  }));
  app.put('/api/admin/interests/:id', authed, admin, wrap(async (req, res) => {
    const st = req.body.status; if (st && !INTEREST_STATUS.includes(st)) fail(400, 'BAD_STATUS');
    const i = await S.interests.update(req.params.id, { ...(st ? { Status: st } : {}), ...(req.body.note !== undefined ? { AdminNote: U.clean(req.body.note, 500, true) } : {}), UpdatedAt: U.now() });
    if (!i) fail(404, 'NOT_FOUND'); audit(req.user, 'INTEREST_STATUS', i.InterestID, st); res.json({ ok: true });
  }));

  /* ---------- super admin: users ---------- */
  app.get('/api/admin/users', authed, admin, superOnly, wrap(async (req, res) => {
    res.json({ ok: true, items: (await S.users.all()).map((u) => ({ ...pubUser(u), active: !!u.Active, createdAt: u.CreatedAt, lastLogin: u.LastLogin, createdBy: u.CreatedBy })) });
  }));
  app.post('/api/admin/users', authed, admin, superOnly, wrap(async (req, res) => {
    const name = U.clean(req.body.name, 80), phone = U.phone10(req.body.phone), email = U.clean(req.body.email, 120).toLowerCase();
    const role = req.body.role === 'admin' ? 'admin' : 'customer', sa = role === 'admin' && U.bool(req.body.superAdmin), pw = String(req.body.password || '');
    const bad = []; if (!name) bad.push('name'); if (!U.validPhone(phone)) bad.push('phone'); if (email && !U.validEmail(email)) bad.push('email');
    if (bad.length) fail(400, 'MISSING', { fields: bad });
    const pp = A.passwordProblem(pw); if (pp) fail(400, pp, { fields: ['password'] });
    if (await S.users.byPhone(phone)) fail(409, 'PHONE_TAKEN', { fields: ['phone'] });
    if (email && await S.users.byEmail(email)) fail(409, 'EMAIL_TAKEN', { fields: ['email'] });
    const { hash, salt } = A.hashPassword(pw);
    const u = await S.users.insert({ UserID: U.id('U'), Name: name, Phone: phone, Email: email, Role: role, SuperAdmin: sa, Active: true, PasswordHash: hash, Salt: salt, MustChangePassword: true, CreatedBy: req.user.Name });
    audit(req.user, 'USER_CREATE', u.UserID, `${role}${sa ? ' super' : ''} ${name}`); res.json({ ok: true, user: pubUser(u) });
  }));
  app.put('/api/admin/users/:id', authed, admin, superOnly, wrap(async (req, res) => {
    if (req.params.id === req.user.UserID && (req.body.active === false || req.body.role === 'customer' || req.body.superAdmin === false)) fail(400, 'CANNOT_CHANGE_SELF');
    const patch = {};
    if (req.body.active !== undefined) patch.Active = U.bool(req.body.active);
    if (req.body.role) patch.Role = req.body.role === 'admin' ? 'admin' : 'customer';
    if (req.body.superAdmin !== undefined) patch.SuperAdmin = U.bool(req.body.superAdmin) && (patch.Role || 'admin') === 'admin';
    if (patch.Role === 'customer') patch.SuperAdmin = false;
    if (req.body.password) { const pp = A.passwordProblem(req.body.password); if (pp) fail(400, pp, { fields: ['password'] }); const h = A.hashPassword(req.body.password); Object.assign(patch, { PasswordHash: h.hash, Salt: h.salt, MustChangePassword: true }); }
    const u = await S.users.update(req.params.id, patch); if (!u) fail(404, 'NOT_FOUND');
    audit(req.user, 'USER_UPDATE', u.UserID, JSON.stringify({ ...patch, PasswordHash: undefined, Salt: undefined })); res.json({ ok: true, user: pubUser(u) });
  }));

  app.use('/api', (req, res) => res.status(404).json({ ok: false, code: 'NOT_FOUND' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ ok: false, code: err.code, ...(err.extra || {}) });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ ok: false, code: 'BAD_JSON' });
    const d = dbProblem(err);
    console.error('[error]', req.method, req.path, d.code, d.hint || err.message);
    res.status(d.code === 'SERVER_ERROR' ? 500 : 503).json({ ok: false, code: d.code === 'SERVER_ERROR' ? 'SERVER_ERROR' : 'DB_ERROR' });
  });
  return app;
}
module.exports = { createApp };
