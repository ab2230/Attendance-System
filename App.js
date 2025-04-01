import React from 'react';
import TabNavigation from './components/tabNavigation';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ClassProvider } from './components/context/ClassContext';
import { MemberProvider } from './components/context/MemberContext';
import { ProgramProvider } from './components/context/ProgramContext';
import { AttendanceProvider } from './components/context/AttendanceContext';

import './components/i18n';
import { checkForUpdate } from './checkForUpdate';

const Stack = createStackNavigator();

const App = () => {
  React.useEffect(()=>{
    checkForUpdate();
  },[])
  return (
  <ClassProvider>
  <MemberProvider>
    <ProgramProvider>
      <AttendanceProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home"  screenOptions={{headerShown: false}}>
              <Stack.Screen name="Home" component={TabNavigation}/>
            </Stack.Navigator>
        </NavigationContainer>
      </AttendanceProvider>
    </ProgramProvider>
  </MemberProvider>
  </ClassProvider>
  )
}

export default App;
