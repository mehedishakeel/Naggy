import * as SQLite from 'expo-sqlite';
import {
  Task,
  TaskList,
  Subtask,
  TaskOccurrenceHistory,
  ScheduledNotificationRecord,
  AppSettings,
  Priority,
} from '../types';

const DB_NAME = 'naggy.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
    dbInstance.execSync('PRAGMA foreign_keys = ON;');
    dbInstance.execSync('PRAGMA journal_mode = WAL;');
  }
  return dbInstance;
};

export const initDatabase = (): void => {
  const db = getDatabase();

  // Create schema migrations table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const currentVersionRow = db.getFirstSync<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_migrations'
  );
  const currentVersion = currentVersionRow?.version || 0;

  if (currentVersion < 1) {
    db.withTransactionSync(() => {
      // 1. Lists
      db.execSync(`
        CREATE TABLE IF NOT EXISTS lists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          color TEXT NOT NULL,
          icon TEXT NOT NULL,
          position INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 2. Tasks
      db.execSync(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          series_id TEXT,
          title TEXT NOT NULL,
          notes TEXT,
          due_date TEXT,
          due_time TEXT,
          is_all_day INTEGER NOT NULL DEFAULT 0,
          priority TEXT NOT NULL DEFAULT 'none',
          list_id TEXT REFERENCES lists(id) ON DELETE SET NULL,
          is_recurring INTEGER NOT NULL DEFAULT 0,
          recurrence_rule TEXT,
          remind_at_due INTEGER NOT NULL DEFAULT 1,
          reminder_interval_minutes INTEGER NOT NULL DEFAULT 10,
          escalate_reminders INTEGER NOT NULL DEFAULT 0,
          snooze_until TEXT,
          is_completed INTEGER NOT NULL DEFAULT 0,
          completed_at TEXT,
          is_archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(is_completed);
        CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
      `);

      // 3. Subtasks
      db.execSync(`
        CREATE TABLE IF NOT EXISTS subtasks (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          is_completed INTEGER NOT NULL DEFAULT 0,
          position INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
      `);

      // 4. Occurrence History
      db.execSync(`
        CREATE TABLE IF NOT EXISTS completion_history (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          series_id TEXT,
          completed_at TEXT NOT NULL,
          due_date TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_history_series ON completion_history(series_id);
      `);

      // 5. Scheduled Notifications registry
      db.execSync(`
        CREATE TABLE IF NOT EXISTS scheduled_notifications (
          id TEXT PRIMARY KEY,
          notification_id TEXT NOT NULL,
          task_id TEXT NOT NULL,
          occurrence_date TEXT NOT NULL,
          trigger_time TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_notifs_task ON scheduled_notifications(task_id);
      `);

      // 6. Settings Key-Value
      db.execSync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      // Seed default lists
      const now = new Date().toISOString();
      const defaultLists = [
        { id: 'list-personal', name: 'Personal', color: '#3B82F6', icon: 'person', position: 0 },
        { id: 'list-work', name: 'Work', color: '#8B5CF6', icon: 'briefcase', position: 1 },
        { id: 'list-health', name: 'Health', color: '#10B981', icon: 'heart', position: 2 },
        { id: 'list-habits', name: 'Habits', color: '#F59E0B', icon: 'repeat', position: 3 },
      ];

      for (const item of defaultLists) {
        db.runSync(
          'INSERT OR IGNORE INTO lists (id, name, color, icon, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [item.id, item.name, item.color, item.icon, item.position, now, now]
        );
      }

      // Record migration
      db.runSync(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?)',
        [now]
      );
    });
  }
};

// ===================== TASK REPOSITORY =====================

export const getAllTasks = (): Task[] => {
  const db = getDatabase();
  const rows = db.getAllSync<any>(`
    SELECT * FROM tasks WHERE is_archived = 0 ORDER BY 
      CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
      due_date ASC,
      CASE WHEN due_time IS NULL THEN 1 ELSE 0 END,
      due_time ASC,
      created_at DESC
  `);

  const subtaskRows = db.getAllSync<any>('SELECT * FROM subtasks ORDER BY position ASC');
  const subtasksByTask = new Map<string, Subtask[]>();

  for (const s of subtaskRows) {
    const list = subtasksByTask.get(s.task_id) || [];
    list.push({
      id: s.id,
      taskId: s.task_id,
      title: s.title,
      isCompleted: s.is_completed === 1,
      position: s.position,
    });
    subtasksByTask.set(s.task_id, list);
  }

  return rows.map((r) => ({
    id: r.id,
    seriesId: r.series_id,
    title: r.title,
    notes: r.notes,
    dueDate: r.due_date,
    dueTime: r.due_time,
    isAllDay: r.is_all_day === 1,
    priority: r.priority as Priority,
    listId: r.list_id,
    isRecurring: r.is_recurring === 1,
    recurrenceRule: r.recurrence_rule ? JSON.parse(r.recurrence_rule) : null,
    remindAtDue: r.remind_at_due === 1,
    reminderIntervalMinutes: r.reminder_interval_minutes,
    escalateReminders: r.escalate_reminders === 1,
    snoozeUntil: r.snooze_until,
    isCompleted: r.is_completed === 1,
    completedAt: r.completed_at,
    isArchived: r.is_archived === 1,
    subtasks: subtasksByTask.get(r.id) || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
};

export const getTaskById = (id: string): Task | null => {
  const db = getDatabase();
  const r = db.getFirstSync<any>('SELECT * FROM tasks WHERE id = ?', [id]);
  if (!r) return null;

  const subtasks = db
    .getAllSync<any>('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC', [id])
    .map((s) => ({
      id: s.id,
      taskId: s.task_id,
      title: s.title,
      isCompleted: s.is_completed === 1,
      position: s.position,
    }));

  return {
    id: r.id,
    seriesId: r.series_id,
    title: r.title,
    notes: r.notes,
    dueDate: r.due_date,
    dueTime: r.due_time,
    isAllDay: r.is_all_day === 1,
    priority: r.priority as Priority,
    listId: r.list_id,
    isRecurring: r.is_recurring === 1,
    recurrenceRule: r.recurrence_rule ? JSON.parse(r.recurrence_rule) : null,
    remindAtDue: r.remind_at_due === 1,
    reminderIntervalMinutes: r.reminder_interval_minutes,
    escalateReminders: r.escalate_reminders === 1,
    snoozeUntil: r.snooze_until,
    isCompleted: r.is_completed === 1,
    completedAt: r.completed_at,
    isArchived: r.is_archived === 1,
    subtasks,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

export const saveTask = (task: Task): void => {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.withTransactionSync(() => {
    db.runSync(
      `INSERT OR REPLACE INTO tasks (
        id, series_id, title, notes, due_date, due_time, is_all_day,
        priority, list_id, is_recurring, recurrence_rule, remind_at_due,
        reminder_interval_minutes, escalate_reminders, snooze_until,
        is_completed, completed_at, is_archived, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.seriesId || null,
        task.title,
        task.notes || null,
        task.dueDate || null,
        task.dueTime || null,
        task.isAllDay ? 1 : 0,
        task.priority,
        task.listId || null,
        task.isRecurring ? 1 : 0,
        task.recurrenceRule ? JSON.stringify(task.recurrenceRule) : null,
        task.remindAtDue ? 1 : 0,
        task.reminderIntervalMinutes,
        task.escalateReminders ? 1 : 0,
        task.snoozeUntil || null,
        task.isCompleted ? 1 : 0,
        task.completedAt || null,
        task.isArchived ? 1 : 0,
        task.createdAt || now,
        now,
      ]
    );

    // Save subtasks if present
    if (task.subtasks) {
      db.runSync('DELETE FROM subtasks WHERE task_id = ?', [task.id]);
      for (const s of task.subtasks) {
        db.runSync(
          'INSERT INTO subtasks (id, task_id, title, is_completed, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [s.id, task.id, s.title, s.isCompleted ? 1 : 0, s.position, now]
        );
      }
    }
  });
};

export const deleteTask = (id: string): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM subtasks WHERE task_id = ?', [id]);
    db.runSync('DELETE FROM scheduled_notifications WHERE task_id = ?', [id]);
    db.runSync('DELETE FROM tasks WHERE id = ?', [id]);
  });
};

export const deleteSeries = (seriesId: string): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    const tasks = db.getAllSync<{ id: string }>('SELECT id FROM tasks WHERE series_id = ?', [seriesId]);
    for (const t of tasks) {
      db.runSync('DELETE FROM subtasks WHERE task_id = ?', [t.id]);
      db.runSync('DELETE FROM scheduled_notifications WHERE task_id = ?', [t.id]);
    }
    db.runSync('DELETE FROM tasks WHERE series_id = ?', [seriesId]);
  });
};

export const addCompletionHistory = (history: TaskOccurrenceHistory): void => {
  const db = getDatabase();
  db.runSync(
    'INSERT INTO completion_history (id, task_id, series_id, completed_at, due_date) VALUES (?, ?, ?, ?, ?)',
    [history.id, history.taskId, history.seriesId || null, history.completedAt, history.dueDate]
  );
};

export const getCompletionHistory = (seriesId?: string): TaskOccurrenceHistory[] => {
  const db = getDatabase();
  const query = seriesId
    ? 'SELECT * FROM completion_history WHERE series_id = ? ORDER BY completed_at DESC'
    : 'SELECT * FROM completion_history ORDER BY completed_at DESC';
  const params = seriesId ? [seriesId] : [];
  return db.getAllSync<any>(query, params).map((r) => ({
    id: r.id,
    taskId: r.task_id,
    seriesId: r.series_id,
    completedAt: r.completed_at,
    dueDate: r.due_date,
  }));
};

// ===================== LISTS REPOSITORY =====================

export const getAllLists = (): TaskList[] => {
  const db = getDatabase();
  const rows = db.getAllSync<any>(`
    SELECT l.*, COUNT(CASE WHEN t.is_completed = 0 AND t.is_archived = 0 THEN 1 END) as task_count
    FROM lists l
    LEFT JOIN tasks t ON t.list_id = l.id
    GROUP BY l.id
    ORDER BY l.position ASC
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    icon: r.icon,
    position: r.position,
    taskCount: r.task_count || 0,
  }));
};

export const saveList = (list: TaskList): void => {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.runSync(
    `INSERT OR REPLACE INTO lists (id, name, color, icon, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [list.id, list.name, list.color, list.icon, list.position, now, now]
  );
};

export const deleteList = (listId: string, deleteTasks: boolean): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    if (deleteTasks) {
      const tasks = db.getAllSync<{ id: string }>('SELECT id FROM tasks WHERE list_id = ?', [listId]);
      for (const t of tasks) {
        db.runSync('DELETE FROM subtasks WHERE task_id = ?', [t.id]);
        db.runSync('DELETE FROM scheduled_notifications WHERE task_id = ?', [t.id]);
        db.runSync('DELETE FROM tasks WHERE id = ?', [t.id]);
      }
    } else {
      // Unlink tasks (move to inbox)
      db.runSync('UPDATE tasks SET list_id = NULL WHERE list_id = ?', [listId]);
    }
    db.runSync('DELETE FROM lists WHERE id = ?', [listId]);
  });
};

// ===================== NOTIFICATION REGISTRY REPOSITORY =====================

export const saveScheduledNotification = (record: ScheduledNotificationRecord): void => {
  const db = getDatabase();
  db.runSync(
    'INSERT OR REPLACE INTO scheduled_notifications (id, notification_id, task_id, occurrence_date, trigger_time, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [record.id, record.notificationId, record.taskId, record.occurrenceDate, record.triggerTime, record.createdAt]
  );
};

export const getScheduledNotificationsByTask = (taskId: string): ScheduledNotificationRecord[] => {
  const db = getDatabase();
  return db
    .getAllSync<any>('SELECT * FROM scheduled_notifications WHERE task_id = ?', [taskId])
    .map((r) => ({
      id: r.id,
      notificationId: r.notification_id,
      taskId: r.task_id,
      occurrenceDate: r.occurrence_date,
      triggerTime: r.trigger_time,
      createdAt: r.created_at,
    }));
};

export const clearScheduledNotificationsForTask = (taskId: string): void => {
  const db = getDatabase();
  db.runSync('DELETE FROM scheduled_notifications WHERE task_id = ?', [taskId]);
};

export const clearAllScheduledNotifications = (): void => {
  const db = getDatabase();
  db.runSync('DELETE FROM scheduled_notifications');
};

// ===================== SETTINGS REPOSITORY =====================

const DEFAULT_SETTINGS: AppSettings = {
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
};

export const getSettings = (): AppSettings => {
  const db = getDatabase();
  const rows = db.getAllSync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(r.key, r.value);
  }

  return {
    theme: (map.get('theme') as any) || DEFAULT_SETTINGS.theme,
    remindersEnabled: map.has('reminders_enabled') ? map.get('reminders_enabled') === 'true' : DEFAULT_SETTINGS.remindersEnabled,
    defaultReminderIntervalMinutes: map.has('default_reminder_interval_minutes')
      ? parseInt(map.get('default_reminder_interval_minutes')!, 10)
      : DEFAULT_SETTINGS.defaultReminderIntervalMinutes,
    defaultSnoozeMinutes: map.has('default_snooze_minutes')
      ? parseInt(map.get('default_snooze_minutes')!, 10)
      : DEFAULT_SETTINGS.defaultSnoozeMinutes,
    quietHoursEnabled: map.has('quiet_hours_enabled')
      ? map.get('quiet_hours_enabled') === 'true'
      : DEFAULT_SETTINGS.quietHoursEnabled,
    quietHoursStart: map.get('quiet_hours_start') || DEFAULT_SETTINGS.quietHoursStart,
    quietHoursEnd: map.get('quiet_hours_end') || DEFAULT_SETTINGS.quietHoursEnd,
    escalationEnabled: map.has('escalation_enabled')
      ? map.get('escalation_enabled') === 'true'
      : DEFAULT_SETTINGS.escalationEnabled,
    missedOccurrencePolicy: (map.get('missed_occurrence_policy') as any) || DEFAULT_SETTINGS.missedOccurrencePolicy,
    startOfWeek: (parseInt(map.get('start_of_week') || '1', 10) as 0 | 1),
    showCompletedTasks: map.has('show_completed_tasks')
      ? map.get('show_completed_tasks') === 'true'
      : DEFAULT_SETTINGS.showCompletedTasks,
    soundEnabled: map.has('sound_enabled') ? map.get('sound_enabled') === 'true' : DEFAULT_SETTINGS.soundEnabled,
    vibrationEnabled: map.has('vibration_enabled') ? map.get('vibration_enabled') === 'true' : DEFAULT_SETTINGS.vibrationEnabled,
    alarmTone: (map.get('alarm_tone') as any) || DEFAULT_SETTINGS.alarmTone,
    voiceNaggingEnabled: map.has('voice_nagging_enabled')
      ? map.get('voice_nagging_enabled') === 'true'
      : DEFAULT_SETTINGS.voiceNaggingEnabled,
    alarmVolume: map.has('alarm_volume')
      ? parseFloat(map.get('alarm_volume')!)
      : DEFAULT_SETTINGS.alarmVolume,
    stickyNotificationEnabled: map.has('sticky_notification_enabled')
      ? map.get('sticky_notification_enabled') === 'true'
      : DEFAULT_SETTINGS.stickyNotificationEnabled,
    hasCompletedOnboarding: map.has('has_completed_onboarding')
      ? map.get('has_completed_onboarding') === 'true'
      : DEFAULT_SETTINGS.hasCompletedOnboarding,
  };
};

export const saveSettings = (settings: Partial<AppSettings>): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    for (const [key, val] of Object.entries(settings)) {
      const dbKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      db.runSync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [dbKey, String(val)]
      );
    }
  });
};

export const clearCompletedTasks = (): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    const completedTasks = db.getAllSync<{ id: string }>('SELECT id FROM tasks WHERE is_completed = 1');
    for (const t of completedTasks) {
      db.runSync('DELETE FROM subtasks WHERE task_id = ?', [t.id]);
      db.runSync('DELETE FROM scheduled_notifications WHERE task_id = ?', [t.id]);
    }
    db.runSync('DELETE FROM tasks WHERE is_completed = 1');
  });
};

export const resetDatabase = (): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM subtasks');
    db.runSync('DELETE FROM scheduled_notifications');
    db.runSync('DELETE FROM completion_history');
    db.runSync('DELETE FROM tasks');
    db.runSync('DELETE FROM lists');
    db.runSync('DELETE FROM settings');
    db.runSync('DELETE FROM schema_migrations');
  });
  // Re-seed
  initDatabase();
};
