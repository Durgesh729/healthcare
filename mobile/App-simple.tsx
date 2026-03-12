import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Simple test component to verify app loads without TurboModule errors
function SimpleApp() {
  const [status, setStatus] = useState('Loading...');

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('🚀 Simple Health Monitor App - Starting...');
        
        // Basic initialization without complex dependencies
        setTimeout(() => {
          setStatus('App loaded successfully!');
          console.log('✅ App initialization completed');
        }, 1000);
        
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };
    
    initApp();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Health Monitor</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.instructions}>
        If you see this screen, the TurboModule error is fixed!
      </Text>
      <Text style={styles.next}>
        Next: Switch back to full App.tsx
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2196F3',
  },
  status: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#4CAF50',
  },
  next: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
});

export default SimpleApp;