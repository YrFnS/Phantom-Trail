/**
 * User Whitelist Manager
 * 
 * Manages user-added trusted sites stored in chrome.storage.local
 */

import type { UserTrustedSite } from './types';

const STORAGE_KEY = 'userTrustedSites';

export class UserWhitelistManager {
  /**
   * Add a site to user whitelist
   */
  static async addTrustedSite(site: UserTrustedSite): Promise<void> {
    // Validate domain format
    if (!this.isValidDomain(site.domain)) {
      throw new Error('Invalid domain format');
    }

    const whitelist = await this.getUserWhitelist();
    
    // Check for duplicates
    const existingIndex = whitelist.findIndex(s => s.domain === site.domain);
    if (existingIndex >= 0) {
      // Update existing entry
      whitelist[existingIndex] = site;
    } else {
      // Add new entry
      whitelist.push(site);
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: whitelist });
  }

  /**
   * Remove a site from user whitelist
   */
  static async removeTrustedSite(domain: string): Promise<void> {
    const whitelist = await this.getUserWhitelist();
    const filtered = whitelist.filter(site => site.domain !== domain);
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
  }

  /**
   * Get all user-trusted sites
   */
  static async getUserWhitelist(): Promise<UserTrustedSite[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  }

  /**
   * Check if a domain is in user whitelist
   */
  static async isUserTrusted(domain: string): Promise<UserTrustedSite | null> {
    const whitelist = await this.getUserWhitelist();
    
    // Exact match
    const exactMatch = whitelist.find(site => site.domain === domain);
    if (exactMatch) return exactMatch;
    
    // Subdomain match
    const subdomainMatch = whitelist.find(site => 
      domain.endsWith(`.${site.domain}`) || domain === site.domain
    );
    
    return subdomainMatch || null;
  }

  /**
   * Clear temporary (session-only) trusted sites
   */
  static async clearTemporary(): Promise<void> {
    const whitelist = await this.getUserWhitelist();
    const permanent = whitelist.filter(site => !site.temporary);
    await chrome.storage.local.set({ [STORAGE_KEY]: permanent });
  }

  /**
   * Export whitelist as JSON string
   */
  static async exportWhitelist(): Promise<string> {
    const whitelist = await this.getUserWhitelist();
    return JSON.stringify(whitelist, null, 2);
  }

  /**
   * Import whitelist from JSON string
   */
  static async importWhitelist(json: string): Promise<void> {
    try {
      const imported = JSON.parse(json);
      
      if (!Array.isArray(imported)) {
        throw new Error('Invalid whitelist format: must be an array');
      }

      // Validate each entry
      for (const site of imported) {
        if (!site.domain || !this.isValidDomain(site.domain)) {
          throw new Error(`Invalid domain: ${site.domain}`);
        }
      }

      // Merge with existing whitelist (avoid duplicates)
      const existing = await this.getUserWhitelist();
      const merged = [...existing];

      for (const importedSite of imported) {
        const existingIndex = merged.findIndex(s => s.domain === importedSite.domain);
        if (existingIndex >= 0) {
          merged[existingIndex] = importedSite;
        } else {
          merged.push(importedSite);
        }
      }

      await chrome.storage.local.set({ [STORAGE_KEY]: merged });
    } catch (error) {
      throw new Error(`Failed to import whitelist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate domain format
   */
  private static isValidDomain(domain: string): boolean {
    // Basic domain validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(domain);
  }
}
