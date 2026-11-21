/* Rawat Marriage Bureau — website (talks to the API on Vercel, data in Supabase) */
(() => {
'use strict';
const API = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '';

/* =================== language =================== */
// L(hindi, english, chrome): in "mix" mode, chrome text (nav, footer, buttons, labels) is English, the rest Hindi.
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
const S = { lang: store.get('rmb_lang') || 'mix', token: store.get('rmb_token') || '', user: JSON.parse(store.get('rmb_user') || 'null'), forPid: store.get('rmb_for') || '',
  F: { q: '', amin: 18, amax: 40, edu: [], city: [], hideClash: true, sort: 'best' }, page: 1, ptab: 'Pending', pq: '', ppage: 1, notifs: { unread: 0, items: [] }, cfg: {} };
const L = (hi, en, c) => (S.lang === 'en' ? en : S.lang === 'hi' ? hi : (c ? en : hi));
const LANGS = [['mix', 'हिंदी + English'], ['hi', 'हिंदी'], ['en', 'English']];
const V = {
  ForWhom: { Self: ['स्वयं', 'Self'], Brother: ['भाई', 'Brother'], Sister: ['बहन', 'Sister'], Son: ['बेटा', 'Son'], Daughter: ['बेटी', 'Daughter'], Relative: ['रिश्तेदार', 'Relative'] },
  MaritalStatus: { NeverMarried: ['अविवाहित', 'Never married'], Divorced: ['तलाकशुदा', 'Divorced'], Widowed: ['विधवा / विधुर', 'Widowed'], Remarriage: ['पुनः विवाह', 'Remarriage'] },
  EduLevel: { school: ['12वीं या कम', 'School'], grad: ['स्नातक', 'Graduate'], pg: ['स्नातकोत्तर', 'Post-graduate'], pro: ['प्रोफ़ेशनल', 'Professional'] },
  Status: { Pending: ['प्रतीक्षा में', 'Pending'], Approved: ['स्वीकृत', 'Approved'], Rejected: ['अस्वीकृत', 'Rejected'] },
  Interest: { New: ['नया', 'New'], Talking: ['बात चल रही है', 'Talking'], FamiliesMet: ['परिवार मिले', 'Families met'], Settled: ['रिश्ता तय', 'Settled'], Closed: ['बात नहीं बनी', 'Closed'] },
  Manglik: { No: ['नहीं', 'No'], Yes: ['हाँ', 'Yes'], DontKnow: ['पता नहीं', "Don't know"] },
  Complexion: { Fair: ['गोरा', 'Fair'], Wheatish: ['गेहुँआ', 'Wheatish'], Dark: ['साँवला', 'Dark'] },
  Income: { NA: ['बताना नहीं चाहते', 'Prefer not to say'], lt10: ['₹10,000 तक', 'Up to ₹10,000'], '10to25': ['₹10,000 – ₹25,000', '₹10,000 – ₹25,000'], '25to50': ['₹25,000 – ₹50,000', '₹25,000 – ₹50,000'], gt50: ['₹50,000 से ज़्यादा', 'Above ₹50,000'] },
  Gender: { F: ['वधू', 'Bride'], M: ['वर', 'Groom'] }
};
const tv = (group, k) => { const x = (V[group] || {})[k]; return x ? L(x[0], x[1]) : (k || '—'); };
const ERR = {
  LOGIN_REQUIRED: ['कृपया फिर से लॉगिन करें', 'Please log in again'], ACCOUNT_DISABLED: ['यह खाता बंद है। ब्यूरो से संपर्क करें।', 'This account is disabled. Contact the bureau.'],
  BAD_LOGIN: ['मोबाइल/ईमेल या पासवर्ड गलत है', 'Wrong mobile/email or password'], PHONE_TAKEN: ['यह मोबाइल नंबर पहले से रजिस्टर है', 'This mobile number is already registered'],
  EMAIL_TAKEN: ['यह ईमेल पहले से रजिस्टर है', 'This email is already registered'], PW_SHORT: ['पासवर्ड कम से कम 6 अक्षर का हो', 'Password must be at least 6 characters'],
  PW_DIGIT: ['पासवर्ड में कम से कम एक अंक हो', 'Password needs at least one digit'], MISSING: ['कृपया ज़रूरी जानकारी भरें', 'Please fill the required fields'],
  BAD_PHONE: ['10 अंकों का सही मोबाइल नंबर लिखें', 'Enter a valid 10-digit mobile number'], BAD_DOB: ['सही जन्मतिथि लिखें (उम्र 18 से ज़्यादा)', 'Enter a valid date of birth (18+)'],
  NOT_APPROVED_YET: ['ब्यूरो की स्वीकृति के बाद मिलान दिखेंगे', 'Matches appear after the bureau approves your profile'], ALREADY_SENT: ['रुचि पहले ही भेजी जा चुकी है', 'Interest already sent'],
  NOT_FOUND: ['यह जानकारी नहीं मिली', 'Not found'], TOO_MANY: ['बहुत ज़्यादा कोशिश। 15 मिनट बाद फिर कोशिश करें।', 'Too many attempts. Try again in 15 minutes.'],
  DB_ERROR: ['डेटाबेस से जुड़ नहीं पाए। थोड़ी देर में कोशिश करें।', 'Could not reach the database. Try again shortly.'], CONFIG_MISSING: ['वेबसाइट की सेटिंग अधूरी है (Vercel Environment Variables)।', 'Website settings are incomplete (Vercel environment variables).'], SERVER_ERROR: ['सर्वर में दिक्कत आई', 'Server error'],
  NETWORK: ['इंटरनेट कनेक्शन जाँचें', 'Check your internet connection'], SUPER_ONLY: ['यह केवल सुपर एडमिन के लिए है', 'Super admins only'], ADMIN_ONLY: ['यह केवल एडमिन के लिए है', 'Admins only'],
  CANNOT_CHANGE_SELF: ['आप अपना खुद का खाता बंद या डाउनग्रेड नहीं कर सकते', "You can't disable or downgrade your own account"], BAD_CURRENT_PW: ['मौजूदा पासवर्ड गलत है', 'Current password is wrong'],
  TOO_MANY_PROFILES: ['एक खाते से अधिकतम 10 प्रोफ़ाइल', 'Maximum 10 profiles per account']
};
const errMsg = (e) => { const x = ERR[e && e.code] || ERR.SERVER_ERROR; return L(x[0], x[1]); };

/* =================== icons & art =================== */
const P = {
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  heart:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  userplus:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  check:'<path d="M20 6 9 17l-5-5"/>', x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  brief:'<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  grad:'<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5M22 10v6"/>',
  ruler:'<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>',
  phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  lock:'<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  sliders:'<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  left:'<path d="m15 18-6-6 6-6"/>', right:'<path d="m9 18 6-6-6-6"/>', down:'<path d="m6 9 6 6 6-6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  plus:'<path d="M5 12h14M12 5v14"/>',
  edit:'<path d="M21.17 6.81a1 1 0 0 0-3.98-3.98L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>',
  trash:'<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:'<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/>',
  home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  grid:'<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  file:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8"/>',
  spark:'<path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  msg:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  crown:'<path d="M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.3l4.27-3.67a.5.5 0 0 1 .8.52l-2.83 10.25a1 1 0 0 1-.96.73H5.81a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .8-.52l4.27 3.67a1 1 0 0 0 1.52-.3z"/><path d="M5 21h14"/>',
  pause:'<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>', play:'<path d="m6 3 14 9-14 9z"/>',
  alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  arrow:'<path d="M5 12h14M12 5l7 7-7 7"/>',
  mail:'<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  cal:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  key:'<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  refresh:'<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
  family:'<circle cx="7" cy="6" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="12" cy="13" r="2"/><path d="M3 21v-4a4 4 0 0 1 4-4M21 21v-4a4 4 0 0 0-4-4M9 21v-2a3 3 0 0 1 6 0v2"/>'
};
const ic = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const logoMark = () => `<svg class="mark" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#4A0D2B"/><circle cx="24" cy="24" r="20" fill="none" stroke="#D4A63A" stroke-width="1" stroke-dasharray="2 3"/><circle cx="19.5" cy="25" r="7.5" fill="none" stroke="#F7D58A" stroke-width="2.4"/><circle cx="28.5" cy="25" r="7.5" fill="none" stroke="#F472B6" stroke-width="2.4"/><path d="M24 9.5l1.6 3.2 3.4.4-2.5 2.3.7 3.4-3.2-1.7-3.2 1.7.7-3.4-2.5-2.3 3.4-.4z" fill="#F7D58A"/></svg>`;
function mandala() {
  let s = '<svg viewBox="-100 -100 200 200" aria-hidden="true" fill="none">';
  const ring = (r, n, rx, ry, col, op) => { for (let i = 0; i < n; i++) s += `<ellipse cx="0" cy="${-r}" rx="${rx}" ry="${ry}" transform="rotate(${360 / n * i})" stroke="${col}" stroke-opacity="${op}" stroke-width=".7"/>`; };
  [[95, '#D4A63A', .55], [78, '#DB2777', .35], [50, '#D4A63A', .5]].forEach(([r, c, o]) => s += `<circle r="${r}" stroke="${c}" stroke-opacity="${o}" stroke-width=".6" stroke-dasharray="1.5 2.5"/>`);
  ring(86, 32, 3.2, 9, '#D4A63A', .7); ring(64, 20, 6, 14, '#DB2777', .45); ring(38, 12, 7, 13, '#D4A63A', .6); ring(18, 8, 4, 8, '#DB2777', .5);
  return s + '</svg>';
}
function toran() {
  let s = '<svg class="toran" viewBox="0 0 1440 46" preserveAspectRatio="none" aria-hidden="true"><path d="M0 4 Q720 30 1440 4" stroke="#D4A63A" stroke-width="1.5" fill="none"/>';
  for (let i = 0; i <= 48; i++) { const x = i * 30, t = x / 1440, y = 4 + 26 * 4 * t * (1 - t);
    s += i % 2 ? `<path d="M${x} ${y} q5 10 0 20 q-5 -10 0 -20z" fill="#BE185D" opacity=".55"/>` : `<circle cx="${x}" cy="${y + 7}" r="4.2" fill="#D4A63A" opacity=".8"/><circle cx="${x}" cy="${y + 7}" r="1.8" fill="#A16207"/>`; }
  return s + '</svg>';
}
const swash = () => `<svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true"><path d="M2 10 Q60 2 110 8 T198 6" stroke="#D4A63A" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

/* =================== helpers =================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avv = (s) => 'v' + [...String(s || '')].reduce((t, ch) => t + ch.charCodeAt(0), 0) % 3;
const av = (p, c = '') => `<div class="av ${p.Gender === 'F' || p.gender === 'F' ? 'F' : 'M'} ${avv(p.Name || p.first || p.name)} ${c}" aria-hidden="true"><span class="pat"></span>${esc(String(p.Name || p.first || p.name || 'र').trim()[0])}</div>`;
const go = (h) => { if (location.hash === h) render(); else location.hash = h; };
const isAdmin = () => S.user && S.user.role === 'admin';
const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d)) return esc(iso); return d.toLocaleDateString(S.lang === 'en' ? 'en-IN' : 'hi-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
const ago = (iso) => { const s = (Date.now() - Date.parse(iso)) / 1000; if (!(s >= 0)) return ''; if (s < 60) return L('अभी', 'just now'); if (s < 3600) return Math.floor(s / 60) + L(' मिनट पहले', ' min ago'); if (s < 86400) return Math.floor(s / 3600) + L(' घंटे पहले', ' h ago'); if (s < 7 * 86400) return Math.floor(s / 86400) + L(' दिन पहले', ' days ago'); return fmtDate(iso); };
const statusBadge = (s) => s === 'Approved' ? `<span class="badge b-ok">${ic('check', 's')}${tv('Status', s)}</span>` : s === 'Rejected' ? `<span class="badge b-bad">${ic('x', 's')}${tv('Status', s)}</span>` : `<span class="badge b-warn">${ic('clock', 's')}${tv('Status', 'Pending')}</span>`;
const phoneTxt = (p) => p ? String(p).replace(/(\d{5})(\d{5})/, '$1 $2') : '—';

async function api(method, path, body) {
  let r;
  try { r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw Object.assign(new Error('NETWORK'), { code: 'NETWORK' }); }
  let j = {}; try { j = await r.json(); } catch { j = { ok: false, code: 'SERVER_ERROR' }; }
  if (!r.ok || !j.ok) {
    const e = Object.assign(new Error(j.code || 'SERVER_ERROR'), j, { status: r.status });
    if (r.status === 401 && S.token && path !== '/api/auth/login') { logout(true); }
    throw e;
  }
  return j;
}
function setSession(token, user) { S.token = token || ''; S.user = user || null; store.set('rmb_token', token || null); store.set('rmb_user', user ? JSON.stringify(user) : null); }
function logout(expired) { setSession('', null); S.me = null; clearInterval(S.poll); store.set('rmb_for', null); S.forPid = ''; if (expired) toast(errMsg({ code: 'LOGIN_REQUIRED' }), 'info'); go('#/login'); }

function toast(msg, kind = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
  t.innerHTML = `<span class="ti">${ic(kind === 'bad' ? 'alert' : kind === 'info' ? 'bell' : 'check', 's')}</span><span>${esc(msg)}</span>`;
  $('#toasts').appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, kind === 'bad' ? 5000 : 3200);
}
function modal(title, body, foot, onMount) {
  const root = $('#modal-root'); const prev = document.activeElement;
  root.innerHTML = `<div class="modal-bg" role="presentation"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="modal-h"><h2 id="mt" class="h3">${title}</h2><button class="btn btn-t btn-icon" data-close aria-label="${L('बंद करें', 'Close', 1)}">${ic('x')}</button></div><div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div></div>`;
  const bg = root.firstElementChild;
  const close = () => { document.removeEventListener('keydown', onKey); bg.style.animation = 'fade .2s reverse forwards'; setTimeout(() => { root.innerHTML = ''; prev && prev.focus && prev.focus(); }, 180); };
  const onKey = (e) => { if (e.key === 'Escape') close();
    if (e.key === 'Tab') { const f = $$('button,a[href],input,select,textarea', bg).filter((x) => !x.disabled && x.offsetParent); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } };
  document.addEventListener('keydown', onKey);
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  setTimeout(() => { const f = bg.querySelector('input:not([disabled]),select,textarea,button:not([data-close])'); (f || bg.querySelector('button')).focus(); }, 60);
  onMount && onMount(bg, close); return close;
}
async function busy(btn, fn) {
  const h = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin"></span>${btn.dataset.busy || L('कृपया रुकें…', 'Please wait…', 1)}`;
  try { return await fn(); } finally { if (document.contains(btn)) { btn.disabled = false; btn.innerHTML = h; } }
}
function validate(i) { const ok = i.checkValidity() && (!i.required || String(i.value).trim() !== ''); const f = i.closest('.field'); f && f.classList.toggle('invalid', !ok); i.setAttribute('aria-invalid', String(!ok)); return ok; }
function markFields(form, fields, map = (x) => x) { (fields || []).forEach((k) => { const i = form.querySelector(`[name="${map(k)}"]`); if (i) { i.closest('.field')?.classList.add('invalid'); i.setAttribute('aria-invalid', 'true'); } }); const first = (fields || []).map((k) => form.querySelector(`[name="${map(k)}"]`)).find(Boolean); first && first.focus(); }
const loadingHTML = () => `<div class="loading" role="status"><span class="spin big"></span><span>${L('लोड हो रहा है…', 'Loading…', 1)}</span></div>`;
const errorHTML = (e) => `<div class="empty"><div class="ei">${ic('alert', 'l')}</div><h3 class="h3">${errMsg(e)}</h3><p class="muted" style="margin:6px 0 18px">${L('कृपया दोबारा कोशिश करें।', 'Please try again.')}</p><button class="btn btn-p" data-retry>${ic('refresh', 's')}${L('दोबारा कोशिश करें', 'Retry', 1)}</button></div>`;

function langSwitch(dark) {
  return `<div class="lang ${dark ? 'dark' : ''}"><label class="sr" for="langSel">Language</label>${ic('globe', 's')}<select id="langSel" class="lang-sel" aria-label="Language / भाषा">${LANGS.map(([k, t]) => `<option value="${k}" ${S.lang === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`;
}
document.addEventListener('change', (e) => { if (e.target.classList.contains('lang-sel')) { S.lang = e.target.value; store.set('rmb_lang', S.lang); document.documentElement.lang = S.lang === 'en' ? 'en' : 'hi'; render(true); toast(L('भाषा बदल दी गई', 'Language changed', 1), 'info'); } });
document.addEventListener('click', (e) => { if (e.target.closest('[data-retry]')) render(true); });

const footerJG = () => `<a class="jg" href="https://jagrutigurukul.org/" target="_blank" rel="noopener"><div class="jgm">ज</div><div><b>${L('जागृति गुरुकुल की पहल', 'An initiative of Jagruti Gurukul', 1)}</b><small>jagrutigurukul.org</small></div></a>`;
const bureauPhone = () => S.cfg.bureauPhone || '';

/* =================== profile card =================== */
function pcard(p, o = {}) {
  const c = p.clash || [];
  return `<article class="pcard">
    <div class="top">${av(p)}<span class="badge b-ok">${ic('shield', 's')}${L('सत्यापित', 'Verified', 1)}</span>${p.score ? `<span class="score">${p.score}% ${L('मेल', 'match', 1)}</span>` : ''}</div>
    <div class="bd"><h4>${esc(p.Name)}${p.Age ? ', ' + esc(p.Age) : ''}</h4>
      <div class="meta"><span>${ic('ruler', 's')}${esc(p.HeightFtIn || '—')} · ${tv('MaritalStatus', p.MaritalStatus)}</span><span>${ic('grad', 's')}${esc(p.Education || '—')}</span><span>${ic('brief', 's')}${esc(p.Occupation || '—')}</span><span>${ic('pin', 's')}${esc(p.City || '—')}</span></div>
      ${o.gotra === false ? '' : c.length ? `<span class="gtag bad">${ic('alert', 's')}${L('गोत्र टकराव', 'Gotra clash')}: ${esc(c.join(', '))}</span>` : `<span class="gtag ok">${ic('check', 's')}${L('चारों गोत्र अलग', 'All 4 gotras differ')}</span>`}
      <div class="ft"><a class="btn btn-o btn-sm" href="#/app/p/${esc(p.ProfileID)}">${L('प्रोफ़ाइल देखें', 'View profile', 1)}</a></div></div></article>`;
}

/* =================== LANDING =================== */
function landing() {
  const tel = bureauPhone();
  return `<div>
  <header class="lh" id="lh"><div class="wrap in">
    <a href="#/" class="logo" aria-label="Home">${logoMark()}<div><b>रावत विवाह ब्यूरो</b><small>Rawat Marriage Bureau</small></div></a>
    <nav class="lnav" aria-label="Main"><a href="#how">${L('कैसे काम करता है', 'How it works', 1)}</a><a href="#why">${L('ख़ासियत', 'Features', 1)}</a><a href="#profiles">${L('प्रोफ़ाइल', 'Profiles', 1)}</a><a href="#stories">${L('अनुभव', 'Stories', 1)}</a></nav>
    <div class="acts">${langSwitch()}${S.token ? `<a href="${isAdmin() ? '#/admin' : '#/app'}" class="btn btn-p">${L('मेरा खाता', 'My account', 1)}</a>` : `<a href="#/login" class="btn btn-o">${L('लॉगिन', 'Login', 1)}</a><a href="#/signup" class="btn btn-p">${L('मुफ़्त रजिस्टर करें', 'Register free', 1)}</a>`}
      <button class="btn btn-o btn-icon menu-btn" aria-label="Menu" id="menuBtn">${ic('menu')}</button></div>
  </div></header>
  <section class="hero">${toran()}<div class="wrap grid">
    <div>
      <span class="script rv">Shubh Vivah</span>
      <h1 class="h1 rv" style="margin-top:6px">${L(`सही रिश्ता,<br><em>सही गोत्र${swash()}</em> के साथ।`, `The right match,<br>with the <em>right gotra${swash()}</em>.`)}</h1>
      <p class="lede rv">${L('रावत परिवारों का अपना विवाह ब्यूरो। हर प्रोफ़ाइल ब्यूरो से सत्यापित होती है, चारों गोत्र अपने-आप जाँचे जाते हैं, और आपका फ़ोन नंबर हमेशा गोपनीय रहता है।', "The Rawat community's own marriage bureau. Every profile is verified by the bureau, all four gotras are checked automatically, and your phone number always stays private.")}</p>
      <form class="search rv" id="heroSearch" aria-label="Search">
        <div class="tabs" role="tablist"><button type="button" role="tab" aria-selected="true" data-t="F">${L('वधू खोजें', 'Find a bride', 1)}</button><button type="button" role="tab" aria-selected="false" data-t="M">${L('वर खोजें', 'Find a groom', 1)}</button></div>
        <div class="row">
          <div class="field"><label for="hs1">${L('उम्र से', 'Age from', 1)}</label><select id="hs1" class="inp">${[18, 20, 22, 24, 26, 28, 30].map((a) => `<option ${a === 22 ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
          <div class="field"><label for="hs2">${L('उम्र तक', 'Age to', 1)}</label><select id="hs2" class="inp">${[24, 26, 28, 30, 32, 35, 40].map((a) => `<option ${a === 30 ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
          <div class="field city"><label for="hs3">${L('शहर', 'City', 1)}</label><input id="hs3" class="inp" placeholder="${L('सभी शहर', 'All cities', 1)}" list="cityList"></div>
          <div class="go"><button class="btn btn-p btn-lg">${ic('search')}${L('खोजें', 'Search', 1)}</button></div>
        </div>
      </form>
      <div class="trust rv" id="trust"><div class="stack">${['प', 'स', 'न', 'द'].map((n, i) => av({ Name: n, Gender: i % 2 ? 'M' : 'F' }, 'round')).join('')}</div><p><b><span data-stat="total">—</span>+ ${L('प्रोफ़ाइल', 'profiles', 1)}</b> ${L('ब्यूरो की सूची में', 'on the bureau list')}<br><span data-stat="brides">—</span> ${L('वधू', 'brides')}, <span data-stat="grooms">—</span> ${L('वर', 'grooms')}</p></div>
    </div>
    <div class="fan" aria-hidden="true" id="fan"><div class="ring">${mandala()}</div>${[0, 1, 2].map((i) => `<div class="pc c${i + 1}"><div class="av ${i === 1 ? 'M' : 'F'} v${i}"><span class="pat"></span>र</div><span class="badge b-ok bd">${ic('shield', 's')}${L('सत्यापित', 'Verified', 1)}</span><h4 class="skel-t">&nbsp;</h4><p>&nbsp;</p></div>`).join('')}
      <div class="pill p1"><span class="pi" style="background:var(--ok-soft);color:var(--ok)">${ic('check')}</span><div><b>${L('चारों गोत्र अलग', 'All 4 gotras differ')}</b><small>${L('स्वयं, माँ, दादी, नानी', 'Self, mother, grandmother, maternal grandmother')}</small></div></div>
      <div class="pill p2"><span class="pi" style="background:var(--primary-soft);color:var(--primary)">${ic('heart')}</span><div><b>${L('नई रुचि आई', 'New interest')}</b><small>${L('ब्यूरो आपसे बात करेगा', 'The bureau will call you')}</small></div></div>
    </div>
  </div></section>
  <section class="stats"><div class="wrap"><div class="in rv">
    ${[['users', 'total', L('कुल प्रोफ़ाइल', 'Total profiles')], ['shield', '100%', L('ब्यूरो से सत्यापित', 'Bureau verified')], ['family', '4', L('गोत्र हर बार जाँचे', 'Gotras checked every time')], ['lock', '0', L('नंबर दूसरों को दिखते', 'Numbers shown to others')]].map(([i, n, l]) => `<div class="s"><span class="si">${ic(i)}</span><div><b ${n === 'total' ? 'data-stat="total"' : ''}>${n === 'total' ? '—' : n}</b><span>${l}</span></div></div>`).join('')}
  </div></div></section>
  <section class="sec" id="how"><div class="wrap">
    <div class="sec-h rv"><span class="script">Kaise Kaam Karta Hai</span><h2 class="h2">${L('चार आसान कदम', 'Four simple steps')}</h2><p>${L('रजिस्टर करने से रिश्ता तय होने तक, हर कदम पर ब्यूरो आपके साथ है।', 'From registration to a settled match, the bureau is with you at every step.')}</p><div class="orn">${ic('spark', 's')}</div></div>
    <div class="steps">${[['userplus', L('रजिस्टर करें', 'Register', 1), L('मोबाइल या ईमेल और पासवर्ड से एक मिनट में खाता बनाएँ।', 'Create an account in a minute with your mobile or email.')], ['file', L('प्रोफ़ाइल भरें', 'Fill profile', 1), L('अपनी या भाई-बहन की पूरी जानकारी, परिवार और चारों गोत्र।', 'Your or your sibling’s details, family and all four gotras.')], ['shield', L('ब्यूरो जाँच', 'Bureau check', 1), L('ब्यूरो फ़ोन पर बात करके प्रोफ़ाइल सत्यापित करता है।', 'The bureau calls the family and verifies the profile.')], ['heart', L('मिलान देखें', 'See matches', 1), L('गोत्र-सुरक्षित रिश्ते देखें, रुचि भेजें, ब्यूरो बात आगे बढ़ाए।', 'See gotra-safe matches, send interest — the bureau takes it forward.')]].map(([i, t, d], k) => `<div class="step rv" style="transition-delay:${k * 90}ms"><div class="n">${ic(i, 'l')}<i>${k + 1}</i></div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>
  </div></section>
  <section class="sec" id="why" style="padding-top:0"><div class="wrap">
    <div class="sec-h rv"><span class="script">Kyon Chunein</span><h2 class="h2">${L('भरोसा, जो परिवार चाहता है', 'The trust families look for')}</h2><p>${L('बड़े पोर्टल की भीड़ नहीं — अपने समाज का, अपने लोगों के लिए बना ब्यूरो।', 'Not a crowded portal — a bureau made by our community, for our people.')}</p></div>
    <div class="bento">
      <div class="bx w4 rv"><div class="bi">${ic('family')}</div><h3>${L('गोत्र-सुरक्षित मिलान', 'Gotra-safe matching')}</h3><p>${L('स्वयं, माँ, दादी और नानी — चारों गोत्र दोनों पक्षों से मिलाए जाते हैं। एक भी मेल हुआ तो वह प्रोफ़ाइल सुझाव में नहीं आती।', 'Self, mother, grandmother and maternal grandmother — all four gotras are compared. If even one matches, the profile is not suggested.')}</p>
        <div class="gotra-viz">${[['स्वयं', 'Self', 'पोकरिया', 'सुरावत'], ['माँ', 'Mother', 'बोया', 'गोडात'], ['दादी', 'Grandmother', 'नणेत', 'कलात'], ['नानी', 'Maternal gm.', 'धोधिंग', 'बाणियात']].map(([h, e, a, b]) => `<div class="gv"><small>${L(h, e)}</small><b>${a}</b><span class="vs">${L('बनाम', 'vs')} ${b}</span><div class="st"><span class="gtag ok">${ic('check', 's')}${L('अलग', 'Different')}</span></div></div>`).join('')}</div></div>
      <div class="bx w2 dark rv"><div class="bi">${ic('lock')}</div><h3>${L('नंबर गोपनीय', 'Number stays private')}</h3><p>${L('किसी दूसरे उपयोगकर्ता को आपका फ़ोन या पता नहीं दिखता। बात ब्यूरो के माध्यम से होती है।', 'No other user sees your phone or address. Talks happen through the bureau.')}</p>
        <div class="lock-demo"><div><span>${L('मोबाइल', 'Mobile', 1)}</span><span class="blur">98290 41212</span></div><div><span>${L('पता', 'Address', 1)}</span><span class="blur">वार्ड 12, अजमेर</span></div></div></div>
      <div class="bx w2 rv"><div class="bi">${ic('users')}</div><h3>${L('पूरे परिवार की प्रोफ़ाइल', 'Profiles for the whole family')}</h3><p>${L('एक खाते से अपनी और अपने भाई-बहन या रिश्तेदारों की प्रोफ़ाइल भरें।', 'Fill profiles for yourself, your siblings or relatives from one account.')}</p></div>
      <div class="bx w2 rv"><div class="bi">${ic('shield')}</div><h3>${L('हर प्रोफ़ाइल सत्यापित', 'Every profile verified')}</h3><p>${L('ब्यूरो की स्वीकृति के बाद ही प्रोफ़ाइल किसी को दिखती है।', 'A profile is visible only after the bureau approves it.')}</p></div>
      <div class="bx w2 rv"><div class="bi">${ic('sliders')}</div><h3>${L('आसान फ़िल्टर', 'Easy filters')}</h3><p>${L('उम्र, शहर, शिक्षा और काम से अपने हिसाब का रिश्ता चुनें।', 'Filter by age, city, education and work.')}</p></div>
    </div>
  </div></section>
  <section class="sec" id="profiles" style="padding-top:0"><div class="wrap">
    <div class="sec-h rv" style="margin-bottom:28px"><span class="script">Naye Rishte</span><h2 class="h2">${L('ब्यूरो की सूची से', 'From the bureau list')}</h2><p>${L('पूरी प्रोफ़ाइल, परिवार और गोत्र लॉगिन और स्वीकृति के बाद दिखते हैं।', 'Full profile, family and gotras are visible after login and approval.')}</p></div>
    <div class="rail-ctl"><button class="btn btn-o btn-icon" data-rail="-1" aria-label="${L('पिछला', 'Previous', 1)}">${ic('left')}</button><button class="btn btn-o btn-icon" data-rail="1" aria-label="${L('अगला', 'Next', 1)}">${ic('right')}</button></div>
    <div class="rail" id="rail" tabindex="0">${[0, 1, 2, 3].map(() => '<div class="pcard skel" style="height:330px"></div>').join('')}</div>
  </div></section>
  <section class="sec" id="stories" style="padding-top:0"><div class="wrap"><div class="testi rv"><div class="in">
    <div><span class="script">Parivaar Ki Baat</span><h2 class="h2" style="margin-top:6px">${L('परिवारों के अनुभव', 'What families say')}</h2><p style="margin-top:12px">${L('ब्यूरो से जुड़े परिवार क्या कहते हैं।', 'Words from families on the bureau.')}</p><span class="sample-note">${ic('alert', 's')}${L('नमूना पाठ — असली अनुभव बाद में जोड़ें', 'Sample text — replace with real stories')}</span></div>
    <div><div class="slides" id="slides" aria-live="polite">
      ${[[L('गोत्र मिलान की वजह से हमें बार-बार रिश्तेदारों से पूछना नहीं पड़ा। ब्यूरो ने ख़ुद दोनों परिवारों से बात कराई।', 'Because of the gotra check we did not have to ask relatives again and again. The bureau connected both families itself.'), 'भ', L('वधू के पिता, अजमेर', "Bride's father, Ajmer")], [L('बेटी का नंबर किसी को नहीं दिखा, यह हमारे लिए सबसे ज़रूरी था। सारी बात ब्यूरो के ज़रिए हुई।', "Our daughter's number was never shown to anyone — that mattered most. Everything went through the bureau."), 'श', L('वधू की माँ, ब्यावर', "Bride's mother, Beawar")], [L('मैंने अपने छोटे भाई की प्रोफ़ाइल भी अपने ही खाते से भर दी। फ़िल्टर से सही रिश्ते जल्दी मिले।', "I filled my younger brother's profile from my own account. The filters found good matches quickly."), 'स', L('वर के बड़े भाई, जयपुर', "Groom's elder brother, Jaipur")]].map(([q, n, r], i) => `<figure class="slide ${i ? '' : 'on'}"><blockquote>“${q}”</blockquote><figcaption class="who">${av({ Name: n, Gender: i === 1 ? 'F' : 'M' }, 'round')}<div><b>${L('नमूना परिवार', 'Sample family')}</b><small>${r}</small></div></figcaption></figure>`).join('')}
    </div>
    <div class="ctl"><button class="btn btn-icon" data-sl="-1" aria-label="${L('पिछला', 'Previous', 1)}">${ic('left')}</button><button class="btn btn-icon" id="slPause" aria-label="Pause">${ic('pause')}</button><button class="btn btn-icon" data-sl="1" aria-label="${L('अगला', 'Next', 1)}">${ic('right')}</button><div class="dots" aria-hidden="true"><i class="on"></i><i></i><i></i></div></div></div>
  </div></div></div></section>
  <section style="padding-bottom:0"><div class="wrap"><div class="cta rv">
    <span class="script">Aaj Hi Judein</span><h2 class="h2">${L('अपने परिवार के लिए सही रिश्ता आज ही खोजें', 'Find the right match for your family today')}</h2>
    <p class="lede" style="margin:auto">${L('रजिस्ट्रेशन मुफ़्त है। प्रोफ़ाइल भरने में 10 मिनट लगते हैं।', 'Registration is free. A profile takes about 10 minutes.')}</p>
    <div class="acts"><a href="#/signup" class="btn btn-p btn-lg">${L('मुफ़्त रजिस्टर करें', 'Register free', 1)} ${ic('arrow')}</a>${tel ? `<a href="tel:+91${esc(tel)}" class="btn btn-o btn-lg">${ic('phone')}${L('ब्यूरो से बात करें', 'Call the bureau', 1)}: ${phoneTxt(tel)}</a>` : ''}</div>
  </div></div></section>
  ${siteFooter()}
  <datalist id="cityList">${CITIES.map((c) => `<option value="${c}">`).join('')}</datalist>
  </div>`;
}
function siteFooter() {
  const tel = bureauPhone();
  return `<footer class="lf"><div class="wrap"><div class="cols">
    <div><a href="#/" class="logo">${logoMark()}<div><b>रावत विवाह ब्यूरो</b><small>Rawat Marriage Bureau</small></div></a><p>${L('रावत समाज के परिवारों के लिए गोत्र-सुरक्षित, सत्यापित और गोपनीय विवाह सेवा।', 'A gotra-safe, verified and private marriage service for Rawat families.')}</p></div>
    <div><h5>${L('ब्यूरो', 'Bureau', 1)}</h5><a href="#how">${L('कैसे काम करता है', 'How it works', 1)}</a><a href="#why">${L('ख़ासियत', 'Features', 1)}</a><a href="#profiles">${L('प्रोफ़ाइल', 'Profiles', 1)}</a><a href="#/login">${L('लॉगिन', 'Login', 1)}</a></div>
    <div><h5>${L('सहायता', 'Help', 1)}</h5>${tel ? `<a href="tel:+91${esc(tel)}">${L('फ़ोन', 'Phone', 1)}: ${phoneTxt(tel)}</a>` : ''}<a href="#/signup">${L('रजिस्टर करें', 'Register', 1)}</a><span style="display:block;padding:6px 0;font-size:15px">${L('भाषा', 'Language', 1)}</span>${langSwitch(true)}</div>
    <div><h5>${L('सहयोग', 'Supported by', 1)}</h5>${footerJG()}</div>
  </div><div class="bar"><span>© ${new Date().getFullYear()} ${L('रावत विवाह ब्यूरो', 'Rawat Marriage Bureau', 1)}</span><span>Created by <b>Kamlesh Rawat</b></span></div></div></footer>`;
}
const CITIES = ['अजमेर', 'ब्यावर', 'भीलवाड़ा', 'जयपुर', 'अहमदाबाद', 'राजसमंद', 'उदयपुर', 'चित्तौड़गढ़', 'कोटा', 'रावतभाटा', 'मुम्बई', 'पाली', 'नसीराबाद', 'टॉडगढ़'];
const GOTRAS = ['पोकरिया', 'बोया', 'बाणियात', 'नणेत', 'धोधिंग', 'सुरावत', 'देवावत', 'सुजावत', 'गोडात', 'लगेत', 'घोडात', 'झूठा', 'मोटिस', 'कलात', 'बिगडियात', 'बालोत', 'खियात', 'देवात', 'उदावत', 'भूडात', 'मुण्डियात', 'आपावत', 'देलात', 'वरात', 'महेन्द्रात', 'मेघावत', 'भीलात', 'मालावत', 'बहलोल', 'डिगा', 'बलाडिया', 'चौहान'];

function bindLanding() {
  const lh = $('#lh'); window.onscroll = () => lh && lh.classList.toggle('scrolled', scrollY > 10); window.onscroll();
  let want = 'F';
  $$('#heroSearch [role=tab]').forEach((b) => b.onclick = () => { want = b.dataset.t; $$('#heroSearch [role=tab]').forEach((x) => x.setAttribute('aria-selected', x === b)); });
  $('#heroSearch').onsubmit = (e) => { e.preventDefault(); S.F.amin = +$('#hs1').value; S.F.amax = +$('#hs2').value; S.F.city = $('#hs3').value.trim() ? [$('#hs3').value.trim()] : []; S.F.want = want;
    if (S.token) go(isAdmin() ? '#/admin/profiles' : '#/app/matches'); else { toast(L('रिश्ते देखने के लिए पहले मुफ़्त रजिस्टर करें', 'Register free to see matches'), 'info'); go('#/signup'); } };
  $('#menuBtn').onclick = () => modal(L('मेनू', 'Menu', 1), `<nav class="nv menu-list">${[['how', L('कैसे काम करता है', 'How it works', 1)], ['why', L('ख़ासियत', 'Features', 1)], ['profiles', L('प्रोफ़ाइल', 'Profiles', 1)], ['stories', L('अनुभव', 'Stories', 1)]].map(([h, t]) => `<a href="#${h}" data-close>${t}</a>`).join('')}<a href="#/login" data-close>${L('लॉगिन', 'Login', 1)}</a></nav>${langSwitch()}`, `<a href="#/signup" class="btn btn-p" data-close style="width:100%">${L('मुफ़्त रजिस्टर करें', 'Register free', 1)}</a>`);
  $$('[data-rail]').forEach((b) => b.onclick = () => { const r = $('#rail'); r.scrollBy({ left: +b.dataset.rail * ((r.firstElementChild || {}).offsetWidth + 24 || 300), behavior: 'smooth' }); });
  let i = 0, paused = matchMedia('(prefers-reduced-motion: reduce)').matches; const sl = $$('.slide'), dots = $$('.dots i');
  const show = (n) => { i = (n + sl.length) % sl.length; sl.forEach((s, k) => s.classList.toggle('on', k === i)); dots.forEach((d, k) => d.classList.toggle('on', k === i)); };
  $$('[data-sl]').forEach((b) => b.onclick = () => show(i + +b.dataset.sl));
  const pb = $('#slPause'); const setP = (v) => { paused = v; pb.innerHTML = ic(v ? 'play' : 'pause'); pb.setAttribute('aria-label', v ? L('चलाएँ', 'Play', 1) : L('रोकें', 'Pause', 1)); };
  setP(paused); pb.onclick = () => setP(!paused);
  const box = $('#slides'); box.onmouseenter = () => box.dataset.h = 1; box.onmouseleave = () => delete box.dataset.h; box.onfocusin = () => box.dataset.h = 1; box.onfocusout = () => delete box.dataset.h;
  clearInterval(window.__sl); window.__sl = setInterval(() => { if (!paused && !box.dataset.h && document.contains(box)) show(i + 1); }, 6000);
  // live data
  api('GET', '/api/public/stats').then((s) => { $$('[data-stat=total]').forEach((x) => x.textContent = s.total); $$('[data-stat=brides]').forEach((x) => x.textContent = s.brides); $$('[data-stat=grooms]').forEach((x) => x.textContent = s.grooms); }).catch(() => {});
  api('GET', '/api/public/featured').then((f) => {
    const items = f.items; const rail = $('#rail'); if (!rail) return;
    rail.innerHTML = items.length ? items.map((p) => `<article class="pcard"><div class="top">${av({ Name: p.first, Gender: p.gender })}<span class="badge b-ok">${ic('shield', 's')}${L('सत्यापित', 'Verified', 1)}</span></div><div class="bd"><h4>${esc(p.first)}${p.age ? ', ' + esc(p.age) : ''}</h4><div class="meta"><span>${ic('user', 's')}${tv('Gender', p.gender)}</span><span>${ic('grad', 's')}${esc(p.education || tv('EduLevel', p.eduLevel))}</span><span>${ic('pin', 's')}${esc(p.city || '—')}</span></div><div class="ft"><a class="btn btn-o btn-sm" href="${S.token ? '#/app/p/' + esc(p.id) : '#/signup'}">${S.token ? L('प्रोफ़ाइल देखें', 'View profile', 1) : L('पूरी प्रोफ़ाइल के लिए रजिस्टर करें', 'Register to view', 1)}</a></div></div></article>`).join('')
      : `<p class="muted">${L('जल्द ही नई प्रोफ़ाइल।', 'New profiles coming soon.')}</p>`;
    $$('#fan .pc').forEach((pc, k) => { const p = items[[0, 1, 2][k]]; if (!p) return; pc.querySelector('.av').outerHTML = av({ Name: p.first, Gender: p.gender }); pc.querySelector('h4').textContent = p.first + (p.age ? ', ' + p.age : ''); pc.querySelector('p').innerHTML = `${ic('pin', 's')}${esc(p.city || '')}`; });
  }).catch(() => { const r = $('#rail'); if (r) r.innerHTML = ''; });
}

/* =================== AUTH =================== */
function auth(mode) {
  const up = mode === 'signup';
  return `<div class="auth">
  <aside class="art"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><a href="#/" class="logo">${logoMark()}<div><b>रावत विवाह ब्यूरो</b><small>Rawat Marriage Bureau</small></div></a>${langSwitch(true)}</div>
    <div><span class="script">${up ? 'Swagat Hai' : 'Phir Se Swagat'}</span><h2>${up ? L('अपने परिवार के लिए<br>पहला कदम उठाएँ', 'Take the first step<br>for your family') : L('आपके रिश्ते<br>आपका इंतज़ार कर रहे हैं', 'Your matches<br>are waiting')}</h2>
      <ul><li>${ic('shield')}<span>${L('हर प्रोफ़ाइल ब्यूरो द्वारा सत्यापित', 'Every profile verified by the bureau')}</span></li><li>${ic('family')}<span>${L('चारों गोत्र अपने-आप जाँचे जाते हैं', 'All four gotras checked automatically')}</span></li><li>${ic('lock')}<span>${L('आपका नंबर किसी को नहीं दिखता', 'Your number is never shown')}</span></li><li>${ic('users')}<span>${L('भाई-बहन की प्रोफ़ाइल भी एक ही खाते से', 'Sibling profiles from the same account')}</span></li></ul></div>
    <small style="color:#F3C7DA">${L('जागृति गुरुकुल की पहल', 'An initiative of Jagruti Gurukul', 1)} · Created by Kamlesh Rawat</small>
    <div class="arch">${mandala()}</div></aside>
  <main class="side" id="main"><div class="box">
    <h1 class="h2">${up ? L('नया खाता बनाएँ', 'Create account') : L('लॉगिन करें', 'Log in')}</h1><p class="muted" style="margin-top:6px">${up ? L('रजिस्ट्रेशन मुफ़्त है।', 'Registration is free.') : L('अपने मोबाइल नंबर या ईमेल से लॉगिन करें।', 'Log in with your mobile number or email.')}</p>
    <div class="seg" role="tablist"><button role="tab" aria-selected="${!up}" data-go="#/login">${L('लॉगिन', 'Login', 1)}</button><button role="tab" aria-selected="${up}" data-go="#/signup">${L('रजिस्टर', 'Register', 1)}</button></div>
    <form id="authForm" novalidate>
      ${up ? `<div class="field"><label for="a-n">${L('पूरा नाम', 'Full name', 1)} <span class="req">*</span></label><div class="inp-ic">${ic('user')}<input id="a-n" name="name" class="inp" autocomplete="name" required maxlength="80"></div><span class="err">${ic('alert', 's')}${L('नाम लिखें', 'Enter your name')}</span></div>
      <div class="grid2"><div class="field"><label for="a-p">${L('मोबाइल नंबर', 'Mobile number', 1)} <span class="req">*</span></label><div class="inp-ic">${ic('phone')}<input id="a-p" name="phone" class="inp" inputmode="numeric" autocomplete="tel" maxlength="14" required pattern="\\+?[0-9 ]{10,14}"></div><span class="err">${ic('alert', 's')}${errMsg({ code: 'BAD_PHONE' })}</span></div>
      <div class="field"><label for="a-e">${L('ईमेल', 'Email', 1)} <span class="muted small">(${L('वैकल्पिक', 'optional', 1)})</span></label><div class="inp-ic">${ic('mail')}<input id="a-e" name="email" class="inp" type="email" autocomplete="email"></div><span class="err">${ic('alert', 's')}${L('सही ईमेल लिखें', 'Enter a valid email')}</span></div></div>`
      : `<div class="field"><label for="a-id">${L('मोबाइल नंबर या ईमेल', 'Mobile number or email', 1)} <span class="req">*</span></label><div class="inp-ic">${ic('user')}<input id="a-id" name="id" class="inp" autocomplete="username" required></div><span class="err">${ic('alert', 's')}${L('मोबाइल या ईमेल लिखें', 'Enter mobile or email')}</span></div>`}
      <div class="field"><label for="a-pw">${L('पासवर्ड', 'Password', 1)} <span class="req">*</span></label><div class="inp-ic">${ic('lock')}<input id="a-pw" name="password" class="inp" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" required minlength="6"><button type="button" class="eye" aria-label="${L('पासवर्ड दिखाएँ', 'Show password', 1)}" id="eye">${ic('eye')}</button></div>
        ${up ? `<div class="pw-meter" aria-hidden="true"><i></i><i></i><i></i><i></i></div><span class="help" id="pwh">${L('कम से कम 6 अक्षर, एक अंक ज़रूर', 'At least 6 characters with a digit')}</span>` : ''}<span class="err">${ic('alert', 's')}${errMsg({ code: 'PW_SHORT' })}</span></div>
      ${up ? `<label class="check"><input type="checkbox" id="a-t"> <span>${L('मैं पुष्टि करता/करती हूँ कि दी गई जानकारी सही है और ब्यूरो मुझसे इस नंबर पर बात कर सकता है।', 'I confirm the details are correct and the bureau may call me on this number.')}</span></label>` : `<p class="help">${L('पासवर्ड भूल गए? ब्यूरो को फ़ोन करें, एडमिन नया पासवर्ड देंगे।', 'Forgot password? Call the bureau — an admin will reset it.')}${bureauPhone() ? ' ' + phoneTxt(bureauPhone()) : ''}</p>`}
      <p class="form-err" id="formErr" role="alert" hidden></p>
      <button class="btn btn-p btn-lg" data-busy="${up ? L('खाता बन रहा है…', 'Creating account…', 1) : L('जाँच हो रही है…', 'Checking…', 1)}">${up ? L('खाता बनाएँ', 'Create account', 1) : L('लॉगिन करें', 'Log in', 1)} ${ic('arrow')}</button>
      <p class="muted small" style="text-align:center">${up ? `${L('पहले से खाता है?', 'Already registered?')} <a href="#/login" class="link" style="min-height:0">${L('लॉगिन करें', 'Log in', 1)}</a>` : `${L('नया खाता?', 'New here?')} <a href="#/signup" class="link" style="min-height:0">${L('मुफ़्त रजिस्टर करें', 'Register free', 1)}</a>`}</p>
    </form>
  </div></main></div>`;
}
function bindAuth(mode) {
  const f = $('#authForm'); const up = mode === 'signup'; const fe = $('#formErr');
  $$('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
  $('#eye').onclick = () => { const i = $('#a-pw'); const s = i.type === 'password'; i.type = s ? 'text' : 'password'; $('#eye').innerHTML = ic(s ? 'eyeoff' : 'eye'); $('#eye').setAttribute('aria-label', s ? L('पासवर्ड छिपाएँ', 'Hide password', 1) : L('पासवर्ड दिखाएँ', 'Show password', 1)); };
  if (up) $('#a-pw').oninput = (e) => { const v = e.target.value; const sc = (v.length >= 6) + (/\d/.test(v)) + (/[A-Z]/.test(v) || /[^\w]/.test(v)) + (v.length >= 10); $$('.pw-meter i').forEach((x, k) => x.style.background = k < sc ? ['#DC2626', '#B45309', '#A16207', '#15803D'][sc - 1] : ''); $('#pwh').textContent = [L('कम से कम 6 अक्षर, एक अंक ज़रूर', 'At least 6 characters with a digit'), L('कमज़ोर', 'Weak'), L('ठीक-ठाक', 'Okay'), L('अच्छा', 'Good'), L('मज़बूत', 'Strong')][sc]; };
  $$('input', f).forEach((i) => i.addEventListener('blur', () => i.value && validate(i)));
  f.onsubmit = async (e) => {
    e.preventDefault(); fe.hidden = true;
    const bad = $$('input[required]', f).filter((i) => !validate(i)); if (up && $('#a-e').value && !validate($('#a-e'))) bad.push($('#a-e'));
    if (bad.length) { bad[0].focus(); return; }
    if (up && !$('#a-t').checked) { fe.textContent = L('कृपया पुष्टि वाले बॉक्स पर टिक करें', 'Please tick the confirmation box'); fe.hidden = false; $('#a-t').focus(); return; }
    await busy(f.querySelector('.btn-p'), async () => {
      try {
        const r = up ? await api('POST', '/api/auth/signup', { name: $('#a-n').value, phone: $('#a-p').value, email: $('#a-e').value, password: $('#a-pw').value })
          : await api('POST', '/api/auth/login', { id: $('#a-id').value, password: $('#a-pw').value });
        setSession(r.token, r.user); S.me = null;
        toast(up ? L('खाता बन गया! अब प्रोफ़ाइल भरें।', 'Account created! Now fill the profile.') : L(`स्वागत है, ${r.user.name}`, `Welcome, ${r.user.name}`));
        go(r.user.role === 'admin' ? '#/admin' : up ? '#/app/form' : '#/app');
        if (r.user.mustChange) setTimeout(() => changePassword(true), 600);
      } catch (err) { fe.textContent = errMsg(err); fe.hidden = false; markFields(f, err.fields); }
    });
  };
}
function changePassword(forced) {
  modal(L('पासवर्ड बदलें', 'Change password', 1), `${forced ? `<div class="banner">${ic('key', 's')}${L('सुरक्षा के लिए अपना अस्थायी पासवर्ड बदलें।', 'For safety, change your temporary password.')}</div>` : ''}<form id="pwForm" class="wform" novalidate>
    <div class="field"><label for="pw0">${L('मौजूदा पासवर्ड', 'Current password', 1)}</label><input id="pw0" name="current" type="password" class="inp" required autocomplete="current-password"><span class="err">${ic('alert', 's')}${L('ज़रूरी है', 'Required')}</span></div>
    <div class="field"><label for="pw1">${L('नया पासवर्ड', 'New password', 1)}</label><input id="pw1" name="next" type="password" class="inp" required minlength="6" autocomplete="new-password"><span class="help">${L('कम से कम 6 अक्षर, एक अंक ज़रूर', 'At least 6 characters with a digit')}</span><span class="err">${ic('alert', 's')}${errMsg({ code: 'PW_SHORT' })}</span></div></form>`,
  `<button class="btn btn-o" data-close>${L('रद्द करें', 'Cancel', 1)}</button><button class="btn btn-p" id="pwSave">${L('पासवर्ड बदलें', 'Change password', 1)}</button>`,
  (bg, close) => { $('#pwSave', bg).onclick = async () => { const f = $('#pwForm', bg); const bad = $$('input', f).filter((i) => !validate(i)); if (bad.length) return bad[0].focus();
    await busy($('#pwSave', bg), async () => { try { await api('POST', '/api/auth/password', { current: $('#pw0', bg).value, next: $('#pw1', bg).value }); S.user.mustChange = false; setSession(S.token, S.user); close(); toast(L('पासवर्ड बदल गया', 'Password changed')); } catch (e) { toast(errMsg(e), 'bad'); markFields(f, e.fields); } }); }; });
}

/* =================== APP SHELL =================== */
function navFor() {
  if (isAdmin()) return [['#/admin', 'grid', L('अवलोकन', 'Overview', 1), L('अवलोकन', 'Home', 1)], ['#/admin/profiles', 'file', L('प्रोफ़ाइल', 'Profiles', 1), L('प्रोफ़ाइल', 'Profiles', 1)], ['#/admin/interests', 'heart', L('रुचि अनुरोध', 'Interests', 1), L('रुचियाँ', 'Interests', 1)], ...(S.user.superAdmin ? [['#/admin/users', 'users', L('उपयोगकर्ता', 'Users', 1), L('यूज़र', 'Users', 1)]] : []), ['#/admin/add', 'userplus', L('प्रोफ़ाइल जोड़ें', 'Add profile', 1), L('जोड़ें', 'Add', 1)]];
  return [['#/app', 'home', L('मेरा डैशबोर्ड', 'Dashboard', 1), L('होम', 'Home', 1)], ['#/app/matches', 'heart', L('मिलान', 'Matches', 1), L('मिलान', 'Matches', 1)], ['#/app/interests', 'inbox', L('मेरी रुचियाँ', 'Interests', 1), L('रुचियाँ', 'Interests', 1)], ['#/app/form', 'file', L('प्रोफ़ाइल भरें', 'Add profile', 1), L('प्रोफ़ाइल', 'Profile', 1)]];
}
function shell(active) {
  const nav = navFor(); const u = S.user;
  return `<div class="shell">
  <aside class="side-nav" aria-label="Sidebar"><a href="#/" class="logo">${logoMark()}<div><b>रावत विवाह ब्यूरो</b><small>Rawat Marriage Bureau</small></div></a>
    <nav class="nv"><span class="gh">${isAdmin() ? L('एडमिन', 'Admin', 1) : L('मेनू', 'Menu', 1)}</span>${nav.map(([h, i, t]) => `<a href="${h}" class="${active === h ? 'on' : ''}" ${active === h ? 'aria-current="page"' : ''} title="${t}">${ic(i)}<span>${t}</span></a>`).join('')}
      <a href="#" data-act="pw" title="${L('पासवर्ड बदलें', 'Change password', 1)}">${ic('key')}<span>${L('पासवर्ड बदलें', 'Change password', 1)}</span></a></nav>
    <div class="me">${av({ Name: u.name, Gender: 'M' }, 'round')}<div class="t"><b>${esc(u.name)}</b><small>${u.superAdmin ? L('सुपर एडमिन', 'Super admin', 1) : isAdmin() ? L('एडमिन', 'Admin', 1) : L('ग्राहक', 'Member', 1)}</small></div><button class="btn btn-t btn-icon" data-act="logout" aria-label="${L('लॉगआउट', 'Log out', 1)}" style="margin-left:auto" title="${L('लॉगआउट', 'Log out', 1)}">${ic('logout')}</button></div>
  </aside>
  <div class="main">
    <header class="topbar"><a href="#/" class="logo mlogo" style="display:none" aria-label="Home">${logoMark()}</a>
      ${isAdmin() ? `<form class="tsearch inp-ic" id="tsearch" role="search">${ic('search')}<input class="inp" name="q" placeholder="${L('नाम, शहर या नंबर से खोजें', 'Search name, city or number', 1)}" aria-label="Search"></form>` : '<div class="tsearch"></div>'}
      <div class="sp"></div>${langSwitch()}
      ${isAdmin() ? `<div class="bell" id="bellWrap"><button class="btn btn-o btn-icon" id="bell" aria-label="${L('सूचनाएँ', 'Notifications', 1)}" aria-expanded="false">${ic('bell')}</button><span class="dot" id="bellDot" ${S.notifs.unread ? '' : 'hidden'}>${S.notifs.unread || ''}</span></div>` : ''}
      <button class="btn btn-o btn-icon mobile-only" data-act="logout" aria-label="${L('लॉगआउट', 'Log out', 1)}">${ic('logout')}</button>
    </header>
    <main class="page" id="main">${loadingHTML()}</main>
    <footer class="app-foot"><a href="https://jagrutigurukul.org/" target="_blank" rel="noopener">${L('जागृति गुरुकुल की पहल', 'An initiative of Jagruti Gurukul', 1)}</a><span>Created by <b>Kamlesh Rawat</b></span></footer>
  </div>
  <nav class="bnav" aria-label="Bottom menu">${nav.slice(0, 5).map(([h, i, t, sh]) => `<a href="${h}" class="${active === h ? 'on' : ''}" ${active === h ? 'aria-current="page"' : ''}>${ic(i)}<span>${sh}</span></a>`).join('')}</nav>
  </div>`;
}
function bindShell() {
  $$('[data-act=logout]').forEach((b) => b.onclick = () => logout());
  $$('[data-act=pw]').forEach((b) => b.onclick = (e) => { e.preventDefault(); changePassword(); });
  const ts = $('#tsearch'); if (ts) ts.onsubmit = (e) => { e.preventDefault(); S.pq = ts.q.value; S.ptab = 'all'; S.ppage = 1; go('#/admin/profiles'); if (location.hash === '#/admin/profiles') render(true); };
  const bell = $('#bell'); if (bell) bell.onclick = async (e) => {
    e.stopPropagation(); const w = $('#bellWrap'); const open = w.querySelector('.dropdown'); if (open) { open.remove(); bell.setAttribute('aria-expanded', 'false'); return; }
    bell.setAttribute('aria-expanded', 'true'); w.insertAdjacentHTML('beforeend', `<div class="dropdown" role="menu"><div class="dh"><b>${L('सूचनाएँ', 'Notifications', 1)}</b></div>${loadingHTML()}</div>`);
    await pollNotifs(); const d = w.querySelector('.dropdown'); if (!d) return;
    d.innerHTML = `<div class="dh"><b>${L('सूचनाएँ', 'Notifications', 1)}</b><button class="link" id="readAll" style="min-height:36px">${L('सब पढ़ा हुआ', 'Mark all read', 1)}</button></div>${S.notifs.items.length ? S.notifs.items.slice(0, 12).map((n) => `<button class="nt ${n.Read === 'TRUE' ? '' : 'unread'}" role="menuitem" data-n="${esc(n.NotifID)}" data-type="${esc(n.Type)}" data-pid="${esc(n.ProfileID)}">${av({ Name: n.Message, Gender: 'F' }, 'round')}<div><p><b>${esc(notifTitle(n))}</b><br>${esc(n.Message)}</p><small>${ago(n.CreatedAt)}</small></div></button>`).join('') : `<p class="muted" style="padding:16px">${L('कोई सूचना नहीं', 'No notifications')}</p>`}<div style="padding:10px 16px"><a href="#/admin/profiles" class="link">${L('सभी प्रतीक्षित प्रोफ़ाइल', 'All pending profiles', 1)} ${ic('arrow', 's')}</a></div>`;
    $('#readAll').onclick = async (ev) => { ev.stopPropagation(); await api('POST', '/api/admin/notifications/read', { all: true }).catch(() => {}); S.notifs.unread = 0; updateBell(); d.remove(); };
    $$('.nt', d).forEach((b) => b.onclick = () => { api('POST', '/api/admin/notifications/read', { ids: [b.dataset.n] }).then(pollNotifs).catch(() => {}); d.remove(); go(b.dataset.type === 'INTEREST' ? '#/admin/interests' : '#/admin/review/' + b.dataset.pid); });
  };
}
const notifTitle = (n) => ({ NEW_PROFILE: L('नई प्रोफ़ाइल जमा हुई', 'New profile submitted'), PROFILE_UPDATED: L('प्रोफ़ाइल में बदलाव', 'Profile updated'), INTEREST: L('नई रुचि', 'New interest') }[n.Type] || n.Title);
async function pollNotifs() { if (!isAdmin()) return; try { const r = await api('GET', '/api/admin/notifications'); const grew = r.unread > S.notifs.unread; S.notifs = r; updateBell(grew); } catch {} }
function updateBell(ring) { const d = $('#bellDot'); if (!d) return; d.hidden = !S.notifs.unread; d.textContent = S.notifs.unread; const b = $('#bellWrap'); if (ring && b) { b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring'); } $('#bell') && $('#bell').setAttribute('aria-label', `${L('सूचनाएँ', 'Notifications', 1)}: ${S.notifs.unread}`); }
document.addEventListener('click', (e) => { const d = $('.dropdown'); if (d && !e.target.closest('#bellWrap')) { d.remove(); $('#bell')?.setAttribute('aria-expanded', 'false'); } });

/* =================== CUSTOMER: DASHBOARD =================== */
async function loadMe(force) { if (!S.me || force) { const r = await api('GET', '/api/me'); S.me = r; S.user = { ...S.user, ...r.user }; setSession(S.token, S.user); } return S.me; }
const completion = (p) => { const k = ['Name', 'Phone', 'DOB', 'HeightFtIn', 'MaritalStatus', 'FatherName', 'FatherJob', 'MotherName', 'Brothers', 'Sisters', 'NativePlace', 'City', 'Gotra1', 'Gotra2', 'Gotra3', 'Gotra4', 'Education', 'Occupation', 'JobPlace', 'BirthPlace', 'Complexion', 'About']; return Math.round(k.filter((x) => p[x]).length / k.length * 100); };
async function userHome() {
  const me = await loadMe(true); const ps = me.profiles; const approved = ps.filter((p) => p.Status === 'Approved');
  let sug = [];
  if (approved.length) { try { const pick = approved.find((p) => p.ProfileID === S.forPid) || approved[0]; const m = await api('GET', '/api/matches?for=' + encodeURIComponent(pick.ProfileID)); sug = m.items.filter((p) => !p.clash.length).sort((a, b) => b.score - a.score).slice(0, 3); } catch {} }
  let ints = { sent: [], received: [] }; try { ints = await api('GET', '/api/interests/mine'); } catch {}
  const first = ps.find((p) => p.ForWhom === 'Self') || ps[0];
  const pct = first ? completion(first) : 0;
  const hero = !first ? `<section class="welcome c8"><div class="ringc"><svg viewBox="0 0 128 128"><circle cx="64" cy="64" r="54" stroke="rgba(255,255,255,.15)" stroke-width="12" fill="none"/></svg><b>0%</b><small>${L('पूरी', 'done')}</small></div><div><span class="script">Shubh Aarambh</span><h2>${L('अपनी प्रोफ़ाइल भरें', 'Fill your profile')}</h2><p>${L('प्रोफ़ाइल भरने और ब्यूरो की स्वीकृति के बाद आपको गोत्र-सुरक्षित मिलान दिखेंगे।', 'After you fill the profile and the bureau approves it, you will see gotra-safe matches.')}</p><a href="#/app/form" class="btn btn-g">${ic('plus', 's')}${L('प्रोफ़ाइल भरें', 'Fill profile', 1)}</a></div></section>`
    : `<section class="welcome c8"><div class="ringc"><svg viewBox="0 0 128 128"><circle cx="64" cy="64" r="54" stroke="rgba(255,255,255,.15)" stroke-width="12" fill="none"/><circle cx="64" cy="64" r="54" stroke="#F7D58A" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="339.3" stroke-dashoffset="${339.3 * (1 - pct / 100)}"/></svg><b>${pct}%</b><small>${L('पूरी', 'done')}</small></div>
      <div><span class="script">Shubh Aarambh</span><h2>${pct >= 90 ? L('प्रोफ़ाइल पूरी है', 'Profile complete') : L('प्रोफ़ाइल को और बेहतर बनाएँ', 'Make your profile stronger')}</h2><p>${pct >= 90 ? L('बढ़िया! पूरी प्रोफ़ाइल से परिवारों को भरोसा होता है।', 'Great — complete profiles earn more trust.') : L('जन्म स्थान, नौकरी की जगह और भाई-बहन की जानकारी जोड़ने से प्रोफ़ाइल 100% होगी।', 'Add birth place, job location and sibling details to reach 100%.')}</p><a href="#/app/form/${esc(first.ProfileID)}" class="btn btn-g">${ic('edit', 's')}${L('प्रोफ़ाइल बदलें', 'Edit profile', 1)}</a></div></section>`;
  const st = first ? first.Status : '';
  const tl = [['done', 'check', L('प्रोफ़ाइल जमा', 'Profile submitted'), first ? fmtDate(first.CreatedAt) : ''], [st === 'Approved' || st === 'Rejected' ? 'done' : first ? 'cur' : '', 'phone', L('ब्यूरो जाँच', 'Bureau check'), st === 'Pending' ? L('ब्यूरो जल्द आपसे बात करेगा', 'The bureau will call you soon') : ''], [st === 'Approved' ? 'done' : '', st === 'Rejected' ? 'x' : 'shield', st === 'Rejected' ? L('अस्वीकृत', 'Not approved') : L('स्वीकृत', 'Approved'), st === 'Approved' ? L('अब आपको मिलान दिखते हैं', 'You can now see matches') : st === 'Rejected' ? esc(first.RejectReason) : '']];
  return `<div class="ph"><div><h1>${L('नमस्ते', 'Hello')}, ${esc(S.user.name.split(' ')[0])} ${L('जी', '')}</h1><p>${L('आपकी प्रोफ़ाइल और रिश्तों का हाल।', 'Your profiles and matches at a glance.')}</p></div>${approved.length ? `<a href="#/app/matches" class="btn btn-p">${ic('heart')}${L('मिलान देखें', 'See matches', 1)}</a>` : ''}</div>
  ${st === 'Rejected' ? `<div class="banner bad">${ic('alert', 's')}<span>${L('प्रोफ़ाइल स्वीकृत नहीं हुई', 'Profile not approved')}: <b>${esc(first.RejectReason)}</b> — ${L('सुधार कर दोबारा जमा करें।', 'please correct and resubmit.')}</span><a class="link" href="#/app/form/${esc(first.ProfileID)}">${L('सुधारें', 'Fix now', 1)}</a></div>` : ''}
  <div class="dgrid">${hero}
    <section class="card card-p c4"><div class="card-h"><h3>${L('स्वीकृति की स्थिति', 'Approval status')}</h3>${first ? statusBadge(st) : ''}</div>
      ${first ? `<div class="timeline">${tl.map(([c, i, t, s]) => `<div class="tl ${c}"><span class="d">${ic(i, 's')}</span><div><b>${t}</b><small>${s}</small></div></div>`).join('')}</div>` : `<p class="muted">${L('अभी कोई प्रोफ़ाइल नहीं।', 'No profile yet.')}</p>`}</section>
    <section class="card card-p c8"><div class="card-h"><h3>${L('आपके लिए सबसे अच्छे मिलान', 'Best matches for you')}</h3>${approved.length ? `<a href="#/app/matches" class="link">${L('सभी देखें', 'See all', 1)} ${ic('arrow', 's')}</a>` : ''}</div>
      ${sug.length ? `<div class="mini-grid">${sug.map((p) => pcard(p)).join('')}</div>` : `<div class="empty" style="padding:32px"><div class="ei">${ic('heart', 'l')}</div><p class="muted">${approved.length ? L('अभी कोई मिलान नहीं।', 'No matches yet.') : errMsg({ code: 'NOT_APPROVED_YET' })}</p></div>`}</section>
    <section class="card card-p c4"><div class="card-h"><h3>${L('परिवार की प्रोफ़ाइल', 'Family profiles')}</h3></div>
      <div style="display:flex;flex-direction:column;gap:10px">${ps.map((p) => `<a class="fam" href="#/app/form/${esc(p.ProfileID)}">${av(p)}<div class="t"><b>${esc(p.Name)}</b><small>${tv('ForWhom', p.ForWhom)}${p.Age ? ', ' + p.Age + ' ' + L('वर्ष', 'yrs') : ''}</small></div>${statusBadge(p.Status)}</a>`).join('')}
        <a href="#/app/form" class="add-fam">${ic('plus')}${L('भाई-बहन की प्रोफ़ाइल जोड़ें', 'Add a sibling’s profile', 1)}</a></div>
      <div class="card-h" style="margin:24px 0 10px"><h3>${L('हाल की रुचियाँ', 'Recent interests')}</h3></div>
      ${[...ints.received.map((x) => ({ ...x, k: 'got' })), ...ints.sent].slice(0, 3).map((x) => `<a class="fam" href="#/app/p/${esc(x.other.ProfileID)}" style="margin-bottom:8px">${av(x.other)}<div class="t"><b>${esc(x.other.Name)}</b><small>${x.k === 'got' ? L('आपके लिए रुचि आई', 'Interested in you') : L('आपने रुचि भेजी', 'You sent interest')}, ${ago(x.at)}</small></div><span class="badge b-gold">${tv('Interest', x.status)}</span></a>`).join('') || `<p class="muted small">${L('अभी कोई रुचि नहीं।', 'No interests yet.')}</p>`}
    </section></div>`;
}

/* =================== CUSTOMER: MATCHES =================== */
let M = { items: [], for: null };
function filtered() {
  const f = S.F; let r = M.items.filter((p) => (!p.Age || (+p.Age >= f.amin && +p.Age <= f.amax)));
  if (f.q) { const q = f.q.trim().toLowerCase(); r = r.filter((p) => [p.Name, p.City, p.Occupation, p.Education, p.NativePlace].join(' ').toLowerCase().includes(q)); }
  if (f.edu.length) r = r.filter((p) => f.edu.includes(p.EduLevel));
  if (f.city.length) r = r.filter((p) => f.city.some((c) => [p.City, p.NativePlace].join(' ').includes(c)));
  if (f.hideClash) r = r.filter((p) => !p.clash.length);
  r.sort(f.sort === 'age' ? (a, b) => (+a.Age || 99) - (+b.Age || 99) : f.sort === 'new' ? (a, b) => String(b.CreatedAt).localeCompare(String(a.CreatedAt)) : (a, b) => b.score - a.score);
  return r;
}
function topCities() { const c = {}; M.items.forEach((p) => { if (p.City) c[p.City] = (c[p.City] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 10).map((x) => x[0]); }
function filterPanel(sheet) {
  const f = S.F; const cities = [...new Set([...topCities(), ...f.city])];
  return `<aside class="filters ${sheet ? 'sheet' : ''}" aria-label="Filters" id="${sheet ? 'fsheet' : 'fpanel'}">
    <h3>${L('फ़िल्टर', 'Filters', 1)} <button class="link" data-reset style="min-height:36px;font-family:var(--f-body)">${L('साफ़ करें', 'Clear', 1)}</button></h3>
    <div class="fgroup"><label class="lbl" for="fq${sheet ? 2 : 1}">${L('नाम, शहर या काम', 'Name, city or work', 1)}</label><div class="inp-ic">${ic('search')}<input id="fq${sheet ? 2 : 1}" class="inp" data-f="q" value="${esc(f.q)}" placeholder="${L('जैसे: अजमेर', 'e.g. Ajmer', 1)}"></div></div>
    <div class="fgroup"><span class="lbl">${L('उम्र', 'Age', 1)}</span><div class="range2"><select class="inp" data-f="amin" aria-label="Min age">${[18, 20, 22, 24, 26, 28, 30, 32].map((a) => `<option ${a == f.amin ? 'selected' : ''}>${a}</option>`).join('')}</select><span class="muted">${L('से', 'to', 1)}</span><select class="inp" data-f="amax" aria-label="Max age">${[24, 26, 28, 30, 32, 35, 40, 50].map((a) => `<option ${a == f.amax ? 'selected' : ''}>${a}</option>`).join('')}</select></div></div>
    <div class="fgroup"><span class="lbl">${L('शिक्षा', 'Education', 1)}</span><div class="chips">${Object.keys(V.EduLevel).map((e) => `<button class="chip" data-chip="edu" data-v="${e}" aria-pressed="${f.edu.includes(e)}">${tv('EduLevel', e)}</button>`).join('')}</div></div>
    <div class="fgroup"><span class="lbl">${L('शहर', 'City', 1)}</span><div class="chips">${cities.map((c) => `<button class="chip" data-chip="city" data-v="${esc(c)}" aria-pressed="${f.city.includes(c)}">${esc(c)}</button>`).join('') || `<span class="muted small">—</span>`}</div></div>
    <div class="fgroup"><label class="switch"><input type="checkbox" data-f="hideClash" ${f.hideClash ? 'checked' : ''}><i></i><span>${L('गोत्र टकराव वाली प्रोफ़ाइल छिपाएँ', 'Hide profiles with a gotra clash')}</span></label><span class="help">${L('आपके गोत्र', 'Your gotras')}: ${esc((M.for && M.for.gotras || []).filter(Boolean).join(', '))}</span></div>
    ${sheet ? `<button class="btn btn-p btn-lg" data-close-sheet>${L('परिणाम देखें', 'Show results', 1)}</button>` : ''}
  </aside>`;
}
function results() {
  const r = filtered(); const f = S.F; const shown = r.slice(0, S.page * 24);
  const act = [...f.edu.map((v) => ['edu', v, tv('EduLevel', v)]), ...f.city.map((v) => ['city', v, v])];
  return `<div class="rbar"><div class="cnt"><b>${r.length}</b> ${L('रिश्ते मिले', 'matches', 1)}</div>
    <div style="display:flex;gap:10px;align-items:center"><button class="btn btn-o mfab" id="openF">${ic('sliders')}${L('फ़िल्टर', 'Filters', 1)}${act.length ? ` (${act.length})` : ''}</button>
    <select class="inp" data-f="sort" aria-label="Sort" style="min-height:44px;width:auto"><option value="best" ${f.sort === 'best' ? 'selected' : ''}>${L('सबसे अच्छा मेल', 'Best match', 1)}</option><option value="age" ${f.sort === 'age' ? 'selected' : ''}>${L('उम्र (कम से ज़्यादा)', 'Age (low to high)', 1)}</option><option value="new" ${f.sort === 'new' ? 'selected' : ''}>${L('नई प्रोफ़ाइल', 'Newest', 1)}</option></select></div></div>
  ${act.length ? `<div class="active-f" style="margin:-6px 0 18px">${act.map(([k, v, t]) => `<span class="badge b-rose">${esc(t)}<button aria-label="Remove ${esc(t)}" data-chip="${k}" data-v="${esc(v)}">${ic('x', 's')}</button></span>`).join('')}</div>` : ''}
  ${r.length ? `<div class="cgrid">${shown.map((p) => pcard(p)).join('')}</div>${r.length > shown.length ? `<div style="text-align:center;margin-top:24px"><button class="btn btn-o btn-lg" id="more">${L('और दिखाएँ', 'Show more', 1)} (${r.length - shown.length})</button></div>` : ''}`
    : `<div class="empty"><div class="ei">${ic('search', 'l')}</div><h3 class="h3">${L('इन फ़िल्टर से कोई रिश्ता नहीं मिला', 'No matches for these filters')}</h3><p class="muted" style="margin:6px 0 18px">${L('उम्र की सीमा बढ़ाएँ या कुछ फ़िल्टर हटाएँ।', 'Widen the age range or remove some filters.')}</p><button class="btn btn-p" data-reset>${L('सभी फ़िल्टर हटाएँ', 'Clear all filters', 1)}</button></div>`}`;
}
async function matches() {
  const me = await loadMe(); const approved = me.profiles.filter((p) => p.Status === 'Approved');
  if (!approved.length) return `<div class="ph"><div><h1>${L('आपके लिए मिलान', 'Your matches')}</h1></div></div><div class="empty"><div class="ei">${ic('clock', 'l')}</div><h3 class="h3">${errMsg({ code: 'NOT_APPROVED_YET' })}</h3><p class="muted" style="margin:6px 0 18px">${me.profiles.length ? L('आपकी प्रोफ़ाइल जाँच में है।', 'Your profile is being reviewed.') : L('पहले अपनी प्रोफ़ाइल भरें।', 'Fill your profile first.')}</p><a class="btn btn-p" href="${me.profiles.length ? '#/app' : '#/app/form'}">${me.profiles.length ? L('डैशबोर्ड', 'Dashboard', 1) : L('प्रोफ़ाइल भरें', 'Fill profile', 1)}</a></div>`;
  if (!approved.some((p) => p.ProfileID === S.forPid)) S.forPid = approved[0].ProfileID;
  const r = await api('GET', '/api/matches?for=' + encodeURIComponent(S.forPid)); M = r; S.page = 1;
  return `<div class="ph"><div><h1>${L('आपके लिए मिलान', 'Your matches')}</h1><p>${L('केवल ब्यूरो से स्वीकृत और गोत्र-सुरक्षित प्रोफ़ाइल।', 'Only bureau-approved, gotra-safe profiles.')}</p></div>
    ${approved.length > 1 ? `<div class="field" style="min-width:240px"><label for="forSel">${L('किसके लिए मिलान', 'Matches for', 1)}</label><select id="forSel" class="inp">${approved.map((p) => `<option value="${esc(p.ProfileID)}" ${p.ProfileID === S.forPid ? 'selected' : ''}>${esc(p.Name)} (${tv('ForWhom', p.ForWhom)})</option>`).join('')}</select></div>` : ''}</div>
  <div class="mlayout">${filterPanel(false)}<section id="res" aria-live="polite">${results()}</section></div>`;
}
function bindMatches() {
  const root = $('#main'); if (!$('#res')) return;
  const upd = () => { $('#res').innerHTML = results(); bindRes(); };
  const bindRes = () => { $('#openF') && ($('#openF').onclick = openSheet); $('#more') && ($('#more').onclick = () => { S.page++; upd(); }); };
  const onChange = (e) => { const t = e.target; const k = t.dataset.f; if (!k) return; S.F[k] = t.type === 'checkbox' ? t.checked : (k === 'amin' || k === 'amax') ? +t.value : t.value; S.page = 1; upd(); };
  root.oninput = (e) => { if (e.target.dataset.f === 'q') onChange(e); };
  root.onchange = (e) => { if (e.target.id === 'forSel') { S.forPid = e.target.value; store.set('rmb_for', S.forPid); render(true); return; } if (e.target.dataset.f && e.target.dataset.f !== 'q') onChange(e); };
  root.onclick = (e) => {
    const c = e.target.closest('[data-chip]'); if (c) { const k = c.dataset.chip, v = c.dataset.v, a = S.F[k]; const i = a.indexOf(v); i < 0 ? a.push(v) : a.splice(i, 1); $$(`.chip[data-chip="${k}"]`).forEach((x) => x.setAttribute('aria-pressed', a.includes(x.dataset.v))); S.page = 1; upd(); }
    if (e.target.closest('[data-reset]')) { S.F = { q: '', amin: 18, amax: 50, edu: [], city: [], hideClash: true, sort: 'best' }; $('#fpanel').outerHTML = filterPanel(false); upd(); toast(L('फ़िल्टर साफ़ किए गए', 'Filters cleared', 1), 'info'); }
  };
  function openSheet() { document.body.insertAdjacentHTML('beforeend', '<div class="sheet-bg" id="sbg"></div>'); root.insertAdjacentHTML('beforeend', filterPanel(true)); const close = () => { $('#sbg')?.remove(); $('#fsheet')?.remove(); $('#fpanel').outerHTML = filterPanel(false); upd(); }; $('#sbg').onclick = close; $('[data-close-sheet]').onclick = close; $('#fsheet input,#fsheet select')?.focus(); }
  bindRes();
}

/* =================== PROFILE VIEW (shared) =================== */
function profileView(p, ctx) {
  const adminMode = ctx.admin; const mine = ctx.for;
  const row = (a, b) => `<div><dt>${a}</dt><dd>${b ? esc(b) : '—'}</dd></div>`;
  const sec = (i, t, rows) => `<div class="card card-p"><div class="sec-t">${ic(i)}${t}</div><dl class="dl">${rows.join('')}</dl></div>`;
  const gl = [L('स्वयं', 'Self'), L('माँ', 'Mother'), L('दादी', 'Grandmother'), L('नानी', 'Maternal gm.')];
  const theirs = [p.Gotra1, p.Gotra2, p.Gotra3, p.Gotra4]; const clash = p.clash || [];
  return {
    hero: `<div class="pd-hero"><div class="pd-cover"></div><div class="pd-in">${av(p)}<div class="t"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">${adminMode ? statusBadge(p.Status) : `<span class="badge b-ok">${ic('shield', 's')}${L('ब्यूरो सत्यापित', 'Bureau verified', 1)}</span>`}<span class="badge b-mute">${tv('ForWhom', p.ForWhom)}</span>${adminMode && p.Source ? `<span class="badge b-mute">${esc(p.Source === 'legacy' ? L('पुरानी सूची', 'Old list') : p.Source === 'admin' ? L('एडमिन ने जोड़ी', 'Added by admin') : L('वेबसाइट', 'Website'))}</span>` : ''}</div><h1>${esc(p.Name)}</h1>
      <div class="facts"><span>${ic('cal', 's')}${p.Age ? esc(p.Age) + ' ' + L('वर्ष', 'yrs') : '—'}</span><span>${ic('ruler', 's')}${esc(p.HeightFtIn || '—')}</span><span>${ic('grad', 's')}${esc(p.Education || '—')}</span><span>${ic('brief', 's')}${esc(p.Occupation || '—')}</span><span>${ic('pin', 's')}${esc(p.City || '—')}</span></div></div>
      ${adminMode ? '' : `<div class="acts"><button class="btn btn-p" id="sendI" ${ctx.sent ? 'disabled' : ''} data-busy="${L('भेजा जा रहा है…', 'Sending…', 1)}">${ic('heart')}${ctx.sent ? L('रुचि भेजी जा चुकी', 'Interest sent', 1) : L('रुचि भेजें', 'Send interest', 1)}</button></div>`}</div></div>`,
    body: [sec('user', L('व्यक्तिगत जानकारी', 'Personal details'), [row(L('उम्र', 'Age', 1), p.Age && p.Age + ' ' + L('वर्ष', 'yrs')), row(L('कद', 'Height', 1), p.HeightFtIn), row(L('वैवाहिक स्थिति', 'Marital status', 1), tv('MaritalStatus', p.MaritalStatus)), row(L('मांगलिक', 'Manglik', 1), p.Manglik && tv('Manglik', p.Manglik)), row(L('रंग', 'Complexion', 1), p.Complexion && tv('Complexion', p.Complexion)), row(L('वज़न', 'Weight', 1), p.Weight && p.Weight + ' kg'), row(L('जन्म स्थान', 'Birth place', 1), p.BirthPlace), row(L('मूल निवास', 'Native place', 1), p.NativePlace), row(L('वर्तमान शहर', 'Current city', 1), p.City), ...(adminMode ? [row(L('जन्मतिथि', 'Date of birth', 1), p.DOB && fmtDate(p.DOB)), row(L('जन्म समय', 'Birth time', 1), p.BirthTime)] : [])]),
      sec('family', L('परिवार', 'Family'), [row(L('पिता का नाम', "Father's name", 1), p.FatherName), row(L('पिता का काम', "Father's work", 1), p.FatherJob), row(L('माता का नाम', "Mother's name", 1), p.MotherName), row(L('माता का काम', "Mother's work", 1), p.MotherJob), row(L('भाई', 'Brothers', 1), p.Brothers), row(L('बहन', 'Sisters', 1), p.Sisters)]),
      sec('grad', L('शिक्षा व काम', 'Education & work'), [row(L('शिक्षा', 'Education', 1), p.Education), row(L('स्तर', 'Level', 1), tv('EduLevel', p.EduLevel)), row(L('व्यवसाय', 'Occupation', 1), p.Occupation), row(L('काम का स्थान', 'Work place', 1), p.JobPlace), row(L('मासिक आय', 'Monthly income', 1), p.Income && tv('Income', p.Income))]),
      p.About ? `<div class="card card-p"><div class="sec-t">${ic('file')}${L('अन्य जानकारी', 'About')}</div><p style="white-space:pre-line">${esc(p.About)}</p></div>` : ''].join(''),
    gotra: `<div class="card card-p"><div class="sec-t">${ic('family')}${L('गोत्र मिलान', 'Gotra check')}</div><p class="muted small" style="margin-bottom:12px">${mine ? L(`${esc(mine.Name)} के गोत्र बनाम इनके गोत्र`, `${esc(mine.Name)}'s gotras vs theirs`) : L('चारों गोत्र', 'All four gotras')}</p>
      <div class="cmp">${gl.map((l, i) => { const bad = mine && clash.includes(theirs[i]); return `<div class="r ${bad ? 'bad' : ''}"><small>${l}</small>${mine ? `<span>${esc(mine.gotras[i] || '—')}</span><b>${esc(theirs[i] || '—')}</b>` : `<b style="grid-column:span 2">${esc(theirs[i] || '—')}</b>`}<span class="${bad ? 'no' : 'ok'}">${mine && theirs[i] ? ic(bad ? 'x' : 'check', 's') : ''}</span></div>`; }).join('')}</div>
      ${mine ? (clash.length ? `<p class="gtag bad" style="margin-top:12px">${ic('alert', 's')}${L('गोत्र टकराव', 'Gotra clash')}: ${esc(clash.join(', '))}</p>` : `<p class="gtag ok" style="margin-top:12px">${ic('check', 's')}${L('चारों गोत्र अलग — रिश्ता संभव', 'All four differ — match possible')}</p>`) : ''}</div>`,
    score: p.score ? `<div class="card card-p"><div class="card-h" style="margin-bottom:10px"><h3>${L('मेल', 'Match', 1)}</h3><b class="en" style="font-size:30px;color:var(--primary)">${p.score}%</b></div><div class="meter"><i style="width:${p.score}%"></i></div><p class="small muted" style="margin-top:10px">${L('उम्र, शहर, शिक्षा और गोत्र के आधार पर।', 'Based on age, city, education and gotra.')}</p></div>` : '',
    lock: `<div class="locked"><span class="li">${ic('lock')}</span><div><b style="color:var(--ink)">${L('संपर्क ब्यूरो के माध्यम से', 'Contact through the bureau')}</b><p class="small muted">${L('फ़ोन नंबर और पता गोपनीय हैं। रुचि भेजने पर ब्यूरो दोनों परिवारों से बात करेगा।', 'Phone and address are private. When you send interest, the bureau talks to both families.')}</p></div></div>`
  };
}
async function profileDetail(id) {
  if (!S.forPid) { const me = await loadMe(); const a = me.profiles.find((p) => p.Status === 'Approved'); if (a) S.forPid = a.ProfileID; }
  const r = await api('GET', `/api/profiles/${encodeURIComponent(id)}?for=${encodeURIComponent(S.forPid)}`);
  if (r.own) { go('#/app/form/' + id); return ''; }
  S.cur = { id, for: r.for };
  const v = profileView(r.profile, { for: r.for, sent: r.sent });
  return `<a href="#/app/matches" class="link" style="margin-bottom:12px">${ic('left', 's')}${L('मिलान पर वापस', 'Back to matches', 1)}</a>${v.hero}<div class="pd-grid"><div style="display:flex;flex-direction:column;gap:20px">${v.body}</div><div style="display:flex;flex-direction:column;gap:20px">${v.score}${v.gotra}${v.lock}</div></div>`;
}
function bindProfile() {
  const b = $('#sendI'); if (!b) return;
  b.onclick = () => busy(b, async () => {
    try { await api('POST', '/api/interests', { fromProfileId: S.cur.for.ProfileID, toProfileId: S.cur.id }); toast(L('रुचि भेज दी गई। ब्यूरो जल्द दोनों परिवारों से बात करेगा।', 'Interest sent. The bureau will talk to both families soon.')); }
    catch (e) { if (e.code !== 'ALREADY_SENT') throw toast(errMsg(e), 'bad'); }
  }).then(() => { if (document.contains(b)) { b.innerHTML = ic('check') + L('रुचि भेजी जा चुकी', 'Interest sent', 1); b.disabled = true; } }).catch(() => {});
}

/* =================== CUSTOMER: INTERESTS =================== */
async function userInterests() {
  const r = await api('GET', '/api/interests/mine'); S.ints = r; S.itab = S.itab || 'sent';
  return `<div class="ph"><div><h1>${L('मेरी रुचियाँ', 'My interests')}</h1><p>${L('भेजी और मिली रुचियाँ। आगे की बात ब्यूरो करता है।', 'Sent and received interests. The bureau takes it forward.')}</p></div></div>
  <div class="tabs-u" role="tablist"><button role="tab" data-itab="sent" aria-selected="${S.itab === 'sent'}">${L('भेजी', 'Sent', 1)} <span class="badge b-rose">${r.sent.length}</span></button><button role="tab" data-itab="received" aria-selected="${S.itab === 'received'}">${L('मिली', 'Received', 1)} <span class="badge b-mute">${r.received.length}</span></button></div>
  <div id="ilist">${interestList()}</div>`;
}
function interestList() {
  const list = S.ints[S.itab];
  if (!list.length) return `<div class="empty"><div class="ei">${ic('inbox', 'l')}</div><h3 class="h3">${L('अभी कुछ नहीं', 'Nothing here yet')}</h3><p class="muted" style="margin:6px 0 18px">${S.itab === 'sent' ? L('मिलान में किसी प्रोफ़ाइल पर "रुचि भेजें" दबाएँ।', 'Press "Send interest" on a profile in Matches.') : L('जब कोई परिवार रुचि भेजेगा, यहाँ दिखेगा।', 'When a family sends interest, it appears here.')}</p><a href="#/app/matches" class="btn btn-p">${L('मिलान देखें', 'See matches', 1)}</a></div>`;
  return `<div style="display:flex;flex-direction:column;gap:12px">${list.map((x) => `<div class="fam card" style="padding:16px">${av(x.other)}<div class="t"><b>${esc(x.other.Name)}${x.other.Age ? ', ' + esc(x.other.Age) : ''}</b><small>${esc([x.other.Education, x.other.Occupation, x.other.City].filter(Boolean).join(', '))} · ${S.itab === 'sent' ? L('के लिए', 'for') + ' ' + esc((x.from || {}).Name || '') : L('के लिए', 'for') + ' ' + esc((x.to || {}).Name || '')} · ${ago(x.at)}</small></div><span class="badge b-gold">${tv('Interest', x.status)}</span>${S.itab === 'sent' ? `<a href="#/app/p/${esc(x.other.ProfileID)}" class="btn btn-o btn-sm">${L('देखें', 'View', 1)}</a>` : ''}</div>`).join('')}</div>`;
}
function bindInterests() { $$('[data-itab]').forEach((b) => b.onclick = () => { S.itab = b.dataset.itab; $$('[data-itab]').forEach((x) => x.setAttribute('aria-selected', x === b)); $('#ilist').innerHTML = interestList(); }); }

/* =================== PROFILE FORM =================== */
const STEPS = () => [[L('किसके लिए', 'For whom', 1), L('प्रोफ़ाइल किसकी है', 'Whose profile')], [L('व्यक्तिगत', 'Personal', 1), L('नाम, जन्म, कद', 'Name, birth, height')], [L('परिवार', 'Family', 1), L('माता-पिता, भाई-बहन', 'Parents, siblings')], [L('गोत्र', 'Gotra', 1), L('चारों गोत्र', 'All four gotras')], [L('शिक्षा व काम', 'Education & work', 1), L('पढ़ाई, नौकरी', 'Study, job')], [L('समीक्षा', 'Review', 1), L('जाँचें और जमा करें', 'Check and submit')]];
const STEP_OF = { ForWhom: 0, Gender: 0, Name: 1, Phone: 1, Phone2: 1, DOB: 1, HeightFtIn: 1, MaritalStatus: 1, FatherName: 2, MotherName: 2, NativePlace: 2, City: 2, Gotra1: 3, Gotra2: 3, Gotra3: 3, Gotra4: 3, Education: 4, EduLevel: 4, Occupation: 4 };
const HEIGHTS = []; for (let f = 4; f <= 6; f++) for (let i = 0; i < 12; i++) if (!(f === 4 && i < 6) && !(f === 6 && i > 6)) HEIGHTS.push(`${f}'${i}"`);
let W = null;
function fld(k, label, o = {}) {
  const v = W.d[k] ?? ''; const req = o.req ? ' <span class="req">*</span>' : '';
  let inner;
  if (o.opts) inner = `<select id="w-${k}" name="${k}" class="inp" ${o.req ? 'required' : ''}><option value="">${L('चुनें', 'Select', 1)}</option>${o.opts.map(([val, t]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}${v && !o.opts.some(([val]) => String(val) === String(v)) ? `<option selected value="${esc(v)}">${esc(v)}</option>` : ''}</select>`;
  else if (o.area) inner = `<textarea id="w-${k}" name="${k}" class="inp" maxlength="600" ${o.req ? 'required' : ''} placeholder="${esc(o.ph || '')}">${esc(v)}</textarea>`;
  else inner = `<input id="w-${k}" name="${k}" class="inp" value="${esc(v)}" type="${o.type || 'text'}" ${o.req ? 'required' : ''} ${o.attrs || ''} placeholder="${esc(o.ph || '')}" maxlength="${o.max || 120}">`;
  return `<div class="field ${o.cls || ''}"><label for="w-${k}">${label}${req}</label>${inner}${o.help ? `<span class="help">${o.help}</span>` : ''}<span class="err">${ic('alert', 's')}${o.err || L('यह जानकारी ज़रूरी है', 'This is required')}</span></div>`;
}
const opts = (g) => Object.keys(V[g]).map((k) => [k, tv(g, k)]);
function wizardStep() {
  const d = W.d; const admin = isAdmin();
  const phoneAttrs = 'inputmode="numeric" maxlength="14" pattern="\\+?[0-9 ]{10,14}"';
  switch (W.step) {
    case 0: return `<h2>${L('प्रोफ़ाइल किसके लिए है?', 'Who is this profile for?')}</h2><p>${L('आप अपनी, या अपने भाई-बहन और रिश्तेदारों की प्रोफ़ाइल एक ही खाते से भर सकते हैं।', 'You can fill profiles for yourself, siblings or relatives from one account.')}</p><div class="wform">
      <div class="fgroup"><span class="lbl">${L('किसके लिए', 'For', 1)} <span class="req">*</span></span><div class="for-chips">${Object.keys(V.ForWhom).map((x) => `<button type="button" class="chip" data-for="${x}" aria-pressed="${d.ForWhom === x}">${tv('ForWhom', x)}</button>`).join('')}</div></div>
      <div class="fgroup"><span class="lbl">${L('प्रोफ़ाइल प्रकार', 'Profile type', 1)} <span class="req">*</span></span><div class="for-chips">${[['F', L('वधू (लड़की)', 'Bride (girl)', 1)], ['M', L('वर (लड़का)', 'Groom (boy)', 1)]].map(([k, x]) => `<button type="button" class="chip" data-gender="${k}" aria-pressed="${d.Gender === k}">${x}</button>`).join('')}</div><span class="err" id="gErr" style="display:none">${ic('alert', 's')}${L('वधू या वर चुनें', 'Choose bride or groom')}</span></div>
      ${d.ForWhom && d.ForWhom !== 'Self' ? `<div class="locked"><span class="li">${ic('phone')}</span><div><b style="color:var(--ink)">${L(`${tv('ForWhom', d.ForWhom)} का नाम और मोबाइल ज़रूरी है`, `Name and mobile of the ${tv('ForWhom', d.ForWhom).toLowerCase()} are required`)}</b><p class="small muted">${L('ब्यूरो इसी नंबर पर बात करके प्रोफ़ाइल सत्यापित करेगा।', 'The bureau verifies the profile by calling this number.')}</p></div></div>` : ''}
      <div class="grid2">${fld('Name', L('पूरा नाम', 'Full name', 1), { req: true, ph: L('जैसे: कविता रावत', 'e.g. Kavita Rawat') })}${fld('Phone', L('मोबाइल नंबर', 'Mobile number', 1), { req: true, attrs: phoneAttrs, err: errMsg({ code: 'BAD_PHONE' }), help: L('केवल ब्यूरो को दिखेगा', 'Only the bureau sees it') })}</div></div>`;
    case 1: return `<h2>${L('व्यक्तिगत जानकारी', 'Personal details')}</h2><p>${L('जो जानकारी * से चिह्नित है, वह ज़रूरी है।', 'Fields marked * are required.')}</p><div class="wform">
      <div class="grid3">${fld('DOB', L('जन्मतिथि', 'Date of birth', 1), { req: true, type: 'date', attrs: `max="${new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10)}"`, err: errMsg({ code: 'BAD_DOB' }) })}${fld('BirthTime', L('जन्म समय', 'Birth time', 1), { type: 'time' })}${fld('BirthPlace', L('जन्म स्थान', 'Birth place', 1))}</div>
      <div class="grid3">${fld('HeightFtIn', L('कद', 'Height', 1), { req: true, opts: HEIGHTS.map((h) => [h, h]) })}${fld('Weight', L('वज़न (किलो)', 'Weight (kg)', 1), { type: 'number', attrs: 'min="30" max="150"' })}${fld('MaritalStatus', L('वैवाहिक स्थिति', 'Marital status', 1), { req: true, opts: opts('MaritalStatus') })}</div>
      <div class="grid3">${fld('Manglik', L('मांगलिक', 'Manglik', 1), { opts: opts('Manglik') })}${fld('Complexion', L('रंग', 'Complexion', 1), { opts: opts('Complexion') })}${fld('Phone2', L('दूसरा मोबाइल', 'Second mobile', 1), { attrs: phoneAttrs, err: errMsg({ code: 'BAD_PHONE' }) })}</div></div>`;
    case 2: return `<h2>${L('परिवार की जानकारी', 'Family details')}</h2><p>${L('माता-पिता कहाँ रहते हैं, क्या काम करते हैं — परिवार यही सबसे पहले पूछते हैं।', 'Where the parents live and what they do — families ask this first.')}</p><div class="wform">
      <div class="grid2">${fld('FatherName', L('पिता का नाम', "Father's name", 1), { req: true })}${fld('FatherJob', L('पिता का काम', "Father's work", 1), { ph: L('जैसे: किसान, सरकारी नौकरी', 'e.g. farmer, govt job') })}</div>
      <div class="grid2">${fld('MotherName', L('माता का नाम', "Mother's name", 1), { req: true })}${fld('MotherJob', L('माता का काम', "Mother's work", 1), { ph: L('जैसे: गृहिणी', 'e.g. homemaker') })}</div>
      <div class="grid2">${fld('Brothers', L('भाई (कितने, विवाहित?)', 'Brothers (how many, married?)', 1), { ph: L('जैसे: 2, एक विवाहित', 'e.g. 2, one married') })}${fld('Sisters', L('बहन (कितनी, विवाहित?)', 'Sisters (how many, married?)', 1), { ph: L('जैसे: 1, अविवाहित', 'e.g. 1, unmarried') })}</div>
      <div class="grid2">${fld('NativePlace', L('मूल निवास (गाँव / तहसील)', 'Native place (village / tehsil)', 1), { req: true })}${fld('City', L('वर्तमान शहर', 'Current city', 1), { req: true, attrs: 'list="cityList"' })}</div>
      ${fld('Address', L('वर्तमान पता', 'Current address', 1), { area: true, help: L('पता किसी उपयोगकर्ता को नहीं दिखता, केवल ब्यूरो को।', 'Only the bureau sees the address.') })}</div><datalist id="cityList">${CITIES.map((c) => `<option value="${c}">`).join('')}</datalist>`;
    case 3: return `<h2>${L('चारों गोत्र', 'All four gotras')}</h2><p>${L('गोत्र से ही सुरक्षित मिलान होता है। सूची से चुनें या लिखें।', 'Safe matching depends on gotras. Pick from the list or type it.')}</p><div class="wform">
      <div class="grid2">${[['Gotra1', L('स्वयं का गोत्र', 'Own gotra', 1)], ['Gotra2', L('माँ का गोत्र', "Mother's gotra", 1)], ['Gotra3', L('दादी का गोत्र', "Grandmother's gotra", 1)], ['Gotra4', L('नानी का गोत्र', "Maternal grandmother's gotra", 1)]].map(([k, l]) => fld(k, l, { req: true, attrs: 'list="gotraList" autocomplete="off"', max: 60 })).join('')}</div>
      <div class="gotra-viz" id="gprev">${gprev()}</div></div><datalist id="gotraList">${GOTRAS.map((g) => `<option value="${g}">`).join('')}</datalist>`;
    case 4: return `<h2>${L('शिक्षा और काम', 'Education & work')}</h2><p>${L('पढ़ाई और नौकरी की जानकारी से फ़िल्टर सही काम करते हैं।', 'Education and work make the filters accurate.')}</p><div class="wform">
      <div class="grid2">${fld('EduLevel', L('शिक्षा का स्तर', 'Education level', 1), { req: true, opts: opts('EduLevel') })}${fld('Education', L('डिग्री / कोर्स', 'Degree / course', 1), { req: true, ph: L('जैसे: B.Com, M.A. हिंदी', 'e.g. B.Com, M.A.') })}</div>
      <div class="grid2">${fld('Occupation', L('व्यवसाय / नौकरी', 'Occupation / job', 1), { req: true, ph: L('जैसे: प्राइवेट जॉब, शिक्षक', 'e.g. private job, teacher') })}${fld('JobPlace', L('काम कहाँ करते हैं', 'Where they work', 1), { ph: L('कंपनी / शहर', 'Company / city') })}</div>
      ${fld('Income', L('मासिक आय', 'Monthly income', 1), { opts: opts('Income') })}
      ${fld('About', L('कुछ और बताना चाहें', 'Anything else', 1), { area: true, ph: L('पसंद, परिवार की अपेक्षा आदि', 'Preferences, family expectations, etc.') })}</div>`;
    default: return W.done ? `<div class="success"><div class="si"><svg class="ic" viewBox="0 0 24 24">${P.check}</svg></div><span class="script">Shubhkamnayein</span><h2 style="margin-top:6px">${admin && d.approve !== false ? L('प्रोफ़ाइल जोड़ दी गई और स्वीकृत है', 'Profile added and approved') : W.edit ? L('बदलाव सेव हो गए', 'Changes saved') : L('प्रोफ़ाइल जमा हो गई!', 'Profile submitted!')}</h2><p class="muted" style="max-width:46ch;margin:10px auto 24px">${admin ? L('डेटाबेस में सेव हो गया।', 'Saved to the database.') : L('ब्यूरो 1–2 दिन में फ़ोन पर बात करके प्रोफ़ाइल स्वीकृत करेगा। स्वीकृति के बाद मिलान दिखेंगे।', 'The bureau will call within 1–2 days and approve the profile. Matches appear after approval.')}</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a href="${admin ? '#/admin/profiles' : '#/app'}" class="btn btn-p">${admin ? L('प्रोफ़ाइल सूची', 'Profile list', 1) : L('डैशबोर्ड पर जाएँ', 'Go to dashboard', 1)}</a><a class="btn btn-o" href="${admin ? '#/admin/add' : '#/app/form'}" id="another">${ic('plus', 's')}${L('एक और प्रोफ़ाइल', 'Add another', 1)}</a></div></div>`
      : `<h2>${L('समीक्षा करें', 'Review')}</h2><p>${L('जमा करने से पहले एक बार सब जाँच लें।', 'Check everything once before submitting.')}</p><div class="wform">
      <div class="rev">${[[L('व्यक्तिगत', 'Personal', 1), 1, [d.Name, d.Phone && phoneTxt(d.Phone), d.DOB && fmtDate(d.DOB), d.HeightFtIn, d.MaritalStatus && tv('MaritalStatus', d.MaritalStatus)]], [L('परिवार', 'Family', 1), 2, [d.FatherName && L('पिता: ', 'Father: ') + d.FatherName, d.MotherName && L('माता: ', 'Mother: ') + d.MotherName, d.NativePlace, d.City]], [L('गोत्र', 'Gotra', 1), 3, [d.Gotra1, d.Gotra2, d.Gotra3, d.Gotra4]], [L('शिक्षा व काम', 'Education & work', 1), 4, [d.Education, d.Occupation, d.JobPlace]]].map(([t, s, v]) => `<div class="card"><h4>${t}<button type="button" class="btn btn-t btn-sm" data-jump="${s}">${ic('edit', 's')}${L('बदलें', 'Edit', 1)}</button></h4><p>${v.filter(Boolean).map(esc).join('<br>') || `<span class="muted">${L('अभी नहीं भरा', 'Not filled yet')}</span>`}</p></div>`).join('')}</div>
      ${admin ? `<div class="sa-box"><label class="switch"><input type="checkbox" id="approveNow" ${d.approve !== false ? 'checked' : ''}><i></i><span><b style="color:var(--ink)">${L('सीधे स्वीकृत करें', 'Approve directly', 1)}</b> — ${L('एडमिन द्वारा जोड़ी गई प्रोफ़ाइल को अलग से जाँचने की ज़रूरत नहीं', 'no separate review for admin-added profiles')}</span></label></div>`
        : `<label class="check"><input type="checkbox" id="consent"> <span>${L('मैं पुष्टि करता/करती हूँ कि दी गई जानकारी सही है और ब्यूरो इस नंबर पर बात कर सकता है।', 'I confirm the details are correct and the bureau may call this number.')}</span></label>${W.edit ? `<p class="help">${L('बदलाव के बाद प्रोफ़ाइल दोबारा जाँच के लिए जाएगी।', 'After changes, the profile goes for review again.')}</p>` : ''}`}</div>`;
  }
}
function gprev() { const d = W.d; return [['Gotra1', L('स्वयं', 'Self')], ['Gotra2', L('माँ', 'Mother')], ['Gotra3', L('दादी', 'Grandmother')], ['Gotra4', L('नानी', 'Maternal gm.')]].map(([k, l]) => `<div class="gv"><small>${l}</small><b>${esc(d[k] || '—')}</b><div class="st">${d[k] ? `<span class="gtag ok">${ic('check', 's')}${L('भरा', 'Filled')}</span>` : `<span class="vs">${L('बाकी', 'Pending')}</span>`}</div></div>`).join(''); }
async function prepWizard(editId) {
  const key = (isAdmin() ? 'a:' : 'u:') + (editId || 'new');
  if (!W || W.key !== key) {
    W = { key, step: 0, d: { ForWhom: 'Self', approve: true }, done: false, edit: editId || '' };
    if (editId) { const r = isAdmin() ? await api('GET', '/api/admin/profiles/' + encodeURIComponent(editId)) : await api('GET', '/api/profiles/' + encodeURIComponent(editId)); W.d = { ...r.profile }; W.owner = r.owner; }
    else { const dr = !isAdmin() && store.get('rmb_draft'); if (dr) { try { W.d = { ...W.d, ...JSON.parse(dr) }; } catch {} }
      else if (!isAdmin()) { const me = await loadMe(); if (!me.profiles.some((p) => p.ForWhom === 'Self')) { W.d.Name = S.user.name; W.d.Phone = S.user.phone; } else W.d.ForWhom = 'Brother'; } }
  }
}
async function wizard(editId) { await prepWizard(editId); return wizardHTML(editId); }
function wizardHTML(editId) {
  const s = W.step, n = STEPS().length, done = W.done, admin = isAdmin();
  return `<div class="ph"><div><h1>${editId ? L('प्रोफ़ाइल बदलें', 'Edit profile') : admin ? L('नई प्रोफ़ाइल जोड़ें', 'Add a profile') : L('प्रोफ़ाइल भरें', 'Fill profile')}</h1><p>${L(`कदम ${Math.min(s + 1, n)} / ${n}`, `Step ${Math.min(s + 1, n)} of ${n}`)}${editId && W.d.Status ? ' · ' + tv('Status', W.d.Status) : ''}</p></div>${!editId && !admin && !done ? `<button class="btn btn-o" id="saveDraft">${ic('file', 's')}${L('ड्राफ़्ट सेव करें', 'Save draft', 1)}</button>` : ''}</div>
  ${editId && W.d.Status === 'Rejected' && W.d.RejectReason ? `<div class="banner bad">${ic('alert', 's')}<span>${L('अस्वीकृत होने का कारण', 'Reason for rejection')}: <b>${esc(W.d.RejectReason)}</b></span></div>` : ''}
  <div class="wz"><nav class="stepper" aria-label="Steps">${STEPS().map(([t, sub], i) => `<button type="button" class="${i === s && !done ? 'on' : i < s || done ? 'done' : ''}" data-jump="${i}" ${i === s ? 'aria-current="step"' : ''}><span class="sn">${i < s || done ? ic('check', 's') : i + 1}</span><span class="t"><b>${t}</b><small>${sub}</small></span></button>`).join('')}</nav>
  <section><div class="wbar" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round((done ? n : s) / n * 100)}"><i style="width:${(done ? n : s + .5) / n * 100}%"></i></div>
    <form class="wcard" id="wform" novalidate>${wizardStep()}
    <p class="form-err" id="wErr" role="alert" hidden></p>
    ${done ? '' : `<div class="wnav"><button type="button" class="btn btn-o" id="prev" ${s === 0 ? 'disabled' : ''}>${ic('left', 's')}${L('पीछे', 'Back', 1)}</button><button class="btn btn-p" data-busy="${L('सेव हो रहा है…', 'Saving…', 1)}">${s === n - 1 ? (editId ? L('बदलाव सेव करें', 'Save changes', 1) : admin ? L('प्रोफ़ाइल जोड़ें', 'Add profile', 1) : L('ब्यूरो को जमा करें', 'Submit to bureau', 1)) : L('आगे बढ़ें', 'Next', 1)} ${ic(s === n - 1 ? 'check' : 'right', 's')}</button></div>`}</form></section></div>`;
}
function bindWizard(editId) {
  const f = $('#wform'); if (!f) return;
  const re = () => { $('#main').innerHTML = wizardHTML(editId); bindWizard(editId); scrollTo({ top: 0, behavior: 'smooth' }); };
  const save = (e) => { const t = e.target; if (!t.name) return; W.d[t.name] = t.value; if (/^Gotra\d$/.test(t.name)) $('#gprev').innerHTML = gprev(); if (t.closest('.invalid')) validate(t); if (!editId && !isAdmin()) store.set('rmb_draft', JSON.stringify(W.d)); };
  f.oninput = save; f.onchange = save;
  $$('[data-for]', f).forEach((b) => b.onclick = () => { W.d.ForWhom = b.dataset.for; if (['Sister', 'Daughter'].includes(b.dataset.for)) W.d.Gender = 'F'; if (['Brother', 'Son'].includes(b.dataset.for)) W.d.Gender = 'M'; if (b.dataset.for !== 'Self' && W.d.Name === S.user.name) { W.d.Name = ''; W.d.Phone = ''; } re(); });
  $$('[data-gender]', f).forEach((b) => b.onclick = () => { W.d.Gender = b.dataset.gender; $$('[data-gender]').forEach((x) => x.setAttribute('aria-pressed', x === b)); $('#gErr').style.display = 'none'; });
  $$('[data-jump]').forEach((b) => b.onclick = (e) => { e.preventDefault(); W.step = +b.dataset.jump; W.done = false; re(); });
  $('#prev') && ($('#prev').onclick = () => { W.step--; re(); });
  $('#saveDraft') && ($('#saveDraft').onclick = () => { store.set('rmb_draft', JSON.stringify(W.d)); toast(L('ड्राफ़्ट इस डिवाइस पर सेव हो गया', 'Draft saved on this device')); });
  $('#approveNow') && ($('#approveNow').onchange = (e) => { W.d.approve = e.target.checked; });
  $('#another') && ($('#another').onclick = () => { W = null; });
  f.onsubmit = async (e) => {
    e.preventDefault(); $('#wErr').hidden = true;
    const bad = $$('[required]', f).filter((i) => !validate(i));
    if (W.step === 0 && !W.d.Gender) { $('#gErr').style.display = 'flex'; bad.push($('[data-gender]')); }
    if (bad.length) { bad[0].focus(); return; }
    if (W.step < STEPS().length - 1) { W.step++; re(); return; }
    if (!isAdmin() && !$('#consent').checked) { $('#consent').focus(); $('#wErr').textContent = L('पुष्टि वाले बॉक्स पर टिक करें', 'Please tick the confirmation box'); $('#wErr').hidden = false; return; }
    const body = { ...W.d }; ['ProfileID', 'Status', 'OwnerUserID', 'CreatedAt', 'UpdatedAt', 'ReviewedAt', 'ReviewedBy', 'AdminNote', 'RejectReason', 'Source', 'LegacyRef', 'Age', 'HeightCm', '_row', 'clash', 'score'].forEach((k) => delete body[k]);
    await busy(f.querySelector('.btn-p'), async () => {
      try {
        if (isAdmin()) await (editId ? api('PUT', '/api/admin/profiles/' + encodeURIComponent(editId), body) : api('POST', '/api/admin/profiles', body));
        else await (editId ? api('PUT', '/api/profiles/' + encodeURIComponent(editId), body) : api('POST', '/api/profiles', body));
        store.set('rmb_draft', null); S.me = null; W.done = true; re();
      } catch (err) {
        $('#wErr').textContent = errMsg(err); $('#wErr').hidden = false; toast(errMsg(err), 'bad');
        const fl = err.fields || []; const st = Math.min(...fl.map((k) => STEP_OF[k] ?? 9)); if (st < 9 && st !== W.step) { W.step = st; re(); }
        setTimeout(() => markFields($('#wform'), fl), 50);
      }
    });
  };
}

/* =================== ADMIN: OVERVIEW =================== */
const actText = (a) => { const m = { SIGNUP: L('ने खाता बनाया', 'signed up'), PROFILE_CREATE: L('ने प्रोफ़ाइल जमा की', 'submitted a profile'), PROFILE_EDIT: L('ने प्रोफ़ाइल बदली', 'edited a profile'), APPROVE: L('ने प्रोफ़ाइल स्वीकृत की', 'approved a profile'), REJECT: L('ने प्रोफ़ाइल अस्वीकृत की', 'rejected a profile'), DELETE: L('ने प्रोफ़ाइल हटाई', 'deleted a profile'), INTEREST_SEND: L('ने रुचि भेजी', 'sent an interest'), INTEREST_STATUS: L('ने रुचि की स्थिति बदली', 'updated an interest'), USER_CREATE: L('ने नया उपयोगकर्ता बनाया', 'created a user'), USER_UPDATE: L('ने उपयोगकर्ता बदला', 'updated a user'), ADMIN_PROFILE_CREATE: L('ने प्रोफ़ाइल जोड़ी', 'added a profile'), ADMIN_PROFILE_EDIT: L('ने प्रोफ़ाइल संपादित की', 'edited a profile'), PASSWORD_CHANGE: L('ने पासवर्ड बदला', 'changed password') }; return m[a.Action] || a.Action; };
const actIcon = (a) => ({ APPROVE: ['check', 'var(--ok-soft)', 'var(--ok)'], REJECT: ['x', 'var(--bad-soft)', 'var(--bad)'], DELETE: ['trash', 'var(--bad-soft)', 'var(--bad)'], INTEREST_SEND: ['heart', 'var(--gold-soft)', 'var(--accent)'] }[a.Action] || ['userplus', 'var(--primary-soft)', 'var(--primary)']);
async function adminHome() {
  const [st, pend] = await Promise.all([api('GET', '/api/admin/stats'), api('GET', '/api/admin/profiles?status=Pending')]);
  const mx = Math.max(4, ...st.days.map((d) => d.M + d.F)); const dn = (d) => new Date(d + 'T00:00:00').toLocaleDateString(S.lang === 'en' ? 'en-IN' : 'hi-IN', { weekday: 'short' });
  return `<div class="ph"><div><h1>${L('एडमिन अवलोकन', 'Admin overview')}</h1><p>${L('आज क्या बाकी है, एक नज़र में।', "What's pending today, at a glance.")}</p></div><div style="display:flex;gap:10px;flex-wrap:wrap"><a href="#/admin/add" class="btn btn-o">${ic('plus')}${L('प्रोफ़ाइल जोड़ें', 'Add profile', 1)}</a>${S.user.superAdmin ? `<a href="#/admin/users" class="btn btn-p">${ic('userplus')}${L('नया उपयोगकर्ता', 'New user', 1)}</a>` : ''}</div></div>
  <div class="kpis">${[['users', st.total, L('कुल प्रोफ़ाइल', 'Total profiles'), 'var(--primary-soft)', 'var(--primary)'], ['clock', st.pending, L('स्वीकृति बाकी', 'Awaiting approval'), 'var(--warn-soft)', 'var(--warn)'], ['heart', st.interestsWeek, L('इस हफ़्ते रुचियाँ', 'Interests this week'), 'var(--gold-soft)', 'var(--accent)'], ['check', st.settledMonth, L('इस महीने रिश्ते तय', 'Settled this month'), 'var(--ok-soft)', 'var(--ok)']].map(([i, n, l, bg, c]) => `<div class="kpi"><div class="top"><span class="ki" style="background:${bg};color:${c}">${ic(i)}</span></div><b>${n}</b><span>${l}</span></div>`).join('')}</div>
  <div class="dgrid">
    <section class="card card-p c8"><div class="card-h"><h3>${L('स्वीकृति की कतार', 'Approval queue')}</h3><a href="#/admin/profiles" class="link">${L('सभी देखें', 'See all', 1)} ${ic('arrow', 's')}</a></div><div id="queue">${pend.items.length ? pend.items.slice(0, 8).map(qrow).join('') : emptyQ()}</div></section>
    <section class="card card-p c4"><div class="card-h"><h3>${L('हाल की गतिविधि', 'Recent activity')}</h3></div>${st.activity.length ? st.activity.slice(0, 7).map((a) => { const [i, bg, c] = actIcon(a); return `<div class="act"><span class="ai" style="background:${bg};color:${c}">${ic(i, 's')}</span><div><p><b>${esc(a.UserName || '—')}</b> ${actText(a)}</p><small>${ago(a.Time)}</small></div></div>`; }).join('') : `<p class="muted small">—</p>`}</section>
    <section class="card card-p c12"><div class="card-h"><h3>${L('पिछले 7 दिन में नई प्रोफ़ाइल', 'New profiles, last 7 days')}</h3></div>
      <div class="chart" role="img" aria-label="${st.days.map((d) => `${d.date}: ${d.M + d.F}`).join(', ')}">${st.days.map((d) => `<div class="col" tabindex="0"><span class="tip">${dn(d.date)}: ${d.M} ${L('वर', 'grooms')}, ${d.F} ${L('वधू', 'brides')}</span><div class="bar" style="height:${Math.max(2, (d.M + d.F) / mx * 100)}%"><i style="flex:${d.M || 0.0001};background:#BE185D"></i><i style="flex:${d.F || 0.0001};background:#D4A63A"></i></div><small>${dn(d.date)}</small></div>`).join('')}</div>
      <div class="legend"><span><i style="background:#BE185D"></i>${L('वर', 'Grooms')}</span><span><i style="background:#D4A63A"></i>${L('वधू', 'Brides')}</span></div></section></div>`;
}
const emptyQ = () => `<div class="empty" style="padding:36px"><div class="ei">${ic('check', 'l')}</div><h3 class="h3">${L('सब काम पूरा!', 'All done!')}</h3><p class="muted">${L('कोई प्रोफ़ाइल स्वीकृति के लिए बाकी नहीं है।', 'No profiles waiting for approval.')}</p></div>`;
const qrow = (p) => `<div class="q" data-q="${esc(p.ProfileID)}">${av(p)}<div class="t"><b>${esc(p.Name)}${p.Age ? ', ' + esc(p.Age) : ''}</b><small>${tv('Gender', p.Gender)}, ${esc(p.City || '—')}, ${tv('ForWhom', p.ForWhom)} · ${ago(p.CreatedAt)}</small></div><div class="acts"><a href="#/admin/review/${esc(p.ProfileID)}" class="btn btn-o btn-sm">${ic('eye', 's')}${L('जाँचें', 'Review', 1)}</a><button class="btn btn-ok btn-sm" data-ap="${esc(p.ProfileID)}" data-name="${esc(p.Name)}" data-busy="…">${ic('check', 's')}${L('स्वीकृत', 'Approve', 1)}</button><button class="btn btn-bad btn-sm btn-icon" data-rj="${esc(p.ProfileID)}" data-name="${esc(p.Name)}" aria-label="${L('अस्वीकृत करें', 'Reject', 1)}: ${esc(p.Name)}">${ic('x', 's')}</button></div></div>`;
function bindQueue() {
  $$('[data-ap]').forEach((b) => b.onclick = () => busy(b, () => decide(b.dataset.ap, 'Approved', '', b.dataset.name)));
  $$('[data-rj]').forEach((b) => b.onclick = () => rejectModal(b.dataset.rj, b.dataset.name));
}
async function decide(id, decision, reason, name, note) {
  try {
    await api('POST', `/api/admin/profiles/${encodeURIComponent(id)}/review`, { decision, reason, note });
    toast(decision === 'Approved' ? L(`${name} की प्रोफ़ाइल स्वीकृत — अब मिलान में दिखेगी`, `${name} approved — now visible in matches`) : L(`${name} की प्रोफ़ाइल अस्वीकृत`, `${name} rejected`), decision === 'Approved' ? 'ok' : 'info');
    pollNotifs();
    const row = $(`[data-q="${CSS.escape(id)}"]`);
    if (row) { row.classList.add('leaving'); setTimeout(() => { row.remove(); if (!$$('.q').length && $('#queue')) $('#queue').innerHTML = emptyQ(); }, 430); }
    else if (location.hash.startsWith('#/admin/review')) go('#/admin'); else render(true);
  } catch (e) { toast(errMsg(e), 'bad'); }
}
function rejectModal(id, name) {
  const reasons = [L('गोत्र अधूरे / गलत', 'Gotras incomplete / wrong'), L('फ़ोन पर बात नहीं हो पाई', 'Could not reach by phone'), L('जानकारी अधूरी', 'Incomplete details'), L('डुप्लिकेट प्रोफ़ाइल', 'Duplicate profile')];
  modal(L('प्रोफ़ाइल अस्वीकृत करें', 'Reject profile', 1), `<p>${L(`${esc(name)} की प्रोफ़ाइल अस्वीकृत करने का कारण चुनें। यह कारण उपयोगकर्ता को दिखेगा।`, `Choose why ${esc(name)}'s profile is rejected. The member will see this reason.`)}</p>
    <div class="for-chips" id="rr">${reasons.map((r) => `<button type="button" class="chip" aria-pressed="false">${r}</button>`).join('')}</div>
    <div class="field"><label for="rnote">${L('कारण / नोट', 'Reason / note', 1)}</label><textarea id="rnote" class="inp" maxlength="200" placeholder="${L('जैसे: नानी का गोत्र नहीं भरा', "e.g. maternal grandmother's gotra missing")}"></textarea></div>`,
  `<button class="btn btn-o" data-close>${L('रद्द करें', 'Cancel', 1)}</button><button class="btn btn-p" id="doRj" style="background:var(--bad)">${ic('x', 's')}${L('अस्वीकृत करें', 'Reject', 1)}</button>`,
  (bg, close) => { $$('#rr .chip', bg).forEach((c) => c.onclick = () => { $$('#rr .chip', bg).forEach((x) => x.setAttribute('aria-pressed', x === c)); $('#rnote', bg).value = c.textContent; });
    $('#doRj', bg).onclick = () => { const why = $('#rnote', bg).value.trim(); if (!why) { $('#rnote', bg).closest('.field').classList.add('invalid'); $('#rnote', bg).focus(); toast(L('कारण चुनें या लिखें', 'Choose or write a reason'), 'bad'); return; } close(); decide(id, 'Rejected', why, name); }; });
}

/* =================== ADMIN: REVIEW =================== */
async function adminReview(id) {
  const r = await api('GET', '/api/admin/profiles/' + encodeURIComponent(id)); const p = r.profile; S.cur = p;
  const v = profileView(p, { admin: true }); const ph = p.Phone || (r.owner && r.owner.phone) || '';
  return `<a href="#/admin/profiles" class="link" style="margin-bottom:12px">${ic('left', 's')}${L('सूची पर वापस', 'Back to list', 1)}</a>${v.hero}
  <div class="rv-grid"><div style="display:flex;flex-direction:column;gap:20px">${v.body}${v.gotra}</div>
  <aside class="card card-p verify"><div class="card-h"><h3>${L('सत्यापन', 'Verification')}</h3>${statusBadge(p.Status)}</div>
    <dl class="dl" style="grid-template-columns:1fr"><div><dt>${L('संपर्क', 'Contact', 1)}</dt><dd>${phoneTxt(ph)}${p.Phone2 ? ', ' + phoneTxt(p.Phone2) : ''}</dd></div>${r.owner ? `<div><dt>${L('खाता', 'Account', 1)}</dt><dd>${esc(r.owner.name)} (${phoneTxt(r.owner.phone)})</dd></div>` : ''}${p.Address ? `<div><dt>${L('पता', 'Address', 1)}</dt><dd>${esc(p.Address)}</dd></div>` : ''}<div><dt>${L('जमा किया', 'Submitted', 1)}</dt><dd>${fmtDate(p.CreatedAt)}</dd></div>${p.ReviewedBy ? `<div><dt>${L('जाँचा', 'Reviewed by', 1)}</dt><dd>${esc(p.ReviewedBy)} · ${fmtDate(p.ReviewedAt)}</dd></div>` : ''}${p.RejectReason ? `<div><dt>${L('कारण', 'Reason', 1)}</dt><dd>${esc(p.RejectReason)}</dd></div>` : ''}</dl>
    ${ph ? `<div class="contact-row"><a class="btn btn-o" href="tel:+91${esc(ph)}">${ic('phone', 's')}${L('फ़ोन करें', 'Call', 1)}</a><a class="btn btn-o" href="https://wa.me/91${esc(ph)}" target="_blank" rel="noopener">${ic('msg', 's')}WhatsApp</a></div>` : ''}
    <p class="lbl" style="margin:6px 0 10px">${L('जाँच सूची', 'Checklist', 1)}</p>
    ${[L('परिवार से फ़ोन पर बात हुई', 'Spoke to the family by phone'), L('चारों गोत्र पक्के किए', 'Confirmed all four gotras'), L('उम्र और शिक्षा सही है', 'Age and education are correct')].map((t) => `<label class="check"><input type="checkbox" class="vchk"> <span>${t}</span></label>`).join('')}
    <div class="field" style="margin:12px 0 16px"><label for="anote">${L('एडमिन नोट (केवल एडमिन को दिखेगा)', 'Admin note (admins only)', 1)}</label><textarea id="anote" class="inp" maxlength="500">${esc(p.AdminNote || '')}</textarea></div>
    <div style="display:flex;flex-direction:column;gap:10px">${p.Status !== 'Approved' ? `<button class="btn btn-ok btn-lg" id="rvAp" data-busy="${L('स्वीकृत हो रहा है…', 'Approving…', 1)}">${ic('check')}${L('स्वीकृत करें', 'Approve', 1)}</button>` : ''}${p.Status !== 'Rejected' ? `<button class="btn btn-bad" id="rvRj">${ic('x')}${L('अस्वीकृत करें', 'Reject', 1)}</button>` : ''}
    <div style="display:flex;gap:10px"><a href="#/admin/edit/${esc(id)}" class="btn btn-t" style="flex:1">${ic('edit', 's')}${L('संपादित करें', 'Edit', 1)}</a><button class="btn btn-t" style="flex:1;color:var(--bad)" id="rvDel">${ic('trash', 's')}${L('हटाएँ', 'Delete', 1)}</button></div></div>
  </aside></div>`;
}
function bindReview(id) {
  const p = S.cur;
  $('#rvAp') && ($('#rvAp').onclick = () => { if ($$('.vchk').filter((c) => c.checked).length < 2) { toast(L('कम से कम फ़ोन और गोत्र वाली जाँच पर टिक करें', 'Tick at least the phone and gotra checks'), 'bad'); $('.vchk').focus(); return; } busy($('#rvAp'), () => decide(id, 'Approved', '', p.Name, $('#anote').value)); });
  $('#rvRj') && ($('#rvRj').onclick = () => rejectModal(id, p.Name));
  $('#rvDel').onclick = () => deleteModal(id, p.Name, () => go('#/admin/profiles'));
}
function deleteModal(id, name, after) {
  modal(L('प्रोफ़ाइल हटाएँ?', 'Delete profile?', 1), `<div class="locked" style="background:var(--bad-soft);border-color:#FCA5A5"><span class="li" style="color:var(--bad)">${ic('trash')}</span><div><b style="color:var(--ink)">${L(`${esc(name)} की प्रोफ़ाइल हमेशा के लिए हट जाएगी`, `${esc(name)}'s profile will be removed permanently`)}</b><p class="small muted">${L('यह वापस नहीं होगा। उससे जुड़ी रुचियाँ भी हट जाएँगी।', 'This cannot be undone. Related interests are removed too.')}</p></div></div>`,
  `<button class="btn btn-o" data-close>${L('रद्द करें', 'Cancel', 1)}</button><button class="btn btn-p" id="doDel" style="background:var(--bad)" data-busy="${L('हट रहा है…', 'Deleting…', 1)}">${ic('trash', 's')}${L('हाँ, हटाएँ', 'Yes, delete', 1)}</button>`,
  (bg, close) => $('#doDel', bg).onclick = () => busy($('#doDel', bg), async () => { try { await api('DELETE', '/api/admin/profiles/' + encodeURIComponent(id)); close(); toast(L(`${name} की प्रोफ़ाइल हटा दी गई`, `${name}'s profile deleted`), 'info'); after ? after() : render(true); } catch (e) { toast(errMsg(e), 'bad'); } }));
}

/* =================== ADMIN: PROFILES =================== */
async function adminProfiles() { const r = await api('GET', '/api/admin/profiles?status=all'); S.plist = r; if (S.ptab === 'Pending' && !r.counts.Pending && !S.ptabSet) S.ptab = 'all'; return profilesView(); }
function profilesView() {
  const r = S.plist; const q = S.pq.trim().toLowerCase();
  let rows = r.items.filter((p) => S.ptab === 'all' || p.Status === S.ptab);
  if (q) rows = rows.filter((p) => [p.Name, p.City, p.Phone, p.Occupation, p.Gotra1].join(' ').toLowerCase().includes(q));
  const per = 30, pages = Math.max(1, Math.ceil(rows.length / per)); S.ppage = Math.min(S.ppage, pages); const page = rows.slice((S.ppage - 1) * per, S.ppage * per);
  return `<div class="ph"><div><h1>${L('प्रोफ़ाइल', 'Profiles')}</h1><p>${L('सभी वधू और वर प्रोफ़ाइल।', 'All bride and groom profiles.')}</p></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-o" id="csvBtn" data-busy="${L('तैयार हो रहा है…', 'Preparing…', 1)}">${ic('file')}${L('CSV डाउनलोड', 'Download CSV', 1)}</button><a href="#/admin/add" class="btn btn-p">${ic('plus')}${L('नई प्रोफ़ाइल जोड़ें', 'Add profile', 1)}</a></div></div>
  <div class="tabs-u" role="tablist">${[['Pending', L('प्रतीक्षा में', 'Pending', 1)], ['all', L('सभी', 'All', 1)], ['Approved', L('स्वीकृत', 'Approved', 1)], ['Rejected', L('अस्वीकृत', 'Rejected', 1)]].map(([k, t]) => `<button role="tab" aria-selected="${S.ptab === k}" data-tab="${k}">${t} <span class="badge ${k === 'Pending' ? 'b-warn' : 'b-mute'}">${r.counts[k] ?? 0}</span></button>`).join('')}</div>
  <div class="tbl-wrap"><div class="toolbar"><div class="inp-ic">${ic('search')}<input class="inp" id="pq" value="${esc(S.pq)}" placeholder="${L('नाम, शहर, नंबर या गोत्र', 'Name, city, number or gotra', 1)}" aria-label="Search"></div><span class="muted small" id="pcount">${rows.length} ${L('प्रोफ़ाइल', 'profiles', 1)}</span></div>
  <div id="ptable">${page.length ? `<table class="tbl"><thead><tr><th>${L('नाम', 'Name', 1)}</th><th>${L('प्रकार', 'Type', 1)}</th><th>${L('शहर', 'City', 1)}</th><th>${L('मोबाइल', 'Mobile', 1)}</th><th>${L('गोत्र', 'Gotra', 1)}</th><th>${L('स्थिति', 'Status', 1)}</th><th style="text-align:right">${L('कार्य', 'Actions', 1)}</th></tr></thead><tbody>
  ${page.map((p) => `<tr><td class="c-who"><div class="who">${av(p)}<div><b>${esc(p.Name)}</b><small>${p.Age ? esc(p.Age) + ' ' + L('वर्ष', 'yrs') + ', ' : ''}${esc(p.Education || '')}</small></div></div></td><td data-l="${L('प्रकार', 'Type', 1)}">${tv('Gender', p.Gender)}</td><td data-l="${L('शहर', 'City', 1)}">${esc(p.City || '—')}</td><td data-l="${L('मोबाइल', 'Mobile', 1)}">${phoneTxt(p.Phone)}</td><td data-l="${L('गोत्र', 'Gotra', 1)}">${esc(p.Gotra1 || '—')}</td><td>${statusBadge(p.Status)}</td>
    <td class="c-act"><div class="ra"><a href="#/admin/review/${esc(p.ProfileID)}" class="btn btn-t btn-icon" aria-label="${L('देखें', 'View', 1)}: ${esc(p.Name)}" title="${L('देखें', 'View', 1)}">${ic('eye', 's')}</a><a href="#/admin/edit/${esc(p.ProfileID)}" class="btn btn-t btn-icon" aria-label="${L('संपादित करें', 'Edit', 1)}: ${esc(p.Name)}" title="${L('संपादित करें', 'Edit', 1)}">${ic('edit', 's')}</a><button class="btn btn-t btn-icon" style="color:var(--bad)" data-del="${esc(p.ProfileID)}" data-name="${esc(p.Name)}" aria-label="${L('हटाएँ', 'Delete', 1)}: ${esc(p.Name)}" title="${L('हटाएँ', 'Delete', 1)}">${ic('trash', 's')}</button></div></td></tr>`).join('')}
  </tbody></table>` : `<div class="empty" style="margin:16px"><div class="ei">${ic('search', 'l')}</div><h3 class="h3">${L('कोई प्रोफ़ाइल नहीं मिली', 'No profiles found')}</h3><p class="muted">${L('खोज बदलें या दूसरा टैब चुनें।', 'Change the search or pick another tab.')}</p></div>`}
  ${pages > 1 ? `<div class="pager"><button class="btn btn-o btn-sm" data-pg="-1" ${S.ppage === 1 ? 'disabled' : ''}>${ic('left', 's')}${L('पिछला', 'Prev', 1)}</button><span>${S.ppage} / ${pages}</span><button class="btn btn-o btn-sm" data-pg="1" ${S.ppage === pages ? 'disabled' : ''}>${L('अगला', 'Next', 1)}${ic('right', 's')}</button></div>` : ''}</div></div>`;
}
function bindProfiles() {
  const rer = (keepFocus) => { const pos = keepFocus && $('#pq').selectionStart; $('#main').innerHTML = profilesView(); bindProfiles(); if (keepFocus) { const n = $('#pq'); n.focus(); n.setSelectionRange(pos, pos); } };
  $$('[data-tab]').forEach((b) => b.onclick = () => { S.ptab = b.dataset.tab; S.ptabSet = true; S.ppage = 1; rer(); });
  let t; $('#pq').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { S.pq = e.target.value; S.ppage = 1; rer(true); }, 200); };
  $$('[data-pg]').forEach((b) => b.onclick = () => { S.ppage += +b.dataset.pg; rer(); scrollTo({ top: 0, behavior: 'smooth' }); });
  $$('[data-del]').forEach((b) => b.onclick = () => deleteModal(b.dataset.del, b.dataset.name));
  $('#csvBtn').onclick = () => busy($('#csvBtn'), async () => {
    try {
      const r = await fetch(API + '/api/admin/export.csv', { headers: { Authorization: 'Bearer ' + S.token } });
      if (!r.ok) throw Object.assign(new Error('x'), { code: (await r.json().catch(() => ({}))).code || 'SERVER_ERROR' });
      const url = URL.createObjectURL(await r.blob()); const a = document.createElement('a');
      a.href = url; a.download = `rawat-profiles-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(L('CSV डाउनलोड हो गई — Excel या Google Sheets में खोलें', 'CSV downloaded — open it in Excel or Google Sheets'));
    } catch (e) { toast(errMsg(e), 'bad'); }
  });
}

/* =================== ADMIN: USERS (super admin) =================== */
async function adminUsers() {
  const r = await api('GET', '/api/admin/users'); S.users = r.items;
  return `<div class="ph"><div><h1>${L('उपयोगकर्ता', 'Users')}</h1><p>${L('ग्राहक और एडमिन खाते। यह पन्ना केवल सुपर एडमिन को दिखता है।', 'Member and admin accounts. Only super admins see this page.')}</p></div><button class="btn btn-p" id="newU">${ic('userplus')}${L('नया उपयोगकर्ता', 'New user', 1)}</button></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${L('नाम', 'Name', 1)}</th><th>${L('मोबाइल', 'Mobile', 1)}</th><th>${L('ईमेल', 'Email', 1)}</th><th>${L('भूमिका', 'Role', 1)}</th><th>${L('आख़िरी लॉगिन', 'Last login', 1)}</th><th>${L('सक्रिय', 'Active', 1)}</th><th></th></tr></thead><tbody>
  ${r.items.map((u) => `<tr><td class="c-who"><div class="who">${av({ Name: u.name, Gender: 'M' }, 'round')}<div><b>${esc(u.name)}</b><small>${L('बनाया', 'Created by')}: ${esc(u.createdBy || '—')}</small></div></div></td><td data-l="${L('मोबाइल', 'Mobile', 1)}">${phoneTxt(u.phone)}</td><td data-l="${L('ईमेल', 'Email', 1)}">${esc(u.email || '—')}</td>
    <td>${u.role === 'admin' ? `<span class="badge b-rose">${ic(u.superAdmin ? 'crown' : 'shield', 's')}${u.superAdmin ? L('सुपर एडमिन', 'Super admin', 1) : L('एडमिन', 'Admin', 1)}</span>` : `<span class="badge b-mute">${L('ग्राहक', 'Member', 1)}</span>`}</td><td data-l="${L('लॉगिन', 'Login', 1)}">${u.lastLogin ? ago(u.lastLogin) : '—'}</td>
    <td><label class="switch"><input type="checkbox" data-act-u="${esc(u.id)}" ${u.active ? 'checked' : ''} ${u.id === S.user.id ? 'disabled' : ''} aria-label="${esc(u.name)}"><i></i><span class="small">${u.active ? L('सक्रिय', 'Active', 1) : L('बंद', 'Off', 1)}</span></label></td>
    <td class="c-act"><div class="ra"><button class="btn btn-t btn-sm" data-edit-u="${esc(u.id)}">${ic('edit', 's')}${L('बदलें', 'Edit', 1)}</button></div></td></tr>`).join('')}
  </tbody></table></div>`;
}
function userForm(u) {
  const edit = !!u;
  return `<div class="role-cards"><label class="role-card"><input type="radio" name="role" value="customer" ${!u || u.role !== 'admin' ? 'checked' : ''}><div><b>${L('ग्राहक', 'Member', 1)}</b><small>${L('प्रोफ़ाइल भरे और मिलान देखे', 'Fills profiles, sees matches')}</small></div></label><label class="role-card"><input type="radio" name="role" value="admin" ${u && u.role === 'admin' ? 'checked' : ''}><div><b>${L('एडमिन', 'Admin', 1)}</b><small>${L('प्रोफ़ाइल स्वीकृत / अस्वीकृत करे', 'Approves / rejects profiles')}</small></div></label></div>
    ${edit ? '' : `<div class="field"><label for="u-n">${L('पूरा नाम', 'Full name', 1)} <span class="req">*</span></label><input id="u-n" name="name" class="inp" required maxlength="80"><span class="err">${ic('alert', 's')}${L('नाम लिखें', 'Enter name')}</span></div>
    <div class="grid2"><div class="field"><label for="u-p">${L('मोबाइल', 'Mobile', 1)} <span class="req">*</span></label><input id="u-p" name="phone" class="inp" inputmode="numeric" maxlength="14" required pattern="\\+?[0-9 ]{10,14}"><span class="err">${ic('alert', 's')}${errMsg({ code: 'BAD_PHONE' })}</span></div><div class="field"><label for="u-e">${L('ईमेल', 'Email', 1)}</label><input id="u-e" name="email" class="inp" type="email"><span class="err">${ic('alert', 's')}${L('सही ईमेल लिखें', 'Enter a valid email')}</span></div></div>`}
    <div class="field"><label for="u-pw">${edit ? L('नया पासवर्ड (बदलना हो तो)', 'New password (only to reset)', 1) : L('अस्थायी पासवर्ड', 'Temporary password', 1) + ' <span class="req">*</span>'}</label><input id="u-pw" name="password" class="inp" ${edit ? '' : 'required'} minlength="6" value="${edit ? '' : 'Rawat@' + Math.floor(1000 + Math.random() * 9000)}"><span class="help">${L('पहली बार लॉगिन पर उपयोगकर्ता इसे बदलेगा।', 'The user is asked to change it at first login.')}</span><span class="err">${ic('alert', 's')}${errMsg({ code: 'PW_DIGIT' })}</span></div>
    <div class="sa-box ${u && u.role === 'admin' ? '' : 'off'}" id="saBox"><label class="check" style="padding:0"><input type="checkbox" id="u-sa" ${u && u.superAdmin ? 'checked' : ''} ${u && u.role === 'admin' ? '' : 'disabled'}> <span><b style="color:var(--ink)">${L('सुपर एडमिन', 'Super admin', 1)}</b><br><small class="muted">${L('यह एडमिन भी नए ग्राहक और एडमिन बना सकेगा।', 'This admin can also create members and admins.')}</small></span></label></div>`;
}
function bindUsers() {
  $$('[data-act-u]').forEach((c) => c.onchange = async () => { const u = S.users.find((x) => x.id === c.dataset.actU); try { await api('PUT', '/api/admin/users/' + encodeURIComponent(u.id), { active: c.checked }); c.parentElement.querySelector('span').textContent = c.checked ? L('सक्रिय', 'Active', 1) : L('बंद', 'Off', 1); toast(c.checked ? L(`${u.name} का खाता चालू`, `${u.name} enabled`) : L(`${u.name} का खाता बंद`, `${u.name} disabled`), c.checked ? 'ok' : 'info'); } catch (e) { c.checked = !c.checked; toast(errMsg(e), 'bad'); } });
  const mount = (u) => (bg, close) => {
    $$('[name=role]', bg).forEach((r) => r.onchange = () => { const a = $('[name=role]:checked', bg).value === 'admin'; $('#saBox', bg).classList.toggle('off', !a); $('#u-sa', bg).disabled = !a; if (!a) $('#u-sa', bg).checked = false; });
    $('#mkU', bg).onclick = async () => {
      const bad = $$('input[required]', bg).filter((i) => !validate(i)); const pw = $('#u-pw', bg); if (pw.value && !/\d/.test(pw.value)) { pw.closest('.field').classList.add('invalid'); bad.push(pw); } if (bad.length) return bad[0].focus();
      await busy($('#mkU', bg), async () => {
        const body = { role: $('[name=role]:checked', bg).value, superAdmin: $('#u-sa', bg).checked, ...(pw.value ? { password: pw.value } : {}) };
        try { if (u) await api('PUT', '/api/admin/users/' + encodeURIComponent(u.id), body); else await api('POST', '/api/admin/users', { ...body, name: $('#u-n', bg).value, phone: $('#u-p', bg).value, email: $('#u-e', bg).value });
          close(); toast(u ? L('बदलाव सेव हो गए', 'Saved') : L('उपयोगकर्ता बन गया — लॉगिन विवरण उन्हें भेजें', 'User created — share the login details with them')); render(true);
        } catch (e) { toast(errMsg(e), 'bad'); markFields(bg, e.fields); }
      });
    };
  };
  $('#newU').onclick = () => modal(L('नया उपयोगकर्ता बनाएँ', 'Create user', 1), userForm(), `<button class="btn btn-o" data-close>${L('रद्द करें', 'Cancel', 1)}</button><button class="btn btn-p" id="mkU" data-busy="${L('बन रहा है…', 'Creating…', 1)}">${ic('check', 's')}${L('उपयोगकर्ता बनाएँ', 'Create user', 1)}</button>`, mount(null));
  $$('[data-edit-u]').forEach((b) => b.onclick = () => { const u = S.users.find((x) => x.id === b.dataset.editU); modal(L('उपयोगकर्ता बदलें', 'Edit user', 1) + ': ' + esc(u.name), userForm(u), `<button class="btn btn-o" data-close>${L('रद्द करें', 'Cancel', 1)}</button><button class="btn btn-p" id="mkU" data-busy="${L('सेव हो रहा है…', 'Saving…', 1)}">${ic('check', 's')}${L('सेव करें', 'Save', 1)}</button>`, mount(u)); });
}

/* =================== ADMIN: INTERESTS =================== */
async function adminInterests() {
  const r = await api('GET', '/api/admin/interests');
  return `<div class="ph"><div><h1>${L('रुचि अनुरोध', 'Interest requests')}</h1><p>${L('दोनों परिवारों से बात करके स्थिति बदलें।', 'Talk to both families, then update the status.')}</p></div></div>
  ${r.items.length ? r.items.map((x) => `<div class="ist"><div class="pp">${av(x.from)}<div><b>${esc(x.from.Name)}${x.from.Age ? ', ' + esc(x.from.Age) : ''}</b><small>${esc(x.from.City || '—')} · <a class="link" style="min-height:0" href="tel:+91${esc(x.from.Phone)}">${phoneTxt(x.from.Phone)}</a></small></div></div><span class="hrt">${ic('heart', 's')}</span><div class="pp">${av(x.to)}<div><b>${esc(x.to.Name)}${x.to.Age ? ', ' + esc(x.to.Age) : ''}</b><small>${esc(x.to.City || '—')} · <a class="link" style="min-height:0" href="tel:+91${esc(x.to.Phone)}">${phoneTxt(x.to.Phone)}</a></small></div></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><select class="inp" style="min-height:44px;width:auto" aria-label="${L('स्थिति', 'Status', 1)}" data-ist="${esc(x.id)}">${Object.keys(V.Interest).map((o) => `<option value="${o}" ${o === x.status ? 'selected' : ''}>${tv('Interest', o)}</option>`).join('')}</select><small class="muted">${ago(x.at)}</small></div></div>`).join('')
    : `<div class="empty"><div class="ei">${ic('heart', 'l')}</div><h3 class="h3">${L('अभी कोई रुचि अनुरोध नहीं', 'No interest requests yet')}</h3></div>`}`;
}
function bindAdminInterests() { $$('[data-ist]').forEach((s) => s.onchange = async () => { try { await api('PUT', '/api/admin/interests/' + encodeURIComponent(s.dataset.ist), { status: s.value }); toast(L('स्थिति बदल दी गई', 'Status updated')); } catch (e) { toast(errMsg(e), 'bad'); } }); }

/* =================== ROUTER =================== */
let seq = 0, lastPath = '';
async function render(keepScroll) {
  const path = location.hash.startsWith('#/') ? location.hash.slice(1) : '/'; const v = $('#view'); const m = path.split('/');
  const newPage = path !== lastPath; lastPath = path; document.documentElement.lang = S.lang === 'en' ? 'en' : 'hi';
  window.onscroll = null; $('#modal-root').innerHTML = '';
  if (path === '/') { v.innerHTML = landing(); bindLanding(); finish(newPage && !keepScroll); return; }
  if (path === '/login' || path === '/signup') { if (S.token) { go(isAdmin() ? '#/admin' : '#/app'); return; } v.innerHTML = auth(path.slice(1)); bindAuth(path.slice(1)); finish(newPage); return; }
  if (!S.token) { toast(L('पहले लॉगिन करें', 'Please log in first'), 'info'); go('#/login'); return; }
  if (m[1] === 'admin' && !isAdmin()) { go('#/app'); return; }
  if (m[1] === 'app' && isAdmin() && m[2] !== 'p') { go('#/admin'); return; }
  const routes = {
    '/app': [userHome, '#/app'], '/app/matches': [matches, '#/app/matches', bindMatches], '/app/interests': [userInterests, '#/app/interests', bindInterests],
    '/app/form': [() => wizard(''), '#/app/form', () => bindWizard('')], '/admin': [adminHome, '#/admin', bindQueue], '/admin/profiles': [adminProfiles, '#/admin/profiles', bindProfiles],
    '/admin/users': [adminUsers, '#/admin/users', bindUsers], '/admin/interests': [adminInterests, '#/admin/interests', bindAdminInterests], '/admin/add': [() => wizard(''), '#/admin/add', () => bindWizard('')]
  };
  let r = routes[path];
  if (!r && m[1] === 'app' && m[2] === 'form' && m[3]) r = [() => wizard(m[3]), '#/app', () => bindWizard(m[3])];
  if (!r && m[2] === 'p' && m[3]) r = [() => profileDetail(m[3]), '#/app/matches', bindProfile];
  if (!r && m[2] === 'review' && m[3]) r = [() => adminReview(m[3]), '#/admin/profiles', () => bindReview(m[3])];
  if (!r && m[2] === 'edit' && m[3]) r = [() => wizard(m[3]), '#/admin/profiles', () => bindWizard(m[3])];
  if (!r) { go(isAdmin() ? '#/admin' : '#/app'); return; }
  if (newPage && (path === '/app/form' || path === '/admin/add')) W = null;
  const my = ++seq;
  if (!$('.shell') || newPage || keepScroll === true) { v.innerHTML = shell(r[1]); bindShell(); } else $('#main').innerHTML = loadingHTML();
  if (isAdmin() && !S.poll) { pollNotifs(); S.poll = setInterval(pollNotifs, 30000); }
  try { const html = await r[0](); if (my !== seq || !html) return; $('#main').innerHTML = html; r[2] && r[2](); }
  catch (e) { if (my !== seq) return; if (e.status === 401) return; $('#main').innerHTML = errorHTML(e); }
  finish(newPage && !keepScroll);
}
function finish(top) {
  if (top) scrollTo(0, 0);
  const els = $$('.rv:not(.in)'); if (!('IntersectionObserver' in window)) els.forEach((e) => e.classList.add('in'));
  else { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' }); els.forEach((e, i) => { if (!e.style.transitionDelay) e.style.transitionDelay = Math.min(i % 6, 5) * 60 + 'ms'; io.observe(e); }); }
  const h1 = $('h1'); document.title = (h1 && location.hash.length > 2 ? h1.textContent.trim() + ' — ' : '') + L('रावत विवाह ब्यूरो', 'Rawat Marriage Bureau', 1);
}
addEventListener('hashchange', () => { if (location.hash.length > 1 && !location.hash.startsWith('#/')) return; render(); });
api('GET', '/api/public/config').then((c) => { S.cfg = c; if (location.hash === '' || location.hash === '#/') render(true); }).catch(() => {});
render();
})();
