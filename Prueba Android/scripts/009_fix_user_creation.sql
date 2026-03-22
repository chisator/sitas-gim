-- Eliminar el trigger problemático que intenta actualizar auth.users
-- Los triggers en public schema no pueden modificar auth.users por seguridad
drop trigger if exists sync_role_on_profile_change on public.profiles;
drop function if exists public.sync_role_to_user_metadata();

-- Simplificar el trigger de creación de perfil
-- Solo crea el perfil, sin intentar modificar auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'deportista')
  )
  on conflict (id) do nothing;
  
  return new;
end;
$$;
