-- Función para actualizar updated_at automáticamente
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers para updated_at
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger routines_updated_at
  before update on public.routines
  for each row
  execute function public.handle_updated_at();

-- Función para crear perfil automáticamente al registrarse
-- NOTA: Esta función NO se ejecutará automáticamente porque requiere confirmación de email
-- Los perfiles se crearán manualmente por el administrador
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo crear perfil si el usuario tiene metadata de rol
  if new.raw_user_meta_data ? 'role' then
    insert into public.profiles (id, email, full_name, role)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
      coalesce(new.raw_user_meta_data ->> 'role', 'deportista')
    )
    on conflict (id) do nothing;
  end if;
  
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
