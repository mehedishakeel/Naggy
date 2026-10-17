import {
  calculateStreaks,
  calculateAvgTimeToCompletion,
  generateDailyBriefing,
  computeAccountabilityMetrics,
} from '../src/services/analytics';
import { Task } from '../src/types';
import { getTodayString } from '../src/utils/date';

describe('Accountability & Nag Analytics Service', () => {
  test('calculateStreaks calculates active and historical streaks', () => {
    const today = getTodayString();
    const d1 = new Date();
    d1.setDate(d1.getDate() - 1);
    const yesterday = d1.toISOString().split('T')[0];

    const d2 = new Date();
    d2.setDate(d2.getDate() - 2);
    const dayBeforeYesterday = d2.toISOString().split('T')[0];

    // 3 consecutive days
    const dates = [today, yesterday, dayBeforeYesterday];
    const { currentStreak, bestStreak } = calculateStreaks(dates);

    expect(currentStreak).toBe(3);
    expect(bestStreak).toBe(3);
  });

  test('calculateStreaks handles broken streak', () => {
    // 5 days ago
    const dOld = new Date();
    dOld.setDate(dOld.getDate() - 5);
    const oldDate = dOld.toISOString().split('T')[0];

    const { currentStreak, bestStreak } = calculateStreaks([oldDate]);
    expect(currentStreak).toBe(0);
    expect(bestStreak).toBe(1);
  });

  test('calculateAvgTimeToCompletion computes average delay in minutes', () => {
    const tasks: Task[] = [
      {
        id: 'task-1',
        title: 'Task 1',
        dueDate: '2026-10-15',
        dueTime: '10:00',
        completedAt: '2026-10-15T10:30:00Z',
        isCompleted: true,
        priority: 'none',
        remindAtDue: true,
        reminderIntervalMinutes: 10,
        escalateReminders: false,
        isRecurring: false,
        isArchived: false,
        isAllDay: false,
        createdAt: '2026-10-15T09:00:00Z',
        updatedAt: '2026-10-15T10:30:00Z',
      },
    ];

    const avgMinutes = calculateAvgTimeToCompletion(tasks);
    expect(avgMinutes).toBeGreaterThanOrEqual(0);
  });

  test('generateDailyBriefing provides motivational advice depending on overdue count', () => {
    const briefingOverdue = generateDailyBriefing({
      overdueCount: 3,
      todayCount: 2,
      completedTodayCount: 0,
      currentStreak: 1,
    });

    expect(briefingOverdue.headline).toBeDefined();
    expect(briefingOverdue.period).toBeDefined();
    expect(briefingOverdue.actionAdvice).toBeDefined();

    const briefingClean = generateDailyBriefing({
      overdueCount: 0,
      todayCount: 4,
      completedTodayCount: 2,
      currentStreak: 5,
    });

    expect(briefingClean.summary).toBeDefined();
    expect(briefingClean.headline).toBeDefined();
  });

  test('computeAccountabilityMetrics aggregates stats without crashing', () => {
    const tasks: Task[] = [
      {
        id: 't-1',
        title: 'Completed Task',
        dueDate: getTodayString(),
        dueTime: '12:00',
        isCompleted: true,
        completedAt: new Date().toISOString(),
        priority: 'high',
        remindAtDue: true,
        reminderIntervalMinutes: 10,
        escalateReminders: false,
        isRecurring: false,
        isArchived: false,
        isAllDay: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const metrics = computeAccountabilityMetrics(tasks);
    expect(metrics.totalCompleted).toBe(1);
    expect(metrics.weeklyTrend.length).toBe(7);
    expect(metrics.briefing).toBeDefined();
  });
});
