# Rawat Marriage Bureau (रावत विवाह ब्यूरो)

Matrimonial website for Rawat families — gotra-safe matching, bureau-verified profiles, private phone numbers,
Hindi / English / mixed language. Database: **Supabase (Postgres)**. Hosting: **Vercel**.

**Setup and deployment: see [GUIDE.md](GUIDE.md).**

```
index.js            Vercel entry (Express preset) → API; public/ is served by Vercel's CDN
dev.js              local server: website + API on http://localhost:3000
lib/                API code: app.js (routes), store.js (database), auth.js, util.js, legacy.js (sheet import)
public/             website (index.html, main.js, styles.css, fonts)
supabase/schema.sql tables + Row Level Security — run once in Supabase SQL Editor
scripts/migrate.js  Google Sheet (.xlsx) → Supabase
scripts/local-demo.js  run everything locally with a private Postgres
scripts/check-setup.js pre-deploy check of DATABASE_URL, tables, data, admin settings
tests/api.test.js   47 checks on a real Postgres
vercel.json         Express preset, security headers, daily keep-alive cron
```

Supabase project: `xiscjfavgynnwqjxovdt` (settings in `.env` / Vercel env vars).

Commands: `npm run check` (test settings before deploy) · `npm run dev` · `npm run demo` · `npm run migrate -- file.xlsx` · `npm test`

जागृति गुरुकुल की पहल · Created by Kamlesh Rawat
