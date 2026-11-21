import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TopNavigator from '../../common/TopNavigator';
import AddButton from '../../common/addButton';
import CustomDropDown from '../../common/CustomDropDown';
import EmptyState from '../../common/EmptyState';
import LoadingScreen from '../../common/LoadingScreen';
import AppTheme from '../../theme/appTheme';
import { ProgramContext } from '../../context/ProgramContext';
import { MemberContext } from '../../context/MemberContext';
import { OrganizationContext } from '../../context/OrganizationContext';
import supabaseService from '../../../services/supabaseService';
import { formatWeekdayRulesSummary } from '../../utils/attendancePermissions';
import { buildProgramPermissionUrl } from '../../../utils/checkInUrl';
import AttendancePermissionModal from './AttendancePermissionModal';

const AttendancePermissionsScreen = ({ navigation, route }) => {
  const initialProgramId = route?.params?.programId || null;
  const { programs, loadPrograms } = useContext(ProgramContext);
  const { members, loadMembers } = useContext(MemberContext);
  const { can } = useContext(OrganizationContext);

  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterProgramId, setFilterProgramId] = useState(initialProgramId);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const canCreate = can('attendance', 'create');
  const canUpdate = can('attendance', 'update');
  const canDelete = can('attendance', 'delete');

  const loadPermissions = useCallback(async () => {
    const rows = await supabaseService.getAttendancePermissions({
      programId: filterProgramId || null,
    });
    setPermissions(rows);
  }, [filterProgramId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Programs/members are already in context from the Classes tab.
        // Only refresh permissions here to avoid an effect loop on unstable loaders.
        await loadPermissions();
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setPermissions([]);
          Alert.alert(
            'Could not load permissions',
            e.message?.includes('attendance_permissions') ||
              e.code === '42P01' ||
              e.code === 'PGRST205'
              ? 'Run supabase/migrations/attendance_permissions_weekday_rules.sql in the Supabase SQL Editor, then try again.'
              : e.message || 'Failed to load permissions.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPermissions]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        typeof loadPrograms === 'function' ? loadPrograms() : Promise.resolve(),
        typeof loadMembers === 'function' ? loadMembers() : Promise.resolve(),
        loadPermissions(),
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Refresh failed', e.message || 'Could not refresh permissions.');
    } finally {
      setRefreshing(false);
    }
  };

  const programFilterOptions = useMemo(
    () => [{ id: null, name: 'All programs' }, ...programs],
    [programs],
  );

  const selectedFilterProgram =
    programFilterOptions.find((p) => p.id === filterProgramId) || programFilterOptions[0];

  const focusedProgram = useMemo(() => {
    if (!filterProgramId) return null;
    return programs.find((p) => p.id === filterProgramId) || null;
  }, [programs, filterProgramId]);

  const permissionRequestUrl = filterProgramId
    ? buildProgramPermissionUrl(filterProgramId)
    : null;

  const emergencyRequestsEnabled =
    focusedProgram != null
    && focusedProgram.emergencyPermissionMonthlyLimit != null
    && focusedProgram.emergencyPermissionMonthlyLimit > 0;

  const handleSharePermissionLink = async () => {
    if (!permissionRequestUrl) return;
    try {
      await Share.share({
        message: permissionRequestUrl,
        url: permissionRequestUrl,
        title: 'Permission request link',
      });
    } catch {
      Alert.alert('Permission request link', permissionRequestUrl);
    }
  };

  const renderEmergencyLinkSection = () => {
    if (!filterProgramId || !permissionRequestUrl) return null;
    return (
      <View style={styles.emergencyLinkCard}>
        <View style={styles.emergencyLinkHeader}>
          <Icon name="web" size={20} color={AppTheme.accent} />
          <Text style={styles.emergencyLinkTitle}>Member permission request link</Text>
        </View>
        <Text style={styles.emergencyLinkHint}>
          {emergencyRequestsEnabled
            ? `Share once with members. They can submit up to ${focusedProgram.emergencyPermissionMonthlyLimit} emergency request(s) per calendar month.`
            : 'Set “Emergency requests per month” when editing this program to enable web submissions. You can still share the link in advance.'}
        </Text>
        <Text style={styles.emergencyLinkUrl} selectable>
          {permissionRequestUrl}
        </Text>
        <TouchableOpacity
          style={styles.emergencyShareBtn}
          onPress={handleSharePermissionLink}
          activeOpacity={0.85}
        >
          <Icon name="share-variant" size={18} color={AppTheme.background} />
          <Text style={styles.emergencyShareText}>Share permission link</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleSave = async (payload) => {
    if (payload.id) {
      if (!canUpdate) throw new Error('You do not have permission to update.');
      await supabaseService.updateAttendancePermission(payload.id, payload);
    } else {
      if (!canCreate) throw new Error('You do not have permission to create.');
      await supabaseService.createAttendancePermission(payload);
    }
    await loadPermissions();
  };

  const handleDelete = (item) => {
    if (!canDelete || deletingId) return;
    const name = `${item.memberFirstName || ''} ${item.memberLastName || ''}`.trim() || 'Member';
    Alert.alert(
      'Revoke permission?',
      `Remove all weekday permissions for ${name} in ${item.programName || 'this program'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await supabaseService.deleteAttendancePermission(item.id);
              await loadPermissions();
            } catch (e) {
              Alert.alert('Error', e.message || 'Could not revoke permission.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => {
    const name = `${item.memberFirstName || ''} ${item.memberLastName || ''}`.trim() || 'Member';
    const summary = formatWeekdayRulesSummary(item.weekdayRules);
    return (
      <View style={styles.card}>
        <Text style={styles.memberName}>{name}</Text>
        <Text style={styles.programName}>{item.programName || 'Program'}</Text>
        <Text style={styles.rulesSummary}>{summary}</Text>
        {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}

        <View style={styles.actions}>
          {canUpdate ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setEditingPermission(item);
                setModalVisible(true);
              }}
            >
              <Icon name="pencil" size={16} color={AppTheme.accent} />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
          ) : null}
          {canDelete ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDelete(item)}
              disabled={deletingId === item.id}
            >
              {deletingId === item.id ? (
                <ActivityIndicator size="small" color={AppTheme.danger} />
              ) : (
                <>
                  <Icon name="delete-outline" size={16} color={AppTheme.danger} />
                  <Text style={[styles.actionText, { color: AppTheme.danger }]}>Revoke</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <TopNavigator title="Permissions" backButton navigation={navigation} />
        <LoadingScreen text="Loading permissions..." backgroundColor={AppTheme.background} color={AppTheme.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopNavigator title="Permissions" backButton navigation={navigation} />

      <View style={styles.filterWrap}>
        <CustomDropDown
          label="Filter by program"
          data={programFilterOptions}
          currentSelected={selectedFilterProgram}
          setSelected={(item) => setFilterProgramId(item.id)}
          onDarkBackground
        />
      </View>

      <FlatList
        data={permissions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderEmergencyLinkSection}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppTheme.accent} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="shield-check-outline"
            title="No permissions yet"
            message="Create weekday excuses for a program member — e.g. late on Thursday, absent on Sunday."
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      {canCreate ? (
        <AddButton
          onClick={() => {
            setEditingPermission(null);
            setModalVisible(true);
          }}
          style={styles.addButton}
        />
      ) : null}

      <AttendancePermissionModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingPermission(null);
        }}
        onSubmit={handleSave}
        programs={programs}
        members={members}
        editingPermission={editingPermission}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  filterWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emergencyLinkCard: {
    marginBottom: 16,
    backgroundColor: AppTheme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppTheme.border,
    padding: 14,
  },
  emergencyLinkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  emergencyLinkTitle: {
    color: AppTheme.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  emergencyLinkHint: {
    color: AppTheme.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  emergencyLinkUrl: {
    color: AppTheme.textSoft,
    fontSize: 12,
    lineHeight: 17,
  },
  emergencyShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: AppTheme.accent,
    borderRadius: 10,
    paddingVertical: 10,
  },
  emergencyShareText: {
    color: AppTheme.background,
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  card: {
    backgroundColor: AppTheme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppTheme.border,
    padding: 14,
  },
  memberName: {
    color: AppTheme.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  programName: {
    color: AppTheme.textSoft,
    fontSize: 13,
    marginTop: 2,
  },
  rulesSummary: {
    color: AppTheme.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  reason: {
    color: AppTheme.textMuted,
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: AppTheme.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: AppTheme.accent,
  },
});

export default AttendancePermissionsScreen;
