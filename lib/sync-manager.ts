import type { UserTrustedSite } from './types';
import type { PrivacyGoal } from './ai-coaching';
import type { ExportSchedule } from './export-scheduler';

import { BaseStorage } from './storage/base-storage';

export interface SyncSettings {
  enabled: boolean;
  syncPrivacySettings: boolean;
  syncTrustedSites: boolean;
  syncPrivacyGoals: boolean;
  syncExportSchedules: boolean;
  conflictResolution: 'manual' | 'newest-wins' | 'merge';
  lastSyncTime: number;
}

export interface SyncData {
  settings: Record<string, unknown>;
  trustedSites: UserTrustedSite[];
  privacyGoals: PrivacyGoal[];
  exportSchedules: ExportSchedule[];
  version: string;
  deviceId: string;
  timestamp: number;
}

export interface SyncStatus {
  enabled: boolean;
  lastSyncTime: number;
  status: 'idle' | 'syncing' | 'error' | 'success';
  error?: string;
  deviceCount?: number;
}

export interface DataConflict {
  type: 'settings' | 'trusted-sites' | 'goals' | 'schedules';
  localData: unknown;
  remoteData: unknown;
  field: string;
  resolution?: 'local' | 'remote' | 'merge';
}

export interface SyncResult {
  success: boolean;
  conflicts: DataConflict[];
  error?: string;
  syncedDataTypes: string[];
}

const SYNC_VERSION = '1.0.0';
const SYNC_STORAGE_LIMIT = 100 * 1024; // 100KB
const SYNC_DEBOUNCE_DELAY = 2000; // 2 seconds

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export class SyncManager {
  private static deviceId: string | null = null;

  static async getDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;
    
    const deviceId = await BaseStorage.get('deviceId') as string | null;
    if (!deviceId) {
      const newDeviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await BaseStorage.set('deviceId', newDeviceId);
      this.deviceId = newDeviceId;
      return newDeviceId;
    }
    
    this.deviceId = deviceId;
    return deviceId;
  }

  static async getSyncSettings(): Promise<SyncSettings> {
    const settings = await BaseStorage.get('syncSettings') as Partial<SyncSettings> | null;
    const defaultSettings: SyncSettings = {
      enabled: false,
      syncPrivacySettings: true,
      syncTrustedSites: true,
      syncPrivacyGoals: true,
      syncExportSchedules: true,
      conflictResolution: 'newest-wins',
      lastSyncTime: 0
    };
    
    return settings ? { ...defaultSettings, ...settings } : defaultSettings;
  }

  static async setSyncSettings(settings: Partial<SyncSettings>): Promise<void> {
    const currentSettings = await this.getSyncSettings();
    const newSettings = { ...currentSettings, ...settings };
    await BaseStorage.set('syncSettings', newSettings);
  }

  static async enableSync(): Promise<void> {
    await this.setSyncSettings({ enabled: true });
    await this.syncNow();
  }

  static async disableSync(): Promise<void> {
    await this.setSyncSettings({ enabled: false });
    // Clear sync data from chrome.storage.sync
    try {
      await chrome.storage.sync.remove(['phantom-trail-sync', 'sync-timestamp', 'sync-version']);
    } catch (error) {
      console.warn('Failed to clear sync data:', error);
    }
  }

  static async getSyncStatus(): Promise<SyncStatus> {
    const settings = await this.getSyncSettings();
    const status = await BaseStorage.get('syncStatus') as string || 'idle';
    const error = await BaseStorage.get('syncError') as string | undefined;
    
    return {
      enabled: settings.enabled,
      lastSyncTime: settings.lastSyncTime,
      status: status as 'idle' | 'syncing' | 'error' | 'success',
      error,
      deviceCount: await this.getDeviceCount()
    };
  }

  private static async getDeviceCount(): Promise<number> {
    try {
      const syncData = await chrome.storage.sync.get('phantom-trail-devices');
      const devices = syncData['phantom-trail-devices'] || [];
      return devices.length;
    } catch {
      return 1;
    }
  }

  static async syncNow(): Promise<SyncResult> {
    const settings = await this.getSyncSettings();
    if (!settings.enabled) {
      return { success: false, conflicts: [], error: 'Sync is disabled', syncedDataTypes: [] };
    }

    await BaseStorage.set('syncStatus', 'syncing');

    try {
      const localData = await this.collectLocalData();
      const remoteData = await this.getRemoteData();
      
      let conflicts: DataConflict[] = [];
      let syncedData = localData;

      if (remoteData) {
        conflicts = this.detectConflicts(localData, remoteData);
        syncedData = await this.resolveConflicts(localData, remoteData, conflicts, settings.conflictResolution);
      }

      await this.uploadSyncData(syncedData);
      await this.updateDeviceList();
      
      const now = Date.now();
      await this.setSyncSettings({ lastSyncTime: now });
      await BaseStorage.set('syncStatus', 'success');
      await BaseStorage.remove('syncError');

      return {
        success: true,
        conflicts,
        syncedDataTypes: this.getSyncedDataTypes(settings)
      };
    } catch (error) {
      await BaseStorage.set('syncStatus', 'error');
      await BaseStorage.set('syncError', error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        conflicts: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        syncedDataTypes: []
      };
    }
  }

  private static async collectLocalData(): Promise<SyncData> {
    const deviceId = await this.getDeviceId();
    const settings = await this.getSyncSettings();
    
    const data: SyncData = {
      settings: {},
      trustedSites: [],
      privacyGoals: [],
      exportSchedules: [],
      version: SYNC_VERSION,
      deviceId,
      timestamp: Date.now()
    };

    if (settings.syncPrivacySettings) {
      data.settings = await BaseStorage.get('extensionSettings') || {};
    }

    if (settings.syncTrustedSites) {
      data.trustedSites = await BaseStorage.get('trustedSites') || [];
    }

    if (settings.syncPrivacyGoals) {
      data.privacyGoals = await BaseStorage.get('privacyGoals') || [];
    }

    if (settings.syncExportSchedules) {
      data.exportSchedules = await BaseStorage.get('exportSchedules') || [];
    }

    return data;
  }

  private static async getRemoteData(): Promise<SyncData | null> {
    try {
      const result = await chrome.storage.sync.get(['phantom-trail-sync']);
      const syncData = result['phantom-trail-sync'];
      return syncData ? JSON.parse(syncData) : null;
    } catch {
      return null;
    }
  }

  private static detectConflicts(localData: SyncData, remoteData: SyncData): DataConflict[] {
    const conflicts: DataConflict[] = [];

    // Compare timestamps for simple conflict detection
    if (localData.timestamp !== remoteData.timestamp) {
      if (JSON.stringify(localData.settings) !== JSON.stringify(remoteData.settings)) {
        conflicts.push({
          type: 'settings',
          localData: localData.settings,
          remoteData: remoteData.settings,
          field: 'settings'
        });
      }

      if (JSON.stringify(localData.trustedSites) !== JSON.stringify(remoteData.trustedSites)) {
        conflicts.push({
          type: 'trusted-sites',
          localData: localData.trustedSites,
          remoteData: remoteData.trustedSites,
          field: 'trustedSites'
        });
      }
    }

    return conflicts;
  }

  private static async resolveConflicts(
    localData: SyncData,
    remoteData: SyncData,
    conflicts: DataConflict[],
    strategy: 'manual' | 'newest-wins' | 'merge'
  ): Promise<SyncData> {
    if (conflicts.length === 0) return localData;

    switch (strategy) {
      case 'newest-wins':
        return localData.timestamp > remoteData.timestamp ? localData : remoteData;
      
      case 'merge':
        return this.mergeData(localData, remoteData);
      
      case 'manual':
        // For now, default to newest wins - manual resolution would need UI
        return localData.timestamp > remoteData.timestamp ? localData : remoteData;
      
      default:
        return localData;
    }
  }

  private static mergeData(localData: SyncData, remoteData: SyncData): SyncData {
    return {
      ...localData,
      settings: { ...remoteData.settings, ...localData.settings },
      trustedSites: this.mergeTrustedSites(localData.trustedSites, remoteData.trustedSites),
      privacyGoals: [...remoteData.privacyGoals, ...localData.privacyGoals],
      exportSchedules: [...remoteData.exportSchedules, ...localData.exportSchedules],
      timestamp: Math.max(localData.timestamp, remoteData.timestamp)
    };
  }

  private static mergeTrustedSites(local: UserTrustedSite[], remote: UserTrustedSite[]): UserTrustedSite[] {
    const merged = [...remote];
    const remoteDomains = new Set(remote.map(site => site.domain));
    
    for (const localSite of local) {
      if (!remoteDomains.has(localSite.domain)) {
        merged.push(localSite);
      }
    }
    
    return merged;
  }

  private static async uploadSyncData(data: SyncData): Promise<void> {
    const serialized = JSON.stringify(data);
    
    if (serialized.length > SYNC_STORAGE_LIMIT) {
      throw new Error('Sync data exceeds storage limit');
    }

    await chrome.storage.sync.set({
      'phantom-trail-sync': serialized,
      'sync-timestamp': data.timestamp,
      'sync-version': SYNC_VERSION
    });
  }

  private static async updateDeviceList(): Promise<void> {
    const deviceId = await this.getDeviceId();
    const devices = await chrome.storage.sync.get('phantom-trail-devices');
    const deviceList = devices['phantom-trail-devices'] || [];
    
    if (!deviceList.includes(deviceId)) {
      deviceList.push(deviceId);
      await chrome.storage.sync.set({ 'phantom-trail-devices': deviceList });
    }
  }

  private static getSyncedDataTypes(settings: SyncSettings): string[] {
    const types: string[] = [];
    if (settings.syncPrivacySettings) types.push('settings');
    if (settings.syncTrustedSites) types.push('trusted-sites');
    if (settings.syncPrivacyGoals) types.push('privacy-goals');
    if (settings.syncExportSchedules) types.push('export-schedules');
    return types;
  }

  static async exportSyncData(): Promise<SyncData> {
    return await this.collectLocalData();
  }

  static async importSyncData(data: SyncData): Promise<void> {
    const settings = await this.getSyncSettings();
    
    if (settings.syncPrivacySettings && data.settings) {
      await BaseStorage.set('extensionSettings', data.settings);
    }
    
    if (settings.syncTrustedSites && data.trustedSites) {
      await BaseStorage.set('trustedSites', data.trustedSites);
    }
    
    if (settings.syncPrivacyGoals && data.privacyGoals) {
      await BaseStorage.set('privacyGoals', data.privacyGoals);
    }
    
    if (settings.syncExportSchedules && data.exportSchedules) {
      await BaseStorage.set('exportSchedules', data.exportSchedules);
    }
  }
}

// Auto-sync triggers
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.local.onChanged.addListener(async () => {
    const syncSettings = await SyncManager.getSyncSettings();
    if (!syncSettings.enabled) return;
    
    // Debounce sync operations
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
      await SyncManager.syncNow();
    }, SYNC_DEBOUNCE_DELAY);
  });

  if (chrome.runtime && chrome.runtime.onStartup) {
    chrome.runtime.onStartup.addListener(async () => {
      const syncSettings = await SyncManager.getSyncSettings();
      if (syncSettings.enabled) {
        await SyncManager.syncNow();
      }
    });
  }
}
