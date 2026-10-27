-- Run in Supabase SQL editor if members fail with:
-- "column members_with_class.organization_id does not exist"

CREATE OR REPLACE VIEW public.members_with_class AS
SELECT
    m.*,
    c.name AS class_name
FROM public.members m
LEFT JOIN public.classes c ON m.class_id = c.id;
