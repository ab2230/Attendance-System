import React, { useEffect, useRef, useState, useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions, Easing } from "react-native";
import CustomTextInput from "../../common/CustomTextInput";
import LoadingButton from "../../common/LoadingButton";
import ErrorModal from "../../common/ErrorModal";
import LoadingScreen from "../../common/LoadingScreen";
import { ProgramContext } from "../../context/ProgramContext";
import { DEFAULT_MAX_LATE_MINUTES } from "../../utils/attendanceEditWindow";
import AntDesign from 'react-native-vector-icons/AntDesign';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';

const { width } = Dimensions.get('window');

const AddProgramModal = ({
  programName,
  setProgramName,
  visible,
  onClose,
  isEditing,
  editingProgram,
  maxLateMinutes,
  setMaxLateMinutes,
}) => {
  const { addProgram, updateProgram, loading } = useContext(ProgramContext);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const scaleValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (isEditing && editingProgram) {
        setMaxLateMinutes?.(
          String(editingProgram.maxLateMinutes ?? DEFAULT_MAX_LATE_MINUTES)
        );
      } else if (!maxLateMinutes) {
        setMaxLateMinutes?.(String(DEFAULT_MAX_LATE_MINUTES));
      }

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

  const handleSubmit = async () => {
    if (localLoading || loading) return;

    try {
      if (!programName.trim()) {
        setError('Program name is required');
        setShowErrorModal(true);
        return;
      }

      const lateMinutes = parseInt(String(maxLateMinutes).trim(), 10);
      if (!Number.isFinite(lateMinutes) || lateMinutes <= 0) {
        setError('Maximum late minutes must be a positive number (e.g. 60)');
        setShowErrorModal(true);
        return;
      }
      
      setLocalLoading(true);
      setError(null);
      
      const programData = {
        name: programName.trim(),
        maxLateMinutes: lateMinutes,
      };
      
      if (isEditing && editingProgram) {
        programData.id = editingProgram.id;
        await updateProgram(programData);
      } else {
        await addProgram(programData);
      }
      
      setProgramName('');
      setMaxLateMinutes?.(String(DEFAULT_MAX_LATE_MINUTES));
      onClose();
      
    } catch (error) {
      console.error('Error submitting program:', error);
      setError(error.message || 'Failed to save program. Please try again.');
      setShowErrorModal(true);
    } finally {
      setLocalLoading(false);
    }
  };

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
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modalHeader}
          >
            <Text style={styles.title}>{isEditing ? 'Update Program' : 'Create New Program'}</Text>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <AntDesign name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.modalContent}>
            <CustomTextInput 
              label="Program Name"
              input={programName}
              placeholder="Eg: Advanced Yoga Course"
              setInput={(value) => setProgramName(value)}
              containerStyle={styles.inputField}
            />

            <CustomTextInput 
              label="Maximum Late Minutes"
              input={String(maxLateMinutes ?? DEFAULT_MAX_LATE_MINUTES)}
              placeholder="Eg: 60"
              setInput={(value) => setMaxLateMinutes?.(value.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              containerStyle={styles.inputField}
            />
            <Text style={styles.helperText}>
              Attendance stays editable until class start time plus this many minutes. After that, edits are locked.
            </Text>

            <LoadingButton
              onPress={handleSubmit}
              loading={localLoading || loading}
              title={isEditing ? 'Update Program' : 'Create Program'}
              loadingText={isEditing ? 'Updating...' : 'Creating...'}
              icon={isEditing ? "checkcircle" : "pluscircle"}
              colors={isEditing ? ['#4facfe', '#00f2fe'] : ['#43e97b', '#38f9d7']}
              style={styles.submitButton}
            />
          </View>
        </Animated.View>
      </Animated.View>
      
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Error"
        message={error}
        onRetry={handleSubmit}
        buttonText="Try Again"
      />
      
      {(localLoading || loading) && (
        <LoadingScreen
          overlay={true}
          text={isEditing ? "Updating program..." : "Creating program..."}
        />
      )}
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
  inputField: {
    marginBottom: 12,
  },
  helperText: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 18,
    marginBottom: 20,
  },
  submitButton: {
    marginTop: 10,
  },
});

export default AddProgramModal;
