#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Method mappings to specific storage classes
const METHOD_MAPPINGS = {
  // SettingsStorage methods
  getSettings: 'SettingsStorage',
  saveSettings: 'SettingsStorage',
  initializeDefaults: 'SettingsStorage',

  // EventsStorage methods
  getRecentEvents: 'EventsStorage',
  addEvent: 'EventsStorage',
  addTrackingEvent: 'EventsStorage',
  getTrackingEvents: 'EventsStorage',
  setTrackingEvents: 'EventsStorage',
  cleanupOldEvents: 'EventsStorage',
  clearEvents: 'EventsStorage',
  getEventsByDateRange: 'EventsStorage',

  // ReportsStorage methods
  storeDailySnapshot: 'ReportsStorage',
  getDailySnapshots: 'ReportsStorage',
  storeWeeklyReport: 'ReportsStorage',
  getWeeklyReports: 'ReportsStorage',
  migrateAndCleanData: 'ReportsStorage',

  // BaseStorage methods
  get: 'BaseStorage',
  set: 'BaseStorage',
  remove: 'BaseStorage',
  getMultiple: 'BaseStorage',
  setMultiple: 'BaseStorage',
  getAllData: 'BaseStorage',
  getStorageInfo: 'BaseStorage',

  // SyncStorage methods
  getSyncableData: 'SyncStorage',
  setSyncableData: 'SyncStorage',
  isSyncableKey: 'SyncStorage',
  getNonSyncableKeys: 'SyncStorage',
  getSessionData: 'SyncStorage',
  setSessionData: 'SyncStorage',
};

// Storage class import paths (relative to project root)
const STORAGE_IMPORTS = {
  SettingsStorage: './lib/storage/settings-storage',
  EventsStorage: './lib/storage/events-storage',
  ReportsStorage: './lib/storage/reports-storage',
  BaseStorage: './lib/storage/base-storage',
  SyncStorage: './lib/storage/sync-storage',
};

/**
 * Find all TypeScript files that contain StorageManager
 */
function findFilesWithStorageManager() {
  const files = [];

  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (
        entry.isDirectory() &&
        entry.name !== 'node_modules' &&
        !entry.name.startsWith('.')
      ) {
        scanDirectory(fullPath);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))
      ) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('StorageManager')) {
            files.push(fullPath);
          }
        } catch (error) {
          console.warn(`Warning: Could not read ${fullPath}:`, error.message);
        }
      }
    }
  }

  scanDirectory('./');
  return files;
}

/**
 * Analyze which storage classes are needed based on method usage
 */
function analyzeMethodUsage(content) {
  const usedClasses = new Set();

  // Find all StorageManager method calls
  const methodCallRegex = /StorageManager\.(\w+)/g;
  let match;

  while ((match = methodCallRegex.exec(content)) !== null) {
    const methodName = match[1];
    const storageClass = METHOD_MAPPINGS[methodName];

    if (storageClass) {
      usedClasses.add(storageClass);
    } else {
      console.warn(`Unknown StorageManager method: ${methodName}`);
    }
  }

  return Array.from(usedClasses);
}

/**
 * Calculate relative import path
 */
function getRelativeImportPath(fromFile, toPath) {
  const fromDir = path.dirname(fromFile);
  const relativePath = path.relative(fromDir, toPath);

  // Normalize path separators for cross-platform compatibility
  const normalizedPath = relativePath.replace(/\\/g, '/');

  // Ensure it starts with ./ or ../
  if (!normalizedPath.startsWith('.')) {
    return './' + normalizedPath;
  }

  return normalizedPath;
}

/**
 * Generate import statements for required storage classes
 */
function generateImports(filePath, requiredClasses) {
  const imports = [];

  for (const className of requiredClasses) {
    const importPath = STORAGE_IMPORTS[className];
    const relativePath = getRelativeImportPath(filePath, importPath);
    imports.push(`import { ${className} } from '${relativePath}';`);
  }

  return imports;
}

/**
 * Replace StorageManager method calls with specific storage class calls
 */
function replaceMethodCalls(content) {
  return content.replace(/StorageManager\.(\w+)/g, (match, methodName) => {
    const storageClass = METHOD_MAPPINGS[methodName];
    if (storageClass) {
      return `${storageClass}.${methodName}`;
    }
    return match; // Keep unchanged if no mapping found
  });
}

/**
 * Update imports in file content
 */
function updateImports(content, filePath, requiredClasses) {
  // Remove existing StorageManager import
  const storageManagerImportRegex =
    /import\s*{\s*StorageManager\s*}\s*from\s*['"][^'"]*['"];\s*\n?/g;
  content = content.replace(storageManagerImportRegex, '');

  // Find the position to insert new imports (after existing imports)
  const importRegex = /^import\s+.*?from\s+['"][^'"]*['"];?\s*$/gm;
  const imports = content.match(importRegex) || [];

  if (imports.length > 0) {
    // Find the last import statement
    const lastImportMatch = [...content.matchAll(importRegex)];
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const insertPosition = lastImport.index + lastImport[0].length;

    // Generate new import statements
    const newImports = generateImports(filePath, requiredClasses);
    const importString = newImports.join('\n') + '\n';

    // Insert new imports after the last existing import
    content =
      content.slice(0, insertPosition) +
      '\n' +
      importString +
      content.slice(insertPosition);
  } else {
    // No existing imports, add at the beginning
    const newImports = generateImports(filePath, requiredClasses);
    const importString = newImports.join('\n') + '\n\n';
    content = importString + content;
  }

  return content;
}

/**
 * Migrate a single file
 */
function migrateFile(filePath) {
  console.log(`Migrating: ${filePath}`);

  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');

    // Skip if file doesn't contain StorageManager
    if (!originalContent.includes('StorageManager')) {
      console.log(`  Skipped: No StorageManager usage found`);
      return;
    }

    // Analyze which storage classes are needed
    const requiredClasses = analyzeMethodUsage(originalContent);

    if (requiredClasses.length === 0) {
      console.log(`  Skipped: No recognized StorageManager methods found`);
      return;
    }

    console.log(`  Required classes: ${requiredClasses.join(', ')}`);

    // Replace method calls
    let newContent = replaceMethodCalls(originalContent);

    // Update imports
    newContent = updateImports(newContent, filePath, requiredClasses);

    // Write the updated content
    fs.writeFileSync(filePath, newContent, 'utf8');

    console.log(`  ✓ Successfully migrated`);
  } catch (error) {
    console.error(`  ✗ Error migrating ${filePath}:`, error.message);
  }
}

/**
 * Main migration function
 */
function main() {
  console.log('🔄 Starting StorageManager migration...\n');

  // Find all files that use StorageManager
  const files = findFilesWithStorageManager();

  if (files.length === 0) {
    console.log('No files found with StorageManager usage.');
    return;
  }

  console.log(`Found ${files.length} files to migrate:\n`);

  // Migrate each file
  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      migrateFile(file);
      successCount++;
    } catch (error) {
      console.error(`Failed to migrate ${file}:`, error.message);
      errorCount++;
    }
    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📊 Migration Summary:');
  console.log(`  ✓ Successfully migrated: ${successCount} files`);
  console.log(`  ✗ Failed to migrate: ${errorCount} files`);

  if (successCount > 0) {
    console.log(
      '\n🎉 Migration completed! Please review the changes and test your application.'
    );
    console.log('\n📝 Next steps:');
    console.log('  1. Run: pnpm lint');
    console.log('  2. Run: pnpm build');
    console.log('  3. Test the application functionality');
    console.log('  4. Consider removing the deprecated StorageManager class');
  }
}

// Run the migration
if (require.main === module) {
  main();
}

module.exports = { main, migrateFile, analyzeMethodUsage };
