-- Create workout_logs table
CREATE TABLE IF NOT EXISTS public.workout_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    routine_id UUID REFERENCES public.routines(id),
    date TIMESTAMPTZ DEFAULT now() NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create workout_log_entries table
CREATE TABLE IF NOT EXISTS public.workout_log_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE CASCADE NOT NULL,
    exercise_name TEXT NOT NULL,
    sets_data JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_log_entries ENABLE ROW LEVEL SECURITY;

-- Policies for workout_logs
CREATE POLICY "Users can view their own workout logs"
    ON public.workout_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout logs"
    ON public.workout_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout logs"
    ON public.workout_logs
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout logs"
    ON public.workout_logs
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for workout_log_entries
-- Users can see entries if they own the parent log
CREATE POLICY "Users can view their own workout log entries"
    ON public.workout_log_entries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_logs
            WHERE workout_logs.id = workout_log_entries.workout_log_id
            AND workout_logs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert entries for their own logs"
    ON public.workout_log_entries
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_logs
            WHERE workout_logs.id = workout_log_entries.workout_log_id
            AND workout_logs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update entries for their own logs"
    ON public.workout_log_entries
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_logs
            WHERE workout_logs.id = workout_log_entries.workout_log_id
            AND workout_logs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete entries for their own logs"
    ON public.workout_log_entries
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_logs
            WHERE workout_logs.id = workout_log_entries.workout_log_id
            AND workout_logs.user_id = auth.uid()
        )
    );

-- Allow admins/trainers to view logs (optional, but good for monitoring)
CREATE POLICY "Trainers can view logs of their assigned users"
    ON public.workout_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.trainer_user_assignments
            WHERE trainer_user_assignments.user_id = workout_logs.user_id
            AND trainer_user_assignments.trainer_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'administrador'
        )
    );

CREATE POLICY "Trainers can view entries of their assigned users"
    ON public.workout_log_entries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_logs
            JOIN public.trainer_user_assignments ON workout_logs.user_id = trainer_user_assignments.user_id
            WHERE workout_logs.id = workout_log_entries.workout_log_id
            AND trainer_user_assignments.trainer_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'administrador'
        )
    );
