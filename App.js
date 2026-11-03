import 'react-native-gesture-handler';

import React, { useContext } from 'react';
import { View } from "react-native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabNavigation from './components/tabNavigation';

import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import AppTheme from './components/theme/appTheme';
import { createStackNavigator } from '@react-navigation/stack';
import { ClassProvider } from './components/context/ClassContext';
import { MemberProvider } from './components/context/MemberContext';
import { ProgramProvider } from './components/context/ProgramContext';
import { AttendanceProvider } from './components/context/AttendanceContext';
import { AuthProvider, AuthContext } from './components/context/AuthContext';
import { OrganizationProvider } from './components/context/OrganizationContext';

import './components/i18n';
import { checkForUpdate } from './checkForUpdate';
import SigninScreen from './components/screens/auth/SigninScreen';
import SignupScreen from './components/screens/auth/SignupScreen';
import VerificationScreen from './components/screens/auth/VerificationScreen';
import LoadingScreen from './components/common/LoadingScreen';

const Stack = createStackNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: AppTheme.background,
  },
};

const authScreenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: AppTheme.background },
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={authScreenOptions}>
    <Stack.Screen name="Signin" component={SigninScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="Verification" component={VerificationScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator initialRouteName="Home" screenOptions={authScreenOptions}>
    <Stack.Screen name="Home" component={TabNavigation} />  
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0f24' }}>
        <LoadingScreen backgroundColor="#0a0f24" color="#ffcc00" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const App = () => {
  // useEffect(()=>{
  //   checkForUpdate();
  // },[])

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OrganizationProvider>
          <ClassProvider>
            <MemberProvider>
              <ProgramProvider>
                <AttendanceProvider>
                  <AppNavigator />
                </AttendanceProvider>
              </ProgramProvider>
            </MemberProvider>
          </ClassProvider>
        </OrganizationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
