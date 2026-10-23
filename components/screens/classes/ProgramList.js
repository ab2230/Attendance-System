import React, { useState, useContext, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, RefreshControl, ScrollView } from "react-native";
import { SwipeListView } from "react-native-swipe-list-view";
import { Card } from "react-native-paper";
import AddButton from '../../common/addButton';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ProgramContext } from "../../context/ProgramContext";
import AddProgramModal from "../attendance/AddProgramModal";
import LinearGradient from 'react-native-linear-gradient';
import { MemberContext } from "../../context/MemberContext";
import EmptyState from "../../common/EmptyState";
import DeleteConfirmationModal from "../../common/DeleteConfirmationModal";
import LoadingScreen from "../../common/LoadingScreen";
import AppTheme from "../../theme/appTheme";
import { DEFAULT_MAX_LATE_MINUTES } from "../../utils/attendanceEditWindow";

const ProgramList = ({navigation}) => {
  const { programs, deleteProgram, loadPrograms, loading } = useContext(ProgramContext);
  const { members, loadMembers } = useContext(MemberContext);

  const [confirmationModal, setConfirmationModal] = useState(false);
  const [programIdTobeDeleted, setProgramIdTobeDeleted] = useState(null);
  const [programName, setProgramName] = useState('');
  const [maxLateMinutes, setMaxLateMinutes] = useState(String(DEFAULT_MAX_LATE_MINUTES));
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadPrograms(), loadMembers()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditProgram = (item) => {
    setEditingProgram(item);
    setProgramName(item.name);
    setMaxLateMinutes(String(item.maxLateMinutes ?? DEFAULT_MAX_LATE_MINUTES));
    setShowModal(true);
  };

  const handleDeleteProgram = (id) => {
    setProgramIdTobeDeleted(id);
    setConfirmationModal(true);
  };

  const confirmDeleteProgram = async () => {
    if (deleting || !programIdTobeDeleted) return;
    setDeleting(true);
    try {
      await deleteProgram(programIdTobeDeleted);
      setProgramIdTobeDeleted(null);
      setConfirmationModal(false);
    } catch (error) {
      console.error("Error deleting program:", error);
    } finally {
      setDeleting(false);
    }
  };

  const renderHiddenItem = (data) => (
    <View style={styles.rowBack}>
      <TouchableOpacity
        style={[styles.backLeftBtn, styles.backLeftBtnLeft]}
        onPress={() => handleEditProgram(data.item)}
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
        onPress={() => handleDeleteProgram(data.item.id)}
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

  const renderItem = ({ item }) => {
    const memberCount = members.filter(member => 
      item.enrolledStudents?.includes(member.id)
    ).length;
    
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          onPress={() => navigation.navigate("MembersInProgram", { programId: item.id })}
          activeOpacity={0.7}
        >
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardText}>{item.name}</Text>
                <Text style={styles.lateWindowText}>
                  Edit window: {item.maxLateMinutes ?? DEFAULT_MAX_LATE_MINUTES} min
                </Text>
              </View>
              <View style={styles.memberCount}>
                <Icon name="people" size={18} color={AppTheme.textMuted} />
                <Text style={styles.memberCountText}>{memberCount}</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppTheme.accent} colors={[AppTheme.accent]} />
  );

  if (loading && programs.length === 0) {
    return (
      <LoadingScreen
        text="Loading programs..."
        backgroundColor="#0a0f24"
        color="#ffcc00"
      />
    );
  }

  return (
    <View style={styles.container}>
      {programs.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={refreshControl}
        >
          <EmptyState
            icon="bookshelf" 
            title="No Programs Available" 
            message="You haven't added any programs. Start by creating one now." 
          />
        </ScrollView>
      ) : (
        <SwipeListView
          data={programs}
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

      <AddProgramModal
        visible={showModal}
        programName={programName}
        setProgramName={setProgramName}
        maxLateMinutes={maxLateMinutes}
        setMaxLateMinutes={setMaxLateMinutes}
        onClose={() => {
          setShowModal(false);
          setEditingProgram(null);
          setProgramName("");
          setMaxLateMinutes(String(DEFAULT_MAX_LATE_MINUTES));
        }}
        isEditing={!!editingProgram}
        editingProgram={editingProgram}
      />

      <DeleteConfirmationModal
        visible={confirmationModal}
        loading={deleting}
        onClose={() => {
          if (deleting) return;
          setProgramIdTobeDeleted(null);
          setConfirmationModal(false);
        }}
        onConfirm={confirmDeleteProgram}
        title="Delete Program?"
        message="Deleting this program will remove all related data. Proceed?"
        icon="bookshelf"
      />

      <AddButton 
        onClick={() => {
          setEditingProgram(null);
          setProgramName('');
          setMaxLateMinutes(String(DEFAULT_MAX_LATE_MINUTES));
          setShowModal(true);
        }} 
        style={styles.addButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  cardContent: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: AppTheme.surface,
    borderWidth: 1,
    borderColor: AppTheme.border,
    borderRadius: 12,
  },
  cardText: { 
    fontSize: 18, 
    fontWeight: '600',
    color: AppTheme.textPrimary,
    letterSpacing: 0.5,
  },
  lateWindowText: {
    fontSize: 12,
    color: AppTheme.textMuted,
    marginTop: 4,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  memberCountText: {
    marginLeft: 5,
    color: AppTheme.textSoft,
    fontSize: 14,
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
    backgroundColor: AppTheme.accent,
    shadowColor: '#4da0b0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  }
});

export default ProgramList;
