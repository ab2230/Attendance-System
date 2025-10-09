import React, { useState, useContext, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SwipeListView } from "react-native-swipe-list-view";
import { ClassContext } from "../../context/ClassContext";
import { Card } from "react-native-paper";
import AddClassModal from "./AddClassModal";
import AddButton from '../../common/addButton';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from "react-i18next";
import LinearGradient from 'react-native-linear-gradient';
import { MemberContext } from "../../context/MemberContext";
import EmptyState from "../../common/EmptyState";
import DeleteConfirmationModal from "../../common/DeleteConfirmationModal";

const ClassScreen = ({ navigation }) => {
  const {t} = useTranslation();
  const { classes, addClass, updateClass, deleteClass } = useContext(ClassContext);
  const { members, setMembers } = useContext(MemberContext);
  const [className, setClassName] = useState("");
  const [classIdTobeDeleted, setClassIdTobeDeleted] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  const handleAddClass = () => {
    if (className.trim().length > 0) {
      addClass({ id: Date.now().toString(), name: className });
      setClassName("");
      setShowModal(false);
    }
  };

  const handleEditClass = (item) => {
    setEditingClass(item);
    setClassName(item.name);
    setShowModal(true);
  };

  const handleUpdateClass = () => {
    if (className.trim().length > 0 && editingClass) {
      updateClass({ ...editingClass, name: className });
      setClassName("");
      setShowModal(false);
      setEditingClass(null);
    }
  };

  const handleDeleteClass = (id) => {
    setClassIdTobeDeleted(id)
    setConfirmationModal(true)
  };

  const renderHiddenItem = (data, rowMap) => (
    <View style={styles.rowBack}>
      <TouchableOpacity
        style={[styles.backLeftBtn, styles.backLeftBtnLeft]}
        onPress={() => handleEditClass(data.item)}
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
        onPress={() => handleDeleteClass(data.item.id)}
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

  const renderItem = ({ item }) =>{ 
    const memberCount = members.filter(member => member.classId === item.id).length;
    return(
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        onPress={() => navigation.navigate("MembersScreen", { classId: item.id })}
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
  );}
  return (
    <LinearGradient 
      colors={['#f8f9fa', '#e9ecef']} 
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {
        classes.length === 0 ?    <View style={{ flex: 1 }}>
        <EmptyState
          icon="calendar-remove"
          title="No Classes Available"
          message="You haven't created any classes yet. Start by adding a new class."
        />
      </View>:<SwipeListView
        data={classes}
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
      

      <AddClassModal
        className={className}
        setClassName={setClassName}
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingClass(null);
          setClassName("");
        }}
        handleAddClass={editingClass ? handleUpdateClass : handleAddClass}
        isEditing={!!editingClass}
        t={t}
      />
        <DeleteConfirmationModal
        visible={confirmationModal}
        onClose={() => {
          setClassIdTobeDeleted(null)
          Animated.spring(fadeAnim, {
                        toValue: 1,
                        friction: 3,
                        useNativeDriver: true,
                      }).start();
          setConfirmationModal(false)}}
        onConfirm={async() => {
          const updatedMembers = members.filter(member => member.classId !== classIdTobeDeleted);
          setMembers(updatedMembers);
          await AsyncStorage.setItem("members", JSON.stringify(updatedMembers));
          // Delete the class
          deleteClass(classIdTobeDeleted);
          setClassIdTobeDeleted(null);
          Animated.spring(fadeAnim, {
                        toValue: 1,
                        friction: 3,
                        useNativeDriver: true,
                      }).start();
          setConfirmationModal(false);
          console.log("Class Deleted!"); // Replace with your delete function
        }}
        title="Delete Class?"
        message="Are you sure you want to delete this class? This action cannot be undone."
        icon="calendar-remove"
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

export default ClassScreen;