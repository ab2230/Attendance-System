import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { createStackNavigator } from '@react-navigation/stack';
import MembersScreen from '../screens/classes/MembersScreen';
import ClassAndProgram from '../screens/classes/ClassAndProgram';
import MembersInProgram from '../screens/classes/MembersInProgram';

const ClassesNavigation = () => {
    const Stack = createStackNavigator();
  return (
    <Stack.Navigator initialRouteName="Classes" screenOptions={{headerShown: false}}>
        <Stack.Screen name="ClassesNav" component={ClassAndProgram} />
        <Stack.Screen name="MembersScreen" component={MembersScreen} />
        <Stack.Screen name="MembersInProgram" component={MembersInProgram} />
      </Stack.Navigator>
  )
}

export default ClassesNavigation

const styles = StyleSheet.create({})