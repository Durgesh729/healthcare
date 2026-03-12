// Expo configuration to bypass login requirements
const { getDefaultConfig } = require('expo/metro-config');

// Set environment variables to bypass login
process.env.EXPO_NO_ACCOUNT_PROMPT = '1';
process.env.EXPO_OFFLINE = '1';

const config = getDefaultConfig(__dirname);

// Configure for offline/anonymous usage
config.resolver.platforms = ['native', 'android', 'ios', 'web'];
config.resolver.alias = {
  'react-native': require.resolve('react-native'),
};

module.exports = config;