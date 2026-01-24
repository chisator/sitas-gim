-- Crear el primer usuario administrador
-- IMPORTANTE: Después de ejecutar este script, inicia sesión y cambia la contraseña

-- Este script crea un usuario admin con credenciales por defecto
-- Email: admin@clubdeportivo.com
-- Password: Admin123!

-- Nota: Supabase requiere que los usuarios se creen a través de su API de autenticación
-- Este script solo crea el perfil. Debes crear el usuario de una de estas formas:

-- OPCIÓN 1: Crear desde el código (recomendado)
-- Descomenta y ejecuta esta función desde tu aplicación una sola vez:

CREATE OR REPLACE FUNCTION create_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Esta función debe ser llamada desde tu aplicación
  -- No se puede crear usuarios de auth directamente desde SQL
  RAISE NOTICE 'Usa la página de registro especial /auth/setup-admin para crear el primer administrador';
END;
$$;

-- OPCIÓN 2: Crear manualmente desde Supabase Dashboard
-- 1. Ve a Authentication > Users en tu panel de Supabase
-- 2. Haz clic en "Add user" > "Create new user"
-- 3. Email: admin@clubdeportivo.com
-- 4. Password: Admin123! (o la que prefieras)
-- 5. Confirma el email automáticamente
-- 6. Copia el UUID del usuario creado
-- 7. Ejecuta este INSERT reemplazando 'USER_UUID_AQUI' con el UUID real:

-- INSERT INTO public.profiles (id, email, full_name, role)
-- VALUES ('USER_UUID_AQUI', 'admin@clubdeportivo.com', 'Administrador Principal', 'administrador');

-- OPCIÓN 3: Política temporal para auto-registro de admin
-- Esta política permite que el primer usuario que se registre sea admin automáticamente
-- ADVERTENCIA: Desactiva esta política después de crear tu primer admin

-- Verificar si ya existe algún admin
CREATE OR REPLACE FUNCTION public.is_first_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'administrador');
$$;

-- Política temporal: el primer usuario será admin automáticamente
DROP POLICY IF EXISTS "Primer usuario es admin" ON public.profiles;
CREATE POLICY "Primer usuario es admin"
ON public.profiles
FOR INSERT
WITH CHECK (
  is_first_user() OR auth.uid() = id
);

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE 
      WHEN is_first_user() THEN 'administrador'
      ELSE 'deportista'
    END
  );
  RETURN NEW;
END;
$$;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Script ejecutado correctamente!';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE: El primer usuario que se registre será ADMINISTRADOR';
  RAISE NOTICE '';
  RAISE NOTICE 'Pasos siguientes:';
  RAISE NOTICE '1. Ve a /auth/login';
  RAISE NOTICE '2. Haz clic en "Crear cuenta"';
  RAISE NOTICE '3. Regístrate con tu email (serás admin automáticamente)';
  RAISE NOTICE '4. Después de crear tu admin, EJECUTA el script 005 para desactivar';
  RAISE NOTICE '   el registro automático de admins';
  RAISE NOTICE '=================================================================';
END $$;
