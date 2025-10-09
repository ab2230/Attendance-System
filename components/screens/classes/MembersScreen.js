import React, { useState, useContext, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from "react-native";
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

const MembersScreen = ({ route, navigation }) => {
  const { classId: initialClassId } = route.params;
  const { classes } = useContext(ClassContext);
  const { members, addMember, updateMember, deleteMember, importMembers } = useContext(MemberContext);
  
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [memberIdTobeDeleted, setMemberIdTobeDeleted] = useState(null);
  const [importing, setImporting] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Derive filtered members directly from members array
  const filteredMembers = members.filter((m) => m.classId === selectedClassId);
  
  // Debug logging
  console.log('MembersScreen Debug:', {
    selectedClassId,
    initialClassId,
    totalMembers: members.length,
    filteredMembersCount: filteredMembers.length,
    members: members.map(m => ({ id: m.id, firstName: m.firstName, classId: m.classId }))
  });
 // Add this function
 const handleImport = async () => {
  try {
    setImporting(true);
    const newMembers = await importStudents(selectedClassId, addMember);
    console.log('this is the new members', newMembers);
    if (newMembers === null) return; // User cancelled
    if (newMembers.length > 0) {
      const status = await importMembers(newMembers);
      console.log('this is the status', status);
      Alert.alert(
        "Import Successful",
        `Imported ${newMembers.length} students.`,
        [{ text: "OK" }]
      );
    } else {
      Alert.alert(
        "No Valid Data",
        "No valid student records found in the file.",
        [{ text: "OK" }]
      );
    }
  } catch (error) {
    Alert.alert(
      "Import Failed",
      error.message || "Failed to import students",
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
    setSelectedClassId(item.classId);
    setShowModal(true);
  };

  const handleUpdateMember = () => {
    if (firstName.trim() && lastName.trim() && editingMember) {
      updateMember({ 
        ...editingMember, 
        firstName, 
        lastName, 
        classId: selectedClassId 
      });
      setFirstName("");
      setLastName("");
      setShowModal(false);
      setEditingMember(null);
    }
  };

  const handleDeleteMember = (id) => {
      setMemberIdTobeDeleted(id);
      setConfirmationModal(true);
  };
if(importing){
  return(
    <LoadingScreen />
  )
}
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
          {/* <Icon name="chevron-right" size={24} color="#6c757d" /> */}
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
    importing={importing}/>
    {
      filteredMembers.length === 0 ? <View style={{flex:1}}><EmptyState 
      icon="account-remove" 
      title="No Students Found" 
      message="There are no students enrolled yet. Add students to start tracking attendance. You can also add excel file with 2 columns of first name and last name" 
    />
    </View>:   <SwipeListView
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
    />
    }

    <AddMembersModal 
      visible={showModal} 
      classes={classes}
      firstName={firstName}
      lastName={lastName}
      setFirstName={setFirstName}
      setLastName={setLastName}
      selectedClassId={selectedClassId}
      setSelectedClassId={setSelectedClassId}
      onClose={() => {
        setShowModal(false);
        setEditingMember(null);
        setFirstName("");
        setLastName("");
        // Reset selectedClassId to the initial class when closing
        setSelectedClassId(initialClassId);
      }}
      isEditing={!!editingMember}
      editingMember={editingMember}
    />

    <DeleteConfirmationModal
      visible={confirmationModal}
      onClose={() => {
        setMemberIdTobeDeleted(null)
          Animated.spring(fadeAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
          }).start()
        setConfirmationModal(false)
      }}
      onConfirm={() => 
      {
        deleteMember(memberIdTobeDeleted)
        console.log("Student Deleted!")
        setMemberIdTobeDeleted(null)
        Animated.spring(fadeAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }).start()
        setConfirmationModal(false)
      }
        }
      title="Delete Student?"
      message="Are you sure you want to remove this student? This cannot be undone."
      icon="account-remove"
    />

      <AddButton 
        onClick={() => {
          // Ensure selectedClassId is set to current class when adding new member
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