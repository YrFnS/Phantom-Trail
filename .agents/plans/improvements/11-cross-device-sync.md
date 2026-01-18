# Cross-Device Sync Implementation Plan

## Overview
Add Chrome storage sync functionality to synchronize privacy settings, trusted sites, and privacy data across all user devices where the extension is installed.

## Technical Requirements

### Chrome Permissions
```json
// manifest.json - no additional permissions needed
// chrome.storage.sync is available with existing "storage" permission
```

### Implementation Files
- `lib/sync-manager.ts` - Cross-device synchronization logic
- `lib/storage-manager.ts` - Enhanced with sync capabilities
- `components/Settings/SyncSettings.tsx` - Sync configuration UI
- `lib/conflict-resolver.ts` - Data conflict resolution logic

## Core Implementation

### 1. Sync Manager (`lib/sync-manager.ts`)
```typescript
export class SyncManager {
  static async enableSync(): Promise<void>
  static async disableSync(): Promise<void>
  static async syncNow(): Promise<SyncResult>
  static async getSyncStatus(): Promise<SyncStatus>
  static async resolveConflicts(conflicts: DataConflict[]): Promise<void>
  static async exportSyncData(): Promise<SyncData>
  static async importSyncData(data: SyncData): Promise<void>
}
```

### 2. Sync Configuration
```typescript
interface SyncSettings {
  enabled: boolean;
  syncPrivacySettings: boolean;
  syncTrustedSites: boolean;
  syncPrivacyGoals: boolean;
  syncExportSchedules: boolean;
  conflictResolution: 'manual' | 'newest-wins' | 'merge';
  lastSyncTime: number;
}

interface SyncData {
  settings: ExtensionSettings;
  trustedSites: TrustedSite[];
  privacyGoals: PrivacyGoal[];
  exportSchedules: ExportSchedule[];
  version: string;
  deviceId: string;
  timestamp: number;
}
```

### 3. Conflict Resolution System
```typescript
interface DataConflict {
  type: 'settings' | 'trusted-sites' | 'goals' | 'schedules';
  localData: any;
  remoteData: any;
  field: string;
  resolution?: 'local' | 'remote' | 'merge';
}
```

## Implementation Steps

### Phase 1: Basic Sync Infrastructure (45 minutes)
1. Create SyncManager with Chrome storage.sync integration
2. Implement data serialization and deserialization
3. Add sync enable/disable functionality with user consent
4. Create basic conflict detection and resolution

### Phase 2: Selective Sync Features (30 minutes)
1. Add granular sync controls for different data types
2. Implement intelligent conflict resolution strategies
3. Create sync status monitoring and error handling
4. Add manual sync trigger and automatic sync scheduling

### Phase 3: Advanced Sync Features (15 minutes)
1. Add device identification and sync history
2. Implement data compression for large sync payloads
3. Create sync data export/import for backup purposes
4. Add sync analytics and usage statistics

## User Experience

### Sync Setup Flow
1. **Initial Setup**: "Sync your privacy settings across devices?"
2. **Data Selection**: Choose what to sync (settings, trusted sites, goals)
3. **Conflict Resolution**: Choose how to handle data conflicts
4. **Confirmation**: "Sync enabled - your data will be available on all devices"

### Sync Status Indicators
- **Sync Status**: "Last synced 5 minutes ago" / "Sync in progress"
- **Conflict Alerts**: "Data conflicts detected - review needed"
- **Device List**: "Synced across 3 devices: Desktop, Laptop, Phone"
- **Data Usage**: "Using 2.3KB of 100KB sync storage"

## Technical Implementation

### 1. Chrome Storage Sync Integration
```typescript
async function syncToCloud(data: SyncData): Promise<void> {
  try {
    // Chrome sync storage has 100KB limit, compress if needed
    const compressedData = await compressData(data);
    
    if (compressedData.size > SYNC_STORAGE_LIMIT) {
      throw new Error('Sync data exceeds storage limit');
    }
    
    await chrome.storage.sync.set({
      'phantom-trail-sync': compressedData,
      'sync-timestamp': Date.now(),
      'sync-version': SYNC_VERSION
    });
    
    await updateSyncStatus('success', Date.now());
  } catch (error) {
    await updateSyncStatus('error', Date.now(), error.message);
    throw error;
  }
}
```

### 2. Conflict Resolution Logic
```typescript
function detectConflicts(localData: SyncData, remoteData: SyncData): DataConflict[] {
  const conflicts: DataConflict[] = [];
  
  // Compare settings
  if (localData.settings.lastModified !== remoteData.settings.lastModified) {
    conflicts.push({
      type: 'settings',
      localData: localData.settings,
      remoteData: remoteData.settings,
      field: 'settings'
    });
  }
  
  // Compare trusted sites
  const localSites = new Set(localData.trustedSites.map(s => s.domain));
  const remoteSites = new Set(remoteData.trustedSites.map(s => s.domain));
  
  if (!setsEqual(localSites, remoteSites)) {
    conflicts.push({
      type: 'trusted-sites',
      localData: localData.trustedSites,
      remoteData: remoteData.trustedSites,
      field: 'trustedSites'
    });
  }
  
  return conflicts;
}
```

### 3. Automatic Sync Triggers
```typescript
// Sync when data changes
chrome.storage.local.onChanged.addListener(async (changes) => {
  const syncSettings = await SyncManager.getSyncSettings();
  if (!syncSettings.enabled) return;
  
  // Debounce sync operations
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    await SyncManager.syncNow();
  }, SYNC_DEBOUNCE_DELAY);
});

// Sync on extension startup
chrome.runtime.onStartup.addListener(async () => {
  const syncSettings = await SyncManager.getSyncSettings();
  if (syncSettings.enabled) {
    await SyncManager.syncNow();
  }
});
```

## Sync Data Categories

### Always Synced (Core Settings)
1. **Extension Settings**: Theme, notifications, AI preferences
2. **Privacy Preferences**: Scoring algorithms, risk thresholds
3. **UI Preferences**: Default views, layout settings

### Optionally Synced (User Choice)
1. **Trusted Sites**: User-defined trusted domains and trust levels
2. **Privacy Goals**: Personal privacy objectives and progress
3. **Export Schedules**: Automated export configurations
4. **Custom Prompts**: User-created AI analysis prompts

### Never Synced (Privacy Protection)
1. **Tracking Events**: Raw browsing and tracking data
2. **Privacy Scores**: Site-specific privacy calculations
3. **Chat History**: AI conversation history
4. **API Keys**: OpenRouter and other service credentials

## Conflict Resolution Strategies

### Automatic Resolution
1. **Newest Wins**: Use data with most recent timestamp
2. **Merge Strategy**: Combine non-conflicting changes
3. **Local Priority**: Prefer local data when in doubt
4. **Remote Priority**: Prefer cloud data when in doubt

### Manual Resolution
- **Side-by-Side Comparison**: Show local vs remote data
- **Field-Level Selection**: Choose specific fields to keep
- **Preview Changes**: Show what will change before applying
- **Backup Creation**: Save current state before resolving

## Integration Points

### Settings Integration
- Add "Sync" section to main settings page
- Include sync status and last sync time
- Provide granular sync controls for data types
- Add conflict resolution preferences

### Storage Manager Enhancement
- Extend existing StorageManager with sync capabilities
- Add sync-aware data operations
- Implement automatic sync triggers
- Handle sync failures gracefully

### Privacy Protection
- Encrypt sensitive data before syncing
- Exclude privacy-sensitive information from sync
- Provide clear disclosure of what data is synced
- Allow users to opt out of specific data types

## Storage Optimization

### Data Compression
```typescript
async function compressData(data: SyncData): Promise<CompressedData> {
  // Remove redundant data
  const optimized = {
    ...data,
    trustedSites: data.trustedSites.map(site => ({
      domain: site.domain,
      trustLevel: site.trustLevel,
      // Exclude verbose fields like 'reason'
    }))
  };
  
  // JSON compression
  return {
    data: JSON.stringify(optimized),
    size: JSON.stringify(optimized).length,
    compressed: true
  };
}
```

### Storage Limits Management
- Chrome sync storage limit: 100KB total
- Individual item limit: 8KB
- Quota management and usage monitoring
- Automatic cleanup of old sync data

## Testing Strategy

### Sync Functionality Testing
1. Test sync across multiple browser profiles
2. Verify data integrity after sync operations
3. Test conflict detection and resolution accuracy
4. Validate sync performance with large datasets

### Conflict Resolution Testing
- Create intentional conflicts and test resolution
- Verify manual conflict resolution interface
- Test automatic resolution strategies
- Validate data consistency after resolution

### Error Handling Testing
- Test behavior when sync storage is full
- Verify graceful handling of network failures
- Test sync recovery after browser crashes
- Validate error messages and user guidance

## Success Metrics
- Users successfully sync settings across multiple devices
- Conflict resolution maintains data integrity
- Sync operations complete within 5 seconds
- User satisfaction with cross-device experience exceeds 80%

## Estimated Time: 1.5 hours
- Phase 1: 45 minutes (basic sync infrastructure)
- Phase 2: 30 minutes (selective sync features)
- Phase 3: 15 minutes (advanced sync features)

## Future Enhancements
- End-to-end encryption for synced data
- Selective device sync (exclude specific devices)
- Sync analytics and usage insights
- Integration with external cloud storage services
