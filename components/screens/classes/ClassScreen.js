import React, { useState, useContext } from "react";
import { View, FlatList, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { ClassContext } from "../../context/ClassContext";
import { Card } from "react-native-paper";
import TopNavigator from "../../common/TopNavigator";

const ClassScreen = ({ navigation }) => {
  const { classes, addClass } = useContext(ClassContext);
  const [className, setClassName] = useState("");

  const handleAddClass = () => {
    if (className.trim().length > 0) {
      addClass({ id: Date.now().toString(), name: className });
      setClassName("");
    }
  };

  return (
    <View style={styles.container}>
      <TopNavigator title="Class Management" />
      
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Enter Class Name"
          value={className}
          onChangeText={setClassName}
          style={styles.input}
        />
        <TouchableOpacity onPress={handleAddClass} style={styles.button}>
          <Text style={styles.buttonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
             <TouchableOpacity 
            style={styles.classButton} 
            onPress={() => navigation.navigate("MembersScreen", { classId: item.id })}
          >
            <Text style={styles.cardText}>{item.name}</Text>
            </TouchableOpacity>
          </Card>
        )}
      />
    </View>
  );
};

export default ClassScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  inputContainer: { flexDirection: "row", padding:20 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, backgroundColor: "white" },
  button: { marginLeft: 10, backgroundColor: "#007bff", padding: 12, borderRadius: 8 },
  buttonText: { color: "white", fontWeight: "bold" },
  card: { margin: 20, padding:10,marginVertical: 2, borderRadius: 8, backgroundColor: "white", elevation: 3 },
  cardText: { fontSize: 18, fontWeight: "bold" },
  classButton: { padding: 2, marginVertical: 5, borderRadius: 8,},
});
