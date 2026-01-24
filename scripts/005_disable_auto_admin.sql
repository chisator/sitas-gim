-- EJECUTAR ESTE SCRIPT DESPUÉS DE CREAR TU PRIMER ADMINISTRADOR
-- Este script desactiva el registro automático de administradores

-- Eliminar la política temporal
DROP POLICY IF EXISTS "Primer usuario es admin" ON public.profiles;

-- Restaurar la política normal de inserción
CREATE POLICY "Los usuarios pueden crear su propio perfil"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Registro automático de admin DESACTIVADO';
  RAISE NOTICE '';
  RAISE NOTICE 'Ahora solo los administradores pueden crear nuevos usuarios';
  RAISE NOTICE 'desde el panel de administración.';
  RAISE NOTICE '=================================================================';
END $$;
