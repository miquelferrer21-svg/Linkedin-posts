-- Sessions table
create table sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  created_at timestamptz default now()
);

-- Documents table
create table documents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  type text not null check (type in ('tendencias', 'angulos', 'contenido', 'report_semanal')),
  content text not null,
  created_at timestamptz default now(),
  unique(session_id, type)
);

-- Enable Row Level Security
alter table sessions enable row level security;
alter table documents enable row level security;

-- Allow authenticated users to read everything
create policy "Authenticated users can read sessions"
  on sessions for select
  to authenticated
  using (true);

create policy "Authenticated users can read documents"
  on documents for select
  to authenticated
  using (true);

-- Allow service role to insert/update (used by sync.js)
create policy "Service role can insert sessions"
  on sessions for insert
  to service_role
  with check (true);

create policy "Service role can upsert documents"
  on documents for insert
  to service_role
  with check (true);

create policy "Service role can update documents"
  on documents for update
  to service_role
  using (true);
