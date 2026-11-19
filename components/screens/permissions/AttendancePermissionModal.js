import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomDropDown from '../../common/CustomDropDown';
import AppTheme from '../../theme/appTheme';
import {
  PERMISSION_TYPE_OPTIONS,
  PERMISSION_TYPES,
  WEEKDAY_OPTIONS,
  normalizeWeekdayRules,
} from '../../utils/attendancePermissions';

const emptyRule = () => ({
  key: `${Date.now()}-${Math.random()}`,
  weekday: 4,
  permissionType: PERMISSION_TYPES.EXCUSED_ABSENCE,
});

const AttendancePermissionModal = ({
  visible,
  onClose,
  onSubmit,
  programs = [],
  members = [],
  editingPermission = null,
}) => {
  const [programId, setProgramId] = useState(null);
  const [memberId, setMemberId] = useState(null);
  const [rules, setRules] = useState([emptyRule()]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(editingPermission?.id);

  useEffect(() => {
    if (!visible) return;
    if (editingPermission) {
      setProgramId(editingPermission.programId);
      setMemberId(editingPermission.memberId);
      const existing = normalizeWeekdayRules(editingPermission.weekdayRules || []);
      setRules(
        existing.length
          ? existing.map((r) => ({
              key: `${r.weekday}-${r.permissionType}`,
              weekday: r.weekday,
              permissionType: r.permissionType,
            }))
          : [emptyRule()],
      );
      setReason(editingPermission.reason || '');
    } else {
      setProgramId(null);
      setMemberId(null);
      setRules([emptyRule()]);
      setReason('');
    }
    setError('');
    setSubmitting(false);
  }, [visible, editingPermission]);

  const selectedProgram = programs.find((p) => p.id === programId) || null;
  const enrolledIds = selectedProgram?.enrolledStudents || [];

  const enrolledMembers = useMemo(() => {
    return (members || [])
      .filter((m) => enrolledIds.includes(m.id))
      .map((m) => ({
        id: m.id,
        name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Member',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, enrolledIds]);

  const selectedMemberOption = enrolledMembers.find((m) => m.id === memberId) || null;

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const updateRule = (key, patch) => {
    setRules((prev) => prev.map((rule) => (rule.key === key ? { ...rule, ...patch } : rule)));
  };

  const addRule = () => {
    setRules((prev) => [...prev, emptyRule()]);
  };

  const removeRule = (key) => {
    setRules((prev) => (prev.length <= 1 ? prev : prev.filter((rule) => rule.key !== key)));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!programId) {
      setError('Select a program.');
      return;
    }
    if (!memberId) {
      setError('Select a member enrolled in that program.');
      return;
    }

    const weekdayRules = normalizeWeekdayRules(rules);
    if (!weekdayRules.length) {
      setError('Add at least one weekday with a permission type.');
      return;
    }

    const weekdays = weekdayRules.map((r) => r.weekday);
    if (new Set(weekdays).size !== weekdays.length) {
      setError('Each weekday can only appear once. Remove the duplicate day.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        id: editingPermission?.id,
        programId,
        memberId,
        weekdayRules,
        reason,
      });
      onClose();
    } catch (e) {
      setError(e.message || 'Could not save permission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{isEditing ? 'Edit permission' : 'New permission'}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={24} color={AppTheme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <Text style={styles.hint}>
              One permission per member in a program. Add weekdays — e.g. Thursday excused late,
              Sunday excused absent. They apply every matching attendance day for that program.
            </Text>

            <CustomDropDown
              label="Program"
              data={programs}
              currentSelected={selectedProgram}
              setSelected={(item) => {
                setProgramId(item.id);
                setMemberId(null);
              }}
              required
            />

            <CustomDropDown
              label="Member"
              data={enrolledMembers}
              currentSelected={selectedMemberOption}
              setSelected={(item) => setMemberId(item.id)}
              required
              searchable
              searchPlaceholder="Search member by name..."
            />

            <Text style={styles.label}>Weekday rules *</Text>
            {rules.map((rule) => {
              const dayOption = WEEKDAY_OPTIONS.find((d) => d.id === rule.weekday) || WEEKDAY_OPTIONS[0];
              const typeOption =
                PERMISSION_TYPE_OPTIONS.find((o) => o.id === rule.permissionType) ||
                PERMISSION_TYPE_OPTIONS[0];
              return (
                <View key={rule.key} style={styles.ruleCard}>
                  <CustomDropDown
                    label="Day of week"
                    data={WEEKDAY_OPTIONS}
                    currentSelected={dayOption}
                    setSelected={(item) => updateRule(rule.key, { weekday: item.id })}
                    required
                  />
                  <CustomDropDown
                    label="Permission type"
                    data={PERMISSION_TYPE_OPTIONS}
                    currentSelected={typeOption}
                    setSelected={(item) => updateRule(rule.key, { permissionType: item.id })}
                    required
                  />
                  {rules.length > 1 ? (
                    <TouchableOpacity style={styles.removeRuleBtn} onPress={() => removeRule(rule.key)}>
                      <Icon name="delete-outline" size={18} color={AppTheme.danger} />
                      <Text style={styles.removeRuleText}>Remove day</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}

            <TouchableOpacity style={styles.addRuleBtn} onPress={addRule}>
              <Icon name="plus-circle-outline" size={20} color={AppTheme.accent} />
              <Text style={styles.addRuleText}>Add another weekday</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Work schedule / medical"
              placeholderTextColor={AppTheme.textMuted}
              multiline
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={AppTheme.background} />
              ) : (
                <Text style={styles.saveButtonText}>{isEditing ? 'Save changes' : 'Create permission'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AppTheme.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: AppTheme.border,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AppTheme.accent,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  hint: {
    color: AppTheme.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: AppTheme.textSoft,
    marginBottom: 6,
    marginTop: 8,
  },
  ruleCard: {
    backgroundColor: AppTheme.background,
    borderWidth: 1,
    borderColor: AppTheme.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  addRuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 4,
  },
  addRuleText: {
    color: AppTheme.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  removeRuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  removeRuleText: {
    color: AppTheme.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  reasonInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: AppTheme.background,
    borderWidth: 1,
    borderColor: AppTheme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: AppTheme.textPrimary,
    fontSize: 15,
  },
  errorText: {
    color: AppTheme.danger,
    marginTop: 12,
    fontSize: 14,
  },
  saveButton: {
    marginTop: 18,
    backgroundColor: AppTheme.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: AppTheme.background,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AttendancePermissionModal;
