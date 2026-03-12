#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Health Monitoring App - Setup Verification');
console.log('==============================================\n');

let allChecksPass = true;

// Check 1: Required files
console.log('1. Checking project structure...');
const requiredFiles = [
  'package.json',
  'App.tsx',
  'services/database.ts',
  'services/supabase.ts',
  'services/sync.ts',
  'services/ai.ts',
  'services/camera.ts',
  'services/i18n.ts',
  'screens/LoginScreen.tsx',
  'screens/HomeScreen.tsx',
  'screens/PatientRegistrationScreen.tsx',
  'screens/HealthDataScreen.tsx',
  'context/AuthContext.tsx'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allChecksPass = false;
  }
});

// Check 2: Package.json dependencies
console.log('\n2. Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'expo',
    'react',
    'react-native',
    '@supabase/supabase-js',
    'expo-sqlite',
    'expo-camera',
    'i18next',
    'react-i18next',
    '@react-navigation/native',
    'react-native-paper'
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      console.log(`   ✅ ${dep}`);
    } else {
      console.log(`   ❌ ${dep} - MISSING`);
      allChecksPass = false;
    }
  });
} catch (error) {
  console.log('   ❌ Error reading package.json');
  allChecksPass = false;
}

// Check 3: Configuration files
console.log('\n3. Checking configuration...');
if (fs.existsSync('.env')) {
  console.log('   ✅ .env file exists');
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    if (envContent.includes('YOUR_SUPABASE_URL')) {
      console.log('   ⚠️  .env contains placeholder values - update with real credentials');
    } else {
      console.log('   ✅ .env appears to be configured');
    }
  } catch (error) {
    console.log('   ⚠️  Could not read .env file');
  }
} else {
  console.log('   ⚠️  .env file missing - copy from .env.example');
}

if (fs.existsSync('app.json')) {
  console.log('   ✅ app.json exists');
} else {
  console.log('   ❌ app.json missing');
  allChecksPass = false;
}

// Check 4: TypeScript configuration
console.log('\n4. Checking TypeScript setup...');
if (fs.existsSync('tsconfig.json')) {
  console.log('   ✅ tsconfig.json exists');
} else {
  console.log('   ❌ tsconfig.json missing');
  allChecksPass = false;
}

// Check 5: Node modules
console.log('\n5. Checking dependencies...');
if (fs.existsSync('node_modules')) {
  console.log('   ✅ node_modules directory exists');
  
  // Check for key packages
  const keyPackages = ['expo', 'react', 'react-native'];
  keyPackages.forEach(pkg => {
    if (fs.existsSync(`node_modules/${pkg}`)) {
      console.log(`   ✅ ${pkg} installed`);
    } else {
      console.log(`   ❌ ${pkg} not installed`);
      allChecksPass = false;
    }
  });
} else {
  console.log('   ❌ node_modules missing - run "npm install"');
  allChecksPass = false;
}

// Summary
console.log('\n' + '='.repeat(50));
if (allChecksPass) {
  console.log('🎉 All checks passed! Your setup looks good.');
  console.log('\n📋 Ready to start development:');
  console.log('   1. Update .env with your credentials');
  console.log('   2. Run "npm start" to start development server');
  console.log('   3. Use Expo Go app or emulator to test');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  console.log('\n🔧 Common fixes:');
  console.log('   • Run "npm install" to install dependencies');
  console.log('   • Copy .env.example to .env and configure');
  console.log('   • Ensure all required files are present');
}

console.log('\n📚 For help, see README.md or run "node setup.js"');

process.exit(allChecksPass ? 0 : 1);