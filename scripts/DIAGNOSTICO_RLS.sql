-- DIAGNÓSTICO COMPLETO DE RLS
-- Ejecuta esto en Supabase SQL Editor para ver exactamente qué está pasando

-- 1. Ver todas las políticas de routines
SELECT policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'routines'
ORDER BY policyname;

-- 2. Desactivar RLS temporalmente para probar
-- (SOLO PARA PRUEBA - descomenta si quieres probar)
-- ALTER TABLE public.routines DISABLE ROW LEVEL SECURITY;

-- 3. Ver las rutinas sin RLS (si RLS está desactivado)
-- SELECT id, title, trainer_id, user_id, created_at FROM routines LIMIT 10;

-- 4. Reactivar RLS cuando termines
-- ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
