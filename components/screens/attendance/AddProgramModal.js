import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import CustomTextInput from "../../common/CustomTextInput";
import AntDesign from 'react-native-vector-icons/AntDesign';


const AddProgramModal = ({programName, setProgramName, visible, onClose, onAddProgram}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        {/* Close Button */}
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <AntDesign name="close" size={24} color="black" />
        </TouchableOpacity>
  
        <Text style={styles.title}>Add Program</Text>
        {/* Add Member */}
        <View style={styles.inputContainer}>
          <CustomTextInput 
            label="Program Name"
            input={programName}
            placeholder="Eg: Course A"
            setInput={(value) => setProgramName(value)}
          />
          <TouchableOpacity onPress={onAddProgram} style={styles.button}>
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
</Modal>
  )
}

export default AddProgramModal

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