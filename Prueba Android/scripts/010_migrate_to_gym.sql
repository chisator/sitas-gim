-- Script de migración: De Club (por deportes) a Gimnasio (por usuarios)
-- Este script modifica la arquitectura para asignar rutinas por usuario en lugar de por deporte

-- 1. Crear tabla de asignaciones entrenador-usuario
create table if not exists public.trainer_user_assignments (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(trainer_id, user_id)
);

-- 2. Modificar tabla routines para remover sport_id y agregar user_id
-- Primero, agregar la columna user_id si no existe
alter table if exists public.routines add column if not exists user_id uuid references public.profiles(id) on delete cascade;

-- Hacer sport_id nullable si aún no lo es
alter table if exists public.routines alter column sport_id drop not null;

-- 3. Crear una tabla temporal para respaldar datos si es necesario
-- (Mantener compatibilidad con rutinas existentes)

-- Habilitar RLS en nueva tabla
alter table public.trainer_user_assignments enable row level security;

-- Políticas RLS para trainer_user_assignments
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

-- Actualizar políticas RLS para routines con la nueva estructura
-- Remover política antigua basada en sports
drop policy if exists "Los deportistas pueden ver rutinas de sus deportes" on public.routines;

-- Crear nueva política: usuarios pueden ver rutinas asignadas a ellos
create policy "Los usuarios pueden ver rutinas asignadas"
  on public.routines for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'entrenador'
    ) or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

-- Asegurarse que los entrenadores solo vean sus propias rutinas (política existente debería bastar)

-- Actualizar política de creación de rutinas
drop policy if exists "Los entrenadores pueden crear rutinas" on public.routines;

create policy "Los entrenadores pueden crear rutinas"
  on public.routines for insert
  with check (
    auth.uid() = trainer_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'entrenador'
    )
  );
