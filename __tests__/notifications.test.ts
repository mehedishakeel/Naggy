import {
  computeReminderTriggers,
  isWithinQuietHours,
  adjustForQuietHours,
} from '../src/services/notifications';
import { Task, AppSettings } from '../src/types';

describe('Persistent Reminder Calculations', () => {
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

  test('computes rolling batch of triggers when interval is 10m', () => {
    const task: Task = {
      id: 'task-test',
      title: 'Take vitamins',
      dueDate: '2026-10-15',
      dueTime: '08:00',
      isAllDay: false,
      priority: 'normal',
      isRecurring: false,
      remindAtDue: true,
      reminderIntervalMinutes: 10,
      escalateReminders: false,
      isCompleted: false,
      isArchived: false,
      createdAt: '2026-10-13T00:00:00Z',
      updatedAt: '2026-10-13T00:00:00Z',
    };

    const now = new Date('2026-10-15T07:50:00'); // 10 minutes before due
    const triggers = computeReminderTriggers(task, dummySettings, now, 5);

    expect(triggers.length).toBe(5);
    // 1st: 08:00
    expect(triggers[0].getHours()).toBe(8);
    expect(triggers[0].getMinutes()).toBe(0);
    // 2nd: 08:10
    expect(triggers[1].getHours()).toBe(8);
    expect(triggers[1].getMinutes()).toBe(10);
    // 3rd: 08:20
    expect(triggers[2].getHours()).toBe(8);
    expect(triggers[2].getMinutes()).toBe(20);
  });

  test('returns empty array when task is completed', () => {
    const task: Task = {
      id: 'task-done',
      title: 'Done task',
      dueDate: '2026-10-15',
      dueTime: '08:00',
      isAllDay: false,
      priority: 'none',
      isRecurring: false,
      remindAtDue: true,
      reminderIntervalMinutes: 10,
      escalateReminders: false,
      isCompleted: true,
      isArchived: false,
      createdAt: '2026-10-13T00:00:00Z',
      updatedAt: '2026-10-13T00:00:00Z',
    };

    const triggers = computeReminderTriggers(task, dummySettings);
    expect(triggers).toEqual([]);
  });

  test('detects quiet hours across midnight (22:00 to 07:00)', () => {
    const midnightTime = new Date('2026-10-15T23:30:00');
    expect(isWithinQuietHours(midnightTime, '22:00', '07:00')).toBe(true);

    const morningQuietTime = new Date('2026-10-15T05:30:00');
    expect(isWithinQuietHours(morningQuietTime, '22:00', '07:00')).toBe(true);

    const dayTime = new Date('2026-10-15T14:30:00');
    expect(isWithinQuietHours(dayTime, '22:00', '07:00')).toBe(false);
  });

  test('adjustForQuietHours pushes time to end of quiet hours', () => {
    const quietTime = new Date('2026-10-15T02:00:00');
    const adjusted = adjustForQuietHours(quietTime, '22:00', '07:00');

    expect(adjusted.getHours()).toBe(7);
    expect(adjusted.getMinutes()).toBe(0);
  });

  test('immediately starts nagging when task due time has arrived or passed', () => {
    const task: Task = {
      id: 'task-overdue',
      title: 'Take immediate medicine',
      dueDate: '2026-10-15',
      dueTime: '08:00',
      isAllDay: false,
      priority: 'high',
      isRecurring: false,
      remindAtDue: true,
      reminderIntervalMinutes: 5,
      escalateReminders: false,
      isCompleted: false,
      isArchived: false,
      createdAt: '2026-10-15T08:00:00Z',
      updatedAt: '2026-10-15T08:00:00Z',
    };

    // Current time is 08:05 (due time was 5 minutes ago)
    const now = new Date('2026-10-15T08:05:00');
    const triggers = computeReminderTriggers(task, dummySettings, now, 4);

    expect(triggers.length).toBe(4);
    // 1st trigger should be immediate (approx 2s after now)
    expect(triggers[0].getTime()).toBe(now.getTime() + 2000);
    // 2nd trigger should be 5 minutes after immediate
    expect(triggers[1].getTime()).toBe(triggers[0].getTime() + 5 * 60 * 1000);
    // 3rd trigger should be 10 minutes after immediate
    expect(triggers[2].getTime()).toBe(triggers[0].getTime() + 10 * 60 * 1000);
  });

  test('supports 1-minute nagging repeat interval for rapid testing', () => {
    const task: Task = {
      id: 'task-rapid',
      title: 'Water plants test',
      dueDate: '2026-10-15',
      dueTime: '09:00',
      isAllDay: false,
      priority: 'normal',
      isRecurring: false,
      remindAtDue: true,
      reminderIntervalMinutes: 1,
      escalateReminders: false,
      isCompleted: false,
      isArchived: false,
      createdAt: '2026-10-15T08:50:00Z',
      updatedAt: '2026-10-15T08:50:00Z',
    };

    const now = new Date('2026-10-15T08:55:00');
    const triggers = computeReminderTriggers(task, dummySettings, now, 5);

    expect(triggers.length).toBe(5);
    expect(triggers[0].getMinutes()).toBe(0); // 09:00
    expect(triggers[1].getMinutes()).toBe(1); // 09:01
    expect(triggers[2].getMinutes()).toBe(2); // 09:02
    expect(triggers[3].getMinutes()).toBe(3); // 09:03
    expect(triggers[4].getMinutes()).toBe(4); // 09:04
  });

  test('cancelRemindersForTask cancels scheduled and dismisses presented notifications', async () => {
    const { cancelRemindersForTask } = require('../src/services/notifications');
    const Notifications = require('expo-notifications');

    Notifications.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
      { identifier: 'notif-1', content: { data: { taskId: 'task-cancel-test' } } },
      { identifier: 'notif-2', content: { data: { taskId: 'other-task' } } },
    ]);

    Notifications.getPresentedNotificationsAsync.mockResolvedValueOnce([
      { request: { identifier: 'pres-1', content: { data: { taskId: 'task-cancel-test' } } } },
      { request: { identifier: 'pres-2', content: { data: { taskId: 'other-task' } } } },
    ]);

    await cancelRemindersForTask('task-cancel-test');

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('pres-1');
  });
});

