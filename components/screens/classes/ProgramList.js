import React, { useState, useContext, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from "react-native";
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

const ProgramList = ({navigation}) => {
  const { programs, addProgram, updateProgram, deleteProgram } = useContext(ProgramContext);
  const { members } = useContext(MemberContext);

    const [confirmationModal, setConfirmationModal] = useState(false);
   const [programIdTobeDeleted, setProgramIdTobeDeleted] = useState(null);
  const [programName, setProgramName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleAddProgram = () => {
    const newProgram = {
      id: Date.now().toString(),
      name: programName,
      enrolledStudents: [],
    };
    addProgram(newProgram);
    setProgramName('');
    setShowModal(false);
  };

  const handleEditProgram = (item) => {
    setEditingProgram(item);
    setProgramName(item.name);
    setShowModal(true);
  };

  const handleUpdateProgram = () => {
    if (programName.trim().length > 0 && editingProgram) {
      updateProgram({ ...editingProgram, name: programName });
      setProgramName("");
      setShowModal(false);
      setEditingProgram(null);
    }
  };

  const handleDeleteProgram = (id) => {
    setProgramIdTobeDeleted(id);
   setConfirmationModal(true);
  };

  const renderHiddenItem = (data, rowMap) => (
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
            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              style={styles.cardContent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.cardText}>{item.name}</Text>
              <View style={styles.memberCount}>
                <Icon name="people" size={18} color="#6c757d" />
                <Text style={styles.memberCountText}>{memberCount}</Text>
              </View>
            </LinearGradient>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <LinearGradient 
      colors={['#f8f9fa', '#e9ecef']} 
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {
        programs.length === 0? <View style={{flex:1}}>
          <EmptyState
            icon="bookshelf" 
            title="No Programs Available" 
            message="You haven't added any programs. Start by creating one now." 
          />
          </View>:<SwipeListView
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
        />
       
      }
   

      <AddProgramModal
        visible={showModal}
        programName={programName}
        setProgramName={setProgramName}
        onClose={() => {
          setShowModal(false);
          setEditingProgram(null);
          setProgramName("");
        }}
        onAddProgram={editingProgram ? handleUpdateProgram : handleAddProgram}
      />

      <DeleteConfirmationModal
        visible={confirmationModal}
        onClose={() => 
        {setProgramIdTobeDeleted(null);
          Animated.spring(fadeAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
          }).start();

          setConfirmationModal(false)
        }}
        onConfirm={() => {
          deleteProgram(programIdTobeDeleted);
          setProgramIdTobeDeleted(null);
          Animated.spring(fadeAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
          }).start();
          setConfirmationModal(false)
          console.log("Program Deleted!")
        }}
        title="Delete Program?"
        message="Deleting this program will remove all related data. Proceed?"
        icon="bookshelf"
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
  cardText: { 
    fontSize: 18, 
    fontWeight: '600',
    color: '#343a40',
    letterSpacing: 0.5,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  memberCountText: {
    marginLeft: 5,
    color: '#6c757d',
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
    backgroundColor: '#4da0b0',
    shadowColor: '#4da0b0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  }
});

export default ProgramList;