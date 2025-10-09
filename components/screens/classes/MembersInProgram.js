import React, { useState, useEffect, useContext, useRef } from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Animated } from "react-native";
import { ProgramContext } from "../../context/ProgramContext";
import { MemberContext } from "../../context/MemberContext";
import AddButton from '../../common/addButton';
import TopNavigator from "../../common/TopNavigator";
import EnrollStudentsModal from "./EnrollStudentsModal";
import LinearGradient from 'react-native-linear-gradient';
import { Card } from "react-native-paper";
import Icon from 'react-native-vector-icons/MaterialIcons';

const MembersInProgram = ({ route, navigation }) => {
  const { programId } = route.params;
  const { programs, unenrollStudent } = useContext(ProgramContext);
  const { members } = useContext(MemberContext);
  const [showModal, setShowModal] = useState(false);
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

  const handleUnenroll = (studentId) => {
    Alert.alert(
      "Unenroll Student",
      "Are you sure you want to unenroll this student?",
      [
        { 
          text: "Cancel", 
          style: "cancel",
          onPress: () => {
            Animated.spring(fadeAnim, {
              toValue: 1,
              friction: 3,
              useNativeDriver: true,
            }).start();
          } 
        },
        { 
          text: "Unenroll", 
          onPress: () => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(() => unenrollStudent(programId, studentId));
          } 
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Card style={styles.card}>
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          style={styles.cardContent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.programName}>{program?.name}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => handleUnenroll(item.id)}
            style={styles.unenrollButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#ff6b6b', '#ff4545']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="person-remove" size={20} color="white" />
              <Text style={styles.unenrollText}>Unenroll</Text>
            </LinearGradient>
          </TouchableOpacity>
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
      <TopNavigator title="Enrolled Students" backButton={true} navigation={navigation} />

      <FlatList
        data={enrolledStudents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
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
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  programName: {
    fontSize: 14,
    color: '#6c757d',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
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

export default MembersInProgram;