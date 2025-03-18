import React, { useState, useContext, useEffect } from "react";
import { View, FlatList, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { ClassContext } from "../../context/ClassContext";
import { MemberContext } from "../../context/MemberContext";
import AddMembersModal from "./AddMembersModal";
import TopNavigator from "../../common/TopNavigator";
import AddButton from '../../common/addButton';

const MembersScreen = ({ route }) => {
  const { classId: initialClassId } = route.params;
  const { classes } = useContext(ClassContext);
  const { members, addMember } = useContext(MemberContext);
  
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showModal, setShowModal] = useState(false);
  useEffect(() => {
    setFilteredMembers(members.filter((m) => m.classId === selectedClassId));
  }, [members, selectedClassId]);

  const handleAddMember = () => {
    if (firstName.trim() && lastName.trim()) {
      addMember({ 
        id: Date.now().toString(), 
        firstName, 
        lastName, 
        classId: selectedClassId 
      });
      setFirstName("");
      setLastName("");
    }
  };

  return (
    <View style={styles.container}>
     <TopNavigator title="Members" backButton={true} />
      {/* Member List */}
      <AddMembersModal 
      visible={showModal} 
      handleAddMember={handleAddMember} 
      classes={classes}
      firstName={firstName}
      lastName={lastName}
      setFirstName={setFirstName}
      setLastName={setLastName}
      selectedClassId={selectedClassId}
      setSelectedClassId={setSelectedClassId}
      onClose={() => setShowModal(false)}
      />
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardText}>{item.firstName} {item.lastName}</Text>
          </View>
        )}
      />
     <AddButton onClick={()=>setShowModal(true)} />
    </View>
  );
};

export default MembersScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 8, backgroundColor: "white" },
  card: { padding: 15, marginVertical: 5, borderRadius: 8, backgroundColor: "white", elevation: 3 },
  cardText: { fontSize: 18, fontWeight: "bold" },
});
