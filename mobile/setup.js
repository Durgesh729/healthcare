#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🏥 Health Monitoring Mobile App Setup');
console.log('=====================================\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'App.tsx',
  'services/database.ts',
  'services/supabase.ts',
  'services/sync.ts',
  'services/ai.ts',
  'services/camera.ts',
  'services/i18n.ts'
];

console.log('✅ Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`   ✓ ${file}`);
  } else {
    console.log(`   ✗ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please ensure all files are created.');
  process.exit(1);
}

console.log('\n📋 Setup Checklist:');
console.log('==================');
console.log('1. ✓ Project structure created');
console.log('2. ⚠️  Update Supabase configuration in services/supabase.ts');
console.log('3. ⚠️  Add your Grok API key in services/ai.ts');
console.log('4. ⚠️  Install dependencies: npm install');
console.log('5. ⚠️  Start development server: npm start');

console.log('\n🔧 Configuration Required:');
console.log('=========================');
console.log('• Supabase URL and anon key');
console.log('• Grok API key from https://x.ai/');
console.log('• Ensure database schema is deployed (see ../dbschema.sql)');

console.log('\n🚀 Ready to start development!');
console.log('Run "npm install" then "npm start" to begin.');