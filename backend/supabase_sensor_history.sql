-- ============================================================
-- SmartH2O Backend — sensor_history
-- Run in: Supabase Dashboard > SQL Editor > New Query
-- Stores historical sensor data for ML training and analytics
-- ============================================================

create table if not exists sensor_history (
  id              uuid primary key default gen_random_uuid(),
  water_level_pct double precision,
  flow_rate       double precision,
  power_on        boolean default true,
  created_at      timestamptz not null default now()
);

create index if not exists idx_sensor_history_created_at
  on sensor_history (created_at desc);

-- Enable RLS
alter table sensor_history enable row level security;

-- Policy to allow inserts and reads from the API
create policy "Allow all for anon on sensor_history"
  on sensor_history for all using (true) with check (true);

-- Optional: enable Realtime in Dashboard > Database > Replication for:
-- sensor_history
