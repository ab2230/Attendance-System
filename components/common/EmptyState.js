import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const EmptyState = ({ icon, title, message }) => {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={80} color="#4CAF50" style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  icon: {
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
  },
});

export default EmptyState;
