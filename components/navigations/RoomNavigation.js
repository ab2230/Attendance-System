import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AttendanceRoomScreen from '../screens/attendance/AttendanceRoomScreen';
import AttendanceRoomDetailScreen from '../screens/attendance/AttendanceRoomDetailScreen';

const Stack = createStackNavigator();

const RoomNavigation = () => (
  <Stack.Navigator initialRouteName="RoomList" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="RoomList" component={AttendanceRoomScreen} />
    <Stack.Screen name="RoomDetail" component={AttendanceRoomDetailScreen} />
  </Stack.Navigator>
);

export default RoomNavigation;
