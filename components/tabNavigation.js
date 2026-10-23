import React from "react";
import { SafeAreaView, View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import ClassesNavigation from "./navigations/ClassesNavigation";
import AttendanceScreen from "./screens/attendance/AttendanceScreen";
import AttendanceRecords from "./screens/attendance/AttendanceRecords";
import RoomNavigation from "./navigations/RoomNavigation";
import ProfileScreen from "./screens/profile/ProfileScreen";

const Tab = createBottomTabNavigator();

function MyTabs() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: "#ffcc00",
            tabBarInactiveTintColor: "#ccc",
            headerShown: false,
            tabBarLabelStyle: styles.tabLabel,
            tabBarIcon: ({ color, size }) => {
              let iconName;

              if (route.name === "Today") {
                iconName = "calendar-check";
              } else if (route.name === "History") {
                iconName = "history";
              } else if (route.name === "Classes") {
                iconName = "account-group";
              } else if (route.name === "Room") {
                iconName = "door-open";
              } else if (route.name === "Profile") {
                iconName = "account-circle";
              }

              return <Icon name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Today" component={AttendanceScreen} />
          <Tab.Screen name="History" component={AttendanceRecords} />
          <Tab.Screen name="Room" component={RoomNavigation} />
          <Tab.Screen name="Classes" component={ClassesNavigation} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0a0f24", // Dark background
  },
  container: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: "#162447", // Deep blue
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 65,
    paddingBottom: 10,
    elevation: 5, // Adds shadow on Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export default MyTabs;
