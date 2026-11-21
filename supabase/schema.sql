-- =====================================================================
-- Rawat Marriage Bureau — database schema for Supabase (Postgres)
-- Run once in Supabase → SQL Editor → New query → paste all → Run.
-- Safe to run again: it only creates what is missing.
-- =====================================================================

-- ---------- users (login accounts) ----------
create table if not exists public.users (
  id                   text primary key,
  name                 text not null,
  phone                text not null unique,
  email                text,
  role                 text not null default 'customer' check (role in ('customer','admin')),
  super_admin          boolean not null default false,
  active               boolean not null default true,
  password_hash        text not null,
  salt                 text not null,
  must_change_password boolean not null default false,   
  created_by           text,
  created_at           timestamptz not null default now(),
  last_login           timestamptz
);
create unique index if not exists users_email_key on public.users (lower(email)) where email is not null and email <> '';

-- ---------- profiles (brides & grooms) ----------
create table if not exists public.profiles (
  id             text primary key,
  status         text not null default 'Pending' check (status in ('Pending','Approved','Rejected')),
  owner_id       text references public.users(id) on delete set null,
  for_whom       text default 'Self',
  gender         text check (gender in ('F','M')),
  name           text not null,
  phone          text,
  phone2         text,
  dob            date,
  age_at_import  int,
  birth_time     text,
  birth_place    text,
  height_ft_in   text,
  height_cm      int,
  weight         text,
  complexion     text,
  marital_status text default 'NeverMarried',
  manglik        text,
  father_name    text,
  father_job     text,
  mother_name    text,
  mother_job     text,
  brothers       text,
  sisters        text,
  native_place   text,
  city           text,
  address        text,
  gotra1         text,
  gotra2         text,
  gotra3         text,
  gotra4         text,
  education      text,
  edu_level      text,
  occupation     text,
  job_place      text,
  income         text,
  about          text,
  reject_reason  text,
  admin_note     text,
  reviewed_by    text,
  reviewed_at    timestamptz,
  source         text default 'site',
  legacy_ref     text unique,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists profiles_status_gender_idx on public.profiles (status, gender);
create index if not exists profiles_owner_idx on public.profiles (owner_id);

-- ---------- interests ----------
create table if not exists public.interests (
  id              text primary key,
  from_user_id    text references public.users(id) on delete set null,
  from_profile_id text not null references public.profiles(id) on delete cascade,
  to_profile_id   text not null references public.profiles(id) on delete cascade,
  status          text not null default 'New' check (status in ('New','Talking','FamiliesMet','Settled','Closed')),
  admin_note      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (from_profile_id, to_profile_id)
);

-- ---------- notifications (admin bell) ----------
create table if not exists public.notifications (
  id         text primary key,
  type       text not null,
  profile_id text references public.profiles(id) on delete cascade,
  title      text,
  message    text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_created_idx on public.notifications (created_at desc);

-- ---------- audit log ----------
create table if not exists public.audit_log (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  user_id    text,
  user_name  text,
  action     text not null,
  target     text,
  details    text
);

-- ---------- login attempts (brute-force protection) ----------
create table if not exists public.auth_attempts (
  id         bigserial primary key,
  key        text not null,
  created_at timestamptz not null default now()
);
create index if not exists auth_attempts_key_idx on public.auth_attempts (key, created_at);

-- ---------- security ----------
-- Row Level Security ON with no policies: the public "anon" key can read/write NOTHING.
-- Only the website's server (connected with the database password) can access these tables.
alter table public.users          enable row level security;
alter table public.profiles       enable row level security;
alter table public.interests      enable row level security;
alter table public.notifications  enable row level security;
alter table public.audit_log      enable row level security;
alter table public.auth_attempts  enable row level security;

-- ---------- handy views for the Supabase Table Editor ----------
create or replace view public.admins_view with (security_invoker = true) as
  select id, name, phone, email, super_admin, active, created_at, last_login from public.users where role = 'admin';
create or replace view public.profiles_summary with (security_invoker = true) as
  select id, status, gender, name, phone, city, gotra1, gotra2, gotra3, gotra4, education, occupation, source, created_at
  from public.profiles order by created_at desc;
