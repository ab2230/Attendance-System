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
import {
  formatWeekdayRulesSummary,
  permissionTypeLabel,
} from '../../utils/attendancePermissions';
import { buildProgramPermissionUrl } from '../../../utils/checkInUrl';
import AttendancePermissionModal from './AttendancePermissionModal';

const TABS = {
  STANDING: 'standing',
  EMERGENCY: 'emergency',
};

function formatSessionDate(dateKey) {
  if (!dateKey) return '—';
  const d = new Date(`${String(dateKey).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(dateKey);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatSubmittedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

const AttendancePermissionsScreen = ({ navigation, route }) => {
  const initialProgramId = route?.params?.programId || null;
  const { programs, loadPrograms } = useContext(ProgramContext);
  const { members, loadMembers } = useContext(MemberContext);
  const { can } = useContext(OrganizationContext);

  const [permissions, setPermissions] = useState([]);
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterProgramId, setFilterProgramId] = useState(initialProgramId);
  const [activeTab, setActiveTab] = useState(TABS.STANDING);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingEmergencyId, setDeletingEmergencyId] = useState(null);

  const canCreate = can('attendance', 'create');
  const canUpdate = can('attendance', 'update');
  const canDelete = can('attendance', 'delete');

  const loadAllPermissions = useCallback(async () => {
    const [standing, emergency] = await Promise.all([
      supabaseService.getAttendancePermissions({
        programId: filterProgramId || null,
      }),
      supabaseService.getEmergencyPermissions({
        programId: filterProgramId || null,
      }),
    ]);
    setPermissions(standing);
    setEmergencyRequests(emergency);
  }, [filterProgramId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadAllPermissions();
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setPermissions([]);
          setEmergencyRequests([]);
          const migrationHint =
            e.message?.includes('attendance_permissions')
            || e.message?.includes('attendance_emergency_permissions')
            || e.code === '42P01'
            || e.code === 'PGRST205';
          Alert.alert(
            'Could not load permissions',
            migrationHint
              ? 'Run the attendance permissions and emergency_permission_requests migrations in Supabase, then try again.'
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
  }, [loadAllPermissions]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        typeof loadPrograms === 'function' ? loadPrograms() : Promise.resolve(),
        typeof loadMembers === 'function' ? loadMembers() : Promise.resolve(),
        loadAllPermissions(),
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
    await loadAllPermissions();
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
              await loadAllPermissions();
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

  const handleDeleteEmergency = (item) => {
    if (!canDelete || deletingEmergencyId) return;
    const name = `${item.memberFirstName || ''} ${item.memberLastName || ''}`.trim() || 'Member';
    Alert.alert(
      'Remove emergency request?',
      `Delete ${name}'s request for ${formatSessionDate(item.attendanceDate)}? Attendance already marked from this request may need a manual update.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingEmergencyId(item.id);
            try {
              await supabaseService.deleteEmergencyPermission(item.id);
              await loadAllPermissions();
            } catch (e) {
              Alert.alert('Error', e.message || 'Could not remove request.');
            } finally {
              setDeletingEmergencyId(null);
            }
          },
        },
      ],
    );
  };

  const renderStandingItem = ({ item }) => {
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

  const renderEmergencyItem = ({ item }) => {
    const name = `${item.memberFirstName || ''} ${item.memberLastName || ''}`.trim() || 'Member';
    const typeLabel = permissionTypeLabel(item.permissionType);
    return (
      <View style={styles.card}>
        <View style={styles.emergencyCardTop}>
          <Text style={styles.memberName}>{name}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeLabel}</Text>
          </View>
        </View>
        {!filterProgramId ? (
          <Text style={styles.programName}>{item.programName || 'Program'}</Text>
        ) : null}
        <Text style={styles.sessionDate}>Session: {formatSessionDate(item.attendanceDate)}</Text>
        {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
        {item.createdAt ? (
          <Text style={styles.submittedAt}>Submitted {formatSubmittedAt(item.createdAt)}</Text>
        ) : null}

        {canDelete ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDeleteEmergency(item)}
              disabled={deletingEmergencyId === item.id}
            >
              {deletingEmergencyId === item.id ? (
                <ActivityIndicator size="small" color={AppTheme.danger} />
              ) : (
                <>
                  <Icon name="delete-outline" size={16} color={AppTheme.danger} />
                  <Text style={[styles.actionText, { color: AppTheme.danger }]}>Remove</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === TABS.STANDING && styles.tabBtnActive]}
        onPress={() => setActiveTab(TABS.STANDING)}
        activeOpacity={0.85}
      >
        <Icon
          name="calendar-week"
          size={18}
          color={activeTab === TABS.STANDING ? AppTheme.background : AppTheme.textMuted}
        />
        <Text
          style={[
            styles.tabBtnText,
            activeTab === TABS.STANDING && styles.tabBtnTextActive,
          ]}
        >
          Standing rules
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === TABS.EMERGENCY && styles.tabBtnActive]}
        onPress={() => setActiveTab(TABS.EMERGENCY)}
        activeOpacity={0.85}
      >
        <Icon
          name="flash-outline"
          size={18}
          color={activeTab === TABS.EMERGENCY ? AppTheme.background : AppTheme.textMuted}
        />
        <Text
          style={[
            styles.tabBtnText,
            activeTab === TABS.EMERGENCY && styles.tabBtnTextActive,
          ]}
        >
          Emergency requests
        </Text>
        {emergencyRequests.length > 0 ? (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{emergencyRequests.length}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );

  const standingList = (
    <FlatList
      data={permissions}
      keyExtractor={(item) => item.id}
      renderItem={renderStandingItem}
      contentContainerStyle={styles.listContent}
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
  );

  const emergencyListEmpty = (
    <EmptyState
      icon="flash-outline"
      title="No emergency requests yet"
      message={
        filterProgramId
          ? 'When members submit one-time permission requests on the web, they appear here.'
          : 'Select a program to share the submission link, or browse requests from all programs below.'
      }
    />
  );

  const emergencyList = (
    <FlatList
      data={emergencyRequests}
      keyExtractor={(item) => item.id}
      renderItem={renderEmergencyItem}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={filterProgramId ? renderEmergencyLinkSection : null}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppTheme.accent} />
      }
      ListEmptyComponent={emergencyListEmpty}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );

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

      {renderTabBar()}

      <View style={styles.listWrap}>
        {activeTab === TABS.STANDING ? standingList : emergencyList}
      </View>

      {canCreate && activeTab === TABS.STANDING ? (
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
  tabBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: AppTheme.surface,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  tabBtnActive: {
    backgroundColor: AppTheme.accent,
    borderColor: AppTheme.accent,
  },
  tabBtnText: {
    color: AppTheme.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: AppTheme.background,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AppTheme.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppTheme.accent,
  },
  listWrap: {
    flex: 1,
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
  emergencyCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 204, 0, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    color: AppTheme.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  memberName: {
    color: AppTheme.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  programName: {
    color: AppTheme.textSoft,
    fontSize: 13,
    marginTop: 2,
  },
  sessionDate: {
    color: AppTheme.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  submittedAt: {
    color: AppTheme.textMuted,
    fontSize: 12,
    marginTop: 8,
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