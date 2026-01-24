-- SCRIPT CORREGIDO PARA POLÍTICAS RLS
-- Ejecuta esto en Supabase SQL Editor

-- 1. Eliminar todas las políticas de routines para empezar limpio
drop policy if exists "Los deportistas pueden ver rutinas de sus deportes" on public.routines;
drop policy if exists "Los usuarios pueden ver rutinas asignadas" on public.routines;
drop policy if exists "Los administradores pueden ver todas las rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden ver sus rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden crear rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden actualizar sus rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden eliminar sus rutinas" on public.routines;

-- 2. NUEVAS POLÍTICAS CORRECTAS

-- Los entrenadores pueden VER sus propias rutinas (que crearon)
create policy "Los entrenadores pueden ver sus propias rutinas"
  on public.routines for select
  using (auth.uid() = trainer_id);

-- Los usuarios pueden ver rutinas asignadas a ellos
create policy "Los usuarios pueden ver rutinas asignadas a ellos"
  on public.routines for select
  using (auth.uid() = user_id);

-- Los administradores pueden ver todas las rutinas
create policy "Los administradores pueden ver todas las rutinas"
  on public.routines for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

-- Los entrenadores pueden crear rutinas
create policy "Los entrenadores pueden crear nuevas rutinas"
  on public.routines for insert
  with check (
    auth.uid() = trainer_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'entrenador'
    )
  );

-- Los entrenadores pueden actualizar sus propias rutinas
create policy "Los entrenadores pueden actualizar sus propias rutinas"
  on public.routines for update
  using (
    auth.uid() = trainer_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'entrenador'
    )
  );

-- Los entrenadores pueden eliminar sus propias rutinas
create policy "Los entrenadores pueden eliminar sus propias rutinas"
  on public.routines for delete
  using (
    auth.uid() = trainer_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'entrenador'
    )
  );
