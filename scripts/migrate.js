#!/usr/bin/env node
// Moves your Google Sheet data into Supabase.
//
//   1. Google Sheet → File → Download → Microsoft Excel (.xlsx)
//   2. npm run migrate -- "Rawat Marriage Bureau List.xlsx"              (writes straight into Supabase, uses DATABASE_URL)
//      npm run migrate -- "Rawat Marriage Bureau List.xlsx" --sql import.sql   (only creates a SQL file to paste in Supabase SQL Editor)
//
// Safe to run again: rows already in the database are skipped (same ID / same old-list row).
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { fromWorkbook } = require('../lib/legacy');
const { toDb } = require('../lib/store');

function cellText(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) { const d = String(v.getUTCDate()).padStart(2, '0'), m = String(v.getUTCMonth() + 1).padStart(2, '0'); return `${d}-${m}-${v.getUTCFullYear()}`; }
  if (typeof v === 'object') {
    if ('result' in v) return cellText(v.result);
    if (v.richText) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return String(v.text);
    if (v.error) return '';
    return '';
  }
  return String(v);
}
async function readXlsx(file) {
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(file);
  const tabs = {};
  wb.eachSheet((ws) => { const grid = []; ws.eachRow({ includeEmpty: true }, (row, n) => { const vals = []; row.eachCell({ includeEmpty: true }, (c, col) => { vals[col - 1] = cellText(c.value); }); grid[n - 1] = vals; }); for (let i = 0; i < grid.length; i++) grid[i] = grid[i] || []; tabs[ws.name] = grid; });
  return tabs;
}
const lit = (v) => (v === null || v === undefined ? 'null' : typeof v === 'boolean' ? String(v) : typeof v === 'number' ? String(v) : "'" + String(v).replace(/\u0000/g, '').replace(/'/g, "''") + "'");
function insertSQL(table, row, conflict) { const cols = Object.keys(row).filter((c) => row[c] !== undefined); return `insert into public.${table} (${cols.join(',')}) values (${cols.map((c) => lit(row[c])).join(',')}) on conflict ${conflict} do nothing;`; }
const clean = (table, o) => { const r = toDb(table, o); for (const k of Object.keys(r)) if (r[k] === undefined) delete r[k]; return r; };

async function main() {
  const args = process.argv.slice(2); const file = args.find((a) => !a.startsWith('--')); const si = args.indexOf('--sql');
  if (!file || !fs.existsSync(file)) { console.log('Usage: npm run migrate -- "<downloaded sheet>.xlsx" [--sql out.sql]'); process.exit(1); }
  const data = fromWorkbook(await readXlsx(file));
  console.log('Found in the file:'); data.notes.forEach((n) => console.log('  - ' + n));
  console.log(`Ready to import: ${data.users.length} users, ${data.profiles.length} profiles, ${data.interests.length} interests`);
  const plan = [['users', data.users, '(id)'], ['profiles', data.profiles, ''], ['interests', data.interests, '']];

  if (si >= 0) {
    const out = args[si + 1] || 'import.sql';
    const lines = ['-- Rawat Marriage Bureau: data imported from ' + path.basename(file), '-- Run AFTER schema.sql. Safe to run twice.', 'begin;'];
    for (const [t, list] of plan) for (const o of list) lines.push(insertSQL(t, clean(t, o), ''));
    lines.push('commit;', "select (select count(*) from public.profiles) as profiles, (select count(*) from public.users) as users;");
    fs.writeFileSync(out, lines.join('\n') + '\n'); console.log(`SQL written → ${out}  (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`); return;
  }
  const { tx, close } = require('../lib/db');
  const added = {};
  await tx(async (c) => {
    for (const [t, list] of plan) {
      added[t] = 0;
      for (const o of list) { const r = clean(t, o); const cols = Object.keys(r);
        const res = await c.query(`insert into public.${t} (${cols.join(',')}) values (${cols.map((_, i) => '$' + (i + 1)).join(',')}) on conflict ${''} do nothing`, cols.map((k) => r[k]));
        added[t] += res.rowCount; }
    }
  });
  await close();
  console.log(`Imported into the database: ${added.users} users, ${added.profiles} profiles, ${added.interests} interests (others were already there).`);
}
main().catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
