-- One-time emergency / sudden permission requests (web self-service).
-- Reuses excused_absence / excused_lateness types from standing weekday permissions.
-- Run in Supabase SQL Editor after attendance_permissions migrations.

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS emergency_permission_monthly_limit INTEGER
    CHECK (emergency_permission_monthly_limit IS NULL OR emergency_permission_monthly_limit >= 0);

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS emergency_permission_submission_days_after INTEGER NOT NULL DEFAULT 1
    CHECK (emergency_permission_submission_days_after >= 0);

COMMENT ON COLUMN public.programs.emergency_permission_monthly_limit IS
  'Max emergency permission requests per member per calendar month of attendance_date. NULL or 0 disables self-service.';
COMMENT ON COLUMN public.programs.emergency_permission_submission_days_after IS
  'Latest calendar day to submit is attendance_date + this many days (inclusive).';

CREATE TABLE IF NOT EXISTS public.attendance_emergency_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  attendance_date DATE NOT NULL,
  permission_type TEXT NOT NULL
    CHECK (permission_type IN ('excused_absence', 'excused_lateness')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (program_id, member_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_emergency_permissions_org
  ON public.attendance_emergency_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_emergency_permissions_program
  ON public.attendance_emergency_permissions(program_id);
CREATE INDEX IF NOT EXISTS idx_attendance_emergency_permissions_member
  ON public.attendance_emergency_permissions(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_emergency_permissions_date
  ON public.attendance_emergency_permissions(attendance_date);

ALTER TABLE public.attendance_emergency_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_emergency_permissions_select" ON public.attendance_emergency_permissions;
CREATE POLICY "org_emergency_permissions_select" ON public.attendance_emergency_permissions
  FOR SELECT USING (public.organization_can(organization_id, 'attendance', 'read'));

DROP POLICY IF EXISTS "org_emergency_permissions_insert" ON public.attendance_emergency_permissions;
CREATE POLICY "org_emergency_permissions_insert" ON public.attendance_emergency_permissions
  FOR INSERT WITH CHECK (public.organization_can(organization_id, 'attendance', 'create'));

DROP POLICY IF EXISTS "org_emergency_permissions_delete" ON public.attendance_emergency_permissions;
CREATE POLICY "org_emergency_permissions_delete" ON public.attendance_emergency_permissions
  FOR DELETE USING (public.organization_can(organization_id, 'attendance', 'delete'));

-- Effective permission for a specific session date (emergency overrides weekday rules).
CREATE OR REPLACE FUNCTION public.permission_type_for_session(
  p_program_id UUID,
  p_member_id UUID,
  p_session_date DATE,
  p_weekday INTEGER DEFAULT NULL
) RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT aep.permission_type
      FROM public.attendance_emergency_permissions aep
      WHERE aep.program_id = p_program_id
        AND aep.member_id = p_member_id
        AND aep.attendance_date = p_session_date
      LIMIT 1
    ),
    (
      SELECT rule->>'permission_type'
      FROM public.attendance_permissions ap,
           jsonb_array_elements(ap.weekday_rules) AS rule
      WHERE ap.program_id = p_program_id
        AND ap.member_id = p_member_id
        AND (rule->>'weekday')::int = COALESCE(
          p_weekday,
          EXTRACT(DOW FROM p_session_date)::int
        )
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.apply_emergency_permission_entry(
  p_program_id UUID,
  p_member_id UUID,
  p_attendance_date DATE,
  p_permission_type TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
  v_entry public.attendance_entries%ROWTYPE;
BEGIN
  SELECT ar.id INTO v_record_id
  FROM public.attendance_records ar
  WHERE ar.program_id = p_program_id
    AND ar.date = p_attendance_date
  ORDER BY ar.created_at DESC
  LIMIT 1;

  IF v_record_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_entry
  FROM public.attendance_entries
  WHERE attendance_record_id = v_record_id
    AND member_id = p_member_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_permission_type = 'excused_absence' THEN
    IF v_entry.status <> 'Present' THEN
      UPDATE public.attendance_entries
      SET
        status = 'Excused',
        arrival_time = NULL,
        is_late = FALSE,
        excused_late = FALSE,
        updated_at = NOW()
      WHERE id = v_entry.id;
    END IF;
  ELSIF p_permission_type = 'excused_lateness' THEN
    IF v_entry.status = 'Present' AND v_entry.is_late THEN
      UPDATE public.attendance_entries
      SET excused_late = TRUE, updated_at = NOW()
      WHERE id = v_entry.id;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.emergency_permission_month_bounds(p_attendance_date DATE)
RETURNS TABLE (month_start DATE, month_end DATE)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    date_trunc('month', p_attendance_date)::date,
    (date_trunc('month', p_attendance_date) + INTERVAL '1 month' - INTERVAL '1 day')::date;
$$;

CREATE OR REPLACE FUNCTION public.get_emergency_permission_program(p_program_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program public.programs%ROWTYPE;
BEGIN
  SELECT * INTO v_program FROM public.programs WHERE id = p_program_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'program_not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'program_id', v_program.id,
    'program_name', v_program.name,
    'monthly_limit', v_program.emergency_permission_monthly_limit,
    'submission_days_after', v_program.emergency_permission_submission_days_after,
    'enabled',
      v_program.emergency_permission_monthly_limit IS NOT NULL
      AND v_program.emergency_permission_monthly_limit > 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_emergency_permission_members(p_program_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_members JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.programs WHERE id = p_program_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'program_not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'member_id', m.id,
      'first_name', m.first_name,
      'last_name', m.last_name
    ) ORDER BY m.first_name, m.last_name
  ), '[]'::jsonb)
  INTO v_members
  FROM public.program_enrollments pe
  JOIN public.members m ON m.id = pe.member_id
  WHERE pe.program_id = p_program_id;

  RETURN jsonb_build_object('ok', true, 'members', v_members);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_emergency_permission_status(
  p_program_id UUID,
  p_member_id UUID,
  p_attendance_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program public.programs%ROWTYPE;
  v_bounds RECORD;
  v_used INTEGER;
  v_limit INTEGER;
  v_last_day DATE;
  v_existing TEXT;
BEGIN
  SELECT * INTO v_program FROM public.programs WHERE id = p_program_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'program_not_found');
  END IF;

  v_limit := v_program.emergency_permission_monthly_limit;
  IF v_limit IS NULL OR v_limit <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'feature_disabled');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.program_enrollments
    WHERE program_id = p_program_id AND member_id = p_member_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_enrolled');
  END IF;

  SELECT * INTO v_bounds FROM public.emergency_permission_month_bounds(p_attendance_date);

  SELECT COUNT(*)::int INTO v_used
  FROM public.attendance_emergency_permissions aep
  WHERE aep.program_id = p_program_id
    AND aep.member_id = p_member_id
    AND aep.attendance_date >= v_bounds.month_start
    AND aep.attendance_date <= v_bounds.month_end;

  v_last_day := p_attendance_date + v_program.emergency_permission_submission_days_after;

  SELECT aep.permission_type INTO v_existing
  FROM public.attendance_emergency_permissions aep
  WHERE aep.program_id = p_program_id
    AND aep.member_id = p_member_id
    AND aep.attendance_date = p_attendance_date
  LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'monthly_limit', v_limit,
    'used_this_month', v_used,
    'remaining', GREATEST(v_limit - v_used, 0),
    'submission_deadline', v_last_day,
    'can_submit',
      v_existing IS NULL
      AND CURRENT_DATE <= v_last_day
      AND v_used < v_limit,
    'existing_permission_type', v_existing,
    'deadline_passed', CURRENT_DATE > v_last_day,
    'monthly_limit_reached', v_used >= v_limit
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_emergency_permission_request(
  p_program_id UUID,
  p_member_id UUID,
  p_attendance_date DATE,
  p_permission_type TEXT,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program public.programs%ROWTYPE;
  v_bounds RECORD;
  v_used INTEGER;
  v_limit INTEGER;
  v_last_day DATE;
  v_reason TEXT;
  v_org_id UUID;
  v_lock_key BIGINT;
BEGIN
  IF p_permission_type NOT IN ('excused_absence', 'excused_lateness') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_permission_type');
  END IF;

  v_reason := trim(COALESCE(p_reason, ''));
  IF length(v_reason) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reason_required');
  END IF;

  SELECT * INTO v_program FROM public.programs WHERE id = p_program_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'program_not_found');
  END IF;

  v_limit := v_program.emergency_permission_monthly_limit;
  IF v_limit IS NULL OR v_limit <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'feature_disabled');
  END IF;

  v_org_id := v_program.organization_id;
  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'program_not_configured');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.program_enrollments
    WHERE program_id = p_program_id AND member_id = p_member_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_enrolled');
  END IF;

  v_last_day := p_attendance_date + v_program.emergency_permission_submission_days_after;
  IF CURRENT_DATE > v_last_day THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'deadline_passed',
      'submission_deadline', v_last_day
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attendance_emergency_permissions
    WHERE program_id = p_program_id
      AND member_id = p_member_id
      AND attendance_date = p_attendance_date
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'duplicate_request');
  END IF;

  SELECT * INTO v_bounds FROM public.emergency_permission_month_bounds(p_attendance_date);

  v_lock_key := hashtextextended(
    p_program_id::text || ':' || p_member_id::text || ':' || to_char(v_bounds.month_start, 'YYYY-MM'),
    0
  );
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT COUNT(*)::int INTO v_used
  FROM public.attendance_emergency_permissions aep
  WHERE aep.program_id = p_program_id
    AND aep.member_id = p_member_id
    AND aep.attendance_date >= v_bounds.month_start
    AND aep.attendance_date <= v_bounds.month_end;

  IF v_used >= v_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'monthly_limit_reached',
      'monthly_limit', v_limit,
      'used_this_month', v_used
    );
  END IF;

  INSERT INTO public.attendance_emergency_permissions (
    organization_id,
    program_id,
    member_id,
    attendance_date,
    permission_type,
    reason
  ) VALUES (
    v_org_id,
    p_program_id,
    p_member_id,
    p_attendance_date,
    p_permission_type,
    v_reason
  );

  PERFORM public.apply_emergency_permission_entry(
    p_program_id,
    p_member_id,
    p_attendance_date,
    p_permission_type
  );

  RETURN jsonb_build_object(
    'ok', true,
    'program_id', p_program_id,
    'member_id', p_member_id,
    'attendance_date', p_attendance_date,
    'permission_type', p_permission_type,
    'remaining', GREATEST(v_limit - v_used - 1, 0),
    'monthly_limit', v_limit,
    'used_this_month', v_used + 1
  );
END;
$$;

-- Room check-in: honor emergency + standing permissions
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
    v_perm TEXT;
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

    v_perm := public.permission_type_for_session(
      v_room.program_id,
      p_member_id,
      v_ar.date,
      NULL
    );

    IF v_perm = 'excused_absence' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'excused_absence');
    END IF;

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

    IF v_is_late AND v_perm = 'excused_lateness' THEN
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

GRANT EXECUTE ON FUNCTION public.permission_type_for_session(UUID, UUID, DATE, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_emergency_permission_program(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_emergency_permission_members(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_emergency_permission_status(UUID, UUID, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_emergency_permission_request(UUID, UUID, DATE, TEXT, TEXT) TO anon, authenticated;