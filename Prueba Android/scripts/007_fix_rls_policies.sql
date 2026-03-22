-- Eliminar todas las políticas existentes de profiles que causan recursión
drop policy if exists "Los usuarios pueden ver su propio perfil" on public.profiles;
drop policy if exists "Los administradores pueden ver todos los perfiles" on public.profiles;
drop policy if exists "Los entrenadores pueden ver perfiles de deportistas" on public.profiles;
drop policy if exists "Los administradores pueden insertar perfiles" on public.profiles;
drop policy if exists "Los administradores pueden actualizar perfiles" on public.profiles;
drop policy if exists "Los usuarios pueden actualizar su propio perfil" on public.profiles;

-- Crear función helper para obtener el rol del usuario actual sin recursión
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

-- Crear función helper para verificar si el usuario es admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'administrador'
  );
$$;

-- Crear función helper para verificar si el usuario es entrenador
create or replace function public.is_trainer()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'entrenador'
  );
$$;

-- Nuevas políticas RLS para profiles sin recursión
create policy "Los usuarios pueden ver su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Los administradores pueden ver todos los perfiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Los entrenadores pueden ver perfiles de deportistas"
  on public.profiles for select
  using (role = 'deportista' and public.is_trainer());

create policy "Los administradores pueden insertar perfiles"
  on public.profiles for insert
  with check (public.is_admin());

create policy "Los administradores pueden actualizar perfiles"
  on public.profiles for update
  using (public.is_admin());

create policy "Los usuarios pueden actualizar su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Actualizar políticas de otras tablas para usar las funciones helper
drop policy if exists "Los administradores pueden crear deportes" on public.sports;
drop policy if exists "Los administradores pueden actualizar deportes" on public.sports;
drop policy if exists "Los administradores pueden eliminar deportes" on public.sports;

create policy "Los administradores pueden crear deportes"
  on public.sports for insert
  with check (public.is_admin());

create policy "Los administradores pueden actualizar deportes"
  on public.sports for update
  using (public.is_admin());

create policy "Los administradores pueden eliminar deportes"
  on public.sports for delete
  using (public.is_admin());

-- Actualizar políticas de athlete_sports
drop policy if exists "Los entrenadores pueden ver asignaciones de deportistas" on public.athlete_sports;
drop policy if exists "Los administradores pueden ver todas las asignaciones" on public.athlete_sports;
drop policy if exists "Los administradores pueden asignar deportes" on public.athlete_sports;
drop policy if exists "Los administradores pueden eliminar asignaciones" on public.athlete_sports;

create policy "Los entrenadores pueden ver asignaciones de deportistas"
  on public.athlete_sports for select
  using (public.is_trainer());

create policy "Los administradores pueden ver todas las asignaciones"
  on public.athlete_sports for select
  using (public.is_admin());

create policy "Los administradores pueden asignar deportes"
  on public.athlete_sports for insert
  with check (public.is_admin());

create policy "Los administradores pueden eliminar asignaciones"
  on public.athlete_sports for delete
  using (public.is_admin());

-- Actualizar políticas de routines
drop policy if exists "Los administradores pueden ver todas las rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden crear rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden actualizar sus rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden eliminar sus rutinas" on public.routines;

create policy "Los administradores pueden ver todas las rutinas"
  on public.routines for select
  using (public.is_admin());

create policy "Los entrenadores pueden crear rutinas"
  on public.routines for insert
  with check (auth.uid() = trainer_id and public.is_trainer());

create policy "Los entrenadores pueden actualizar sus rutinas"
  on public.routines for update
  using (auth.uid() = trainer_id and public.is_trainer());

create policy "Los entrenadores pueden eliminar sus rutinas"
  on public.routines for delete
  using (auth.uid() = trainer_id and public.is_trainer());

-- Actualizar políticas de attendance
drop policy if exists "Los administradores pueden ver toda la asistencia" on public.attendance;

create policy "Los administradores pueden ver toda la asistencia"
  on public.attendance for select
  using (public.is_admin());
