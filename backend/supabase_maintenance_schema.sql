-- ============================================================
-- SmartH2O Backend — maintenance_logs & anomaly_alerts
-- Run in: Supabase Dashboard > SQL Editor > New Query
-- Matches: backend/main.py (SensorData, MaintenancePrediction, Anomaly)
-- ============================================================

-- Reusable severity enum (matches Pydantic comments in main.py)
do $$ begin
  create type severity_level as enum ('critical', 'high', 'medium', 'low');
exception
  when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- maintenance_logs
-- One row per POST /api/maintenance/predict call
-- ------------------------------------------------------------
create table if not exists maintenance_logs (
  id                uuid primary key default gen_random_uuid(),

  -- Optional link to live sensor row (sensor_status.id is always 1 in this project)
  sensor_status_id  int references sensor_status (id) on delete set null,

  -- SensorData snapshot (all nullable — matches Optional[float] in Pydantic)
  water_level_pct   double precision,
  flow_rate         double precision,
  power_on          boolean default true,

  -- MaintenancePrediction output
  days_remaining    integer        not null check (days_remaining >= 0),
  reason            text           not null,
  severity          severity_level not null,
  confidence        double precision not null
    check (confidence >= 0.0 and confidence <= 1.0),

  created_at        timestamptz    not null default now()
);

create index if not exists idx_maintenance_logs_created_at
  on maintenance_logs (created_at desc);

create index if not exists idx_maintenance_logs_severity
  on maintenance_logs (severity);

-- ------------------------------------------------------------
-- anomaly_alerts
-- One row per detected anomaly from POST /api/anomalies/detect
-- ------------------------------------------------------------
create table if not exists anomaly_alerts (
  id                uuid primary key default gen_random_uuid(),

  sensor_status_id  int references sensor_status (id) on delete set null,

  -- SensorData snapshot at detection time
  water_level_pct   double precision,
  flow_rate         double precision,
  power_on          boolean default true,

  -- Anomaly output (main.py maps Anomaly.timestamp -> detected_at)
  type              text           not null,
  message           text           not null,
  severity          severity_level not null,
  detected_at       timestamptz    not null default now(),

  created_at        timestamptz    not null default now()
);

create index if not exists idx_anomaly_alerts_detected_at
  on anomaly_alerts (detected_at desc);

create index if not exists idx_anomaly_alerts_severity
  on anomaly_alerts (severity);

create index if not exists idx_anomaly_alerts_type
  on anomaly_alerts (type);

-- ------------------------------------------------------------
-- Row Level Security (consistent with frontend/supabase_schema.sql)
-- Backend uses SUPABASE_ANON_KEY — allow insert + read for prototype
-- ------------------------------------------------------------
alter table maintenance_logs enable row level security;
alter table anomaly_alerts  enable row level security;

create policy "Allow all for anon on maintenance_logs"
  on maintenance_logs for all using (true) with check (true);

create policy "Allow all for anon on anomaly_alerts"
  on anomaly_alerts for all using (true) with check (true);

-- Optional: enable Realtime in Dashboard > Database > Replication for:
-- maintenance_logs, anomaly_alerts
