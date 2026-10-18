export type Priority = 'none' | 'low' | 'normal' | 'high' | 'urgent';

export type RecurrenceFrequency =
  | 'daily'
  | 'weekdays'
  | 'weekends'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // e.g. 1 for every day, 2 for every 2 weeks
  daysOfWeek?: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  dayOfMonth?: number; // 1-31
  endDate?: string | null; // ISO YYYY-MM-DD
  endCount?: number | null; // Number of occurrences
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  position: number;
}

export interface TaskList {
  id: string;
  name: string;
  color: string;
  icon: string;
  position: number;
  taskCount?: number;
}

export interface Task {
  id: string;
  seriesId?: string | null;
  title: string;
  notes?: string | null;
  dueDate?: string | null; // YYYY-MM-DD
  dueTime?: string | null; // HH:mm
  isAllDay: boolean;
  priority: Priority;
  listId?: string | null;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule | null;
  remindAtDue: boolean;
  reminderIntervalMinutes: number; // 0 = only once, 5, 10, 15, 30, 60
  escalateReminders: boolean; // increases frequency if ignored
  snoozeUntil?: string | null; // ISO timestamp
  isCompleted: boolean;
  completedAt?: string | null; // ISO timestamp
  isArchived: boolean;
  subtasks?: Subtask[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskOccurrenceHistory {
  id: string;
  taskId: string;
  seriesId: string;
  completedAt: string;
  dueDate: string;
}

export type MissedOccurrencePolicy = 'keep_overdue' | 'skip' | 'reschedule_today';

export type AlarmTone = 'radar' | 'classic' | 'chime' | 'bell' | 'none';

export type NuclearChallengeType = 'math' | 'tap';

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  remindersEnabled: boolean;
  defaultReminderIntervalMinutes: number;
  defaultSnoozeMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
  escalationEnabled: boolean;
  missedOccurrencePolicy: MissedOccurrencePolicy;
  startOfWeek: 0 | 1; // 0 = Sunday, 1 = Monday
  showCompletedTasks: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  alarmTone: AlarmTone;
  voiceNaggingEnabled: boolean;
  alarmVolume: number;
  stickyNotificationEnabled: boolean;
  hasCompletedOnboarding: boolean;
  nuclearModeEnabled: boolean;
  nuclearModeType: NuclearChallengeType;
}


export interface ScheduledNotificationRecord {
  id: string;
  notificationId: string;
  taskId: string;
  occurrenceDate: string;
  triggerTime: string;
  createdAt: string;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  lists: TaskList[];
  tasks: Task[];
  subtasks: Subtask[];
  history: TaskOccurrenceHistory[];
}
