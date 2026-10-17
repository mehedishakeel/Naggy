import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { Task, TaskList } from '../types';
import {
  getAllTasks,
  saveTask as saveDbTask,
  deleteTask as deleteDbTask,
  deleteSeries as deleteDbSeries,
  getAllLists,
  saveList as saveDbList,
  deleteList as deleteDbList,
  addCompletionHistory,
  getSettings,
} from '../database';
import {
  scheduleRemindersForTask,
  cancelRemindersForTask,
  reconcileAllNotifications,
} from '../services/notifications';
import {
  isTaskOverdue,
  getTodayString,
} from '../utils/date';
import { calculateNextOccurrence } from '../utils/recurrence';
import { syncStickyNotification } from '../services/stickyNotification';
import { syncWidgetData } from '../services/widgetSync';


interface UndoAction {
  type: 'complete' | 'delete';
  previousTask: Task;
}

interface TaskContextValue {
  tasks: Task[];
  lists: TaskList[];
  isLoading: boolean;
  undoAction: UndoAction | null;
  refreshTasks: () => void;
  createTask: (taskData: Partial<Task>) => Promise<Task>;
  updateTask: (task: Task) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  reopenTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string, deleteSeries?: boolean) => Promise<void>;
  snoozeTask: (taskId: string, minutes: number) => Promise<void>;
  undo: () => Promise<void>;
  dismissUndo: () => void;
  createList: (name: string, color: string, icon: string) => Promise<TaskList>;
  deleteList: (listId: string, deleteTasks: boolean) => Promise<void>;
  // Derived computed lists
  overdueTasks: Task[];
  todayTasks: Task[];
  upcomingTasks: Task[];
  completedTasks: Task[];
  todayProgress: { total: number; completed: number; percentage: number };
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      return getAllTasks();
    } catch {
      return [];
    }
  });

  const [lists, setLists] = useState<TaskList[]>(() => {
    try {
      return getAllLists();
    } catch {
      return [];
    }
  });

  const [isLoading] = useState(false);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);

  const refreshTasks = useCallback(() => {
    try {
      const loadedTasks = getAllTasks();
      const loadedLists = getAllLists();
      setTasks(loadedTasks);
      setLists(loadedLists);
    } catch (e) {
      console.warn('Failed to load tasks/lists:', e);
    }
  }, []);

  // Create Task
  const createTask = async (taskData: Partial<Task>): Promise<Task> => {
    const settings = getSettings();
    const now = new Date().toISOString();
    const id = taskData.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newTask: Task = {
      id,
      seriesId: taskData.isRecurring ? taskData.seriesId || id : null,
      title: taskData.title?.trim() || 'Untitled Task',
      notes: taskData.notes?.trim() || null,
      dueDate: taskData.dueDate || null,
      dueTime: taskData.dueTime || null,
      isAllDay: taskData.isAllDay ?? false,
      priority: taskData.priority || 'none',
      listId: taskData.listId || null,
      isRecurring: taskData.isRecurring ?? false,
      recurrenceRule: taskData.recurrenceRule || null,
      remindAtDue: taskData.remindAtDue ?? true,
      reminderIntervalMinutes:
        taskData.reminderIntervalMinutes !== undefined
          ? taskData.reminderIntervalMinutes
          : settings.defaultReminderIntervalMinutes,
      escalateReminders: taskData.escalateReminders ?? settings.escalationEnabled,
      snoozeUntil: null,
      isCompleted: false,
      completedAt: null,
      isArchived: false,
      subtasks: taskData.subtasks || [],
      createdAt: now,
      updatedAt: now,
    };

    saveDbTask(newTask);
    await scheduleRemindersForTask(newTask, settings);
    refreshTasks();

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignored
    }

    return newTask;
  };

  // Update Task
  const updateTask = async (task: Task): Promise<void> => {
    const settings = getSettings();
    const updated = {
      ...task,
      updatedAt: new Date().toISOString(),
    };
    saveDbTask(updated);
    await scheduleRemindersForTask(updated, settings);
    refreshTasks();
  };

  // Complete Task
  const completeTask = async (taskId: string): Promise<void> => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignored
    }

    const settings = getSettings();
    setUndoAction({ type: 'complete', previousTask: { ...target } });

    if (target.isRecurring && target.recurrenceRule && target.dueDate) {
      // 1. Log completion in history
      addCompletionHistory({
        id: `history-${Date.now()}`,
        taskId: target.id,
        seriesId: target.seriesId || target.id,
        completedAt: new Date().toISOString(),
        dueDate: target.dueDate,
      });

      // 2. Clear current occurrence notifications and tray banners immediately!
      await cancelRemindersForTask(target.id);

      // 3. Advance to next occurrence
      const nextDate = calculateNextOccurrence(target.dueDate, target.recurrenceRule);
      const updatedTask: Task = {
        ...target,
        dueDate: nextDate,
        snoozeUntil: null,
        isCompleted: false,
        completedAt: null,
        updatedAt: new Date().toISOString(),
      };

      saveDbTask(updatedTask);
      await scheduleRemindersForTask(updatedTask, settings);
    } else {
      // One-time task completion
      const updatedTask: Task = {
        ...target,
        isCompleted: true,
        completedAt: new Date().toISOString(),
        snoozeUntil: null,
        updatedAt: new Date().toISOString(),
      };

      saveDbTask(updatedTask);
      await cancelRemindersForTask(target.id);
    }

    refreshTasks();
  };

  // Reopen Task
  const reopenTask = async (taskId: string): Promise<void> => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const settings = getSettings();
    const updatedTask: Task = {
      ...target,
      isCompleted: false,
      completedAt: null,
      updatedAt: new Date().toISOString(),
    };

    saveDbTask(updatedTask);
    await scheduleRemindersForTask(updatedTask, settings);
    refreshTasks();
  };

  // Delete Task
  const deleteTask = async (taskId: string, deleteSeries = false): Promise<void> => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Ignored
    }

    setUndoAction({ type: 'delete', previousTask: { ...target } });

    if (deleteSeries && target.seriesId) {
      deleteDbSeries(target.seriesId);
    } else {
      deleteDbTask(taskId);
    }
    await cancelRemindersForTask(taskId);

    refreshTasks();
  };

  // Snooze Task
  const snoozeTask = async (taskId: string, minutes: number): Promise<void> => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    try {
      await Haptics.selectionAsync();
    } catch {
      // Ignored
    }

    const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    const settings = getSettings();
    const updatedTask: Task = {
      ...target,
      snoozeUntil,
      updatedAt: new Date().toISOString(),
    };

    saveDbTask(updatedTask);
    await scheduleRemindersForTask(updatedTask, settings);
    refreshTasks();
  };

  // Undo
  const undo = async (): Promise<void> => {
    if (!undoAction) return;

    const { previousTask } = undoAction;
    saveDbTask(previousTask);
    const settings = getSettings();
    await scheduleRemindersForTask(previousTask, settings);

    setUndoAction(null);
    refreshTasks();

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignored
    }
  };

  const dismissUndo = () => {
    setUndoAction(null);
  };

  // Lists CRUD
  const createList = async (name: string, color: string, icon: string): Promise<TaskList> => {
    const newList: TaskList = {
      id: `list-${Date.now()}`,
      name: name.trim(),
      color,
      icon,
      position: lists.length,
      taskCount: 0,
    };
    saveDbList(newList);
    refreshTasks();
    return newList;
  };

  const deleteList = async (listId: string, deleteTasks: boolean): Promise<void> => {
    deleteDbList(listId, deleteTasks);
    await reconcileAllNotifications();
    refreshTasks();
  };

  // Derived filtered views
  const overdueTasks = useMemo(() => {
    const currentDate = new Date();
    return tasks.filter(
      (t) => !t.isCompleted && !t.isArchived && t.dueDate && isTaskOverdue(t.dueDate, t.dueTime, currentDate)
    );
  }, [tasks]);

  const todayTasks = useMemo(() => {
    const todayStr = getTodayString();
    const currentDate = new Date();
    return tasks.filter(
      (t) =>
        !t.isCompleted &&
        !t.isArchived &&
        t.dueDate === todayStr &&
        !isTaskOverdue(t.dueDate, t.dueTime, currentDate)
    );
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    const todayStr = getTodayString();
    return tasks.filter((t) => {
      if (t.isCompleted || t.isArchived || !t.dueDate) return false;
      return t.dueDate > todayStr;
    });
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter((t) => t.isCompleted && !t.isArchived);
  }, [tasks]);

  const todayProgress = useMemo(() => {
    const todayStr = getTodayString();
    const tasksForToday = tasks.filter((t) => t.dueDate === todayStr);
    const completedForToday = tasksForToday.filter((t) => t.isCompleted).length;
    const total = tasksForToday.length;
    const percentage = total > 0 ? Math.round((completedForToday / total) * 100) : 0;
    return { total, completed: completedForToday, percentage };
  }, [tasks]);

  // Synchronize sticky lock screen notification & widget payload
  useEffect(() => {
    if (isLoading) return;
    try {
      const currentSettings = getSettings();
      const todayStr = getTodayString();
      const completedToday = tasks.filter(
        (t) =>
          t.isCompleted &&
          (t.dueDate === todayStr || (t.completedAt && t.completedAt.startsWith(todayStr)))
      );

      // 1. Sync ongoing sticky notification for highest priority overdue task
      syncStickyNotification(overdueTasks, currentSettings);

      // 2. Sync widget data payload for home screen glanceable widget
      syncWidgetData({
        overdueTasks,
        todayTasks,
        completedTodayTasks: completedToday,
      });
    } catch {
      // Sync fallback
    }
  }, [tasks, overdueTasks, todayTasks, isLoading]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        lists,
        isLoading,
        undoAction,
        refreshTasks,
        createTask,
        updateTask,
        completeTask,
        reopenTask,
        deleteTask,
        snoozeTask,
        undo,
        dismissUndo,
        createList,
        deleteList,
        overdueTasks,
        todayTasks,
        upcomingTasks,
        completedTasks,
        todayProgress,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = (): TaskContextValue => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
