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
  type text not null check (type in (
    'noticia_financiera', 'frase_iconica', 'dato_impactante',
    'error_financiero', 'concepto_mes', 'nueva_funcionalidad'
  )),
  content text not null,
  status text not null default 'sin_revisar'
    check (status in ('sin_revisar', 'por_revisar', 'colgado', 'no_me_gusta')),
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

-- Allow authenticated users to update status only
-- NOTE: client must only send { status } in the update call, never other fields
create policy "Authenticated users can update document status"
  on documents for update
  to authenticated
  using (true)
  with check (true);

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
