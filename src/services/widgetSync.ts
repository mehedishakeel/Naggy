import { Paths, File } from 'expo-file-system';
import { Task } from '../types';

export interface WidgetTaskPayload {
  overdueCount: number;
  todayCount: number;
  completedTodayCount: number;
  topOverdueTask: {
    id: string;
    title: string;
    dueTime: string | null;
    priority: string;
  } | null;
  lastUpdated: string;
}

const WIDGET_DATA_FILENAME = 'naggy_widget_data.json';

/**
 * Computes the widget payload and writes it to disk so the native Android widget
 * and lock screen components can read it instantly.
 */
export const syncWidgetData = async ({
  overdueTasks,
  todayTasks,
  completedTodayTasks,
}: {
  overdueTasks: Task[];
  todayTasks: Task[];
  completedTodayTasks: Task[];
}): Promise<WidgetTaskPayload> => {
  const topTask = overdueTasks[0] || null;

  const payload: WidgetTaskPayload = {
    overdueCount: overdueTasks.length,
    todayCount: todayTasks.length,
    completedTodayCount: completedTodayTasks.length,
    topOverdueTask: topTask
      ? {
          id: topTask.id,
          title: topTask.title,
          dueTime: topTask.dueTime || null,
          priority: topTask.priority,
        }
      : null,
    lastUpdated: new Date().toISOString(),
  };

  try {
    const file = new File(Paths.document, WIDGET_DATA_FILENAME);
    if (!file.exists) {
      file.create();
    }
    file.write(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.warn('Failed to write widget synchronization payload:', err);
  }

  return payload;
};

/**
 * Reads the latest widget synchronization payload from disk
 */
export const readWidgetData = async (): Promise<WidgetTaskPayload | null> => {
  try {
    const file = new File(Paths.document, WIDGET_DATA_FILENAME);
    if (file.exists && typeof file.text === 'function') {
      const content = await file.text();
      return JSON.parse(content) as WidgetTaskPayload;
    }
  } catch {
    // Return null if unreadable
  }
  return null;
};
