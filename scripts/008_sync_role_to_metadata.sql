-- Función para sincronizar el rol del perfil a los metadatos del usuario
create or replace function public.sync_role_to_user_metadata()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Actualizar los metadatos del usuario en auth.users
  update auth.users
  set raw_user_meta_data = jsonb_set(
    coalesce(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  )
  where id = NEW.id;
  
  return NEW;
end;
$$;

-- Trigger para sincronizar el rol cuando se inserta o actualiza un perfil
drop trigger if exists sync_role_on_profile_change on public.profiles;
create trigger sync_role_on_profile_change
  after insert or update of role on public.profiles
  for each row
  execute function public.sync_role_to_user_metadata();

-- Sincronizar roles existentes (si hay alguno)
do $$
declare
  profile_record record;
begin
  for profile_record in select id, role from public.profiles loop
    update auth.users
    set raw_user_meta_data = jsonb_set(
      coalesce(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(profile_record.role)
    )
    where id = profile_record.id;
  end loop;
end $$;
