// Turns rows from the Google Sheet (downloaded as .xlsx) into database records.
// Understands: the old "Female (वधू पक्ष)" / "Male (वर पक्ष)" list tabs, and — if you used the Sheets version of the
// website — its "Users", "Profiles" and "Interests" tabs.
const U = require('./util');

const pick = (row, re) => { const k = Object.keys(row).find((h) => re.test(h)); return k ? String(row[k] ?? '').trim() : ''; };

function legacyProfile(r, tab, gender) {
  const name = pick(r, /^Name/i); if (!name) return null;
  const remarks = pick(r, /^Remarks/i);
  const dob = pick(r, /^DOB \(/i) || pick(r, /^DOB/i);
  const cur = pick(r, /^Current Address/i), nat = pick(r, /^Native Address/i);
  const phones = [pick(r, /^Mobile 1/i), pick(r, /^Mobile 2/i), pick(r, /^Mobile 3/i)].map(U.phone10).filter((p) => p.length === 10);
  const ht = pick(r, /^Height \(ft/i), cm = pick(r, /^Height \(cm/i);
  const iso = U.isoDate(dob);
  return {
    ProfileID: 'P-L' + (gender === 'F' ? 'F' : 'M') + String(r._row).padStart(4, '0'), Status: 'Approved', OwnerUserID: null, ForWhom: 'Self', Gender: gender, Name: name,
    Phone: phones[0] || '', Phone2: phones[1] || '', DOB: iso || null, AgeAtImport: iso ? null : (+pick(r, /^Age/i) || null),
    HeightFtIn: U.heightLabel(ht), HeightCm: +cm || U.heightCm(ht) || null,
    MaritalStatus: /remarriage|पुनः/i.test(remarks) ? 'Remarriage' : 'NeverMarried',
    FatherName: pick(r, /^Father/i), NativePlace: nat, City: U.cityFrom(cur || nat), Address: cur,
    Gotra1: pick(r, /^Gotra 1/i), Gotra2: pick(r, /^Gotra 2/i), Gotra3: pick(r, /^Gotra 3/i), Gotra4: pick(r, /^Gotra 4/i),
    Education: pick(r, /^Education/i), EduLevel: U.eduLevel(pick(r, /^Education/i)), Occupation: pick(r, /^Occupation/i),
    About: remarks && !/remarriage|पुनः/i.test(remarks) ? remarks : '',
    Source: 'legacy', LegacyRef: `${tab}#row${r._row}`, ReviewedBy: 'Imported list', _list: 1
  };
}
// Rows from a "Profiles" tab written by the Google-Sheets version (same column names).
function sheetProfile(r) {
  if (!r.ProfileID || !r.Name) return null;
  const o = { ...r }; delete o._row;
  const iso = U.isoDate(o.DOB); o.DOB = iso || null; if (!iso) o.AgeAtImport = +o.Age || null; delete o.Age;
  if (!['Pending', 'Approved', 'Rejected'].includes(o.Status)) o.Status = 'Pending';
  if (!['F', 'M'].includes(o.Gender)) o.Gender = null;
  for (const k of ['CreatedAt', 'UpdatedAt', 'ReviewedAt']) if (!o[k] || isNaN(Date.parse(o[k]))) o[k] = k === 'ReviewedAt' ? null : undefined;
  if (!o.CreatedAt) delete o.CreatedAt; if (!o.UpdatedAt) delete o.UpdatedAt;
  o.HeightCm = +o.HeightCm || U.heightCm(o.HeightFtIn) || null; o.LegacyRef = o.LegacyRef || null; o.OwnerUserID = o.OwnerUserID || null;
  return o;
}
function sheetUser(r) {
  if (!r.UserID || !r.PasswordHash || !U.validPhone(r.Phone)) return null;
  const o = { ...r }; delete o._row;
  o.Phone = U.phone10(o.Phone); for (const k of ['SuperAdmin', 'Active', 'MustChangePassword']) o[k] = U.bool(o[k]);
  o.Role = o.Role === 'admin' ? 'admin' : 'customer';
  for (const k of ['CreatedAt', 'LastLogin']) if (!o[k] || isNaN(Date.parse(o[k]))) delete o[k];
  return o;
}
function sheetInterest(r) {
  if (!r.InterestID || !r.FromProfileID || !r.ToProfileID) return null;
  const o = { ...r }; delete o._row;
  if (!['New', 'Talking', 'FamiliesMet', 'Settled', 'Closed'].includes(o.Status)) o.Status = 'New';
  for (const k of ['CreatedAt', 'UpdatedAt']) if (!o[k] || isNaN(Date.parse(o[k]))) delete o[k];
  return o;
}
// tabs: { [tabName]: [[header...], [row...], ...] }  →  records to import
function fromWorkbook(tabs) {
  const out = { users: [], profiles: [], interests: [], notes: [] };
  const objs = (grid) => { const h = (grid[0] || []).map((x) => String(x || '').trim()); return grid.slice(1).map((v, i) => { const o = { _row: i + 2 }; h.forEach((k, j) => { if (k) o[k] = v[j] === undefined || v[j] === null ? '' : String(v[j]).trim(); }); return o; }).filter((o) => h.some((k) => k && o[k] !== '')); };
  for (const [name, grid] of Object.entries(tabs)) {
    const head = (grid[0] || []).map(String);
    if (head.includes('UserID') && head.includes('PasswordHash')) { out.users.push(...objs(grid).map(sheetUser).filter(Boolean)); out.notes.push(`${name}: users`); }
    else if (head.includes('ProfileID')) { out.profiles.push(...objs(grid).map(sheetProfile).filter(Boolean)); out.notes.push(`${name}: profiles (website)`); }
    else if (head.includes('InterestID')) { out.interests.push(...objs(grid).map(sheetInterest).filter(Boolean)); out.notes.push(`${name}: interests`); }
    else if (head.some((h) => /^Name/i.test(h)) && head.some((h) => /^Gotra 1/i.test(h))) {
      const g = /female|वधू/i.test(name) ? 'F' : /male|वर/i.test(name) ? 'M' : null;
      if (!g) { out.notes.push(`${name}: skipped (cannot tell bride/groom from the tab name)`); continue; }
      const rows = objs(grid).map((r) => legacyProfile(r, name, g)).filter(Boolean);
      out.profiles.push(...rows); out.notes.push(`${name}: ${rows.length} ${g === 'F' ? 'brides' : 'grooms'} (old list)`);
    } else out.notes.push(`${name}: skipped`);
  }
  // Website profiles first, so an old-list person already imported by the Sheets version keeps its status/edits.
  out.profiles.sort((a, b) => (a._list || 0) - (b._list || 0));
  const userIds = new Set(out.users.map((u) => u.UserID));
  out.profiles.forEach((p) => { if (p.OwnerUserID && !userIds.has(p.OwnerUserID)) p.OwnerUserID = null; });
  return out;
}
module.exports = { fromWorkbook, legacyProfile };
