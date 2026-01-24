-- =================================================================
-- Script 014: Permisos de Administrador para Gestionar Rutinas
-- Este script otorga a los usuarios con rol 'administrador'
-- permisos para crear, actualizar y eliminar rutinas y asignaciones.
-- =================================================================

-- 1. Políticas para la tabla "routines"

-- Eliminar políticas antiguas de escritura para reemplazarlas.
DROP POLICY IF EXISTS "Trainers can create routines" ON public.routines;
DROP POLICY IF EXISTS "Trainers can update their own routines" ON public.routines;
DROP POLICY IF EXISTS "Trainers can delete their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users with permission can create routines" ON public.routines;
DROP POLICY IF EXISTS "Users with permission can update routines" ON public.routines;
DROP POLICY IF EXISTS "Users with permission can delete routines" ON public.routines;


-- Política de CREACIÓN (INSERT)
-- Permite a entrenadores crearse rutinas a sí mismos.
-- Permite a administradores crear rutinas para cualquier entrenador.
CREATE POLICY "Allow routine creation for trainers and admins" ON public.routines
FOR INSERT
WITH CHECK (
    (auth.uid() = trainer_id AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'entrenador')
    OR
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrador')
);

-- Política de ACTUALIZACIÓN (UPDATE)
-- Permite a entrenadores actualizar sus propias rutinas.
-- Permite a administradores actualizar cualquier rutina.
CREATE POLICY "Allow routine updates for trainers and admins" ON public.routines
FOR UPDATE
USING (
    (auth.uid() = trainer_id)
    OR
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrador')
);

-- Política de ELIMINACIÓN (DELETE)
-- Permite a entrenadores eliminar sus propias rutinas.
-- Permite a administradores eliminar cualquier rutina.
CREATE POLICY "Allow routine deletion for trainers and admins" ON public.routines
FOR DELETE
USING (
    (auth.uid() = trainer_id)
    OR
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrador')
);


-- 2. Políticas para la tabla "routine_user_assignments"

-- Eliminar política antigua de inserción.
DROP POLICY IF EXISTS "insert_assignments" ON public.routine_user_assignments;

-- Política de CREACIÓN de Asignaciones (INSERT)
-- Permite a entrenadores asignar usuarios a sus propias rutinas.
-- Permite a administradores asignar usuarios a cualquier rutina.
CREATE POLICY "Allow assignment creation for trainers and admins" ON public.routine_user_assignments
FOR INSERT
WITH CHECK (
    (
        EXISTS(SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.trainer_id = auth.uid())
    )
    OR
    (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrador'
    )
);

-- Las políticas de SELECT y DELETE en esta tabla ya permiten a los administradores,
-- por lo que no necesitan cambios.

-- =================================================================
-- Fin del Script
-- =================================================================
