-- Imperium Gladiador — esquema de Supabase.
-- Pegalo en: Supabase > SQL Editor > New query > Run.

-- Todos tus datos de la app, un documento por usuario.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;

create policy "user_data: leer lo propio" on public.user_data
  for select using (auth.uid() = user_id);
create policy "user_data: insertar lo propio" on public.user_data
  for insert with check (auth.uid() = user_id);
create policy "user_data: actualizar lo propio" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_data: borrar lo propio" on public.user_data
  for delete using (auth.uid() = user_id);

-- Tokens de Strava: SIN políticas = ningún cliente puede leerlos.
-- Solo la Edge Function (con service_role) accede.
create table if not exists public.strava_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  athlete_id bigint,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  updated_at timestamptz not null default now()
);
alter table public.strava_tokens enable row level security;
