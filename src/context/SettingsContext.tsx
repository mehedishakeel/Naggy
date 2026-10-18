import React, { createContext, useContext, useState, useCallback } from 'react';
import { AppSettings } from '../types';
import { getSettings, saveSettings as saveDbSettings } from '../database';

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  refreshSettings: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'system',
  remindersEnabled: true,
  defaultReminderIntervalMinutes: 10,
  defaultSnoozeMinutes: 15,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  escalationEnabled: false,
  missedOccurrencePolicy: 'keep_overdue',
  startOfWeek: 1,
  showCompletedTasks: true,
  soundEnabled: true,
  vibrationEnabled: true,
  alarmTone: 'radar',
  voiceNaggingEnabled: true,
  alarmVolume: 1.0,
  stickyNotificationEnabled: true,
  hasCompletedOnboarding: false,
  nuclearModeEnabled: false,
  nuclearModeType: 'math',
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      return getSettings();
    } catch {
      return defaultSettings;
    }
  });

  const refreshSettings = useCallback(() => {
    try {
      const current = getSettings();
      setSettings(current);
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }, []);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    try {
      saveDbSettings(newSettings);
      setSettings((prev) => ({ ...prev, ...newSettings }));
    } catch (e) {
      console.warn('Failed to update settings:', e);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
