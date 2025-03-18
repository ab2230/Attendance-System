import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import CustomTextInput from "../../common/CustomTextInput";
import CustomDropDown from "../../common/CustomDropDown";
import AntDesign from 'react-native-vector-icons/AntDesign';

const AddMembersModal = ({visible, handleAddMember, classes, firstName, lastName, selectedClassId, setSelectedClassId, setFirstName, setLastName, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Close Button */}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <AntDesign name="close" size={24} color="black" />
            </TouchableOpacity>
      
            <Text style={styles.title}>Add Members</Text>
            {/* Class Selector */}
            <CustomDropDown
              label="Selected Class"
              data={classes}
              currentSelected={classes.find(cls => cls.id === selectedClassId)}
              setSelected={(input) => setSelectedClassId(input.id)}
              required={true}
            />
            {/* Add Member */}
            <View style={styles.inputContainer}>
              <CustomTextInput 
                label="First Name"
                input={firstName}
                placeholder="Eg: Abrham"
                setInput={(value) => setFirstName(value)}
              />
              <CustomTextInput 
                label="Last Name"
                input={lastName}
                placeholder="Eg: Tesfaye"
                setInput={(value) => setLastName(value)}
              />
              <TouchableOpacity onPress={handleAddMember} style={styles.button}>
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
    </Modal>
  );
};

export default AddMembersModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  inputContainer: {
    width: '100%',
  },
  button: {
    marginTop: 15,
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});