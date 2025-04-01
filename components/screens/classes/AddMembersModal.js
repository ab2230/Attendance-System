import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions, Easing } from "react-native";
import CustomTextInput from "../../common/CustomTextInput";
import CustomDropDown from "../../common/CustomDropDown";
import AntDesign from 'react-native-vector-icons/AntDesign';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';

const { width } = Dimensions.get('window');

const AddMembersModal = ({visible, handleAddMember, classes, firstName, lastName, selectedClassId, setSelectedClassId, setFirstName, setLastName, onClose, isEditing }) => {
  const scaleValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

   useEffect(() => {
      if (visible) {
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
          Animated.timing(fadeValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fadeValue, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          })
        ]).start();
      }
    }, [visible]);
  return (
    <Modal visible={visible} animationType="none" transparent={true}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeValue }]}>
        <BlurView
          style={styles.absolute}
          blurType="dark"
          blurAmount={10}
          reducedTransparencyFallbackColor="black"
        />
        
        <Animated.View style={[
          styles.modalContainer, 
          { 
            transform: [{ scale: scaleValue }],
            opacity: fadeValue
          }
        ]}>
          {/* Header with gradient */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modalHeader}
          >
            <Text style={styles.title}>{isEditing ? "Update Member" : "Add New Member"}</Text>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <AntDesign name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Modal Content */}
          <View style={styles.modalContent}>
            <View style={styles.dropdownContainer}>
              <CustomDropDown
                label="Select Class"
                data={classes}
                currentSelected={classes.find(cls => cls.id === selectedClassId)}
                setSelected={(input) => setSelectedClassId(input.id)}
                required={true}
                containerStyle={styles.dropdownStyle}
              />
            </View>

            <CustomTextInput 
              label="First Name"
              input={firstName}
              placeholder="Eg: Abrham"
              setInput={(value) => setFirstName(value)}
              containerStyle={styles.inputField}
            />

            <CustomTextInput 
              label="Last Name"
              input={lastName}
              placeholder="Eg: Tesfaye"
              setInput={(value) => setLastName(value)}
              containerStyle={styles.inputField}
            />

            <TouchableOpacity 
              onPress={handleAddMember} 
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isEditing ? ['#4facfe', '#00f2fe'] : ['#43e97b', '#38f9d7']}
                style={styles.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buttonText}>
                  {isEditing ? "Update" : "Add Member"}
                </Text>
                <AntDesign 
                  name={isEditing ? "checkcircle" : "adduser"} 
                  size={20} 
                  color="white" 
                  style={styles.buttonIcon}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    paddingVertical: 20,
    paddingHorizontal: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalContent: {
    padding: 25,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
    flexShrink: 1,
    paddingRight: 20,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 5,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    marginBottom: 20,
  },
  dropdownStyle: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
  },
  inputField: {
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 10,
  },
});

export default AddMembersModal;