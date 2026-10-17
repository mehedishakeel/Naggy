import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  Task,
  AppSettings,
  ScheduledNotificationRecord,
} from '../types';
import {
  combineDateAndTime,
  isTaskOverdue,
  formatDisplayTime,
} from '../utils/date';
import {
  saveScheduledNotification,
  clearScheduledNotificationsForTask,
  clearAllScheduledNotifications,
  getScheduledNotificationsByTask,
  getAllTasks,
  getSettings,
} from '../database';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export const NOTIFICATION_CATEGORY_TASK = 'naggy-task-actions';
export const ACTION_DONE = 'ACTION_MARK_DONE';
export const ACTION_SNOOZE = 'ACTION_SNOOZE';

export interface NotificationPermissionState {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}

/**
 * Configure notification categories (actions like Done, Snooze) and Android channels
 */
export const setupNotificationChannelsAndCategories = async (): Promise<void> => {
  try {
    // 1. Android Notification Channel with high importance
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('naggy-persistent', {
        name: 'Persistent Reminders',
        description: 'Persistent nagging alarm reminders for incomplete tasks',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        lightColor: '#FF5A45',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });
    }

    // 2. Notification Category with actions
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY_TASK, [
      {
        identifier: ACTION_DONE,
        buttonTitle: '✓ Mark as Done',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: ACTION_SNOOZE,
        buttonTitle: '⏰ Snooze 15m',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  } catch (err) {
    console.warn('Failed to configure notification channel/category:', err);
  }
};

/**
 * Check current notification permissions
 */
export const checkNotificationPermissions = async (): Promise<NotificationPermissionState> => {
  try {
    const { status, canAskAgain, granted } = await Notifications.getPermissionsAsync();
    return { status, canAskAgain, granted };
  } catch {
    return {
      status: Notifications.PermissionStatus.UNDETERMINED,
      canAskAgain: true,
      granted: false,
    };
  }
};

/**
 * Request notification permissions contextually
 */
export const requestNotificationPermissions = async (): Promise<NotificationPermissionState> => {
  try {
    const { status, canAskAgain, granted } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowDisplayInCarPlay: true,
      },
    });
    return { status, canAskAgain, granted };
  } catch {
    return {
      status: Notifications.PermissionStatus.DENIED,
      canAskAgain: false,
      granted: false,
    };
  }
};

/**
 * Checks whether a given timestamp falls within configured quiet hours
 */
export const isWithinQuietHours = (
  date: Date,
  quietStart: string, // "22:00"
  quietEnd: string // "07:00"
): boolean => {
  const [startH, startM] = quietStart.split(':').map((v) => parseInt(v, 10));
  const [endH, endM] = quietEnd.split(':').map((v) => parseInt(v, 10));

  const currentH = date.getHours();
  const currentM = date.getMinutes();
  const currentTimeMinutes = currentH * 60 + currentM;

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes > endMinutes) {
    // Spans midnight (e.g. 22:00 to 07:00)
    return currentTimeMinutes >= startMinutes || currentTimeMinutes < endMinutes;
  } else {
    // Same day (e.g. 13:00 to 15:00)
    return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
  }
};

/**
 * Adjust date to the end of quiet hours if it lands inside quiet hours
 */
export const adjustForQuietHours = (
  targetDate: Date,
  quietStart: string,
  quietEnd: string
): Date => {
  if (!isWithinQuietHours(targetDate, quietStart, quietEnd)) {
    return targetDate;
  }

  const [endH, endM] = quietEnd.split(':').map((v) => parseInt(v, 10));
  const adjusted = new Date(targetDate);
  adjusted.setHours(endH, endM, 0, 0);

  // If adjusted time is already in the past, push to next day's quiet hours end
  if (adjusted.getTime() <= targetDate.getTime()) {
    adjusted.setDate(adjusted.getDate() + 1);
  }

  return adjusted;
};

/**
 * Calculates a rolling window of scheduled notification triggers for a task.
 * Returns up to maxBatch triggers.
 */
export const computeReminderTriggers = (
  task: Task,
  settings: AppSettings,
  now = new Date(),
  maxBatch = 6
): Date[] => {
  // If task is completed or archived or no due date, no reminders
  if (task.isCompleted || task.isArchived || !task.dueDate) {
    return [];
  }

  // If reminders globally disabled or task interval is off and no remindAtDue
  if (!settings.remindersEnabled || (!task.remindAtDue && task.reminderIntervalMinutes <= 0)) {
    return [];
  }

  const triggers: Date[] = [];
  const baseDueDate = combineDateAndTime(task.dueDate, task.dueTime);

  // Check if task has a pending snooze
  let startingTime: Date = baseDueDate;
  if (task.snoozeUntil) {
    const snoozeDate = new Date(task.snoozeUntil);
    if (snoozeDate.getTime() > now.getTime()) {
      startingTime = snoozeDate;
    }
  }

  // If the initial trigger is in the future
  if (startingTime.getTime() > now.getTime()) {
    let initialTrigger = startingTime;
    if (settings.quietHoursEnabled) {
      initialTrigger = adjustForQuietHours(
        initialTrigger,
        settings.quietHoursStart,
        settings.quietHoursEnd
      );
    }
    triggers.push(initialTrigger);
  } else {
    // Starting time is right now or in the past (task is already due/overdue!)
    // Start nagging immediately so user receives a notification right away
    const immediateTrigger = new Date(now.getTime() + 2000);
    let candidate = immediateTrigger;
    if (settings.quietHoursEnabled) {
      candidate = adjustForQuietHours(
        immediateTrigger,
        settings.quietHoursStart,
        settings.quietHoursEnd
      );
    }
    triggers.push(candidate);
  }

  // If persistent nagging is enabled (interval > 0)
  const baseInterval = task.reminderIntervalMinutes || settings.defaultReminderIntervalMinutes;
  if (baseInterval > 0) {
    // Generate nagging repeat sequence
    let cursor = new Date(triggers[0].getTime());

    while (triggers.length < maxBatch) {
      let interval = baseInterval;

      // Escalation: if task is overdue by > 60m and escalation is enabled
      if (task.escalateReminders || settings.escalationEnabled) {
        const overdueMinutes = (cursor.getTime() - baseDueDate.getTime()) / (1000 * 60);
        if (overdueMinutes > 60) {
          interval = Math.max(1, Math.floor(baseInterval / 2));
        }
      }

      const nextTrigger = new Date(cursor.getTime() + interval * 60 * 1000);

      // Apply quiet hours if enabled
      let candidate = nextTrigger;
      if (settings.quietHoursEnabled) {
        candidate = adjustForQuietHours(
          nextTrigger,
          settings.quietHoursStart,
          settings.quietHoursEnd
        );
      }

      // Avoid duplicate triggers within 30 seconds
      if (!triggers.some((t) => Math.abs(t.getTime() - candidate.getTime()) < 30000)) {
        triggers.push(candidate);
      }

      cursor = candidate;
    }
  }

  return triggers;
};

/**
 * Schedules persistent reminders for a single task.
 * Idempotently cancels obsolete reminders and registers new rolling batch.
 */
export const scheduleRemindersForTask = async (
  task: Task,
  settings: AppSettings
): Promise<void> => {
  try {
    // 1. Cancel existing notifications registered for this task
    await cancelRemindersForTask(task.id);

    // If task is completed, archived, or lacks due date, stop
    if (task.isCompleted || task.isArchived || !task.dueDate) {
      return;
    }

    if (!settings.remindersEnabled) {
      return;
    }

    // 2. Compute future triggers
    const triggers = computeReminderTriggers(task, settings);
    if (triggers.length === 0) {
      return;
    }

    const now = new Date();

    // 3. Schedule each trigger
    for (let i = 0; i < triggers.length; i++) {
      const triggerDate = triggers[i];
      if (triggerDate.getTime() <= now.getTime()) {
        continue;
      }

      const isSubsequentNag = i > 0 || isTaskOverdue(task.dueDate, task.dueTime, now);
      const title = isSubsequentNag ? `🔔 Still pending: ${task.title}` : `⏰ Due: ${task.title}`;
      const body = isSubsequentNag
        ? `We nag. You get things done! Mark complete when done.`
        : task.notes
        ? `${task.notes}`
        : `Scheduled for ${task.dueTime ? formatDisplayTime(task.dueTime) : 'today'}.`;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            taskId: task.id,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            nagIndex: i,
          },
          categoryIdentifier: NOTIFICATION_CATEGORY_TASK,
          sound: settings.soundEnabled ? 'default' : undefined,
          vibrate: settings.vibrationEnabled ? [0, 250, 250, 250] : undefined,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: 'naggy-persistent',
        },
      });

      // Record in local database registry
      const record: ScheduledNotificationRecord = {
        id: `notif-${task.id}-${triggerDate.getTime()}`,
        notificationId,
        taskId: task.id,
        occurrenceDate: task.dueDate,
        triggerTime: triggerDate.toISOString(),
        createdAt: now.toISOString(),
      };
      saveScheduledNotification(record);
    }
  } catch (err) {
    console.warn(`Failed to schedule reminders for task ${task.id}:`, err);
  }
};

/**
 * Cancels all scheduled reminders for a specific task and dismisses any
 * already delivered notifications sitting in the notification tray/shade.
 */
export const cancelRemindersForTask = async (taskId: string): Promise<void> => {
  try {
    // 1. Cancel from our database registry
    const records = getScheduledNotificationsByTask(taskId);
    for (const r of records) {
      try {
        await Notifications.cancelScheduledNotificationAsync(r.notificationId);
      } catch {
        // Notification might already have fired or been removed by OS
      }
    }
    clearScheduledNotificationsForTask(taskId);

    // 2. Query all scheduled notifications directly from OS to catch any unregistered triggers
    try {
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of allScheduled) {
        const notifTaskId = notif.content?.data?.taskId as string | undefined;
        if (notifTaskId === taskId) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
    } catch {
      // Ignored
    }

    // 3. Immediately dismiss any delivered notification currently visible in the system tray
    try {
      const presented = await Notifications.getPresentedNotificationsAsync();
      for (const p of presented) {
        const pTaskId = p.request?.content?.data?.taskId as string | undefined;
        if (pTaskId === taskId) {
          await Notifications.dismissNotificationAsync(p.request.identifier);
        }
      }
    } catch {
      // Ignored
    }
  } catch (err) {
    console.warn(`Failed to cancel notifications for task ${taskId}:`, err);
  }
};

/**
 * Reconciles all pending tasks against scheduled notifications.
 * Crucial for app launch, foreground return, reboot recovery, and settings changes.
 * Guarantees idempotency and stays within iOS 64-notification limit.
 * Purges any orphan notifications for tasks that have been completed or deleted.
 */
export const reconcileAllNotifications = async (): Promise<void> => {
  try {
    const settings = getSettings();
    if (!settings.remindersEnabled) {
      // If disabled globally, clear all scheduled and active notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      try {
        await Notifications.dismissAllNotificationsAsync();
      } catch {
        // Ignored
      }
      clearAllScheduledNotifications();
      return;
    }

    const tasks = getAllTasks();
    const activeTasks = tasks.filter(
      (t) => !t.isCompleted && !t.isArchived && t.dueDate
    );
    const activeTaskIds = new Set(activeTasks.map((t) => t.id));

    // 1. Purge scheduled notifications for completed, archived, or deleted tasks
    try {
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of allScheduled) {
        const notifTaskId = notif.content?.data?.taskId as string | undefined;
        if (notifTaskId && !activeTaskIds.has(notifTaskId)) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
          clearScheduledNotificationsForTask(notifTaskId);
        }
      }
    } catch {
      // Ignored
    }

    // 2. Dismiss any presented notifications in the tray for completed or deleted tasks
    try {
      const presented = await Notifications.getPresentedNotificationsAsync();
      for (const p of presented) {
        const pTaskId = p.request?.content?.data?.taskId as string | undefined;
        if (pTaskId && !activeTaskIds.has(pTaskId)) {
          await Notifications.dismissNotificationAsync(p.request.identifier);
        }
      }
    } catch {
      // Ignored
    }

    // 3. Limit active scheduled tasks to stay within OS notification quotas (iOS max 64)
    // We allocate rolling reminders per task for the top 12 most urgent/upcoming tasks
    const tasksToSchedule = activeTasks.slice(0, 12);

    for (const task of tasksToSchedule) {
      await scheduleRemindersForTask(task, settings);
    }
  } catch (err) {
    console.warn('Failed to reconcile notifications:', err);
  }
};
