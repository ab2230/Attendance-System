-- Add member type attribute: Regular | Extension | Distant
-- Run this in the Supabase SQL editor if your project already has the members table.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_type') THEN
    CREATE TYPE member_type AS ENUM ('Regular', 'Extension', 'Distant');
  END IF;
END $$;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS type member_type NOT NULL DEFAULT 'Regular';

CREATE INDEX IF NOT EXISTS idx_members_type ON public.members(type);

-- Recreate view so it includes the new column (m.* already would, but keep explicit refresh)
CREATE OR REPLACE VIEW public.members_with_class AS
SELECT 
    m.*,
    c.name as class_name
FROM public.members m
LEFT JOIN public.classes c ON m.class_id = c.id;

CREATE OR REPLACE VIEW public.program_members AS
SELECT 
    p.id as program_id,
    p.name as program_name,
    p.user_id,
    m.id as member_id,
    m.first_name,
    m.last_name,
    m.type as member_type,
    c.name as class_name
FROM public.programs p
JOIN public.program_enrollments pe ON p.id = pe.program_id
JOIN public.members m ON pe.member_id = m.id
LEFT JOIN public.classes c ON m.class_id = c.id;
