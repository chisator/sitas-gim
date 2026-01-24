-- FIX PARA QUE USUARIOS VEAN SUS RUTINAS
-- Y ASEGURAR QUE TODOS PUEDAN SER CREADOS

-- ============================================
-- 1. VERIFICAR Y LIMPIAR POLÍTICAS DE ROUTINES
-- ============================================

-- Ver qué políticas existen
SELECT policyname FROM pg_policies WHERE tablename = 'routines' ORDER BY policyname;

-- Eliminar todas y crear de nuevo con permiso explícito para usuarios
drop policy if exists "trainer_see_own" on public.routines;
drop policy if exists "user_see_assigned" on public.routines;
drop policy if exists "admin_see_all" on public.routines;
drop policy if exists "trainer_insert" on public.routines;
drop policy if exists "trainer_update" on public.routines;
drop policy if exists "trainer_delete" on public.routines;

-- ============================================
-- 2. CREAR POLÍTICAS DEFINITIVAS
-- ============================================

-- Política 1: Entrenadores ven TODAS sus rutinas (las que ellos crean)
create policy "trainer_see_all_own"
  on public.routines for select
  using (auth.uid() = trainer_id);

-- Política 2: Usuarios (deportistas) ven TODAS sus rutinas asignadas
-- Esta es la KEY para que los deportistas vean sus rutinas
create policy "user_see_all_own"
  on public.routines for select
  using (auth.uid() = user_id);

-- Política 3: Admins ven TODO
create policy "admin_read_all"
  on public.routines for select
  using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'administrador'
    )
  );

-- Política 4: Solo entrenadores pueden crear rutinas
create policy "only_trainer_create"
  on public.routines for insert
  with check (
    auth.uid() = trainer_id
    and
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'entrenador'
    )
  );

-- Política 5: Entrenadores actualizan solo sus rutinas
create policy "trainer_update_own"
  on public.routines for update
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

-- Política 6: Entrenadores eliminan solo sus rutinas
create policy "trainer_delete_own"
  on public.routines for delete
  using (auth.uid() = trainer_id);

-- ============================================
-- 3. VERIFICAR POLÍTICAS DE PROFILES
-- ============================================

-- Ver políticas de profiles
SELECT policyname FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;

-- Asegurar que los roles se guardan correctamente
-- Ver los perfiles para verificar roles
SELECT id, email, full_name, role FROM public.profiles LIMIT 10;
