import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { createStackNavigator } from '@react-navigation/stack';
import ClassScreen from '../screens/classes/ClassScreen';
import MembersScreen from '../screens/classes/MembersScreen';

const ClassesNavigation = () => {
    const Stack = createStackNavigator();
  return (
    <Stack.Navigator initialRouteName="Classes" screenOptions={{headerShown: false}}>
        <Stack.Screen name="Classes" component={ClassScreen} />
        <Stack.Screen name="MembersScreen" component={MembersScreen} />
      </Stack.Navigator>
  )
}

export default ClassesNavigation

const styles = StyleSheet.create({})