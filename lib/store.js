// Data access. The rest of the app works with PascalCase objects (UserID, Name, Gotra1 …);
// this file maps them to the snake_case Postgres columns and back.
const { q } = require('./db');
const U = require('./util');

const MAP = {
  users: { UserID: 'id', Name: 'name', Phone: 'phone', Email: 'email', Role: 'role', SuperAdmin: 'super_admin', Active: 'active', PasswordHash: 'password_hash', Salt: 'salt', MustChangePassword: 'must_change_password', CreatedBy: 'created_by', CreatedAt: 'created_at', LastLogin: 'last_login' },
  profiles: { ProfileID: 'id', Status: 'status', OwnerUserID: 'owner_id', ForWhom: 'for_whom', Gender: 'gender', Name: 'name', Phone: 'phone', Phone2: 'phone2', DOB: 'dob', AgeAtImport: 'age_at_import', BirthTime: 'birth_time', BirthPlace: 'birth_place', HeightFtIn: 'height_ft_in', HeightCm: 'height_cm', Weight: 'weight', Complexion: 'complexion', MaritalStatus: 'marital_status', Manglik: 'manglik', FatherName: 'father_name', FatherJob: 'father_job', MotherName: 'mother_name', MotherJob: 'mother_job', Brothers: 'brothers', Sisters: 'sisters', NativePlace: 'native_place', City: 'city', Address: 'address', Gotra1: 'gotra1', Gotra2: 'gotra2', Gotra3: 'gotra3', Gotra4: 'gotra4', Education: 'education', EduLevel: 'edu_level', Occupation: 'occupation', JobPlace: 'job_place', Income: 'income', About: 'about', RejectReason: 'reject_reason', AdminNote: 'admin_note', ReviewedBy: 'reviewed_by', ReviewedAt: 'reviewed_at', Source: 'source', LegacyRef: 'legacy_ref', CreatedAt: 'created_at', UpdatedAt: 'updated_at' },
  interests: { InterestID: 'id', FromUserID: 'from_user_id', FromProfileID: 'from_profile_id', ToProfileID: 'to_profile_id', Status: 'status', AdminNote: 'admin_note', CreatedAt: 'created_at', UpdatedAt: 'updated_at' },
  notifications: { NotifID: 'id', Type: 'type', ProfileID: 'profile_id', Title: 'title', Message: 'message', Read: 'is_read', CreatedAt: 'created_at' },
  audit_log: { Time: 'created_at', UserID: 'user_id', UserName: 'user_name', Action: 'action', Target: 'target', Details: 'details' }
};
const BOOL = new Set(['super_admin', 'active', 'must_change_password', 'is_read']);
const INT = new Set(['height_cm', 'age_at_import']);
const TS = new Set(['created_at', 'updated_at', 'reviewed_at', 'last_login']);

function fromDb(table, row) {
  if (!row) return null; const o = {};
  for (const [k, c] of Object.entries(MAP[table])) { let v = row[c]; if (v instanceof Date) v = v.toISOString(); if (BOOL.has(c)) v = !!v; o[k] = v === null || v === undefined ? '' : v; }
  if (table === 'profiles') o.Age = U.ageFrom(o.DOB) || o.AgeAtImport || '';
  return o;
}
function toDb(table, obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const c = MAP[table][k]; if (!c) continue;
    if (BOOL.has(c)) out[c] = U.bool(v);
    else if (INT.has(c)) out[c] = v === '' || v === null || v === undefined || isNaN(+v) ? null : Math.round(+v);
    else if (c === 'dob' || TS.has(c)) out[c] = v ? v : null;
    else out[c] = v === undefined || v === null ? null : String(v);
  }
  return out;
}
async function insert(table, obj, { onConflict = '' } = {}) {
  const r = toDb(table, obj); const cols = Object.keys(r);
  const res = await q(`insert into ${table} (${cols.join(',')}) values (${cols.map((_, i) => '$' + (i + 1)).join(',')}) ${onConflict} returning *`, cols.map((c) => r[c]));
  return fromDb(table, res.rows[0]);
}
async function update(table, id, patch) {
  const r = toDb(table, patch); delete r.id; const cols = Object.keys(r); if (!cols.length) return byId(table, id);
  const res = await q(`update ${table} set ${cols.map((c, i) => `${c}=$${i + 1}`).join(',')} where id=$${cols.length + 1} returning *`, [...cols.map((c) => r[c]), id]);
  return fromDb(table, res.rows[0]);
}
async function byId(table, id) { const r = await q(`select * from ${table} where id=$1`, [String(id)]); return fromDb(table, r.rows[0]); }
const rows = (table, res) => res.rows.map((r) => fromDb(table, r));

const users = {
  byId: (id) => byId('users', id),
  byPhone: async (p) => fromDb('users', (await q('select * from users where phone=$1', [p])).rows[0]),
  byEmail: async (e) => fromDb('users', (await q('select * from users where lower(email)=lower($1)', [e])).rows[0]),
  all: async () => rows('users', await q('select * from users order by created_at')),
  insert: (u) => insert('users', u),
  update: (id, p) => update('users', id, p),
  superCount: async () => +(await q("select count(*) from users where role='admin' and super_admin and active")).rows[0].count
};
const profiles = {
  byId: (id) => byId('profiles', id),
  byOwner: async (uid) => rows('profiles', await q('select * from profiles where owner_id=$1 order by created_at', [uid])),
  approved: async () => rows('profiles', await q("select * from profiles where status='Approved' order by created_at desc")),
  all: async () => rows('profiles', await q('select * from profiles order by created_at desc')),
  counts: async () => { const r = await q('select status, gender, count(*)::int n from profiles group by 1,2'); return r.rows; },
  featured: async (n) => rows('profiles', await q("select * from profiles where status='Approved' order by (source='legacy'), created_at desc limit $1", [n])),
  insert: (p) => insert('profiles', p),
  insertIgnore: (p) => insert('profiles', p, { onConflict: 'on conflict do nothing' }),
  update: (id, p) => update('profiles', id, p),
  remove: async (id) => (await q('delete from profiles where id=$1', [id])).rowCount > 0,
  ownerCount: async (uid) => +(await q('select count(*) from profiles where owner_id=$1', [uid])).rows[0].count
};
const interests = {
  insert: (i) => insert('interests', i, { onConflict: 'on conflict (from_profile_id, to_profile_id) do nothing' }),
  exists: async (f, t) => (await q('select 1 from interests where from_profile_id=$1 and to_profile_id=$2', [f, t])).rowCount > 0,
  forProfiles: async (ids) => rows('interests', await q('select * from interests where from_profile_id = any($1) or to_profile_id = any($1) order by created_at desc', [ids])),
  all: async () => rows('interests', await q('select * from interests order by created_at desc limit 500')),
  update: (id, p) => update('interests', id, p)
};
const notifs = {
  insert: (n) => insert('notifications', n),
  recent: async (n = 40) => rows('notifications', await q('select * from notifications order by created_at desc limit $1', [n])),
  unread: async () => +(await q('select count(*) from notifications where not is_read')).rows[0].count,
  markRead: async (ids) => q('update notifications set is_read=true where id = any($1)', [ids]),
  markAll: async () => q('update notifications set is_read=true where not is_read'),
  markForProfile: async (pid) => q("update notifications set is_read=true where profile_id=$1 and type<>'INTEREST'", [pid])
};
const audit = {
  add: (a) => insert('audit_log', a),
  recent: async (n = 12) => rows('audit_log', await q('select * from audit_log order by id desc limit $1', [n]))
};
const attempts = {
  add: (key) => q('insert into auth_attempts (key) values ($1)', [key]),
  count: async (key, minutes) => +(await q("select count(*) from auth_attempts where key=$1 and created_at > now() - ($2 || ' minutes')::interval", [key, String(minutes)])).rows[0].count,
  clear: (key) => q('delete from auth_attempts where key=$1', [key]),
  prune: () => q("delete from auth_attempts where created_at < now() - interval '1 day'")
};
async function stats() {
  const [c, iw, sm, days] = await Promise.all([
    q("select count(*)::int total, count(*) filter (where status='Approved')::int approved, count(*) filter (where status='Pending')::int pending from profiles"),
    q("select count(*)::int n from interests where created_at > now() - interval '7 days'"),
    q("select count(*)::int n from interests where status='Settled' and updated_at > now() - interval '30 days'"),
    q("select to_char(created_at at time zone 'Asia/Kolkata','YYYY-MM-DD') d, gender, count(*)::int n from profiles where source<>'legacy' and created_at > now() - interval '7 days' group by 1,2")
  ]);
  const out = []; for (let k = 6; k >= 0; k--) { const d = new Date(Date.now() + 5.5 * 36e5 - k * 864e5).toISOString().slice(0, 10); out.push({ date: d, M: 0, F: 0 }); }
  for (const r of days.rows) { const d = out.find((x) => x.date === r.d); if (d) d[r.gender === 'F' ? 'F' : 'M'] += r.n; }
  return { ...c.rows[0], interestsWeek: iw.rows[0].n, settledMonth: sm.rows[0].n, days: out };
}
module.exports = { users, profiles, interests, notifs, audit, attempts, stats, fromDb, toDb, MAP };
