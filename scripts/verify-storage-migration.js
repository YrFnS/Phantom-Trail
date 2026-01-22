#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Verification script for StorageManager migration
 */

function findAllTSFiles(dir = './') {
  const files = [];
  
  function scanDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  
  scanDirectory(dir);
  return files;
}

function verifyMigration() {
  console.log('🔍 Verifying StorageManager migration...\n');
  
  const files = findAllTSFiles();
  let issuesFound = 0;
  
  // Check for remaining StorageManager usage
  const storageManagerFiles = [];
  const storageManagerImports = [];
  const storageManagerCalls = [];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for StorageManager imports
      const importMatches = content.match(/import\s*{\s*StorageManager\s*}\s*from/g);
      if (importMatches) {
        storageManagerImports.push({ file, matches: importMatches.length });
      }
      
      // Check for StorageManager method calls
      const callMatches = content.match(/StorageManager\.\w+/g);
      if (callMatches) {
        storageManagerCalls.push({ file, calls: callMatches });
      }
      
      // Check if file contains any StorageManager reference
      if (content.includes('StorageManager')) {
        storageManagerFiles.push(file);
      }
      
    } catch (error) {
      console.warn(`Warning: Could not read ${file}:`, error.message);
    }
  }
  
  // Report findings
  console.log('📊 Migration Verification Results:\n');
  
  if (storageManagerImports.length === 0) {
    console.log('✅ No StorageManager imports found');
  } else {
    console.log('❌ StorageManager imports still exist:');
    storageManagerImports.forEach(({ file, matches }) => {
      console.log(`  - ${file} (${matches} imports)`);
    });
    issuesFound += storageManagerImports.length;
  }
  
  if (storageManagerCalls.length === 0) {
    console.log('✅ No StorageManager method calls found');
  } else {
    console.log('❌ StorageManager method calls still exist:');
    storageManagerCalls.forEach(({ file, calls }) => {
      console.log(`  - ${file}:`);
      calls.forEach(call => console.log(`    * ${call}`));
    });
    issuesFound += storageManagerCalls.length;
  }
  
  // Check for proper storage class imports
  const storageClassUsage = {
    SettingsStorage: 0,
    EventsStorage: 0,
    ReportsStorage: 0,
    BaseStorage: 0,
    SyncStorage: 0
  };
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      Object.keys(storageClassUsage).forEach(className => {
        if (content.includes(className)) {
          storageClassUsage[className]++;
        }
      });
      
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  console.log('\n📈 Storage Class Usage:');
  Object.entries(storageClassUsage).forEach(([className, count]) => {
    console.log(`  - ${className}: ${count} files`);
  });
  
  // Files that still mention StorageManager (excluding the class definition itself)
  const remainingFiles = storageManagerFiles.filter(file => 
    !file.includes('storage-manager.ts') && 
    !file.includes('migrate-storage-manager.js') &&
    !file.includes('STORAGE_MIGRATION_SUMMARY.md')
  );
  
  if (remainingFiles.length > 0) {
    console.log('\n⚠️  Files still mentioning StorageManager:');
    remainingFiles.forEach(file => console.log(`  - ${file}`));
  }
  
  console.log(`\n🎯 Summary:`);
  console.log(`  - Total TypeScript files scanned: ${files.length}`);
  console.log(`  - Issues found: ${issuesFound}`);
  console.log(`  - Migration status: ${issuesFound === 0 ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
  
  if (issuesFound === 0) {
    console.log('\n🎉 Migration verification passed! All StorageManager usage has been successfully replaced.');
  } else {
    console.log('\n🔧 Please address the issues above to complete the migration.');
  }
  
  return issuesFound === 0;
}

// Run verification
if (require.main === module) {
  const success = verifyMigration();
  process.exit(success ? 0 : 1);
}

module.exports = { verifyMigration };