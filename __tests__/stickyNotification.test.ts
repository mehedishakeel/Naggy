import * as Notifications from 'expo-notifications';
import {
  syncStickyNotification,
  dismissStickyNotification,
  STICKY_NOTIFICATION_ID,
} from '../src/services/stickyNotification';
import { syncWidgetData } from '../src/services/widgetSync';
import { Task, AppSettings } from '../src/types';

describe('Sticky Lock Screen & Widget Sync Service', () => {
  const dummySettings: AppSettings = {
    theme: 'system',
    remindersEnabled: true,
    defaultReminderIntervalMinutes: 10,
    defaultSnoozeMinutes: 15,
    quietHoursEnabled: false,
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
    hasCompletedOnboarding: true,
  };

  const sampleOverdueTask: Task = {
    id: 'overdue-1',
    title: 'Submit tax return',
    notes: 'Urgent deadline',
    dueDate: '2026-10-15',
    dueTime: '10:00',
    isAllDay: false,
    priority: 'urgent',
    remindAtDue: true,
    reminderIntervalMinutes: 10,
    escalateReminders: false,
    isCompleted: false,
    isRecurring: false,
    isArchived: false,
    createdAt: '2026-10-15T09:00:00Z',
    updatedAt: '2026-10-15T09:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('syncStickyNotification schedules sticky ongoing lock screen notification for top overdue task', async () => {
    await syncStickyNotification([sampleOverdueTask], dummySettings);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: STICKY_NOTIFICATION_ID,
        content: expect.objectContaining({
          title: expect.stringContaining('Submit tax return'),
          sticky: true,
          autoDismiss: false,
          priority: Notifications.AndroidNotificationPriority.MAX,
        }),
        trigger: null,
      })
    );
  });

  test('syncStickyNotification dismisses sticky notification when overdue list is empty', async () => {
    await syncStickyNotification([], dummySettings);

    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith(STICKY_NOTIFICATION_ID);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('syncStickyNotification dismisses when stickyNotificationEnabled is false', async () => {
    await syncStickyNotification([sampleOverdueTask], {
      ...dummySettings,
      stickyNotificationEnabled: false,
    });

    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith(STICKY_NOTIFICATION_ID);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('dismissStickyNotification calls dismissNotificationAsync with correct ID', async () => {
    await dismissStickyNotification();
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith(STICKY_NOTIFICATION_ID);
  });

  test('syncWidgetData writes computed payload with counts and top task', async () => {
    const payload = await syncWidgetData({
      overdueTasks: [sampleOverdueTask],
      todayTasks: [],
      completedTodayTasks: [],
    });

    expect(payload.overdueCount).toBe(1);
    expect(payload.todayCount).toBe(0);
    expect(payload.topOverdueTask?.title).toBe('Submit tax return');
    expect(payload.topOverdueTask?.priority).toBe('urgent');
  });
});
