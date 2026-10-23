-- Attendance rooms: OTP-gated web check-in for a program session
-- Run this in the Supabase SQL editor after the main schema.

CREATE TABLE IF NOT EXISTS public.attendance_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
    attendance_record_id UUID REFERENCES public.attendance_records(id) ON DELETE CASCADE NOT NULL,
    otp_code TEXT NOT NULL,
    minute_limit INTEGER NOT NULL CHECK (minute_limit > 0),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance_room_otp_attempts (
    room_id UUID REFERENCES public.attendance_rooms(id) ON DELETE CASCADE NOT NULL,
    client_key TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (room_id, client_key)
);

CREATE TABLE IF NOT EXISTS public.attendance_room_access (
    room_id UUID REFERENCES public.attendance_rooms(id) ON DELETE CASCADE NOT NULL,
    client_key TEXT NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (room_id, client_key)
);

CREATE INDEX IF NOT EXISTS idx_attendance_rooms_user_id ON public.attendance_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_rooms_expires_at ON public.attendance_rooms(expires_at);

ALTER TABLE public.attendance_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_room_otp_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_room_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own attendance rooms" ON public.attendance_rooms
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "No direct access to otp attempts" ON public.attendance_room_otp_attempts
    FOR ALL USING (false);

CREATE POLICY "No direct access to room access" ON public.attendance_room_access
    FOR ALL USING (false);

-- Verify OTP (max 3 failed attempts per browser client_key per room)
CREATE OR REPLACE FUNCTION public.verify_attendance_room_otp(
    p_room_id UUID,
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

    SELECT * INTO v_room FROM public.attendance_rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'room_not_found');
    END IF;

    IF v_room.expires_at < NOW() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'expired');
    END IF;

    SELECT * INTO v_attempts
    FROM public.attendance_room_otp_attempts
    WHERE room_id = p_room_id AND client_key = p_client_key;

    IF FOUND AND (v_attempts.locked OR v_attempts.attempt_count >= 3) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'locked', 'attempts_left', 0);
    END IF;

    IF trim(v_room.otp_code) <> trim(p_otp) THEN
        INSERT INTO public.attendance_room_otp_attempts (room_id, client_key, attempt_count, locked)
        VALUES (p_room_id, p_client_key, 1, false)
        ON CONFLICT (room_id, client_key) DO UPDATE SET
            attempt_count = public.attendance_room_otp_attempts.attempt_count + 1,
            locked = (public.attendance_room_otp_attempts.attempt_count + 1 >= 3);

        SELECT * INTO v_attempts
        FROM public.attendance_room_otp_attempts
        WHERE room_id = p_room_id AND client_key = p_client_key;

        IF v_attempts.attempt_count >= 3 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'locked', 'attempts_left', 0);
        END IF;

        v_remaining := 3 - v_attempts.attempt_count;
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_otp', 'attempts_left', v_remaining);
    END IF;

    INSERT INTO public.attendance_room_access (room_id, client_key)
    VALUES (p_room_id, p_client_key)
    ON CONFLICT (room_id, client_key) DO NOTHING;

    SELECT name INTO v_program_name FROM public.programs WHERE id = v_room.program_id;

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

-- List enrolled members (after OTP verified)
CREATE OR REPLACE FUNCTION public.get_attendance_room_members(
    p_room_id UUID,
    p_client_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room public.attendance_rooms%ROWTYPE;
    v_members JSONB;
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

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'member_id', m.id,
            'first_name', m.first_name,
            'last_name', m.last_name,
            'status', ae.status,
            'already_present', (ae.status = 'Present')
        ) ORDER BY m.first_name, m.last_name
    ), '[]'::jsonb)
    INTO v_members
    FROM public.program_enrollments pe
    JOIN public.members m ON m.id = pe.member_id
    LEFT JOIN public.attendance_entries ae
        ON ae.member_id = m.id AND ae.attendance_record_id = v_room.attendance_record_id
    WHERE pe.program_id = v_room.program_id;

    RETURN jsonb_build_object('ok', true, 'members', v_members);
END;
$$;

-- Mark a member present for this room session
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
    v_is_late := v_ar.class_start_time IS NOT NULL AND v_arrival > v_ar.class_start_time;

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

GRANT EXECUTE ON FUNCTION public.verify_attendance_room_otp(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_room_members(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_attendance_room_present(UUID, TEXT, UUID, TEXT) TO anon, authenticated;

-- Per-program stable links: see attendance_rooms_program_link.sql
