import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService from '../../services/supabaseService';
import { canPerform } from '../../utils/organizationPermissions';
import { AuthContext } from './AuthContext';

export const OrganizationContext = createContext();

const STORAGE_KEY = 'activeOrganizationId';

export const OrganizationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [organizations, setOrganizations] = useState([]);
  const [activeOrganization, setActiveOrganizationState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const applyActiveOrg = useCallback(async (org) => {
    if (!org?.id) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      supabaseService.setActiveOrganizationId(null);
      setActiveOrganizationState(null);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, org.id);
    supabaseService.setActiveOrganizationId(org.id);
    setActiveOrganizationState(org);
    setReloadToken((t) => t + 1);
  }, []);

  const refreshOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      await applyActiveOrg(null);
      return [];
    }

    await supabaseService.ensureUserOrganization();
    const orgs = await supabaseService.getMyOrganizations();
    setOrganizations(orgs);
    return orgs;
  }, [user, applyActiveOrg]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!user) {
        setOrganizations([]);
        setActiveOrganizationState(null);
        supabaseService.setActiveOrganizationId(null);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const orgs = await refreshOrganizations();
        if (cancelled) return;

        const storedId = await AsyncStorage.getItem(STORAGE_KEY);
        const picked =
          orgs.find((o) => o.id === storedId) ||
          orgs.find((o) => o.isOwner) ||
          orgs[0] ||
          null;

        if (picked) {
          await AsyncStorage.setItem(STORAGE_KEY, picked.id);
          supabaseService.setActiveOrganizationId(picked.id);
          setActiveOrganizationState(picked);
        } else {
          supabaseService.setActiveOrganizationId(null);
          setActiveOrganizationState(null);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Organization bootstrap error:', e);
          setError(e.message || 'Failed to load organizations');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshOrganizations]);

  const setActiveOrganization = useCallback(
    async (orgId) => {
      const org = organizations.find((o) => o.id === orgId);
      if (!org) return;
      await applyActiveOrg(org);
    },
    [organizations, applyActiveOrg],
  );

  const createOrganization = useCallback(
    async (name) => {
      const org = await supabaseService.createOrganization(name);
      const orgs = await refreshOrganizations();
      const full = orgs.find((o) => o.id === org.id) || {
        id: org.id,
        name: org.name,
        created_at: org.created_at,
        isOwner: true,
        permissions: {},
      };
      await applyActiveOrg(full);
      return full;
    },
    [refreshOrganizations, applyActiveOrg],
  );

  const inviteMember = useCallback(async (email, permissions) => {
    if (!activeOrganization?.id) {
      throw new Error('No active organization');
    }
    return supabaseService.inviteOrganizationMember(activeOrganization.id, email, permissions);
  }, [activeOrganization?.id]);

  const can = useCallback(
    (module, action) =>
      canPerform(
        activeOrganization?.permissions,
        activeOrganization?.isOwner,
        module,
        action,
      ),
    [activeOrganization],
  );

  const value = useMemo(
    () => ({
      organizations,
      activeOrganization,
      loading,
      error,
      reloadToken,
      setActiveOrganization,
      refreshOrganizations,
      createOrganization,
      inviteMember,
      can,
    }),
    [
      organizations,
      activeOrganization,
      loading,
      error,
      reloadToken,
      setActiveOrganization,
      refreshOrganizations,
      createOrganization,
      inviteMember,
      can,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
  );
};
