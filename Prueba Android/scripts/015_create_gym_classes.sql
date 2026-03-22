
-- 015_create_gym_classes.sql
-- Crea la tabla para gestionar clases y eventos del gimnasio

-- Crear tabla
CREATE TABLE IF NOT EXISTS public.gym_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    instructor_id UUID REFERENCES public.profiles(id),
    capacity INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.gym_classes ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad

-- 1. Lectura: Permitir a todos los usuarios autenticados ver las clases
CREATE POLICY "Todos pueden ver clases" 
ON public.gym_classes
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 2. Escritura (Insert/Update/Delete): Solo administradores y entrenadores
-- Usamos una subconsulta para verificar el rol en la tabla profiles
CREATE POLICY "Admin y Entrenadores pueden gestionar clases"
ON public.gym_classes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'administrador' OR profiles.role = 'entrenador')
  )
);

-- Comentario
COMMENT ON TABLE public.gym_classes IS 'Tabla para almacenar eventos y clases del gimnasio (ej. Zumba, Spinning).';
