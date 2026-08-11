import {
  DataProtectionStorage,
  type StorageInventory,
} from './storage/data-protection-storage';

export const CLEAR_ALL_CONFIRMATION_PHRASE = 'DELETE PHANTOM TRAIL DATA';

export interface StorageAreaDeletionResult {
  area: 'local' | 'session' | 'sync';
  cleared: boolean;
  keysBefore: number;
  bytesBefore: number | null;
  error?: string;
}

export interface DataDeletionReport {
  startedAt: number;
  completedAt: number;
  success: boolean;
  storage: StorageAreaDeletionResult[];
  alarmsCleared: number;
  badgeCleared: boolean;
  peerSessionDisconnected: boolean;
  optionalManagementPermissionRevoked: boolean;
  limitations: string[];
}

/**
 * Complete, user-confirmed deletion of data controlled by this extension.
 */
export class DataDeletionService {
  static async getInventory(): Promise<StorageInventory> {
    return DataProtectionStorage.getStorageInventory();
  }

  static async clearAllData(
    confirmationPhrase: string
  ): Promise<DataDeletionReport> {
    if (confirmationPhrase.trim() !== CLEAR_ALL_CONFIRMATION_PHRASE) {
      throw new Error('The deletion confirmation phrase does not match.');
    }

    const startedAt = Date.now();
    const inventory = await this.getInventory();
    let peerSessionDisconnected = false;
    let badgeCleared = false;
    let alarmsCleared = 0;
    let optionalManagementPermissionRevoked = false;

    try {
      const { P2PPrivacyNetwork } = await import('./p2p-privacy-network');
      await P2PPrivacyNetwork.getInstance().disconnectFromNetwork();
      peerSessionDisconnected = true;
    } catch (error) {
      console.warn('Failed to disconnect the peer session during deletion:', error);
    }

    try {
      const { BadgeManager } = await import('./badge-manager');
      await BadgeManager.clearAllBadges();
      badgeCleared = true;
    } catch (error) {
      console.warn('Failed to clear toolbar badge state during deletion:', error);
    }

    try {
      const alarms = await chrome.alarms.getAll();
      const cleared = await chrome.alarms.clearAll();
      alarmsCleared = cleared ? alarms.length : 0;
    } catch (error) {
      console.warn('Failed to clear extension alarms during deletion:', error);
    }

    try {
      const granted = await chrome.permissions.contains({
        permissions: ['management'],
      });
      if (granted) {
        optionalManagementPermissionRevoked = await chrome.permissions.remove({
          permissions: ['management'],
        });
      }
    } catch {
      // Optional permission may not exist in older test/browser contexts.
    }

    const storage = await Promise.all(
      inventory.areas.map(area => this.clearArea(area.area, area))
    );
    const success = storage.every(area => area.cleared);

    return {
      startedAt,
      completedAt: Date.now(),
      success,
      storage,
      alarmsCleared,
      badgeCleared,
      peerSessionDisconnected,
      optionalManagementPermissionRevoked,
      limitations: [
        'Downloaded exports are separate files and were not deleted.',
        'Data already sent to OpenRouter or peers cannot be recalled by this extension.',
        'Browser-profile backups and copies held by third parties are outside this deletion operation.',
      ],
    };
  }

  private static async clearArea(
    areaName: StorageAreaDeletionResult['area'],
    inventory: StorageInventory['areas'][number]
  ): Promise<StorageAreaDeletionResult> {
    const storageArea =
      areaName === 'local'
        ? chrome.storage.local
        : areaName === 'session'
          ? chrome.storage.session
          : chrome.storage.sync;

    if (!storageArea || !inventory.available) {
      return {
        area: areaName,
        cleared: true,
        keysBefore: inventory.keyCount,
        bytesBefore: inventory.bytesInUse,
      };
    }

    try {
      await storageArea.clear();
      return {
        area: areaName,
        cleared: true,
        keysBefore: inventory.keyCount,
        bytesBefore: inventory.bytesInUse,
      };
    } catch (error) {
      return {
        area: areaName,
        cleared: false,
        keysBefore: inventory.keyCount,
        bytesBefore: inventory.bytesInUse,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
