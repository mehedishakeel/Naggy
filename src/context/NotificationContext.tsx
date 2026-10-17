import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  checkNotificationPermissions,
  requestNotificationPermissions,
  setupNotificationChannelsAndCategories,
  reconcileAllNotifications,
  cancelRemindersForTask,
  scheduleRemindersForTask,
  ACTION_DONE,
  ACTION_SNOOZE,
  NotificationPermissionState,
} from '../services/notifications';
import {
  getTaskById,
  getAllTasks,
  saveTask,
  addCompletionHistory,
  getSettings,
} from '../database';
import { calculateNextOccurrence } from '../utils/recurrence';
import { isTaskOverdue } from '../utils/date';
import { Task } from '../types';

interface NotificationContextValue {
  permissionState: NotificationPermissionState;
  activeAlarmTask: Task | null;
  triggerAlarm: (task: Task) => void;
  dismissAlarm: () => void;
  requestPermission: () => Promise<boolean>;
  refreshPermissions: () => Promise<void>;
  reconcile: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>({
    status: Notifications.PermissionStatus.UNDETERMINED,
    canAskAgain: true,
    granted: false,
  });

  const [activeAlarmTask, setActiveAlarmTask] = useState<Task | null>(null);

  const refreshPermissions = useCallback(async () => {
    const state = await checkNotificationPermissions();
    setPermissionState(state);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const result = await requestNotificationPermissions();
    setPermissionState(result);
    if (result.granted) {
      await reconcileAllNotifications();
    }
    return result.granted;
  }, []);

  const reconcile = useCallback(async () => {
    await reconcileAllNotifications();
  }, []);

  const triggerAlarm = useCallback((task: Task) => {
    setActiveAlarmTask(task);
  }, []);

  const dismissAlarm = useCallback(() => {
    setActiveAlarmTask(null);
  }, []);

  useEffect(() => {
    // 1. Initialize channels and check permissions
    setupNotificationChannelsAndCategories().then(() => {
      refreshPermissions();
      reconcileAllNotifications();
    });

    // 2. Listen to AppState transitions (reconcile when returning to foreground and check alarms)
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        refreshPermissions();
        reconcileAllNotifications();

        // If there's an active alarm, verify it is still incomplete
        setActiveAlarmTask((prev) => {
          if (!prev) return null;
          const fresh = getTaskById(prev.id);
          return fresh && !fresh.isCompleted && !fresh.isArchived ? fresh : null;
        });

        // Check if there are overdue tasks with nagging enabled
        try {
          const allTasks = getAllTasks();
          const overdueNaggingTask = allTasks.find(
            (t) =>
              !t.isCompleted &&
              !t.isArchived &&
              t.dueDate &&
              (t.reminderIntervalMinutes > 0 || t.remindAtDue) &&
              isTaskOverdue(t.dueDate, t.dueTime)
          );
          if (overdueNaggingTask) {
            setActiveAlarmTask((prev) => prev || overdueNaggingTask);
          }
        } catch {
          // Ignored
        }
      }
    });

    // 3. Listen for incoming notifications in foreground -> trigger full screen alarm
    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      const taskId = data?.taskId as string | undefined;
      if (taskId) {
        const task = getTaskById(taskId);
        if (task && !task.isCompleted && !task.isArchived) {
          setActiveAlarmTask(task);
        }
      }
    });

    // 4. Handle interactive notification action responses (Mark as Done, Snooze, or Open)
    const responseListener = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { actionIdentifier, notification } = response;
      const data = notification.request.content.data;
      const taskId = data?.taskId as string | undefined;

      if (!taskId) return;

      const task = getTaskById(taskId);
      if (!task) return;

      const settings = getSettings();

      if (actionIdentifier === ACTION_DONE) {
        // User marked task as DONE directly from the persistent notification
        if (task.isRecurring && task.recurrenceRule && task.dueDate) {
          addCompletionHistory({
            id: `history-${Date.now()}`,
            taskId: task.id,
            seriesId: task.seriesId || task.id,
            completedAt: new Date().toISOString(),
            dueDate: task.dueDate,
          });

          const nextDate = calculateNextOccurrence(task.dueDate, task.recurrenceRule);
          const updatedTask = {
            ...task,
            dueDate: nextDate,
            snoozeUntil: null,
            isCompleted: false,
            updatedAt: new Date().toISOString(),
          };
          saveTask(updatedTask);
          await scheduleRemindersForTask(updatedTask, settings);
        } else {
          const updatedTask = {
            ...task,
            isCompleted: true,
            completedAt: new Date().toISOString(),
            snoozeUntil: null,
            updatedAt: new Date().toISOString(),
          };
          saveTask(updatedTask);
          await cancelRemindersForTask(task.id);
        }
        setActiveAlarmTask(null);
      } else if (actionIdentifier === ACTION_SNOOZE) {
        const snoozeTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        const updatedTask = {
          ...task,
          snoozeUntil: snoozeTime,
          updatedAt: new Date().toISOString(),
        };
        saveTask(updatedTask);
        await scheduleRemindersForTask(updatedTask, settings);
        setActiveAlarmTask(null);
      } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // User tapped the notification -> verify task is still incomplete before opening full screen alarm
        const fresh = getTaskById(task.id);
        if (fresh && !fresh.isCompleted && !fresh.isArchived) {
          setActiveAlarmTask(fresh);
        } else {
          setActiveAlarmTask(null);
        }
      }
    });

    return () => {
      subscription.remove();
      receivedListener.remove();
      responseListener.remove();
    };
  }, [refreshPermissions, activeAlarmTask]);

  return (
    <NotificationContext.Provider
      value={{
        permissionState,
        activeAlarmTask,
        triggerAlarm,
        dismissAlarm,
        requestPermission,
        refreshPermissions,
        reconcile,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
