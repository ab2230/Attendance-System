import React, { useState, useContext, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, RefreshControl, ScrollView } from "react-native";
import { SwipeListView } from "react-native-swipe-list-view";
import { ClassContext } from "../../context/ClassContext";
import { MemberContext } from "../../context/MemberContext";
import AddMembersModal from "./AddMembersModal";
import TopNavigator from "../../common/TopNavigator";
import AddButton from '../../common/addButton';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { Card } from "react-native-paper";
import { importStudents } from "../../utils/importStudents";
import LoadingScreen from "../../common/LoadingScreen";
import EmptyState from "../../common/EmptyState";
import DeleteConfirmationModal from "../../common/DeleteConfirmationModal";
import ImportGuideModal from "../../common/ImportGuideModal";
import { DEFAULT_MEMBER_TYPE } from "../../constants/memberTypes";

const MembersScreen = ({ route, navigation }) => {
  const { classId: initialClassId } = route.params;
  const { classes } = useContext(ClassContext);
  const { members, deleteMember, importMembers, loadMembers, loading } = useContext(MemberContext);
  
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [memberIdTobeDeleted, setMemberIdTobeDeleted] = useState(null);
  const [importing, setImporting] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [memberType, setMemberType] = useState(DEFAULT_MEMBER_TYPE);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredMembers = members.filter((m) => m.classId === selectedClassId);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadMembers();
    } finally {
      setRefreshing(false);
    }
  };

  const handleImport = () => {
    setShowImportGuide(true);
  };

  const proceedImport = async () => {
    if (importing) return;
    try {
      setShowImportGuide(false);
      setImporting(true);
      const result = await importStudents(selectedClassId);
      if (result === null) return;

      const { members: newMembers, skipped } = result;
      if (newMembers.length > 0) {
        await importMembers(newMembers);
        const skippedMsg = skipped.length
          ? `\n\nSkipped ${skipped.length} row(s) with missing/invalid data.`
          : '';
        Alert.alert(
          "Import Successful",
          `Imported ${newMembers.length} students.${skippedMsg}`,
          [{ text: "OK" }]
        );
      } else {
        const reason = skipped.length
          ? ` All ${skipped.length} row(s) were skipped. Check First Name, Last Name, and Type (Regular, Extension, or Distant).`
          : '';
        Alert.alert(
          "No Valid Data",
          `No valid student records found in the file.${reason}`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      const message = error?.message || "Failed to import students";
      const needsMigration =
        /could not find.*(column|'type'|\"type\").*members/i.test(message) ||
        /'type' column/i.test(message) ||
        /column.*type.*schema cache/i.test(message);

      Alert.alert(
        "Import Failed",
        needsMigration
          ? "Your database is missing the member 'type' column. Open Supabase → SQL Editor and run the file supabase/migrations/add_member_type.sql, then try importing again."
          : message,
        [{ text: "OK" }]
      );
    } finally {
      setImporting(false);
    }
  };

  const handleEditMember = (item) => {
    setEditingMember(item);
    setFirstName(item.firstName);
    setLastName(item.lastName);
    setMemberType(item.type || DEFAULT_MEMBER_TYPE);
    setSelectedClassId(item.classId);
    setShowModal(true);
  };

  const handleDeleteMember = (id) => {
    setMemberIdTobeDeleted(id);
    setConfirmationModal(true);
  };

  const confirmDeleteMember = async () => {
    if (deleting || !memberIdTobeDeleted) return;
    setDeleting(true);
    try {
      await deleteMember(memberIdTobeDeleted);
      setMemberIdTobeDeleted(null);
      setConfirmationModal(false);
    } catch (error) {
      console.error("Error deleting member:", error);
    } finally {
      setDeleting(false);
    }
  };

  if (importing) {
    return <LoadingScreen text="Importing students..." />;
  }

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4da0b0']} />
  );

  const renderHiddenItem = (data) => (
    <View style={styles.rowBack}>
      <TouchableOpacity
        style={[styles.backLeftBtn, styles.backLeftBtnLeft]}
        onPress={() => handleEditMember(data.item)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#4da0b0', '#4d79b0']}
          style={styles.gradientButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Icon name="edit" size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.backRightBtn, styles.backRightBtnRight]}
        onPress={() => handleDeleteMember(data.item.id)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#ff6b6b', '#ff4545']}
          style={styles.gradientButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Icon name="delete" size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Card style={styles.card}>
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          style={styles.cardContent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.memberInfo}>
            <Text style={styles.cardText}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.className}>
              {classes.find(c => c.id === item.classId)?.name || 'No Class'}
            </Text>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.type || DEFAULT_MEMBER_TYPE}</Text>
          </View>
        </LinearGradient>
      </Card>
    </Animated.View>
  );

  return (
    <LinearGradient 
      colors={['#f8f9fa', '#e9ecef']} 
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <TopNavigator 
        title="Members" 
        backButton={true} 
        navigation={navigation} 
        uploadTrue={true} 
        handleImport={handleImport}
        importing={importing}
      />
      <ImportGuideModal
        visible={showImportGuide}
        onClose={() => setShowImportGuide(false)}
        onProceed={proceedImport}
      />

      {loading && members.length === 0 ? (
        <LoadingScreen
          text="Loading members..."
          backgroundColor="#f8f9fa"
          color="#4da0b0"
        />
      ) : filteredMembers.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={refreshControl}
        >
          <EmptyState 
            icon="account-remove" 
            title="No Students Found" 
            message="There are no students enrolled yet. Add students to start tracking attendance. You can also import an Excel file with First Name, Last Name, and Type (Regular, Extension, or Distant)." 
          />
        </ScrollView>
      ) : (
        <SwipeListView
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderHiddenItem={renderHiddenItem}
          leftOpenValue={85}
          rightOpenValue={-85}
          disableLeftSwipe={false}
          disableRightSwipe={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={refreshControl}
        />
      )}

    <AddMembersModal 
      visible={showModal} 
      classes={classes}
      firstName={firstName}
      lastName={lastName}
      setFirstName={setFirstName}
      setLastName={setLastName}
      memberType={memberType}
      setMemberType={setMemberType}
      selectedClassId={selectedClassId}
      setSelectedClassId={setSelectedClassId}
      onClose={() => {
        setShowModal(false);
        setEditingMember(null);
        setFirstName("");
        setLastName("");
        setMemberType(DEFAULT_MEMBER_TYPE);
        setSelectedClassId(initialClassId);
      }}
      isEditing={!!editingMember}
      editingMember={editingMember}
    />

      <DeleteConfirmationModal
        visible={confirmationModal}
        loading={deleting}
        onClose={() => {
          if (deleting) return;
          setMemberIdTobeDeleted(null);
          setConfirmationModal(false);
        }}
        onConfirm={confirmDeleteMember}
        title="Delete Student?"
        message="Are you sure you want to remove this student? This cannot be undone."
        icon="account-remove"
      />

      <AddButton 
        onClick={() => {
          setEditingMember(null);
          setMemberType(DEFAULT_MEMBER_TYPE);
          setSelectedClassId(initialClassId);
          setShowModal(true);
        }} 
        style={styles.addButton}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 12,
  },
  cardContent: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  cardText: { 
    fontSize: 18, 
    fontWeight: '600',
    color: '#343a40',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  className: {
    fontSize: 14,
    color: '#6c757d',
  },
  typeBadge: {
    backgroundColor: 'rgba(77, 160, 176, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4da0b0',
  },
  rowBack: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  backLeftBtn: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 85,
    left: 0,
  },
  backLeftBtnLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    overflow: 'hidden',
  },
  backRightBtn: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 85,
    right: 0,
  },
  backRightBtnRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 12,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#4da0b0',
    shadowColor: '#4da0b0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  }
});

export default MembersScreen;
