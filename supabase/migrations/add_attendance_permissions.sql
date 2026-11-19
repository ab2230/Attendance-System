-- Attendance permissions (excused absence / excused lateness)
-- Run in Supabase → SQL Editor.

-- Excused absence stored as status = 'Excused'
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
  permission_date DATE NOT NULL,
  permission_type TEXT NOT NULL
    CHECK (permission_type IN ('excused_absence', 'excused_lateness')),
  reason TEXT,
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (program_id, member_id, permission_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_permissions_org
  ON public.attendance_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_permissions_program_date
  ON public.attendance_permissions(program_id, permission_date);
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

-- Room check-in: honor excused_lateness for the session date
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

    IF v_is_late AND EXISTS (
      SELECT 1 FROM public.attendance_permissions ap
      WHERE ap.program_id = v_room.program_id
        AND ap.member_id = p_member_id
        AND ap.permission_date = v_ar.date
        AND ap.permission_type = 'excused_lateness'
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
