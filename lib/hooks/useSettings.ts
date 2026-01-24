import { useState, useEffect } from 'react';
import { SettingsStorage } from '../storage/settings-storage';
import type { ExtensionSettings } from '../types';

/**
 * Custom hook for managing extension settings
 */
export function useSettings() {
  const [settings, setSettings] = useState<ExtensionSettings>({
    enableAI: true,
    enableNotifications: true,
    riskThreshold: 'medium',
  });
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await SettingsStorage.getSettings();
      console.log('[Settings] Loaded settings:', {
        ...currentSettings,
        openRouterApiKey: currentSettings.openRouterApiKey
          ? '***' + currentSettings.openRouterApiKey.slice(-4)
          : 'none',
      });
      setSettings(currentSettings);
      setApiKey(currentSettings.openRouterApiKey || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const trimmedKey = apiKey.trim();

      // Enhanced debugging
      console.log('[Settings] === SAVE OPERATION START ===');
      console.log('[Settings] API Key length:', trimmedKey.length);
      console.log(
        '[Settings] API Key prefix:',
        trimmedKey ? trimmedKey.slice(0, 15) + '...' : 'empty'
      );
      console.log('[Settings] Current settings state:', {
        ...settings,
        openRouterApiKey: settings.openRouterApiKey ? '***hidden***' : 'none',
      });

      const newSettings = {
        ...settings,
        openRouterApiKey: trimmedKey || undefined,
      };

      console.log('[Settings] New settings to save:', {
        ...newSettings,
        openRouterApiKey: newSettings.openRouterApiKey
          ? '***' + newSettings.openRouterApiKey.slice(-4)
          : 'none',
      });

      await SettingsStorage.saveSettings(newSettings);
      console.log('[Settings] SettingsStorage.saveSettings() completed');

      // Verify save by reading back directly from storage
      const verified = await SettingsStorage.getSettings();
      console.log('[Settings] Verified saved settings:', {
        ...verified,
        openRouterApiKey: verified.openRouterApiKey
          ? '***' + verified.openRouterApiKey.slice(-4)
          : 'none',
      });

      // Check if key was actually saved when we expected it to be
      if (trimmedKey && !verified.openRouterApiKey) {
        console.error(
          '[Settings] API KEY SAVE FAILED - Key was provided but not found after save!'
        );
        setSaveError('API key was not saved. Please try again.');
        return;
      }

      console.log('[Settings] === SAVE OPERATION SUCCESS ===');
      setSaveSuccess(true);
    } catch (error) {
      console.error('[Settings] === SAVE OPERATION FAILED ===', error);
      setSaveError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    setSettings,
    apiKey,
    setApiKey,
    saving,
    saveError,
    saveSuccess,
    saveSettings,
  };
}
