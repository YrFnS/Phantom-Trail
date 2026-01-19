import { DataConflict, SyncData } from './sync-manager';

export interface ConflictResolutionStrategy {
  name: string;
  description: string;
  resolve: (localData: unknown, remoteData: unknown) => unknown;
}

export class ConflictResolver {
  private static strategies: Map<string, ConflictResolutionStrategy> = new Map([
    ['newest-wins', {
      name: 'Newest Wins',
      description: 'Use the data with the most recent timestamp',
      resolve: (localData: unknown, remoteData: unknown) => {
        const local = localData as { timestamp?: number; lastModified?: number };
        const remote = remoteData as { timestamp?: number; lastModified?: number };
        const localTime = local.timestamp || local.lastModified || 0;
        const remoteTime = remote.timestamp || remote.lastModified || 0;
        return localTime > remoteTime ? localData : remoteData;
      }
    }],
    ['local-wins', {
      name: 'Local Wins',
      description: 'Always prefer local data over remote data',
      resolve: (localData: any) => localData
    }],
    ['remote-wins', {
      name: 'Remote Wins',
      description: 'Always prefer remote data over local data',
      resolve: (_localData: any, remoteData: any) => remoteData
    }],
    ['merge', {
      name: 'Smart Merge',
      description: 'Intelligently combine local and remote data',
      resolve: (localData: any, remoteData: any) => {
        if (Array.isArray(localData) && Array.isArray(remoteData)) {
          return ConflictResolver.mergeArrays(localData, remoteData);
        }
        if (typeof localData === 'object' && typeof remoteData === 'object') {
          return ConflictResolver.mergeObjects(localData, remoteData);
        }
        // For primitive values, use newest wins
        const localTime = localData.timestamp || localData.lastModified || 0;
        const remoteTime = remoteData.timestamp || remoteData.lastModified || 0;
        return localTime > remoteTime ? localData : remoteData;
      }
    }]
  ]);

  static getAvailableStrategies(): ConflictResolutionStrategy[] {
    return Array.from(this.strategies.values());
  }

  static resolveConflict(
    conflict: DataConflict,
    strategy: string = 'newest-wins'
  ): unknown {
    const resolver = this.strategies.get(strategy);
    if (!resolver) {
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }

    return resolver.resolve(conflict.localData, conflict.remoteData);
  }

  static resolveMultipleConflicts(
    conflicts: DataConflict[],
    strategy: string = 'newest-wins'
  ): Map<string, unknown> {
    const resolutions = new Map<string, unknown>();

    for (const conflict of conflicts) {
      const resolved = this.resolveConflict(conflict, strategy);
      resolutions.set(conflict.field, resolved);
    }

    return resolutions;
  }

  private static mergeArrays(local: unknown[], remote: unknown[]): unknown[] {
    // For arrays of objects with unique identifiers
    if (local.length > 0 && remote.length > 0 && 
        typeof local[0] === 'object' && typeof remote[0] === 'object') {
      
      // Try to find a unique identifier field
      const idField = this.findIdField(local[0]);
      if (idField) {
        return this.mergeArraysByField(local, remote, idField);
      }
    }

    // For simple arrays, combine and deduplicate
    const combined = [...remote, ...local];
    return Array.from(new Set(combined));
  }

  private static mergeObjects(local: any, remote: any): any {
    const merged = { ...remote };

    for (const [key, value] of Object.entries(local)) {
      if (!(key in remote)) {
        // Key only exists locally
        merged[key] = value;
      } else if (typeof value === 'object' && typeof remote[key] === 'object') {
        // Both are objects, merge recursively
        merged[key] = this.mergeObjects(value, remote[key]);
      } else {
        // Conflict on primitive value, use local (could be configurable)
        const localTime = (value as any).timestamp || (value as any).lastModified || 0;
        const remoteTime = (remote[key] as any).timestamp || (remote[key] as any).lastModified || 0;
        merged[key] = localTime > remoteTime ? value : remote[key];
      }
    }

    return merged;
  }

  private static findIdField(obj: any): string | null {
    const commonIdFields = ['id', 'domain', 'name', 'key', 'identifier'];
    
    for (const field of commonIdFields) {
      if (field in obj) {
        return field;
      }
    }

    return null;
  }

  private static mergeArraysByField(local: any[], remote: any[], idField: string): any[] {
    const merged = [...remote];
    const remoteIds = new Set(remote.map(item => item[idField]));

    for (const localItem of local) {
      const id = localItem[idField];
      if (!remoteIds.has(id)) {
        // Item only exists locally, add it
        merged.push(localItem);
      } else {
        // Item exists in both, merge the objects
        const remoteIndex = merged.findIndex(item => item[idField] === id);
        if (remoteIndex !== -1) {
          merged[remoteIndex] = this.mergeObjects(localItem, merged[remoteIndex]);
        }
      }
    }

    return merged;
  }

  static detectConflicts(localData: SyncData, remoteData: SyncData): DataConflict[] {
    const conflicts: DataConflict[] = [];

    // Settings conflicts
    if (this.hasDataChanged(localData.settings, remoteData.settings)) {
      conflicts.push({
        type: 'settings',
        localData: localData.settings,
        remoteData: remoteData.settings,
        field: 'settings'
      });
    }

    // Trusted sites conflicts
    if (this.hasDataChanged(localData.trustedSites, remoteData.trustedSites)) {
      conflicts.push({
        type: 'trusted-sites',
        localData: localData.trustedSites,
        remoteData: remoteData.trustedSites,
        field: 'trustedSites'
      });
    }

    // Privacy goals conflicts
    if (this.hasDataChanged(localData.privacyGoals, remoteData.privacyGoals)) {
      conflicts.push({
        type: 'goals',
        localData: localData.privacyGoals,
        remoteData: remoteData.privacyGoals,
        field: 'privacyGoals'
      });
    }

    // Export schedules conflicts
    if (this.hasDataChanged(localData.exportSchedules, remoteData.exportSchedules)) {
      conflicts.push({
        type: 'schedules',
        localData: localData.exportSchedules,
        remoteData: remoteData.exportSchedules,
        field: 'exportSchedules'
      });
    }

    return conflicts;
  }

  private static hasDataChanged(local: any, remote: any): boolean {
    try {
      return JSON.stringify(local) !== JSON.stringify(remote);
    } catch {
      return local !== remote;
    }
  }

  static createConflictSummary(conflicts: DataConflict[]): string {
    if (conflicts.length === 0) {
      return 'No conflicts detected';
    }

    const summary = conflicts.map(conflict => {
      const type = conflict.type.replace('-', ' ');
      return `${type} data differs between devices`;
    }).join(', ');

    return `${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''} detected: ${summary}`;
  }
}
