import React from "react";
import { 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  StyleSheet 
} from "react-native";
import LinearGradient from 'react-native-linear-gradient';
import AntDesign from 'react-native-vector-icons/AntDesign';

const LoadingButton = ({ 
  onPress, 
  loading = false, 
  disabled = false,
  title = "Submit", 
  loadingText = "Processing...",
  icon = null,
  colors = ['#43e97b', '#38f9d7'],
  disabledColors = ['#e9ecef', '#dee2e6'],
  style = {},
  textStyle = {},
  activeOpacity = 0.8
}) => {
  const isDisabled = disabled || loading;
  const buttonColors = isDisabled ? disabledColors : colors;
  const displayText = loading ? loadingText : title;

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={isDisabled}
      activeOpacity={activeOpacity}
      style={[styles.container, style]}
    >
      <LinearGradient
        colors={buttonColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color="white" 
            style={styles.loader}
          />
        ) : (
          icon && (
            <AntDesign 
              name={icon} 
              size={18} 
              color={isDisabled ? '#6c757d' : 'white'} 
              style={styles.icon}
            />
          )
        )}
        
        <Text style={[
          styles.text, 
          textStyle,
          isDisabled && styles.disabledText
        ]}>
          {displayText}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  gradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  text: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  disabledText: {
    color: '#6c757d',
  },
  loader: {
    marginRight: 10,
  },
  icon: {
    marginRight: 8,
  },
});

export default LoadingButton;
