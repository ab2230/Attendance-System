-- Team listing with emails (bypasses profiles self-only RLS),
-- update permissions, remove members, revoke pending invites.
-- Run in Supabase → SQL Editor.

CREATE OR REPLACE FUNCTION public.list_organization_team(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_members JSONB;
  v_invites JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public.organization_can(p_organization_id, 'organization', 'read') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'kind', 'member',
      'user_id', om.user_id,
      'is_owner', om.is_owner,
      'permissions', om.permissions,
      'email', p.email,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'status', 'active'
    )
    ORDER BY om.is_owner DESC, lower(COALESCE(p.email, '')), p.first_name
  ), '[]'::jsonb)
  INTO v_members
  FROM public.organization_members om
  LEFT JOIN public.profiles p ON p.id = om.user_id
  WHERE om.organization_id = p_organization_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'kind', 'invite',
      'invitation_id', oi.id,
      'email', oi.email,
      'permissions', oi.permissions,
      'status', 'pending',
      'is_owner', false
    )
    ORDER BY lower(oi.email)
  ), '[]'::jsonb)
  INTO v_invites
  FROM public.organization_invitations oi
  WHERE oi.organization_id = p_organization_id
    AND oi.status = 'pending';

  RETURN jsonb_build_object(
    'ok', true,
    'members', v_members,
    'invites', v_invites
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organization_member_permissions(
  p_organization_id UUID,
  p_user_id UUID,
  p_permissions JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public.organization_can(p_organization_id, 'organization', 'update') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_user_id IS NULL OR p_permissions IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  IF p_user_id = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_edit_self');
  END IF;

  SELECT is_owner INTO v_is_owner
  FROM public.organization_members
  WHERE organization_id = p_organization_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_is_owner THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_edit_owner');
  END IF;

  UPDATE public.organization_members
  SET permissions = p_permissions,
      updated_at = NOW()
  WHERE organization_id = p_organization_id AND user_id = p_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_organization_member(
  p_organization_id UUID,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public.organization_can(p_organization_id, 'organization', 'update') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  IF p_user_id = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_remove_self');
  END IF;

  SELECT is_owner INTO v_is_owner
  FROM public.organization_members
  WHERE organization_id = p_organization_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_is_owner THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_remove_owner');
  END IF;

  DELETE FROM public.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND is_owner = FALSE;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organization_invitation_permissions(
  p_organization_id UUID,
  p_invitation_id UUID,
  p_permissions JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public.organization_can(p_organization_id, 'organization', 'update') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  UPDATE public.organization_invitations
  SET permissions = p_permissions
  WHERE id = p_invitation_id
    AND organization_id = p_organization_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_organization_invitation(
  p_organization_id UUID,
  p_invitation_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public.organization_can(p_organization_id, 'organization', 'update') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  UPDATE public.organization_invitations
  SET status = 'revoked'
  WHERE id = p_invitation_id
    AND organization_id = p_organization_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Allow reading teammate profiles within shared organizations (belt-and-suspenders for joins)
DROP POLICY IF EXISTS "Users can view org teammate profiles" ON public.profiles;
CREATE POLICY "Users can view org teammate profiles" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members me
      JOIN public.organization_members them
        ON them.organization_id = me.organization_id
      WHERE me.user_id = auth.uid()
        AND them.user_id = profiles.id
    )
  );

GRANT EXECUTE ON FUNCTION public.list_organization_team(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_organization_member_permissions(UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_organization_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_organization_invitation_permissions(UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_organization_invitation(UUID, UUID) TO authenticated;
