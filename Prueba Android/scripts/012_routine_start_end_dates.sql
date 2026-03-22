-- Añadir columnas start_date y end_date a routines
alter table if exists public.routines
  add column if not exists start_date timestamptz,
  add column if not exists end_date timestamptz;

-- Migrar valores existentes de scheduled_date (si existen) a start_date y end_date
update public.routines
set start_date = scheduled_date,
    end_date = scheduled_date
where scheduled_date is not null;

-- Hacer scheduled_date nullable ya que el nuevo modelo usa start_date y end_date
alter table if exists public.routines
  alter column scheduled_date drop not null;

-- Recomendación: una vez verificado, considerar dropear la columna `scheduled_date`.
