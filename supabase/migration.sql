-- Timer: singleton row storing shared timer state
create table if not exists timer (
  id int primary key default 1 check (id = 1),
  started_at timestamptz,
  duration_seconds int not null default 600,
  is_active boolean not null default false,
  paused_remaining int
);

insert into timer (id) values (1) on conflict do nothing;

-- Task completions: one row per checked task
create table if not exists task_completions (
  id bigint primary key generated always as identity,
  task_id text not null,
  task_type text not null check (task_type in ('daily', 'weekly')),
  date_key text not null,
  completed_by text not null,
  completed_at timestamptz default now(),
  unique (task_id, task_type, date_key)
);

-- Need full replica identity so DELETE events include all columns
alter table task_completions replica identity full;

-- RLS: permissive for anon (household app, not multi-tenant)
alter table timer enable row level security;
alter table task_completions enable row level security;

create policy "Allow all on timer" on timer for all using (true) with check (true);
create policy "Allow all on task_completions" on task_completions for all using (true) with check (true);

-- Enable realtime
alter publication supabase_realtime add table timer;
alter publication supabase_realtime add table task_completions;
