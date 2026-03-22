-- Crear tabla de perfiles de usuario con roles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('deportista', 'entrenador', 'administrador')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Crear tabla de deportes
create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamp with time zone default now()
);

-- Crear tabla de relación deportista-deporte
create table if not exists public.athlete_sports (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(athlete_id, sport_id)
);

-- Crear tabla de rutinas
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  exercises jsonb not null default '[]',
  scheduled_date date not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Crear tabla de asistencia/progreso
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  completed boolean default false,
  notes text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(routine_id, athlete_id)
);

-- Habilitar Row Level Security en todas las tablas
alter table public.profiles enable row level security;
alter table public.sports enable row level security;
alter table public.athlete_sports enable row level security;
alter table public.routines enable row level security;
alter table public.attendance enable row level security;

-- Políticas RLS para profiles
create policy "Los usuarios pueden ver su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Los administradores pueden ver todos los perfiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

create policy "Los entrenadores pueden ver perfiles de deportistas"
  on public.profiles for select
  using (
    role = 'deportista' and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'entrenador'
    )
  );

create policy "Los administradores pueden insertar perfiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

create policy "Los administradores pueden actualizar perfiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

create policy "Los usuarios pueden actualizar su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Políticas RLS para sports
create policy "Todos pueden ver deportes"
  on public.sports for select
  using (true);

create policy "Los administradores pueden crear deportes"
  on public.sports for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

create policy "Los administradores pueden actualizar deportes"
  on public.sports for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

create policy "Los administradores pueden eliminar deportes"
  on public.sports for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

-- Políticas RLS para athlete_sports
create policy "Los deportistas pueden ver sus deportes"
  on public.athlete_sports for select
  using (auth.uid() = athlete_id);

create policy "Los entrenadores pueden ver asignaciones de deportistas"
  on public.athlete_sports for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'entrenador'
    )
  );

create policy "Los administradores pueden ver todas las asignaciones"
  on public.athlete_sports for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

create policy "Los administradores pueden asignar deportes"
  on public.athlete_sports for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

create policy "Los administradores pueden eliminar asignaciones"
  on public.athlete_sports for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

-- Políticas RLS para routines
create policy "Los deportistas pueden ver rutinas de sus deportes"
  on public.routines for select
  using (
    exists (
      select 1 from public.athlete_sports
      where athlete_id = auth.uid() and sport_id = routines.sport_id
    )
  );

create policy "Los entrenadores pueden ver sus rutinas"
  on public.routines for select
  using (auth.uid() = trainer_id);

create policy "Los administradores pueden ver todas las rutinas"
  on public.routines for select
  using (
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

-- Políticas RLS para attendance
create policy "Los deportistas pueden ver su asistencia"
  on public.attendance for select
  using (auth.uid() = athlete_id);

create policy "Los entrenadores pueden ver asistencia de sus rutinas"
  on public.attendance for select
  using (
    exists (
      select 1 from public.routines
      where id = attendance.routine_id and trainer_id = auth.uid()
    )
  );

create policy "Los administradores pueden ver toda la asistencia"
  on public.attendance for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'administrador'
    )
  );

create policy "Los deportistas pueden marcar su asistencia"
  on public.attendance for insert
  with check (auth.uid() = athlete_id);

create policy "Los deportistas pueden actualizar su asistencia"
  on public.attendance for update
  using (auth.uid() = athlete_id);

create policy "Los entrenadores pueden crear registros de asistencia"
  on public.attendance for insert
  with check (
    exists (
      select 1 from public.routines
      where id = attendance.routine_id and trainer_id = auth.uid()
    )
  );
