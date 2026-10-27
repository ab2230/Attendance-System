-- Grace period before check-ins count as "late".
-- Example: late_after_minutes = 30 → arrivals within 30 min of class start are on time.

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS late_after_minutes INTEGER NOT NULL DEFAULT 0
  CHECK (late_after_minutes >= 0);

ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS late_after_minutes INTEGER NOT NULL DEFAULT 0
  CHECK (late_after_minutes >= 0);

-- Room OTP check-in (re-run if you already deployed attendance_rooms.sql)
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

    UPDATE public.attendance_entries
    SET
        status = 'Present',
        arrival_time = v_arrival,
        is_late = v_is_late,
        updated_at = NOW()
    WHERE id = v_entry.id;

    RETURN jsonb_build_object(
        'ok', true,
        'member_id', p_member_id,
        'arrival_time', v_arrival,
        'is_late', v_is_late
    );
END;
$$;
