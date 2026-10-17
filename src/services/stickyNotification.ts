import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task, AppSettings } from '../types';
import { formatDisplayTime } from '../utils/date';
import { NOTIFICATION_CATEGORY_TASK } from './notifications';

export const STICKY_NOTIFICATION_ID = 'naggy-sticky-lockscreen-top';
export const STICKY_CHANNEL_ID = 'naggy-sticky-lockscreen';

/**
 * Configure the Android channel for sticky ongoing notifications
 */
export const setupStickyNotificationChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync(STICKY_CHANNEL_ID, {
      name: 'Sticky Lock Screen Nag',
      description: 'Ongoing non-dismissible notification for highest priority overdue task',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#FF5A45',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });
  } catch {
    // Channel configuration fallback
  }
};

/**
 * Dismiss the sticky ongoing lock screen notification
 */
export const dismissStickyNotification = async (): Promise<void> => {
  try {
    await Notifications.dismissNotificationAsync(STICKY_NOTIFICATION_ID);
  } catch {
    // Ignore dismiss error
  }
};

/**
 * Synchronize the sticky lock screen notification with current overdue tasks.
 * If there are overdue tasks and sticky notifications are enabled, pins the top overdue task.
 * If all overdue tasks are completed or snoozed, dismisses the notification.
 */
export const syncStickyNotification = async (
  overdueTasks: Task[],
  settings: AppSettings
): Promise<void> => {
  if (!settings.stickyNotificationEnabled || overdueTasks.length === 0) {
    await dismissStickyNotification();
    return;
  }

  // Pick the top most urgent overdue task
  const topTask = overdueTasks[0];
  if (!topTask) {
    await dismissStickyNotification();
    return;
  }

  try {
    await setupStickyNotificationChannel();

    const timeStr = topTask.dueTime ? formatDisplayTime(topTask.dueTime) : 'earlier today';
    const otherCount = overdueTasks.length - 1;
    const extraInfo = otherCount > 0 ? ` (+${otherCount} more overdue)` : '';

    await Notifications.scheduleNotificationAsync({
      identifier: STICKY_NOTIFICATION_ID,
      content: {
        title: `🚨 OVERDUE NAG: ${topTask.title}`,
        body: `Due ${timeStr}${extraInfo} • Pinned until marked done or snoozed!`,
        data: {
          taskId: topTask.id,
          isStickyLockScreen: true,
        },
        categoryIdentifier: NOTIFICATION_CATEGORY_TASK,
        sound: settings.soundEnabled ? 'default' : undefined,
        vibrate: settings.vibrationEnabled ? [0, 250, 250, 250] : undefined,
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true,
        autoDismiss: false,
      },
      trigger: null, // deliver immediately
    });
  } catch (err) {
    console.warn('Failed to update sticky lock screen notification:', err);
  }
};
