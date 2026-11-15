-- Imperium Gladiador — esquema de Supabase (se puede ejecutar varias veces sin romper nada).
-- Pegalo en: Supabase > SQL Editor > New query > Run.

-- ============ Datos privados de cada usuario (un documento por persona) ============
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
drop policy if exists "user_data: leer lo propio" on public.user_data;
drop policy if exists "user_data: insertar lo propio" on public.user_data;
drop policy if exists "user_data: actualizar lo propio" on public.user_data;
drop policy if exists "user_data: borrar lo propio" on public.user_data;
create policy "user_data: leer lo propio" on public.user_data for select using (auth.uid() = user_id);
create policy "user_data: insertar lo propio" on public.user_data for insert with check (auth.uid() = user_id);
create policy "user_data: actualizar lo propio" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_data: borrar lo propio" on public.user_data for delete using (auth.uid() = user_id);

-- ============ Perfil público (Arena): solo un RESUMEN que el propio usuario publica ============
-- Rutinas, peso corporal, medidas, notas y recorridos viven en user_data y son privados.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  share boolean not null default true,
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles: ver compartidos o propio" on public.profiles;
drop policy if exists "profiles: crear el propio" on public.profiles;
drop policy if exists "profiles: editar el propio" on public.profiles;
drop policy if exists "profiles: borrar el propio" on public.profiles;
create policy "profiles: ver compartidos o propio" on public.profiles for select to authenticated using (share = true or auth.uid() = user_id);
create policy "profiles: crear el propio" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "profiles: editar el propio" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles: borrar el propio" on public.profiles for delete to authenticated using (auth.uid() = user_id);

-- ============ Carreras automáticas desde el celular ============
-- Token personal: se guarda SOLO su huella (hash). El token real lo ves una vez en la app.
create table if not exists public.ingest_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.ingest_tokens enable row level security;
drop policy if exists "ingest_tokens: crear el propio" on public.ingest_tokens;
drop policy if exists "ingest_tokens: cambiar el propio" on public.ingest_tokens;
drop policy if exists "ingest_tokens: borrar el propio" on public.ingest_tokens;
-- Sin política de lectura: nadie (ni vos) puede leer hashes desde el cliente.
create policy "ingest_tokens: crear el propio" on public.ingest_tokens for insert to authenticated with check (auth.uid() = user_id);
create policy "ingest_tokens: cambiar el propio" on public.ingest_tokens for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ingest_tokens: borrar el propio" on public.ingest_tokens for delete to authenticated using (auth.uid() = user_id);

-- Bandeja de entrada: la función "ingest-run" deja carreras acá y la app las recoge y las borra.
create table if not exists public.incoming_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ext_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, ext_id)
);
alter table public.incoming_runs enable row level security;
drop policy if exists "incoming_runs: leer lo propio" on public.incoming_runs;
drop policy if exists "incoming_runs: borrar lo propio" on public.incoming_runs;
-- Sin política de inserción: solo la Edge Function (con la clave de servicio) puede escribir.
create policy "incoming_runs: leer lo propio" on public.incoming_runs for select to authenticated using (auth.uid() = user_id);
create policy "incoming_runs: borrar lo propio" on public.incoming_runs for delete to authenticated using (auth.uid() = user_id);

-- ============ Limpieza: Strava ya no se usa ============
drop table if exists public.strava_tokens;
