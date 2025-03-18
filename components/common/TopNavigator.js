import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Entypo from 'react-native-vector-icons/Entypo';

const TopNavigator = ({ title, backButton = false }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {backButton && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
           <Entypo name="chevron-left" size={24} color="white" />
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginTop: 50
  },
  backButton: {
    paddingLeft: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    padding:10
  },
});

export default TopNavigator;
