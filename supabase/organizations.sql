-- Organizations (multi-tenant workspace) + membership permissions
-- Run once in Supabase SQL editor. Migrates existing user_id-owned rows into a default org per owner.

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    is_owner BOOLEAN NOT NULL DEFAULT FALSE,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (organization_id, email)
);

CREATE OR REPLACE FUNCTION public.default_owner_permissions()
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT '{
        "classes": {"create": true, "read": true, "update": true, "delete": true},
        "members": {"create": true, "read": true, "update": true, "delete": true},
        "programs": {"create": true, "read": true, "update": true, "delete": true},
        "attendance": {"create": true, "read": true, "update": true, "delete": true},
        "rooms": {"create": true, "read": true, "update": true, "delete": true},
        "organization": {"create": true, "read": true, "update": true, "delete": true}
    }'::jsonb;
$$;

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_rooms') THEN
        ALTER TABLE public.attendance_rooms ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_classes_organization_id ON public.classes(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_organization_id ON public.members(organization_id);
CREATE INDEX IF NOT EXISTS idx_programs_organization_id ON public.programs(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_organization_id ON public.attendance_records(organization_id);

DO $$
DECLARE
    r RECORD;
    v_org_id UUID;
    v_name TEXT;
    v_perms JSONB;
BEGIN
    v_perms := public.default_owner_permissions();

    FOR r IN
        SELECT DISTINCT owner_id AS user_id
        FROM (
            SELECT user_id AS owner_id FROM public.classes
            UNION SELECT user_id FROM public.members
            UNION SELECT user_id FROM public.programs
            UNION SELECT user_id FROM public.attendance_records
        ) owners
        WHERE owner_id IS NOT NULL
    LOOP
        SELECT o.id INTO v_org_id
        FROM public.organizations o
        WHERE o.created_by_user_id = r.user_id
        ORDER BY o.created_at ASC
        LIMIT 1;

        IF v_org_id IS NULL THEN
            SELECT trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
            INTO v_name
            FROM public.profiles
            WHERE id = r.user_id;

            IF v_name IS NULL OR length(trim(v_name)) = 0 THEN
                v_name := 'My Organization';
            ELSE
                v_name := v_name || '''s Organization';
            END IF;

            INSERT INTO public.organizations (name, created_by_user_id)
            VALUES (v_name, r.user_id)
            RETURNING id INTO v_org_id;

            INSERT INTO public.organization_members (organization_id, user_id, is_owner, permissions)
            VALUES (v_org_id, r.user_id, TRUE, v_perms)
            ON CONFLICT (organization_id, user_id) DO NOTHING;
        END IF;

        UPDATE public.classes SET organization_id = v_org_id WHERE user_id = r.user_id AND organization_id IS NULL;
        UPDATE public.members SET organization_id = v_org_id WHERE user_id = r.user_id AND organization_id IS NULL;
        UPDATE public.programs SET organization_id = v_org_id WHERE user_id = r.user_id AND organization_id IS NULL;
        UPDATE public.attendance_records SET organization_id = v_org_id WHERE user_id = r.user_id AND organization_id IS NULL;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_rooms') THEN
            UPDATE public.attendance_rooms ar
            SET organization_id = v_org_id
            WHERE ar.user_id = r.user_id AND ar.organization_id IS NULL;
        END IF;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.organization_can(
    p_organization_id UUID,
    p_module TEXT,
    p_action TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member public.organization_members%ROWTYPE;
BEGIN
    IF p_organization_id IS NULL OR auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT * INTO v_member
    FROM public.organization_members
    WHERE organization_id = p_organization_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_member.is_owner THEN
        RETURN TRUE;
    END IF;

    RETURN COALESCE((v_member.permissions -> p_module ->> p_action)::boolean, FALSE);
END;
$$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_member" ON public.organizations;
CREATE POLICY "org_select_member" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organizations.id AND om.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "org_insert_authenticated" ON public.organizations;
CREATE POLICY "org_insert_authenticated" ON public.organizations
    FOR INSERT WITH CHECK (auth.uid() = created_by_user_id);

DROP POLICY IF EXISTS "org_update_owner" ON public.organizations;
CREATE POLICY "org_update_owner" ON public.organizations
    FOR UPDATE USING (public.organization_can(id, 'organization', 'update'));

DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;
CREATE POLICY "org_members_select" ON public.organization_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.organization_can(organization_id, 'organization', 'read')
    );

DROP POLICY IF EXISTS "org_members_manage" ON public.organization_members;
CREATE POLICY "org_members_manage" ON public.organization_members
    FOR ALL USING (public.organization_can(organization_id, 'organization', 'update'))
    WITH CHECK (public.organization_can(organization_id, 'organization', 'update'));

DROP POLICY IF EXISTS "org_invites_manage" ON public.organization_invitations;
CREATE POLICY "org_invites_manage" ON public.organization_invitations
    FOR ALL USING (public.organization_can(organization_id, 'organization', 'update'))
    WITH CHECK (public.organization_can(organization_id, 'organization', 'update'));

DROP POLICY IF EXISTS "Users can manage own classes" ON public.classes;
DROP POLICY IF EXISTS "org_classes_select" ON public.classes;
DROP POLICY IF EXISTS "org_classes_insert" ON public.classes;
DROP POLICY IF EXISTS "org_classes_update" ON public.classes;
DROP POLICY IF EXISTS "org_classes_delete" ON public.classes;

CREATE POLICY "org_classes_select" ON public.classes FOR SELECT
    USING (public.organization_can(organization_id, 'classes', 'read'));
CREATE POLICY "org_classes_insert" ON public.classes FOR INSERT
    WITH CHECK (public.organization_can(organization_id, 'classes', 'create'));
CREATE POLICY "org_classes_update" ON public.classes FOR UPDATE
    USING (public.organization_can(organization_id, 'classes', 'update'));
CREATE POLICY "org_classes_delete" ON public.classes FOR DELETE
    USING (public.organization_can(organization_id, 'classes', 'delete'));

DROP POLICY IF EXISTS "Users can manage own members" ON public.members;
DROP POLICY IF EXISTS "org_members_row_select" ON public.members;
DROP POLICY IF EXISTS "org_members_row_insert" ON public.members;
DROP POLICY IF EXISTS "org_members_row_update" ON public.members;
DROP POLICY IF EXISTS "org_members_row_delete" ON public.members;

CREATE POLICY "org_members_row_select" ON public.members FOR SELECT
    USING (public.organization_can(organization_id, 'members', 'read'));
CREATE POLICY "org_members_row_insert" ON public.members FOR INSERT
    WITH CHECK (public.organization_can(organization_id, 'members', 'create'));
CREATE POLICY "org_members_row_update" ON public.members FOR UPDATE
    USING (public.organization_can(organization_id, 'members', 'update'));
CREATE POLICY "org_members_row_delete" ON public.members FOR DELETE
    USING (public.organization_can(organization_id, 'members', 'delete'));

DROP POLICY IF EXISTS "Users can manage own programs" ON public.programs;
DROP POLICY IF EXISTS "org_programs_select" ON public.programs;
DROP POLICY IF EXISTS "org_programs_insert" ON public.programs;
DROP POLICY IF EXISTS "org_programs_update" ON public.programs;
DROP POLICY IF EXISTS "org_programs_delete" ON public.programs;

CREATE POLICY "org_programs_select" ON public.programs FOR SELECT
    USING (public.organization_can(organization_id, 'programs', 'read'));
CREATE POLICY "org_programs_insert" ON public.programs FOR INSERT
    WITH CHECK (public.organization_can(organization_id, 'programs', 'create'));
CREATE POLICY "org_programs_update" ON public.programs FOR UPDATE
    USING (public.organization_can(organization_id, 'programs', 'update'));
CREATE POLICY "org_programs_delete" ON public.programs FOR DELETE
    USING (public.organization_can(organization_id, 'programs', 'delete'));

DROP POLICY IF EXISTS "Users can manage own program enrollments" ON public.program_enrollments;
DROP POLICY IF EXISTS "org_enrollments_all" ON public.program_enrollments;

CREATE POLICY "org_enrollments_all" ON public.program_enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.programs p
            WHERE p.id = program_enrollments.program_id
            AND public.organization_can(p.organization_id, 'programs', 'read')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.programs p
            WHERE p.id = program_enrollments.program_id
            AND public.organization_can(p.organization_id, 'programs', 'update')
        )
    );

DROP POLICY IF EXISTS "Users can manage own attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "org_attendance_records_select" ON public.attendance_records;
DROP POLICY IF EXISTS "org_attendance_records_insert" ON public.attendance_records;
DROP POLICY IF EXISTS "org_attendance_records_update" ON public.attendance_records;
DROP POLICY IF EXISTS "org_attendance_records_delete" ON public.attendance_records;

CREATE POLICY "org_attendance_records_select" ON public.attendance_records FOR SELECT
    USING (public.organization_can(organization_id, 'attendance', 'read'));
CREATE POLICY "org_attendance_records_insert" ON public.attendance_records FOR INSERT
    WITH CHECK (public.organization_can(organization_id, 'attendance', 'create'));
CREATE POLICY "org_attendance_records_update" ON public.attendance_records FOR UPDATE
    USING (public.organization_can(organization_id, 'attendance', 'update'));
CREATE POLICY "org_attendance_records_delete" ON public.attendance_records FOR DELETE
    USING (public.organization_can(organization_id, 'attendance', 'delete'));

DROP POLICY IF EXISTS "Users can manage own attendance entries" ON public.attendance_entries;
DROP POLICY IF EXISTS "org_attendance_entries_all" ON public.attendance_entries;

CREATE POLICY "org_attendance_entries_all" ON public.attendance_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.attendance_records ar
            WHERE ar.id = attendance_entries.attendance_record_id
            AND public.organization_can(ar.organization_id, 'attendance', 'read')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.attendance_records ar
            WHERE ar.id = attendance_entries.attendance_record_id
            AND public.organization_can(ar.organization_id, 'attendance', 'update')
        )
    );

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_rooms') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage own attendance rooms" ON public.attendance_rooms';
        EXECUTE 'DROP POLICY IF EXISTS "org_rooms_select" ON public.attendance_rooms';
        EXECUTE 'DROP POLICY IF EXISTS "org_rooms_insert" ON public.attendance_rooms';
        EXECUTE 'DROP POLICY IF EXISTS "org_rooms_update" ON public.attendance_rooms';
        EXECUTE 'DROP POLICY IF EXISTS "org_rooms_delete" ON public.attendance_rooms';
        EXECUTE 'CREATE POLICY "org_rooms_select" ON public.attendance_rooms FOR SELECT USING (public.organization_can(organization_id, ''rooms'', ''read''))';
        EXECUTE 'CREATE POLICY "org_rooms_insert" ON public.attendance_rooms FOR INSERT WITH CHECK (public.organization_can(organization_id, ''rooms'', ''create''))';
        EXECUTE 'CREATE POLICY "org_rooms_update" ON public.attendance_rooms FOR UPDATE USING (public.organization_can(organization_id, ''rooms'', ''update''))';
        EXECUTE 'CREATE POLICY "org_rooms_delete" ON public.attendance_rooms FOR DELETE USING (public.organization_can(organization_id, ''rooms'', ''delete''))';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_user_organization()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_org_id UUID;
    v_name TEXT;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
    END IF;

    SELECT om.organization_id INTO v_org_id
    FROM public.organization_members om
    WHERE om.user_id = v_uid
    LIMIT 1;

    IF v_org_id IS NOT NULL THEN
        RETURN jsonb_build_object('ok', true, 'organization_id', v_org_id, 'created', false);
    END IF;

    SELECT trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    INTO v_name
    FROM public.profiles
    WHERE id = v_uid;

    IF v_name IS NULL OR length(trim(v_name)) = 0 THEN
        v_name := 'My Organization';
    ELSE
        v_name := v_name || '''s Organization';
    END IF;

    INSERT INTO public.organizations (name, created_by_user_id)
    VALUES (v_name, v_uid)
    RETURNING id INTO v_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, is_owner, permissions)
    VALUES (v_org_id, v_uid, TRUE, public.default_owner_permissions());

    RETURN jsonb_build_object('ok', true, 'organization_id', v_org_id, 'created', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_organization_member(
    p_organization_id UUID,
    p_email TEXT,
    p_permissions JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitee_id UUID;
    v_email TEXT;
BEGIN
    IF NOT public.organization_can(p_organization_id, 'organization', 'update') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
    END IF;

    v_email := lower(trim(p_email));
    IF v_email IS NULL OR length(v_email) < 3 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_email');
    END IF;

    SELECT id INTO v_invitee_id
    FROM public.profiles
    WHERE lower(email) = v_email;

    IF v_invitee_id IS NULL THEN
        INSERT INTO public.organization_invitations (organization_id, email, permissions, invited_by, status)
        VALUES (p_organization_id, v_email, p_permissions, auth.uid(), 'pending')
        ON CONFLICT (organization_id, email) DO UPDATE SET
            permissions = EXCLUDED.permissions,
            status = 'pending',
            invited_by = auth.uid();
        RETURN jsonb_build_object('ok', true, 'status', 'pending');
    END IF;

    IF v_invitee_id = auth.uid() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'cannot_invite_self');
    END IF;

    INSERT INTO public.organization_members (organization_id, user_id, is_owner, permissions)
    VALUES (p_organization_id, v_invitee_id, FALSE, p_permissions)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET
        permissions = EXCLUDED.permissions,
        is_owner = FALSE;

    UPDATE public.organization_invitations
    SET status = 'accepted'
    WHERE organization_id = p_organization_id AND lower(email) = v_email;

    RETURN jsonb_build_object('ok', true, 'status', 'active', 'user_id', v_invitee_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_organization() TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_organization_member(UUID, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
    v_name TEXT;
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name'
    );

    v_name := trim(COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', ''));
    IF length(v_name) = 0 THEN
        v_name := 'My Organization';
    ELSE
        v_name := v_name || '''s Organization';
    END IF;

    INSERT INTO public.organizations (name, created_by_user_id)
    VALUES (v_name, NEW.id)
    RETURNING id INTO v_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, is_owner, permissions)
    VALUES (v_org_id, NEW.id, TRUE, public.default_owner_permissions());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Refresh views so they expose organization_id and other new member columns
CREATE OR REPLACE VIEW public.members_with_class AS
SELECT
    m.*,
    c.name AS class_name
FROM public.members m
LEFT JOIN public.classes c ON m.class_id = c.id;

CREATE OR REPLACE VIEW public.program_members AS
SELECT
    p.id AS program_id,
    p.name AS program_name,
    p.user_id,
    p.organization_id AS program_organization_id,
    m.id AS member_id,
    m.first_name,
    m.last_name,
    m.type AS member_type,
    m.organization_id AS member_organization_id,
    c.name AS class_name
FROM public.programs p
JOIN public.program_enrollments pe ON p.id = pe.program_id
JOIN public.members m ON pe.member_id = m.id
LEFT JOIN public.classes c ON m.class_id = c.id;
