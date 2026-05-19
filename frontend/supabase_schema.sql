-- ============================================================
-- SmartH2WO Database Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Transactions table
create table if not exists transactions (
  id              uuid default gen_random_uuid() primary key,
  customer        text,
  volume_ml       int    not null,
  price           numeric(8,2) not null,
  payment_method  text   not null check (payment_method in ('coin', 'qr')),
  created_at      timestamptz default now()
);

-- 2. System logs table
create table if not exists logs (
  id          uuid default gen_random_uuid() primary key,
  event       text not null,
  volume_ml   int,
  payment     numeric(8,2),
  status      text not null check (status in ('Success', 'Scheduled', 'Failed')),
  created_at  timestamptz default now()
);

-- 3. Sensor status table (single row — always update, never insert)
create table if not exists sensor_status (
  id              int primary key default 1,
  water_level_pct int  not null default 100,
  power_on        bool not null default true,
  updated_at      timestamptz default now()
);

-- Seed the single sensor_status row
insert into sensor_status (id, water_level_pct, power_on)
values (1, 100, true)
on conflict (id) do nothing;

-- 4. Schedule table
create table if not exists schedule (
  id      serial primary key,
  day     text not null unique,
  start   text,
  "end"   text,
  active  bool not null default true
);

-- Seed default schedule (Mon-Fri active, Sat-Sun off)
insert into schedule (day, start, "end", active) values
  ('Mon', '8:00 AM', '5:00 PM', true),
  ('Tue', '8:00 AM', '5:00 PM', true),
  ('Wed', '8:00 AM', '5:00 PM', true),
  ('Thu', '8:00 AM', '5:00 PM', true),
  ('Fri', '8:00 AM', '5:00 PM', true),
  ('Sat', '--', '--', false),
  ('Sun', '--', '--', false)
on conflict (day) do nothing;

-- ============================================================
-- Enable Row Level Security (RLS)
-- For prototype: allow all read/write. Lock down before going public.
-- ============================================================

alter table transactions  enable row level security;
alter table logs          enable row level security;
alter table sensor_status enable row level security;
alter table schedule      enable row level security;

-- Allow anon key to read and insert (ESP32 uses anon key)
create policy "Allow all for anon" on transactions  for all using (true) with check (true);
create policy "Allow all for anon" on logs          for all using (true) with check (true);
create policy "Allow all for anon" on sensor_status for all using (true) with check (true);
create policy "Allow all for anon" on schedule      for all using (true) with check (true);

-- ============================================================
-- Enable Realtime (for live dashboard updates)
-- ============================================================

-- In Supabase Dashboard > Database > Replication, toggle ON for:
-- transactions, logs, sensor_status

-- ============================================================
-- User Profiles table for admin role management
-- ============================================================

create table if not exists user_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text unique not null,
  is_admin   boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on user_profiles
alter table user_profiles enable row level security;

-- Policy: Users can read their own profile
create policy "Users can read their own profile" on user_profiles
  for select using (auth.uid() = user_id or is_admin = true);

-- Policy: Only service role can insert/update
create policy "Service role can manage profiles" on user_profiles
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
