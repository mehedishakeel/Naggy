import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { BackupData } from '../types';
import {
  getAllTasks,
  getAllLists,
  getSettings,
  getCompletionHistory,
  saveTask,
  saveList,
  saveSettings,
  addCompletionHistory,
  getDatabase,
} from '../database';

/**
 * Generates full JSON backup data payload
 */
export const generateBackupData = (): BackupData => {
  const db = getDatabase();
  const subtasks = db.getAllSync<any>('SELECT * FROM subtasks').map((s) => ({
    id: s.id,
    taskId: s.task_id,
    title: s.title,
    isCompleted: s.is_completed === 1,
    position: s.position,
  }));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    lists: getAllLists(),
    tasks: getAllTasks(),
    subtasks,
    history: getCompletionHistory(),
  };
};

/**
 * Whitelist of permitted AppSettings keys to prevent property injection
 */
const ALLOWED_SETTINGS_KEYS = new Set([
  'theme',
  'remindersEnabled',
  'defaultReminderIntervalMinutes',
  'defaultSnoozeMinutes',
  'quietHoursEnabled',
  'quietHoursStart',
  'quietHoursEnd',
  'escalationEnabled',
  'missedOccurrencePolicy',
  'startOfWeek',
  'showCompletedTasks',
  'soundEnabled',
  'vibrationEnabled',
  'alarmTone',
  'voiceNaggingEnabled',
  'alarmVolume',
  'stickyNotificationEnabled',
  'hasCompletedOnboarding',
  'nuclearModeEnabled',
  'nuclearModeType',
]);

/**
 * Validates whether parsed object conforms to BackupData and sanitizes untrusted input
 */
export const validateBackupPayload = (data: any): { isValid: boolean; error?: string } => {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Backup data is empty or invalid JSON.' };
  }

  if (!Array.isArray(data.tasks)) {
    return { isValid: false, error: 'Missing or invalid "tasks" collection in backup.' };
  }

  if (!Array.isArray(data.lists)) {
    return { isValid: false, error: 'Missing or invalid "lists" collection in backup.' };
  }

  // Strict task record validation
  for (const t of data.tasks) {
    if (!t || typeof t !== 'object' || typeof t.id !== 'string' || !t.id.trim() || typeof t.title !== 'string') {
      return { isValid: false, error: 'Backup contains corrupted task records.' };
    }
  }

  // Strict list record validation
  for (const l of data.lists) {
    if (!l || typeof l !== 'object' || typeof l.id !== 'string' || typeof l.name !== 'string') {
      return { isValid: false, error: 'Backup contains corrupted list records.' };
    }
  }

  // Settings validation & key sanitization
  if (data.settings) {
    if (typeof data.settings !== 'object') {
      return { isValid: false, error: 'Backup contains invalid settings payload.' };
    }
    for (const key of Object.keys(data.settings)) {
      if (!ALLOWED_SETTINGS_KEYS.has(key)) {
        delete data.settings[key];
      }
    }
  }

  return { isValid: true };
};

/**
 * Exports JSON backup file and opens native share sheet
 */
export const exportBackupJSON = async (): Promise<{ success: boolean; filePath?: string; error?: string }> => {
  try {
    const backup = generateBackupData();
    const jsonStr = JSON.stringify(backup, null, 2);
    const fileName = `naggy-backup-${new Date().toISOString().slice(0, 10)}.json`;

    if (Platform.OS === 'web') {
      // Web download fallback
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    }

    const file = new File(Paths.document, fileName);
    if (file.exists) {
      file.delete();
    }
    file.create();
    file.write(jsonStr);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Naggy Backup',
        UTI: 'public.json',
      });
    }

    return { success: true, filePath: file.uri };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to export backup' };
  }
};

/**
 * Exports human-readable CSV of all tasks
 */
export const exportTasksCSV = async (): Promise<{ success: boolean; filePath?: string; error?: string }> => {
  try {
    const tasks = getAllTasks();
    const lists = getAllLists();
    const listMap = new Map(lists.map((l) => [l.id, l.name]));

    const sanitizeCsvCell = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return '""';
      let str = String(value);
      // OWASP CSV Injection Defense: Neutralize executable formulas (=, +, -, @, tab, cr, %)
      if (/^[=+\-@\t\r%]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['ID', 'Title', 'Due Date', 'Due Time', 'Priority', 'List', 'Completed', 'Recurring', 'Notes'];
    const rows = tasks.map((t) => [
      sanitizeCsvCell(t.id),
      sanitizeCsvCell(t.title),
      sanitizeCsvCell(t.dueDate),
      sanitizeCsvCell(t.dueTime),
      sanitizeCsvCell(t.priority),
      sanitizeCsvCell(listMap.get(t.listId || '') || 'Inbox'),
      sanitizeCsvCell(t.isCompleted ? 'Yes' : 'No'),
      sanitizeCsvCell(t.isRecurring ? 'Yes' : 'No'),
      sanitizeCsvCell(t.notes),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const fileName = `naggy-tasks-${new Date().toISOString().slice(0, 10)}.csv`;

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    }

    const file = new File(Paths.document, fileName);
    if (file.exists) {
      file.delete();
    }
    file.create();
    file.write(csvContent);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Tasks CSV',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return { success: true, filePath: file.uri };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to export CSV' };
  }
};

/**
 * Restores data from validated BackupData object
 */
export const restoreFromBackup = (data: BackupData): { success: boolean; taskCount: number; error?: string } => {
  const validation = validateBackupPayload(data);
  if (!validation.isValid) {
    return { success: false, taskCount: 0, error: validation.error };
  }

  try {
    const db = getDatabase();
    db.withTransactionSync(() => {
      // 1. Restore Lists
      for (const list of data.lists) {
        saveList(list);
      }

      // 2. Restore Settings
      if (data.settings) {
        saveSettings(data.settings);
      }

      // 3. Restore Tasks
      for (const task of data.tasks) {
        saveTask(task);
      }

      // 4. Restore Occurrence History
      if (Array.isArray(data.history)) {
        for (const h of data.history) {
          addCompletionHistory(h);
        }
      }
    });

    return { success: true, taskCount: data.tasks.length };
  } catch (err: any) {
    return { success: false, taskCount: 0, error: err.message || 'Failed to restore database' };
  }
};
