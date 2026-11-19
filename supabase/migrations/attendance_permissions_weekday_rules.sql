-- Convert attendance permissions from specific dates → weekday rules.
-- One row per (program, member). weekday_rules is an array like:
-- [{"weekday":4,"permission_type":"excused_lateness"},{"weekday":0,"permission_type":"excused_absence"}]
-- weekday uses JS Date.getDay(): 0=Sunday ... 6=Saturday
-- Run in Supabase → SQL Editor (safe if you already ran add_attendance_permissions.sql).

-- Ensure Excused status + excused_late column exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'attendance_status'
      AND e.enumlabel = 'Excused'
  ) THEN
    ALTER TYPE public.attendance_status ADD VALUE 'Excused';
  END IF;
END $$;

ALTER TABLE public.attendance_entries
  ADD COLUMN IF NOT EXISTS excused_late BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.attendance_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  weekday_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT,
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (program_id, member_id)
);

-- Migrate legacy date/type columns → weekday_rules if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attendance_permissions'
      AND column_name = 'permission_date'
  ) THEN
    ALTER TABLE public.attendance_permissions
      ADD COLUMN IF NOT EXISTS weekday_rules JSONB NOT NULL DEFAULT '[]'::jsonb;

    -- Build weekday rules from existing dated rows (keep the type for that weekday)
    WITH collapsed AS (
      SELECT
        organization_id,
        program_id,
        member_id,
        created_by_user_id,
        reason,
        jsonb_agg(
          DISTINCT jsonb_build_object(
            'weekday', EXTRACT(DOW FROM permission_date)::int,
            'permission_type', permission_type
          )
        ) AS rules,
        MIN(created_at) AS created_at,
        MAX(updated_at) AS updated_at
      FROM public.attendance_permissions
      GROUP BY organization_id, program_id, member_id, created_by_user_id, reason
    )
    UPDATE public.attendance_permissions ap
    SET weekday_rules = COALESCE(c.rules, '[]'::jsonb)
    FROM collapsed c
    WHERE ap.program_id = c.program_id
      AND ap.member_id = c.member_id;

    -- Deduplicate to one row per program+member (keep newest)
    DELETE FROM public.attendance_permissions a
    USING public.attendance_permissions b
    WHERE a.program_id = b.program_id
      AND a.member_id = b.member_id
      AND a.ctid < b.ctid;

    ALTER TABLE public.attendance_permissions
      DROP CONSTRAINT IF EXISTS attendance_permissions_program_id_member_id_permission_date_key;

    ALTER TABLE public.attendance_permissions
      DROP COLUMN IF EXISTS permission_date;

    ALTER TABLE public.attendance_permissions
      DROP COLUMN IF EXISTS permission_type;

    ALTER TABLE public.attendance_permissions
      DROP CONSTRAINT IF EXISTS attendance_permissions_program_id_member_id_key;

    ALTER TABLE public.attendance_permissions
      ADD CONSTRAINT attendance_permissions_program_id_member_id_key UNIQUE (program_id, member_id);
  END IF;
END $$;

-- If table was created fresh without weekday_rules somehow
ALTER TABLE public.attendance_permissions
  ADD COLUMN IF NOT EXISTS weekday_rules JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_attendance_permissions_org
  ON public.attendance_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_permissions_program
  ON public.attendance_permissions(program_id);
CREATE INDEX IF NOT EXISTS idx_attendance_permissions_member
  ON public.attendance_permissions(member_id);

ALTER TABLE public.attendance_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_attendance_permissions_select" ON public.attendance_permissions;
CREATE POLICY "org_attendance_permissions_select" ON public.attendance_permissions
  FOR SELECT USING (public.organization_can(organization_id, 'attendance', 'read'));

DROP POLICY IF EXISTS "org_attendance_permissions_insert" ON public.attendance_permissions;
CREATE POLICY "org_attendance_permissions_insert" ON public.attendance_permissions
  FOR INSERT WITH CHECK (public.organization_can(organization_id, 'attendance', 'create'));

DROP POLICY IF EXISTS "org_attendance_permissions_update" ON public.attendance_permissions;
CREATE POLICY "org_attendance_permissions_update" ON public.attendance_permissions
  FOR UPDATE USING (public.organization_can(organization_id, 'attendance', 'update'));

DROP POLICY IF EXISTS "org_attendance_permissions_delete" ON public.attendance_permissions;
CREATE POLICY "org_attendance_permissions_delete" ON public.attendance_permissions
  FOR DELETE USING (public.organization_can(organization_id, 'attendance', 'delete'));

-- Room check-in: honor excused_lateness for the session weekday
CREATE OR REPLACE FUNCTION public.mark_attendance_room_present(
    p_room_id UUID,
    p_client_key TEXT,
    p_member_id UUID,
    p_arrival_time TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room public.attendance_rooms%ROWTYPE;
    v_ar public.attendance_records%ROWTYPE;
    v_entry public.attendance_entries%ROWTYPE;
    v_arrival TIME;
    v_is_late BOOLEAN;
    v_excused_late BOOLEAN := FALSE;
    v_late_after INTEGER;
    v_weekday INTEGER;
BEGIN
    IF p_client_key IS NULL OR length(trim(p_client_key)) < 8 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_client');
    END IF;

    SELECT * INTO v_room FROM public.attendance_rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'room_not_found');
    END IF;

    IF v_room.expires_at < NOW() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'expired');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.attendance_room_access
        WHERE room_id = p_room_id AND client_key = p_client_key
    ) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_verified');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.program_enrollments
        WHERE program_id = v_room.program_id AND member_id = p_member_id
    ) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_enrolled');
    END IF;

    SELECT * INTO v_ar FROM public.attendance_records WHERE id = v_room.attendance_record_id;

    SELECT * INTO v_entry
    FROM public.attendance_entries
    WHERE attendance_record_id = v_room.attendance_record_id AND member_id = p_member_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'entry_not_found');
    END IF;

    IF v_entry.status = 'Present' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'already_marked');
    END IF;

    IF p_arrival_time IS NOT NULL AND length(trim(p_arrival_time)) >= 4 THEN
        v_arrival := trim(p_arrival_time)::TIME;
    ELSE
        v_arrival := LOCALTIME;
    END IF;

    v_late_after := COALESCE(v_ar.late_after_minutes, 0);
    v_is_late := v_ar.class_start_time IS NOT NULL
        AND v_arrival > (v_ar.class_start_time + (v_late_after * INTERVAL '1 minute'));

    v_weekday := EXTRACT(DOW FROM v_ar.date)::int;

    IF v_is_late AND EXISTS (
      SELECT 1
      FROM public.attendance_permissions ap,
           jsonb_array_elements(ap.weekday_rules) AS rule
      WHERE ap.program_id = v_room.program_id
        AND ap.member_id = p_member_id
        AND (rule->>'weekday')::int = v_weekday
        AND rule->>'permission_type' = 'excused_lateness'
    ) THEN
      v_excused_late := TRUE;
    END IF;

    UPDATE public.attendance_entries
    SET
        status = 'Present',
        arrival_time = v_arrival,
        is_late = v_is_late,
        excused_late = v_excused_late,
        updated_at = NOW()
    WHERE id = v_entry.id;

    RETURN jsonb_build_object(
        'ok', true,
        'member_id', p_member_id,
        'arrival_time', v_arrival,
        'is_late', v_is_late,
        'excused_late', v_excused_late
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_attendance_room_present(UUID, TEXT, UUID, TEXT) TO anon, authenticated;
