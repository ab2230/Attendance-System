import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AppTheme from "../theme/appTheme";

const EmptyState = ({ icon, title, message }) => {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={80} color={AppTheme.accent} style={styles.icon} />
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
    backgroundColor: AppTheme.background,
  },
  icon: {
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: AppTheme.textPrimary,
    marginBottom: 5,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    color: AppTheme.textMuted,
  },
});

export default EmptyState;
