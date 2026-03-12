module.exports = function (api) {
  api.cache(true);
  
  const plugins = [];
  
  // Only add reanimated plugin if it's installed
  try {
    require.resolve('react-native-reanimated/plugin');
    plugins.push('react-native-reanimated/plugin');
  } catch (e) {
    console.warn('react-native-reanimated/plugin not found, skipping...');
  }
  
  // Add module resolver if available
  try {
    require.resolve('babel-plugin-module-resolver');
    plugins.push([
      'module-resolver',
      {
        alias: {
          '@': './src',
        },
      },
    ]);
  } catch (e) {
    console.warn('babel-plugin-module-resolver not found, skipping...');
  }

  return {
    presets: ['babel-preset-expo'],
    plugins: plugins,
  };
};