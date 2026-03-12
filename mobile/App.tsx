import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { AppRegistry, View, Text, StyleSheet, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import PatientRegistrationScreen from './screens/PatientRegistrationScreen';
import HealthDataScreen from './screens/HealthDataScreen';
import SurveyScreen from './screens/SurveyScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { initializeDatabase, insertTemplate } from './services/database';
import { initializeI18n } from './services/i18n';
import { seedSystemTemplates } from './services/systemTemplates';
import { initializeSync, syncFromServer, checkConnectivity } from './services/sync';
import OnboardingScreen from './components/OnboardingScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="PatientRegistration" component={PatientRegistrationScreen} />
            <Stack.Screen name="HealthData" component={HealthDataScreen} />
            <Stack.Screen name="Survey" component={SurveyScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function LoadingScreen() {
  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <Text style={styles.loadingIcon}>🏥</Text>
        <Text style={styles.loadingTitle}>Health Monitor</Text>
        <Text style={styles.loadingSubtitle}>Field Data Collection System</Text>
        <ActivityIndicator size="large" color="#fff" style={styles.spinner} />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    </LinearGradient>
  );
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Health Monitor App - Starting initialization...');
        console.log('🔧 Debug mode:', __DEV__ ? 'ENABLED' : 'DISABLED');
        
        // Initialize i18n first
        await initializeI18n();
        console.log('✅ i18n initialized successfully!');
        
        // Initialize SQLite database
        await initializeDatabase();
        console.log('✅ Database initialized successfully!');
        
        // Initialize sync service (this will sync from server automatically)
        await initializeSync();
        console.log('✅ Sync service initialized!');
        
        // Check if onboarding has been seen
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
        setShowOnboarding(hasSeenOnboarding !== 'true');
        
        setIsInitialized(true);
        console.log('✅ App initialization completed successfully!');
        
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setIsInitialized(true); // Still show the app even if init fails
      }
    };
    initializeApp();
  }, []);

  // Sync when app comes to foreground (user-triggered, not automatic polling)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App came to foreground');
        // Sync is now manual via button - no automatic sync here
      }
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState]);

  if (!isInitialized) {
    console.log('⏳ App loading...');
    return <LoadingScreen />;
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  console.log('📱 App ready - rendering main interface');
  return (
    <PaperProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AuthProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    padding: 40,
    alignItems: 'center',
  },
  loadingIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 30,
  },
  spinner: {
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
  },
});

// Register the main component
AppRegistry.registerComponent('main', () => App);

export default App;