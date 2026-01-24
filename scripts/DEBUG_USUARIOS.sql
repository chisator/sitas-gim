-- DIAGNÓSTICO CREACIÓN DE USUARIOS

-- 1. Ver todos los usuarios creados y sus roles
SELECT 
  id, 
  email, 
  full_name, 
  role,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 20;

-- 2. Ver SOLO entrenadores
SELECT id, email, full_name FROM public.profiles WHERE role = 'entrenador';

-- 3. Ver SOLO administradores
SELECT id, email, full_name FROM public.profiles WHERE role = 'administrador';

-- 4. Ver SOLO deportistas
SELECT id, email, full_name FROM public.profiles WHERE role = 'deportista';

-- 5. Contar por rol
SELECT role, COUNT(*) as cantidad FROM public.profiles GROUP BY role;

-- 6. Ver si hay problemas con la metadata de auth
-- (Solo si tienes acceso - esto podría no funcionar por permisos)
-- SELECT id, email, raw_user_meta_data->>'role' as metadata_role FROM auth.users LIMIT 10;
