import { StyleSheet } from 'react-native'
import React from 'react'
import { createStackNavigator } from '@react-navigation/stack';
import MembersScreen from '../screens/classes/MembersScreen';
import ClassAndProgram from '../screens/classes/ClassAndProgram';
import MembersInProgram from '../screens/classes/MembersInProgram';
import AttendancePermissionsScreen from '../screens/permissions/AttendancePermissionsScreen';

const ClassesNavigation = () => {
    const Stack = createStackNavigator();
  return (
    <Stack.Navigator initialRouteName="ClassesNav" screenOptions={{headerShown: false}}>
        <Stack.Screen name="ClassesNav" component={ClassAndProgram} />
        <Stack.Screen name="MembersScreen" component={MembersScreen} />
        <Stack.Screen name="MembersInProgram" component={MembersInProgram} />
        <Stack.Screen name="AttendancePermissions" component={AttendancePermissionsScreen} />
      </Stack.Navigator>
  )
}

export default ClassesNavigation

const styles = StyleSheet.create({})