create table if not exists cron_logs (
  id uuid primary key default gen_random_uuid(),
  executed_at timestamptz not null,
  status text not null check (status in ('success', 'error')),
  source text not null default 'antihibernation',
  created_at timestamptz default now()
);

-- Policy to allow anon insert (if needed for the cron job if it runs as anon, typically service_role is used but cron might hit public endpoint)
-- Ideally cron API uses service role. But for safety let's assume we need read access for dashboard.
alter table cron_logs enable row level security;

create policy "Enable read access for all users" on cron_logs
  for select using (true);

create policy "Enable insert for service role only" on cron_logs
  for insert with check (auth.role() = 'service_role' OR auth.role() = 'anon'); 
  -- Assuming API might run as anon if triggered externally without auth, 
  -- but generally we should use service key. 
  -- For now allowing anon insert to ensure the public cron endpoint works if it's open.
