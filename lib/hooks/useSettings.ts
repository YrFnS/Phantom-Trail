import { useState, useEffect } from 'react';
import { SettingsStorage } from '../storage/settings-storage';
import { DataProtectionStorage } from '../storage/data-protection-storage';
import { OpenRouterCredentialStorage } from '../storage/openrouter-credential-storage';
import { DATA_CLEARED_EVENT } from '../data-deletion';
import type { ExtensionSettings } from '../types';

const DEFAULT_UI_SETTINGS: ExtensionSettings = {
  enableAI: false,
  enableNotifications: false,
  riskThreshold: 'medium',
  enablePrivacyPredictions: false,
};

/**
 * Custom hook for non-secret settings and the separately stored OpenRouter key.
 */
export function useSettings() {
  const [settings, setSettings] = useState<ExtensionSettings>({
    ...DEFAULT_UI_SETTINGS,
  });
  const [apiKey, setApiKey] = useState('');
  const [rememberApiKey, setRememberApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    void loadSettings();

    const handleDataCleared = () => {
      setSettings({ ...DEFAULT_UI_SETTINGS });
      setApiKey('');
      setRememberApiKey(false);
      setSaveError(null);
      setSaveSuccess(false);
    };
    window.addEventListener(DATA_CLEARED_EVENT, handleDataCleared);
    return () =>
      window.removeEventListener(DATA_CLEARED_EVENT, handleDataCleared);
  }, []);

  const loadSettings = async () => {
    try {
      const [currentSettings, credential, protection] = await Promise.all([
        SettingsStorage.getSettings(),
        OpenRouterCredentialStorage.getCredential(),
        DataProtectionStorage.getSettings(),
      ]);
      setSettings(currentSettings);
      setApiKey(credential);
      setRememberApiKey(protection.rememberOpenRouterKey);
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
      const currentProtection = await DataProtectionStorage.getSettings();

      await SettingsStorage.saveSettings(settings);
      await DataProtectionStorage.saveSettings({
        ...currentProtection,
        rememberOpenRouterKey: rememberApiKey,
      });
      await OpenRouterCredentialStorage.setCredential(
        trimmedKey,
        rememberApiKey
      );

      const credentialState = await OpenRouterCredentialStorage.getState();
      if (trimmedKey && !credentialState.configured) {
        setSaveError('The OpenRouter key could not be stored. Please try again.');
        return;
      }

      setSaveSuccess(true);
    } catch (error) {
      console.error('Failed to save settings:', error);
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
    rememberApiKey,
    setRememberApiKey,
    saving,
    saveError,
    saveSuccess,
    saveSettings,
  };
}
