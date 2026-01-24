-- SCRIPT FINAL: ASEGURAR QUE TODO FUNCIONA
-- Ejecuta esto en Supabase SQL Editor

-- ============================================
-- 1. VERIFICAR DATOS
-- ============================================
-- Ver rutinas con sus usuarios asignados
SELECT 
  r.id,
  r.title,
  r.trainer_id,
  r.user_id,
  p.full_name as "Usuario Asignado",
  r.scheduled_date
FROM routines r
LEFT JOIN profiles p ON r.user_id = p.id
ORDER BY r.created_at DESC
LIMIT 10;

-- Ver cuántos usuarios tienen qué roles
SELECT role, COUNT(*) as cantidad FROM public.profiles GROUP BY role;

-- ============================================
-- 2. LIMPIAR POLÍTICAS (UNA VEZ MÁS)
-- ============================================
drop policy if exists "trainer_see_own" on public.routines;
drop policy if exists "user_see_assigned" on public.routines;
drop policy if exists "admin_see_all" on public.routines;
drop policy if exists "trainer_insert" on public.routines;
drop policy if exists "trainer_update" on public.routines;
drop policy if exists "trainer_delete" on public.routines;
drop policy if exists "trainer_see_all_own" on public.routines;
drop policy if exists "user_see_all_own" on public.routines;
drop policy if exists "admin_read_all" on public.routines;
drop policy if exists "only_trainer_create" on public.routines;
drop policy if exists "trainer_update_own" on public.routines;
drop policy if exists "trainer_delete_own" on public.routines;

-- ============================================
-- 3. CREAR POLÍTICAS FINALES Y SIMPLES
-- ============================================

-- Política 1: Entrenador ve SUS rutinas (las que él creo)
create policy "entrenador_ve_sus_rutinas"
  on public.routines for select
  using (auth.uid() = trainer_id);

-- Política 2: Usuario VE SUS RUTINAS (las que le asignaron)
create policy "usuario_ve_sus_rutinas"
  on public.routines for select
  using (auth.uid() = user_id);

-- Política 3: Admin ve TODO
create policy "admin_ve_todo"
  on public.routines for select
  using (
    (select role from public.profiles where id = auth.uid() limit 1) = 'administrador'
  );

-- Política 4: Solo entrenador puede CREAR
create policy "solo_entrenador_crea"
  on public.routines for insert
  with check (
    auth.uid() = trainer_id
  );

-- Política 5: Entrenador puede ACTUALIZAR sus rutinas
create policy "entrenador_actualiza_sus"
  on public.routines for update
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

-- Política 6: Entrenador puede ELIMINAR sus rutinas
create policy "entrenador_elimina_sus"
  on public.routines for delete
  using (auth.uid() = trainer_id);

-- ============================================
-- 4. VERIFICAR QUE LAS POLÍTICAS EXISTAN
-- ============================================
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'routines' ORDER BY policyname;
