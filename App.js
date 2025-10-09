import 'react-native-gesture-handler';

import React, { useContext } from 'react';
import { View } from "react-native";
import TabNavigation from './components/tabNavigation';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ClassProvider } from './components/context/ClassContext';
import { MemberProvider } from './components/context/MemberContext';
import { ProgramProvider } from './components/context/ProgramContext';
import { AttendanceProvider } from './components/context/AttendanceContext';
import { AuthProvider, AuthContext } from './components/context/AuthContext';

import './components/i18n';
import { checkForUpdate } from './checkForUpdate';
import SigninScreen from './components/screens/auth/SigninScreen';
import SignupScreen from './components/screens/auth/SignupScreen';
import VerificationScreen from './components/screens/auth/VerificationScreen';
import LoadingScreen from './components/common/LoadingScreen';

const Stack = createStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Signin" component={SigninScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="Verification" component={VerificationScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={TabNavigation} />  
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LoadingScreen />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const App = () => {
  // useEffect(()=>{
  //   checkForUpdate();
  // },[])

  return (
    <AuthProvider>
      <ClassProvider>
        <MemberProvider>
          <ProgramProvider>
            <AttendanceProvider>
              <AppNavigator />
            </AttendanceProvider>
          </ProgramProvider>
        </MemberProvider>
      </ClassProvider>
    </AuthProvider>
  );
}

export default App;
