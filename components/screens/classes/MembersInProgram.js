import React, { useState, useEffect, useContext, useRef } from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Animated, RefreshControl } from "react-native";
import { ProgramContext } from "../../context/ProgramContext";
import { MemberContext } from "../../context/MemberContext";
import AddButton from '../../common/addButton';
import TopNavigator from "../../common/TopNavigator";
import EnrollStudentsModal from "./EnrollStudentsModal";
import LinearGradient from 'react-native-linear-gradient';
import { Card } from "react-native-paper";
import Icon from 'react-native-vector-icons/MaterialIcons';
import LoadingScreen from "../../common/LoadingScreen";
import AppTheme from "../../theme/appTheme";

const MembersInProgram = ({ route, navigation }) => {
  const { programId } = route.params;
  const { programs, unenrollStudent, loadPrograms, loading: programsLoading } = useContext(ProgramContext);
  const { members, loadMembers, loading: membersLoading } = useContext(MemberContext);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unenrollingId, setUnenrollingId] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const program = programs.find((p) => p.id === programId);
  const enrolledStudents = members.filter((member) => 
    program?.enrolledStudents?.includes(member.id)
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadPrograms(), loadMembers()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUnenroll = (studentId) => {
    if (unenrollingId) return;
    Alert.alert(
      "Unenroll Student",
      "Are you sure you want to unenroll this student?",
      [
        { 
          text: "Cancel", 
          style: "cancel",
        },
        { 
          text: "Unenroll", 
          onPress: async () => {
            setUnenrollingId(studentId);
            try {
              await unenrollStudent(programId, studentId);
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to unenroll student");
            } finally {
              setUnenrollingId(null);
            }
          } 
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isUnenrolling = unenrollingId === item.id;
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.programName}>
                {program?.name} · {item.type || 'Regular'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => handleUnenroll(item.id)}
              style={styles.unenrollButton}
              activeOpacity={0.7}
              disabled={!!unenrollingId}
            >
              <LinearGradient
                colors={isUnenrolling || unenrollingId ? ['#3a4563', '#2a3550'] : ['#ff6b6b', '#ff4545']}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="person-remove" size={20} color={isUnenrolling || unenrollingId ? AppTheme.textMuted : 'white'} />
                <Text style={[styles.unenrollText, (isUnenrolling || unenrollingId) && styles.disabledText]}>
                  {isUnenrolling ? '...' : 'Unenroll'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Card>
      </Animated.View>
    );
  };

  if ((programsLoading || membersLoading) && !program) {
    return (
      <View style={styles.container}>
        <TopNavigator title="Enrolled Students" backButton={true} navigation={navigation} />
        <LoadingScreen
          text="Loading students..."
          backgroundColor={AppTheme.background}
          color={AppTheme.accent}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavigator title="Enrolled Students" backButton={true} navigation={navigation} />

      <FlatList
        data={enrolledStudents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppTheme.accent} colors={[AppTheme.accent]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No students enrolled yet</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
  
      <EnrollStudentsModal 
        programId={programId} 
        onClose={() => setShowModal(false)} 
        visible={showModal}
      />
      
      <AddButton 
        onClick={() => setShowModal(true)} 
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
    flexGrow: 1,
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
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '600',
    color: AppTheme.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  programName: {
    fontSize: 14,
    color: AppTheme.textMuted,
  },
  unenrollButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  unenrollText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 5,
  },
  disabledText: {
    color: AppTheme.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: AppTheme.textMuted,
  },
  separator: {
    height: 12,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: AppTheme.accent,
    shadowColor: AppTheme.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  }
});

export default MembersInProgram;
