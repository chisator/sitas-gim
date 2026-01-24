-- FIX: Allow users to see routines via routine_user_assignments table
-- The old policy checked user_id column, but new routines use routine_user_assignments table
-- Solution: Use direct joins instead of IN subqueries to avoid RLS recursion

-- Drop all old user-related policies to avoid conflicts
drop policy if exists "user_see_assigned" on public.routines;
drop policy if exists "user_see_via_assignments" on public.routines;
drop policy if exists "trainer_see_own" on public.routines;
drop policy if exists "admin_see_all" on public.routines;
drop policy if exists "trainer_insert" on public.routines;
drop policy if exists "trainer_update" on public.routines;
drop policy if exists "trainer_delete" on public.routines;

-- LECTURA: Entrenadores ven sus propias rutinas
create policy "trainer_see_own"
  on public.routines for select
  using (trainer_id = auth.uid());

-- LECTURA: Usuarios ven rutinas asignadas DIRECTAMENTE (no recursion)
-- This avoids RLS recursion by checking routine_user_assignments directly
create policy "user_see_assigned"
  on public.routines for select
  using (
    -- Legacy: direct user_id
    user_id = auth.uid()
    OR
    -- New: check if user is in routine_user_assignments
    EXISTS (
      SELECT 1 FROM public.routine_user_assignments rua
      WHERE rua.routine_id = routines.id 
        AND rua.user_id = auth.uid()
    )
  );

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

-- Verify: Run this as a sportista user to test
-- SELECT id, title FROM public.routines 
-- WHERE id IN (SELECT routine_id FROM public.routine_user_assignments WHERE user_id = auth.uid());
