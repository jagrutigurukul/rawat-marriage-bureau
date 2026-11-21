#!/usr/bin/env node
// Try the full website on your computer without Supabase: starts a private local Postgres, creates the tables,
// optionally imports your sheet, and runs the site on http://localhost:3000
//   npm run demo                         (empty database)
//   npm run demo -- "Rawat Marriage Bureau List.xlsx"
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
(async () => {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const dir = process.env.DEMO_DB_DIR || path.join(__dirname, '..', '.localdb'); const fresh = !fs.existsSync(dir); const port = +(process.env.DEMO_PG_PORT || 54329);
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'localdemo', port, persistent: true, onLog: () => {} });
  if (fresh) await pg.initialise();
  await pg.start(); if (fresh) await pg.createDatabase('rmb');
  const url = `postgresql://postgres:localdemo@localhost:${port}/rmb`;
  Object.assign(process.env, { DATABASE_URL: url, JWT_SECRET: process.env.JWT_SECRET || 'local-demo-secret-change-me', SUPERADMIN_NAME: process.env.SUPERADMIN_NAME || 'Super Admin', SUPERADMIN_PHONE: process.env.SUPERADMIN_PHONE || '9000000001', SUPERADMIN_PASSWORD: process.env.SUPERADMIN_PASSWORD || 'Admin@123' });
  const { Client } = require('pg'); const c = new Client({ connectionString: url }); await c.connect();
  await c.query(fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8')); await c.end();
  const xlsx = process.argv[2]; if (xlsx) execFileSync('node', [path.join(__dirname, 'migrate.js'), xlsx], { stdio: 'inherit', env: process.env });
  console.log(`\nLocal demo database ready. Super admin login: ${process.env.SUPERADMIN_PHONE} / ${process.env.SUPERADMIN_PASSWORD}`);
  require('../dev.js');
  const stop = async () => { await pg.stop(); process.exit(0); }; process.on('SIGINT', stop); process.on('SIGTERM', stop);
})().catch((e) => { console.error('Demo failed:', e.message); process.exit(1); });
