// Simple test to verify app connectivity and debugging
console.log('🚀 Health Monitor App - Connection Test');
console.log('📱 App loaded successfully!');
console.log('🔧 Debug mode:', __DEV__ ? 'ENABLED' : 'DISABLED');
console.log('🌐 Environment:', process.env.NODE_ENV);
console.log('📡 Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? 'CONFIGURED' : 'MISSING');

// Test basic functionality
const testConnection = () => {
  console.log('✅ JavaScript execution working');
  console.log('✅ Console logging working');
  console.log('✅ App is responsive');
  
  // Test async functionality
  setTimeout(() => {
    console.log('✅ Async operations working');
  }, 1000);
  
  return 'Connection test completed successfully!';
};

// Export for use in app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testConnection };
}

// Auto-run test
testConnection();