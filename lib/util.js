const crypto = require('crypto');

const id = (prefix) => prefix + '-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase();
const now = () => new Date().toISOString();

// Text from users: trimmed, single-line unless allowed, capped length.
function clean(v, max = 200, multiline = false) {
  if (v === undefined || v === null) return '';
  let s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  if (!multiline) s = s.replace(/\s+/g, ' ');
  return s.trim().slice(0, max);
}
const phone10 = (v) => { const d = String(v || '').replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };
const validPhone = (v) => /^[6-9]\d{9}$/.test(phone10(v));
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());

// Gotra spellings vary ("मोटीस" / "मोटिस", "पोकरीया" / "पोकरिया"). Compare on a normalised key.
// Key = consonant skeleton: drop spaces, nukta, vowel signs, halant, anusvara/chandrabindu.
// Errs on the side of "same gotra", which only hides a match — the safe direction.
function normGotra(g) {
  return String(g || '').normalize('NFC')
    .replace(/[\s.\-_()]/g, '')
    .replace(/[ऀ-ःऺ-ॏ॑-ॗॢॣ]/g, '')
    .replace(/ण/g, 'न').replace(/ड़/g, 'ड')
    .toLowerCase();
}
const gotraList = (p) => [p.Gotra1, p.Gotra2, p.Gotra3, p.Gotra4].map((g) => clean(g, 60)).filter(Boolean);
function gotraClash(a, b) {
  const A = new Set(gotraList(a).map(normGotra)); return gotraList(b).filter((g) => A.has(normGotra(g)));
}

// DOB in YYYY-MM-DD (form) or DD-MM-YYYY / DD.MM.YY (legacy list).
function parseDOB(v) {
  const s = String(v || '').trim(); let y, m, d;
  let r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (r) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})$/))) { [d, m, y] = [+r[1], +r[2], +r[3]]; if (y < 100) y += y > 40 ? 1900 : 2000; }
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return isNaN(dt) || dt.getUTCMonth() !== m - 1 ? null : dt;
}
function ageFrom(dob) {
  const d = parseDOB(dob); if (!d) return '';
  const t = new Date(); let a = t.getUTCFullYear() - d.getUTCFullYear();
  if (t.getUTCMonth() < d.getUTCMonth() || (t.getUTCMonth() === d.getUTCMonth() && t.getUTCDate() < d.getUTCDate())) a--;
  return a > 0 && a < 100 ? a : '';
}
const isoDate = (dob) => { const d = parseDOB(dob); return d ? d.toISOString().slice(0, 10) : ''; };

// "5'3"" or "5 ft 3 in" -> cm
function heightCm(h) {
  const r = String(h || '').match(/(\d)\s*(?:'|ft|फ़ीट|फीट)\s*(\d{1,2})?/i);
  if (!r) { const n = parseFloat(h); return n > 100 && n < 230 ? Math.round(n) : ''; }
  return Math.round(((+r[1]) * 12 + (+(r[2] || 0))) * 2.54);
}
const heightLabel = (h) => { const r = String(h || '').match(/(\d)\s*(?:'|ft)\s*(\d{1,2})?/i); return r ? `${r[1]}'${r[2] || 0}"` : clean(h, 20); };

// Education text -> level used by the filter: school | grad | pg | pro
function eduLevel(e) {
  const s = String(e || '').toLowerCase().replace(/\s|\./g, '');
  if (!s) return '';
  if (/mbbs|btech|be\b|bca|mca|bpharm|nursing|gnm|anm|bed|b\.?ed|llb|iti|diploma|engineer|polytechnic|बीएड|नर्सिंग|डिप्लोमा|आईटीआई|ca\b|bams|bds/.test(s)) return 'pro';
  if (/^m|mba|msc|mcom|ma\b|ma,|pg|phd|एम|स्नातकोत्तर/.test(s) && !/^mbbs/.test(s)) return 'pg';
  if (/^b|ba\b|bcom|bsc|bba|graduat|बी|स्नातक|बीए|बीकॉम/.test(s)) return 'grad';
  return 'school';
}
// Last meaningful part of an address = city ("आदर्शनगर अजमेर" -> "अजमेर")
function cityFrom(addr) {
  const parts = String(addr || '').split(/[,،]/).map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return '';
  const last = parts[parts.length - 1].split(/\s+/); return clean(last[last.length - 1], 40);
}
const bool = (v) => v === true || /^(true|yes|1|हाँ)$/i.test(String(v || '').trim());

module.exports = { id, now, clean, phone10, validPhone, validEmail, normGotra, gotraList, gotraClash, parseDOB, ageFrom, isoDate, heightCm, heightLabel, eduLevel, cityFrom, bool };
