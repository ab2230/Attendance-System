import React from 'react';
import { SafeAreaView } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ClassesNavigation from './navigations/ClassesNavigation';
import AttendanceScreen from './screens/attendance/AttendanceScreen';
import AttendanceRecords from './screens/attendance/AttendanceRecords';

const Tab = createBottomTabNavigator();

function MyTabs() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarStyle: {
            backgroundColor: "blue",
          },
          tabBarActiveTintColor: "#fff",
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            let iconName;

            if (route.name === "Today") {
              iconName = "calendar-check"; // Icon for attendance check
            } else if (route.name === "History") {
              iconName = "history"; // Icon for past attendance
            } else if (route.name === "Classes") {
              iconName = "account-group"; // Icon for managing classes
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Today" component={AttendanceScreen} />
        <Tab.Screen name="History" component={AttendanceRecords} />
        <Tab.Screen name="Classes" component={ClassesNavigation} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

export default MyTabs;
