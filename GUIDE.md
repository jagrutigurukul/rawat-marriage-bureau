# Rawat Marriage Bureau — Supabase + Vercel setup guide

Total time: about 30–40 minutes. You need: a GitHub account, a Supabase account, a Vercel account (all free; sign in to
Supabase and Vercel with GitHub to keep it simple).

```
How it fits together

  Visitor's phone/computer ──►  Vercel  (website files + /api server function)
                                   │   DATABASE_URL (secret, only on Vercel)
                                   ▼
                               Supabase (Postgres database: users, profiles, interests …)
```
The browser never talks to the database directly. Only the API on Vercel does, with a password that lives in Vercel's
settings. Row Level Security is switched on, so even Supabase's public key can't read anything.

---

## Step 1 — Create the Supabase project (5 min)
1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub.
2. **New project**
   - Name: `rawat-marriage-bureau`
   - **Database password:** click *Generate*, then **copy it and keep it safe** (you need it in step 4).
   - Region: **South Asia (Mumbai)** — fastest for Rajasthan.
   - Plan: Free.
3. Wait ~2 minutes until the project is ready.

## Step 2 — Create the tables (2 min)
1. Left menu → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this project, copy **everything**, paste, click **Run**.
3. You should see *Success. No rows returned*. Check **Table Editor**: `users`, `profiles`, `interests`, `notifications`,
   `audit_log`, `auth_attempts` now exist (empty).

## Step 3 — Move your Google Sheet data into Supabase (5 min)

### Option A — easiest (no software needed)
I already converted your sheet (195 brides + 350 grooms = **545 profiles**) into three SQL files:
`import_part1.sql`, `import_part2.sql`, `import_part3.sql` (sent separately — they contain phone numbers, so **don't put
them on GitHub**).

For each file: SQL Editor → New query → paste the whole file → **Run**. The last line shows the running total:
182 → 364 → **545**. Running a file twice is safe (duplicates are skipped).

### Option B — if you changed the sheet after uploading it here
1. Open the Google Sheet → **File → Download → Microsoft Excel (.xlsx)**.
2. On your computer (needs Node.js 18+ from <https://nodejs.org>), in this project folder:
   ```bash
   npm install
   cp .env.example .env        # then put your DATABASE_URL in .env (step 4 shows where to find it)
   npm run migrate -- "Rawat Marriage Bureau List.xlsx"
   ```
   It reads the **Female (वधू पक्ष)** and **Male (वर पक्ष)** tabs. If you also used the Google-Sheets version of the
   website, it imports its **Users**, **Profiles** and **Interests** tabs too (passwords keep working). Safe to re-run.

   No database yet? `npm run migrate -- file.xlsx --sql import.sql` makes a SQL file to paste in the SQL Editor instead.

Check: **Table Editor → profiles** shows 545 rows. Your Google Sheet stays as it is — keep it as an old backup.

## Step 4 — Copy the database connection string (2 min)
1. In Supabase, click **Connect** (top of the project page).
2. Choose **Transaction pooler** (port **6543**) → copy the **URI**. For your project it starts with
   `postgresql://postgres.xiscjfavgynnwqjxovdt:[YOUR-PASSWORD]@` and ends with `.pooler.supabase.com:6543/postgres`
   (copy the host in the middle exactly as Supabase shows it).
3. Replace `[YOUR-PASSWORD]` with the password from step 1 (no brackets).
   If the password has special characters, replace them: `@`→`%40`, `#`→`%23`, `/`→`%2F`, `?`→`%3F`, `&`→`%26`, `%`→`%25`.
   (Or reset the database password in *Project Settings → Database* to letters and digits only.)

This full line is your **`DATABASE_URL`**. Treat it like a password.

> The **anon** and **service_role** API keys are not needed anywhere — the server talks to the database directly with
> `DATABASE_URL`. Never put the service_role key or the database password in website code or in a chat.

### Test it before deploying (recommended, 2 min)
The project already contains a `.env` file with your project ID and a ready `JWT_SECRET`. Open it and fill in
`DATABASE_URL`, `SUPERADMIN_PHONE` and `SUPERADMIN_PASSWORD`, then:
```bash
npm install
npm run check
```
It connects to your Supabase and checks: the URL format (pooler, port 6543, project `xiscjfavgynnwqjxovdt`), the
password, the 6 tables, Row Level Security, that the 545 profiles are there, and the admin/JWT settings. Every ✗ line
tells you exactly what to fix. When it says **✓ All good**, copy the same values into Vercel (step 6).
Optional: `npm run dev` → open <http://localhost:3000> and use the real site against your Supabase data.

## Step 5 — Put the code on GitHub (5 min)
1. <https://github.com/new> → name `rawat-marriage-bureau` → **Private** → Create repository.
2. Upload the project:
   - **Without git:** on the new repo page click *uploading an existing file*, drag in everything from the unzipped
     folder **except** `node_modules`, `.env` and any `.sql` import files → *Commit changes*.
     (Folders `lib`, `public`, `scripts`, `supabase`, `tests` and the files `index.js`, `dev.js`, `package.json`,
     `package-lock.json`, `vercel.json`, `.gitignore`, `.env.example`, `GUIDE.md`, `README.md`.)
   - **With git:**
     ```bash
     git init && git add . && git commit -m "Rawat Marriage Bureau"
     git branch -M main
     git remote add origin https://github.com/<your-username>/rawat-marriage-bureau.git
     git push -u origin main
     ```
     `.gitignore` already keeps `.env`, `node_modules` and `.xlsx` files out.

## Step 6 — Deploy on Vercel (5 min)
1. <https://vercel.com/new> → **Import** the `rawat-marriage-bureau` repo.
2. **Framework Preset: Express** (Vercel detects it from `index.js`; `vercel.json` also sets it). Leave Build,
   Output and Install settings **without overrides** — if an earlier attempt set *Output Directory* to `public`,
   switch that override off in *Settings → Build and Deployment*.
3. Open **Environment Variables** and add:

| Name | Value |
|---|---|
| `DATABASE_URL` | the line from step 4 |
| `JWT_SECRET` | the value already in your `.env` file (or a new one from <https://generate-secret.vercel.app/64>). Never change it later (everyone gets logged out) |
| `SUPERADMIN_NAME` | `Kamlesh Rawat` |
| `SUPERADMIN_PHONE` | your 10-digit mobile — you log in with this |
| `SUPERADMIN_PASSWORD` | your first password (6+ characters, at least one digit) |
| `SUPERADMIN_EMAIL` | `kamleshsoftdev@gmail.com` (optional) |
| `BUREAU_PHONE` | number shown on "Call the bureau" buttons (optional) |

4. Click **Deploy**. After ~1 minute you get a link like `https://rawat-marriage-bureau.vercel.app`.

## Step 7 — Check it works (2 min)
1. Open `https://<your-site>.vercel.app/api/health` → should show `{"ok":true,"db":"connected",...}`.
2. Open the site → **Login** with `SUPERADMIN_PHONE` + `SUPERADMIN_PASSWORD`. You land on the admin overview with
   545 profiles.
3. In the site menu use **Change password**. After that you can delete `SUPERADMIN_PASSWORD` from Vercel
   (it's only used to create the very first super admin).
4. Try the flow once: register a test member from another browser → fill a profile → approve it as admin →
   log in as the member → matches appear.

## Step 8 — Your own domain (optional)
Vercel → Project → **Settings → Domains** → add e.g. `rawatvivah.in` and follow the DNS instructions shown.
HTTPS is automatic.

---

## Daily use
- **Admin panel** (on the site): approve/reject, add/edit/delete profiles, interests, users, **Download CSV**
  (opens in Excel or Google Sheets — use it as a weekly backup, the free Supabase plan has no automatic backups).
- **Supabase Table Editor:** see or fix data directly. Views `profiles_summary` and `admins_view` give quick lists.
  Don't edit `password_hash` / `salt` there.
- **Changing the website:** edit files → push/upload to GitHub → Vercel redeploys automatically in ~1 minute.

## Good to know about the free plans
- Supabase Free pauses a project after **7 days without activity**. This project includes a daily Vercel cron job
  (`/api/health` at 9:00 IST) that touches the database so it stays active. If it ever pauses, open the Supabase
  dashboard → **Restore project**. The Pro plan ($25/month) never pauses and adds daily backups.
- Free limits (500 MB database, 5 GB bandwidth) are far more than this bureau needs; 545 profiles use about 1 MB.

## Troubleshooting
| What you see | Fix |
|---|---|
| Build error *No entrypoint found which imports express* | Use the latest project files (entry is `index.js` at the top level) and remove any *Output Directory* override in Vercel settings |
| `/api/health` → `CONFIG_MISSING` | `DATABASE_URL` or `JWT_SECRET` not set in Vercel → add it → **Deployments → … → Redeploy** |
| `/api/health` → `DB_ERROR` | Wrong password in `DATABASE_URL`, unencoded special character, or used port 5432 instead of the **Transaction pooler** 6543 URI. Check Vercel → Project → **Logs** for the exact message |
| `relation "users" does not exist` in Logs | Step 2 was skipped — run `supabase/schema.sql` |
| Can't log in as super admin | Phone must be 10 digits; password 6+ chars with a digit. Change the variables → Redeploy. If a super admin already exists, the variables are ignored — log in with that one, or in SQL Editor run `delete from users where super_admin;` then Vercel → Deployments → Redeploy |
| "Too many attempts" | 8 wrong passwords lock that number for 15 minutes (brute-force protection) |
| Site works but old profiles missing | Step 3 not done, or done in a different Supabase project |

## Run on your computer (optional)
```bash
npm install
npm run demo -- "Rawat Marriage Bureau List.xlsx"   # full site + private local database, no Supabase needed
npm run dev                                         # site on http://localhost:3000 using DATABASE_URL from .env
npm test                                            # 47 automated checks on a real local Postgres
```

## Security checklist
- The repo is **Private**; `.env` and the import `.sql` files are never committed.
- `DATABASE_URL` and `JWT_SECRET` exist only in Vercel's Environment Variables.
- RLS is on for every table, so the Supabase anon key exposes nothing.
- Passwords are stored as salted scrypt hashes; logins are signed tokens valid 7 days; 8 wrong attempts lock for 15 min.
- The Google OAuth client from the Sheets version is **no longer used** — in Google Cloud Console you can delete it or
  reset its secret (it was shared in a chat).

---
जागृति गुरुकुल की पहल · Created by Kamlesh Rawat
