-- Imperium Gladiador — esquema de Supabase (se puede ejecutar varias veces sin romper nada).
-- Pegalo en: Supabase > SQL Editor > New query > Run.
--
-- Seguridad (resumen):
--  * Row Level Security (RLS) activada en todas las tablas: cada persona solo ve y modifica lo suyo.
--  * La API sin sesión (rol "anon") no tiene ningún permiso sobre estas tablas.
--  * Los documentos JSON tienen límites de tamaño y de forma.
--  * La hora de modificación la pone el servidor; el cliente no puede falsearla.

-- ============ Hora de modificación: siempre la del servidor ============
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- ============ Datos privados de cada usuario (un documento por persona) ============
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
revoke all on public.user_data from anon;
grant select, insert, update, delete on public.user_data to authenticated;

drop policy if exists "user_data: leer lo propio" on public.user_data;
drop policy if exists "user_data: insertar lo propio" on public.user_data;
drop policy if exists "user_data: actualizar lo propio" on public.user_data;
drop policy if exists "user_data: borrar lo propio" on public.user_data;
create policy "user_data: leer lo propio" on public.user_data for select to authenticated using (auth.uid() = user_id);
create policy "user_data: insertar lo propio" on public.user_data for insert to authenticated with check (auth.uid() = user_id);
create policy "user_data: actualizar lo propio" on public.user_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_data: borrar lo propio" on public.user_data for delete to authenticated using (auth.uid() = user_id);

-- Un documento tiene que ser un objeto y no pasar de ~3 MB (evita usar la base como depósito de archivos).
alter table public.user_data drop constraint if exists user_data_forma;
alter table public.user_data add constraint user_data_forma
  check (jsonb_typeof(data) = 'object' and octet_length(data::text) < 3000000) not valid;
drop trigger if exists user_data_updated_at on public.user_data;
create trigger user_data_updated_at before insert or update on public.user_data
  for each row execute function public.set_updated_at();

-- ============ Perfil público (Arena): solo un RESUMEN que el propio usuario publica ============
-- Rutinas, peso corporal, medidas y notas viven en user_data y son privados.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  share boolean not null default true,
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;

-- Grupos (ligas privadas): quien comparte un código de 8 caracteres solo se ve con los de su grupo.
-- Sin grupo, se ve con los demás que tampoco tienen grupo (la Arena abierta, como antes).
alter table public.profiles add column if not exists grupo text;
alter table public.profiles drop constraint if exists profiles_grupo_forma;
alter table public.profiles add constraint profiles_grupo_forma
  check (grupo is null or grupo ~ '^[A-Z0-9]{8}$') not valid;
create index if not exists profiles_grupo_idx on public.profiles (grupo);
-- Grupo de quien consulta. "security definer" para leerlo sin pasar por la misma política (evita recursión).
create or replace function public.mi_grupo() returns text
language sql stable security definer set search_path = '' as $$
  select grupo from public.profiles where user_id = auth.uid()
$$;
revoke all on function public.mi_grupo() from public, anon;
grant execute on function public.mi_grupo() to authenticated;

drop policy if exists "profiles: ver compartidos o propio" on public.profiles;
drop policy if exists "profiles: ver los de mi grupo o propio" on public.profiles;
drop policy if exists "profiles: crear el propio" on public.profiles;
drop policy if exists "profiles: editar el propio" on public.profiles;
drop policy if exists "profiles: borrar el propio" on public.profiles;
create policy "profiles: ver los de mi grupo o propio" on public.profiles for select to authenticated
  using (auth.uid() = user_id or (share = true and grupo is not distinct from public.mi_grupo()));
create policy "profiles: crear el propio" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "profiles: editar el propio" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles: borrar el propio" on public.profiles for delete to authenticated using (auth.uid() = user_id);

-- El resumen tiene que ser un objeto chico, y el nombre no puede llevar marcas HTML ni caracteres de control.
alter table public.profiles drop constraint if exists profiles_forma;
alter table public.profiles add constraint profiles_forma
  check (jsonb_typeof(stats) = 'object' and octet_length(stats::text) < 60000) not valid;
alter table public.profiles drop constraint if exists profiles_nombre_limpio;
alter table public.profiles add constraint profiles_nombre_limpio
  check (name !~ '[<>[:cntrl:]]') not valid;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before insert or update on public.profiles
  for each row execute function public.set_updated_at();

-- ============ Limpieza: ya no se usan (Strava, puente de carreras) ============
drop table if exists public.strava_tokens;
drop table if exists public.incoming_runs;
drop table if exists public.ingest_tokens;
