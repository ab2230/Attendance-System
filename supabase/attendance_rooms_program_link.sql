-- Stable check-in link per program: ?program=<uuid> + daily OTP
-- Run in Supabase SQL editor after attendance_rooms.sql

CREATE OR REPLACE FUNCTION public.get_active_room_for_program(p_program_id UUID)
RETURNS public.attendance_rooms
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT ar.*
    FROM public.attendance_rooms ar
    WHERE ar.program_id = p_program_id
      AND ar.expires_at > NOW()
    ORDER BY ar.created_at DESC
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_program_check_in_public(p_program_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_name TEXT;
BEGIN
    SELECT name INTO v_name FROM public.programs WHERE id = p_program_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'program_not_found');
    END IF;
    RETURN jsonb_build_object('ok', true, 'program_id', p_program_id, 'program_name', v_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_attendance_room_otp_by_program(
    p_program_id UUID,
    p_otp TEXT,
    p_client_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room public.attendance_rooms%ROWTYPE;
    v_attempts public.attendance_room_otp_attempts%ROWTYPE;
    v_program_name TEXT;
    v_remaining INTEGER;
BEGIN
    IF p_client_key IS NULL OR length(trim(p_client_key)) < 8 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_client');
    END IF;

    SELECT * INTO v_room FROM public.get_active_room_for_program(p_program_id);
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_active_session');
    END IF;

    SELECT name INTO v_program_name FROM public.programs WHERE id = p_program_id;

    SELECT * INTO v_attempts
    FROM public.attendance_room_otp_attempts
    WHERE room_id = v_room.id AND client_key = p_client_key;

    IF FOUND AND (v_attempts.locked OR v_attempts.attempt_count >= 3) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'locked', 'attempts_left', 0);
    END IF;

    IF trim(v_room.otp_code) <> trim(p_otp) THEN
        INSERT INTO public.attendance_room_otp_attempts (room_id, client_key, attempt_count, locked)
        VALUES (v_room.id, p_client_key, 1, false)
        ON CONFLICT (room_id, client_key) DO UPDATE SET
            attempt_count = public.attendance_room_otp_attempts.attempt_count + 1,
            locked = (public.attendance_room_otp_attempts.attempt_count + 1 >= 3);

        SELECT * INTO v_attempts
        FROM public.attendance_room_otp_attempts
        WHERE room_id = v_room.id AND client_key = p_client_key;

        IF v_attempts.attempt_count >= 3 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'locked', 'attempts_left', 0);
        END IF;

        v_remaining := 3 - v_attempts.attempt_count;
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_otp', 'attempts_left', v_remaining);
    END IF;

    INSERT INTO public.attendance_room_access (room_id, client_key)
    VALUES (v_room.id, p_client_key)
    ON CONFLICT (room_id, client_key) DO NOTHING;

    RETURN jsonb_build_object(
        'ok', true,
        'room_id', v_room.id,
        'program_id', v_room.program_id,
        'program_name', v_program_name,
        'attendance_record_id', v_room.attendance_record_id,
        'expires_at', v_room.expires_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_room_for_program(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_program_check_in_public(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_attendance_room_otp_by_program(UUID, TEXT, TEXT) TO anon, authenticated;
