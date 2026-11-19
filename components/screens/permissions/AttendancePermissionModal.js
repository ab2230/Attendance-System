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
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomDropDown from '../../common/CustomDropDown';
import AppTheme from '../../theme/appTheme';
import {
  PERMISSION_TYPE_OPTIONS,
  PERMISSION_TYPES,
  toPermissionDateKey,
} from '../../utils/attendancePermissions';

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
  const [permissionType, setPermissionType] = useState(PERMISSION_TYPES.EXCUSED_ABSENCE);
  const [permissionDate, setPermissionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(editingPermission?.id);

  useEffect(() => {
    if (!visible) return;
    if (editingPermission) {
      setProgramId(editingPermission.programId);
      setMemberId(editingPermission.memberId);
      setPermissionType(editingPermission.permissionType || PERMISSION_TYPES.EXCUSED_ABSENCE);
      setPermissionDate(
        editingPermission.permissionDate
          ? new Date(`${editingPermission.permissionDate}T12:00:00`)
          : new Date(),
      );
      setReason(editingPermission.reason || '');
    } else {
      setProgramId(null);
      setMemberId(null);
      setPermissionType(PERMISSION_TYPES.EXCUSED_ABSENCE);
      setPermissionDate(new Date());
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
  const selectedTypeOption =
    PERMISSION_TYPE_OPTIONS.find((o) => o.id === permissionType) || PERMISSION_TYPE_OPTIONS[0];

  const handleClose = () => {
    if (submitting) return;
    onClose();
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
    if (!permissionType) {
      setError('Select a permission type.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        id: editingPermission?.id,
        programId,
        memberId,
        permissionType,
        permissionDate: toPermissionDateKey(permissionDate),
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

            <CustomDropDown
              label="Permission type"
              data={PERMISSION_TYPE_OPTIONS}
              currentSelected={selectedTypeOption}
              setSelected={(item) => setPermissionType(item.id)}
              required
            />

            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Icon name="calendar" size={18} color={AppTheme.accent} />
              <Text style={styles.dateText}>{permissionDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker ? (
              <DateTimePicker
                value={permissionDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (event?.type === 'dismissed') return;
                  if (date) setPermissionDate(date);
                }}
              />
            ) : null}

            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Medical appointment"
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
  label: {
    fontSize: 14,
    color: AppTheme.textSoft,
    marginBottom: 6,
    marginTop: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AppTheme.background,
    borderWidth: 1,
    borderColor: AppTheme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateText: {
    color: AppTheme.textPrimary,
    fontSize: 15,
    fontWeight: '500',
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
