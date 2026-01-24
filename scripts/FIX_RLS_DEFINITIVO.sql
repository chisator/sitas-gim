-- SCRIPT DEFINITIVO PARA LIMPIAR Y RECREAR POLÍTICAS RLS
-- Ejecuta esto y debería resolver todo

-- ============================================
-- 1. ELIMINAR TODAS LAS POLÍTICAS DE ROUTINES
-- ============================================
drop policy if exists "Los deportistas pueden ver rutinas de sus deportes" on public.routines;
drop policy if exists "Los usuarios pueden ver rutinas asignadas" on public.routines;
drop policy if exists "Los administradores pueden ver todas las rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden ver sus rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden crear rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden actualizar sus rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden eliminar sus rutinas" on public.routines;
drop policy if exists "Los usuarios pueden ver rutinas asignadas a ellos" on public.routines;
drop policy if exists "Los administradores pueden ver todas las rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden ver sus propias rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden crear nuevas rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden actualizar sus propias rutinas" on public.routines;
drop policy if exists "Los entrenadores pueden eliminar sus propias rutinas" on public.routines;

-- ============================================
-- 2. CREAR POLÍTICAS NUEVAS Y LIMPIAS
-- ============================================

-- LECTURA: Entrenadores ven sus propias rutinas
create policy "trainer_see_own"
  on public.routines for select
  using (trainer_id = auth.uid());

-- LECTURA: Usuarios ven sus rutinas asignadas
create policy "user_see_assigned"
  on public.routines for select
  using (user_id = auth.uid());

-- LECTURA: Admins ven todo
create policy "admin_see_all"
  on public.routines for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'administrador'
  );

-- CREACIÓN: Solo entrenadores pueden crear
create policy "trainer_insert"
  on public.routines for insert
  with check (
    trainer_id = auth.uid() and
    (select role from public.profiles where id = auth.uid()) = 'entrenador'
  );

-- ACTUALIZACIÓN: Entrenadores actualizan sus rutinas
create policy "trainer_update"
  on public.routines for update
  using (
    trainer_id = auth.uid() and
    (select role from public.profiles where id = auth.uid()) = 'entrenador'
  );

-- ELIMINACIÓN: Entrenadores eliminan sus rutinas
create policy "trainer_delete"
  on public.routines for delete
  using (
    trainer_id = auth.uid() and
    (select role from public.profiles where id = auth.uid()) = 'entrenador'
  );

-- ============================================
-- 3. VERIFICACIÓN - Ejecuta esto para confirmar
-- ============================================
-- SELECT * FROM routines WHERE user_id IS NOT NULL LIMIT 5;
