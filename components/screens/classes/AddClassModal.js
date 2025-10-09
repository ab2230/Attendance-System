import { StyleSheet, Text, View, Modal, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native'
import React, { useEffect, useRef, useState, useContext } from 'react'
import AntDesign from 'react-native-vector-icons/AntDesign';
import CustomTextInput from "../../common/CustomTextInput";
import LoadingButton from "../../common/LoadingButton";
import ErrorModal from "../../common/ErrorModal";
import LoadingScreen from "../../common/LoadingScreen";
import { ClassContext } from "../../context/ClassContext";
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';

const { width } = Dimensions.get('window');

const AddClassModal = ({className, setClassName, visible, onClose, isEditing, editingClass, t}) => {
  const { addClass, updateClass, loading } = useContext(ClassContext);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
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

  const handleSubmit = async () => {
    try {
      // Validation
      if (!className.trim()) {
        setError('Class name is required');
        setShowErrorModal(true);
        return;
      }
      
      setLocalLoading(true);
      setError(null);
      
      const classData = {
        name: className.trim()
      };
      
      if (isEditing && editingClass) {
        classData.id = editingClass.id;
        await updateClass(classData);
      } else {
        await addClass(classData.name);
      }
      
      // Reset form
      setClassName('');
      onClose();
      
    } catch (error) {
      console.error('Error submitting class:', error);
      setError(error.message || 'Failed to save class. Please try again.');
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
          {/* Header with gradient */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modalHeader}
          >
            <Text style={styles.title}>{isEditing ? t('update') : t('add')} Class</Text>
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
            <CustomTextInput 
              label="Class Name"
              input={className}
              placeholder="Eg: Advanced Yoga"
              setInput={(value) => setClassName(value)}
              containerStyle={styles.inputContainer}
            />

            <LoadingButton
              onPress={handleSubmit}
              loading={localLoading || loading}
              title={isEditing ? (t ? t('update') : 'Update') + ' Class' : (t ? t('add') : 'Add') + ' Class'}
              loadingText={isEditing ? 'Updating...' : 'Adding...'}
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
          text={isEditing ? "Updating class..." : "Adding class..."}
        />
      )}
    </Modal>
  )
}

export default AddClassModal

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
  inputContainer: {
    marginBottom: 25,
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
  submitButton: {
    marginTop: 10,
  },
});