import React, { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, Animated, StyleSheet } from "react-native";

const LoadingScreen = ({ 
  text = "Loading...", 
  size = "large", 
  color = "#4CAF50",
  overlay = false,
  backgroundColor = "#121212"
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const containerStyle = overlay 
    ? [styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]
    : [styles.container, { backgroundColor }];

  return (
    <Animated.View style={[containerStyle, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
        <ActivityIndicator size={size} color={color} />
        <Text style={styles.text}>{text}</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  content: {
    alignItems: "center",
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    textAlign: 'center',
  },
});

export default LoadingScreen;
