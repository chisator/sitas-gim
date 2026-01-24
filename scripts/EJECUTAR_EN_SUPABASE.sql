-- SCRIPT DE MIGRACIÓN INMEDIATO PARA SUPABASE
-- Copia y pega TODO este contenido en Supabase SQL Editor y ejecuta

-- 1. Crear tabla de asignaciones entrenador-usuario
create table if not exists public.trainer_user_assignments (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(trainer_id, user_id)
);

-- 2. Modificar tabla routines
alter table if exists public.routines add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table if exists public.routines alter column sport_id drop not null;

-- 3. Habilitar RLS
alter table public.trainer_user_assignments enable row level security;

-- 4. Eliminar políticas antiguas si existen
drop policy if exists "Los deportistas pueden ver rutinas de sus deportes" on public.routines;
drop policy if exists "Los entrenadores pueden crear rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden ver sus rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden actualizar sus rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden eliminar sus rutinas" on public.routines;

-- Eliminar políticas de trainer_user_assignments si existen (de ejecuciones anteriores)
drop policy if exists "Los entrenadores pueden ver sus asignaciones de usuarios" on public.trainer_user_assignments;
drop policy if exists "Los usuarios pueden ver los entrenadores asignados" on public.trainer_user_assignments;
drop policy if exists "Los administradores pueden ver todas las asignaciones" on public.trainer_user_assignments;
drop policy if exists "Los administradores pueden asignar usuarios a entrenadores" on public.trainer_user_assignments;
drop policy if exists "Los administradores pueden eliminar asignaciones" on public.trainer_user_assignments;

-- Eliminar políticas nuevas de routines si existen
drop policy if exists "Los usuarios pueden ver rutinas asignadas" on public.routines;
drop policy if exists "Los administradores pueden ver todas las rutinas" on public.routines;

-- 5. Políticas para trainer_user_assignments
create policy "Los entrenadores pueden ver sus asignaciones de usuarios"
  on public.trainer_user_assignments for select
  using (auth.uid() = trainer_id);

create policy "Los usuarios pueden ver los entrenadores asignados"
  on public.trainer_user_assignments for select
  using (auth.uid() = user_id);

create policy "Los administradores pueden ver todas las asignaciones"
  on public.trainer_user_assignments for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

create policy "Los administradores pueden asignar usuarios a entrenadores"
  on public.trainer_user_assignments for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

create policy "Los administradores pueden eliminar asignaciones"
  on public.trainer_user_assignments for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

-- 6. Nuevas políticas para routines
create policy "Los usuarios pueden ver rutinas asignadas"
  on public.routines for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.routines r
      join public.trainer_user_assignments tua on r.trainer_id = tua.trainer_id
      where r.id = routines.id and tua.user_id = auth.uid()
    ) or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'entrenador'
    ) or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

create policy "Los entrenadores pueden crear rutinas"
  on public.routines for insert
  with check (
    auth.uid() = trainer_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'entrenador'
    )
  );

create policy "Los entrenadores pueden actualizar sus rutinas"
  on public.routines for update
  using (
    auth.uid() = trainer_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'entrenador'
    )
  );

create policy "Los entrenadores pueden eliminar sus rutinas"
  on public.routines for delete
  using (
    auth.uid() = trainer_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'entrenador'
    )
  );

create policy "Los administradores pueden ver todas las rutinas"
  on public.routines for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );
