-- Crear tabla para asignar múltiples usuarios a una rutina
drop table if exists public.routine_user_assignments cascade;
create table public.routine_user_assignments (
  id uuid default gen_random_uuid() primary key,
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- Habilitar RLS
alter table public.routine_user_assignments enable row level security;

-- Eliminar políticas previas si existieran (por nombre)
drop policy if exists "select_assignments" on public.routine_user_assignments;
drop policy if exists "insert_assignments" on public.routine_user_assignments;
drop policy if exists "delete_assignments" on public.routine_user_assignments;

-- SELECT: Permitir ver la asignación si eres el usuario asignado o el entrenador de la rutina, o admin
create policy "select_assignments"
  on public.routine_user_assignments for select
  using (
    user_id = auth.uid()
    or exists(select 1 from public.routines r where r.id = routine_id and r.trainer_id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'administrador'
  );

-- INSERT: Sólo entrenadores que sean dueños de la rutina pueden crear asignaciones
create policy "insert_assignments"
  on public.routine_user_assignments for insert
  with check (
    exists(select 1 from public.routines r where r.id = routine_id and r.trainer_id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) = 'entrenador'
  );

-- DELETE: Entrenadores dueños de la rutina o administradores pueden borrar asignaciones
create policy "delete_assignments"
  on public.routine_user_assignments for delete
  using (
    exists(select 1 from public.routines r where r.id = routine_id and r.trainer_id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'administrador'
  );

-- Índices para consultas frecuentes
create index if not exists idx_routine_user_assignments_routine_id on public.routine_user_assignments(routine_id);
create index if not exists idx_routine_user_assignments_user_id on public.routine_user_assignments(user_id);

-- Verificación sugerida:
-- select * from public.routine_user_assignments limit 5;
