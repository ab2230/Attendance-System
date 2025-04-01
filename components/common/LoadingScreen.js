import React, { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, Animated, StyleSheet } from "react-native";

const LoadingScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.text}>Loading...</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  text: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
});

export default LoadingScreen;
