-- Script para reactivar temporalmente el sistema de auto-admin
-- Ejecuta este script, luego regístrate, y después ejecuta el 005 nuevamente

-- Eliminar el trigger actual si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recrear la función que hace al primer usuario admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Contar cuántos perfiles existen
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Si es el primer usuario, hacerlo admin
  IF user_count = 0 THEN
    INSERT INTO public.profiles (id, email, role, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      'administrador',
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Administrador')
    );
  ELSE
    -- Los demás usuarios son deportistas por defecto
    INSERT INTO public.profiles (id, email, role, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      'deportista',
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Sistema de auto-admin reactivado. Ahora puedes registrarte como el primer usuario y serás administrador automáticamente.';
  RAISE NOTICE 'Después de registrarte, ejecuta el script 005_disable_auto_admin.sql nuevamente.';
END $$;
