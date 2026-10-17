import { Task } from '../types';
import { getDatabase } from '../database';
import { getTodayString } from '../utils/date';

export interface DayActivity {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Mon", "Tue"
  completedCount: number;
}

export interface SnoozedTaskStat {
  taskId: string;
  title: string;
  priority: string;
  dueDate: string | null;
}

export interface AccountabilityMetrics {
  currentStreak: number;
  bestStreak: number;
  totalCompleted: number;
  completionRate: number; // 0 - 100
  avgTimeToCompletionMinutes: number;
  weeklyTrend: DayActivity[];
  mostPostponedTasks: SnoozedTaskStat[];
  briefing: {
    period: 'morning' | 'afternoon' | 'evening';
    headline: string;
    summary: string;
    actionAdvice: string;
  };
}

/**
 * Calculates consecutive daily streaks from a list of completion dates
 */
export const calculateStreaks = (completionDates: string[]): { currentStreak: number; bestStreak: number } => {
  if (completionDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Get unique sorted dates (YYYY-MM-DD) descending
  const uniqueDates = Array.from(new Set(completionDates))
    .filter(Boolean)
    .sort()
    .reverse();

  if (uniqueDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const todayStr = getTodayString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Current streak calculation:
  // Starts if completed today or yesterday
  let currentStreak = 0;
  let checkDate = new Date();

  // If today has completion, start counting from today; otherwise from yesterday
  if (uniqueDates.includes(todayStr)) {
    checkDate = new Date();
  } else if (uniqueDates.includes(yesterdayStr)) {
    checkDate = yesterday;
  } else {
    // Streak broken
    checkDate = new Date(0);
  }

  if (checkDate.getTime() > 0) {
    let cursor = new Date(checkDate);
    while (true) {
      const dateStr = cursor.toISOString().split('T')[0];
      if (uniqueDates.includes(dateStr)) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Best streak calculation:
  // Ascending sort to find longest consecutive chain
  const ascDates = [...uniqueDates].sort();
  let bestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dStr of ascDates) {
    const curDate = new Date(dStr + 'T00:00:00Z');
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
    prevDate = curDate;
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
  };
};

/**
 * Computes average time to completion in minutes (from scheduled due time to completedAt)
 */
export const calculateAvgTimeToCompletion = (completedTasks: Task[]): number => {
  let totalMinutes = 0;
  let validCount = 0;

  for (const t of completedTasks) {
    if (t.dueDate && t.dueTime && t.completedAt) {
      try {
        const scheduled = new Date(`${t.dueDate}T${t.dueTime}:00`);
        const completed = new Date(t.completedAt);
        const diffMs = completed.getTime() - scheduled.getTime();
        // Only count if completed after due (positive delay) or reasonably around it
        const diffMin = Math.round(diffMs / (1000 * 60));
        if (diffMin >= 0 && diffMin < 10080) { // within 7 days
          totalMinutes += diffMin;
          validCount++;
        }
      } catch {
        // Ignore date parsing issues
      }
    }
  }

  return validCount > 0 ? Math.round(totalMinutes / validCount) : 0;
};

/**
 * Generates morning, afternoon, or evening accountability briefing
 */
export const generateDailyBriefing = ({
  overdueCount,
  todayCount,
  completedTodayCount,
  currentStreak,
}: {
  overdueCount: number;
  todayCount: number;
  completedTodayCount: number;
  currentStreak: number;
}) => {
  const hour = new Date().getHours();
  let period: 'morning' | 'afternoon' | 'evening' = 'morning';

  if (hour >= 12 && hour < 17) period = 'afternoon';
  if (hour >= 17) period = 'evening';

  if (period === 'morning') {
    const headline = overdueCount > 0 ? 'Urgent attention required' : 'Ready to conquer today!';
    const summary =
      overdueCount > 0
        ? `You have ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} carryover. Knock them out early so Naggy stops buzzing.`
        : `You have ${todayCount} task${todayCount > 1 ? 's' : ''} scheduled today with an active ${currentStreak}-day streak.`;
    const actionAdvice = 'Start with your highest-priority task first thing this morning.';

    return { period, headline, summary, actionAdvice };
  }

  if (period === 'afternoon') {
    const headline = 'Mid-day momentum check';
    const summary = `You've completed ${completedTodayCount} task${completedTodayCount === 1 ? '' : 's'} today. ${todayCount} remain on deck.`;
    const actionAdvice = overdueCount > 0 ? 'Clear existing overdue tasks to avoid escalation alarms.' : 'Keep the momentum going!';

    return { period, headline, summary, actionAdvice };
  }

  // Evening
  const headline = completedTodayCount > 0 ? 'Great progress today!' : 'Wrap up before bed';
  const summary = `Completed ${completedTodayCount} task${completedTodayCount === 1 ? '' : 's'} today. Streak is at ${currentStreak} day${currentStreak === 1 ? '' : 's'}.`;
  const actionAdvice =
    overdueCount > 0
      ? 'Resolve or snooze pending overdue tasks so quiet hours stay peaceful.'
      : 'Review tomorrow’s agenda and relax knowing everything is on track.';

  return { period, headline, summary, actionAdvice };
};

/**
 * Computes full Accountability & Nag Analytics metrics
 */
export const computeAccountabilityMetrics = (allTasks: Task[]): AccountabilityMetrics => {
  const db = getDatabase();

  // 1. Completion history dates
  let historyRows: { completed_at: string; due_date: string }[] = [];
  try {
    historyRows = db.getAllSync<{ completed_at: string; due_date: string }>(
      'SELECT completed_at, due_date FROM completion_history'
    );
  } catch {
    // History fallback
  }

  const completedTasks = allTasks.filter((t) => t.isCompleted);
  const completionDates = [
    ...historyRows.map((h) => h.completed_at.split('T')[0]),
    ...completedTasks.map((t) => (t.completedAt ? t.completedAt.split('T')[0] : t.dueDate)).filter(Boolean) as string[],
  ];

  const { currentStreak, bestStreak } = calculateStreaks(completionDates);

  // 2. Average time to completion
  const avgTimeToCompletionMinutes = calculateAvgTimeToCompletion(completedTasks);

  // 3. Completion rate
  const totalTasks = allTasks.filter((t) => !t.isArchived).length;
  const totalCompleted = completedTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  // 4. Weekly trend (last 7 days)
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyTrend: DayActivity[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = weekDays[d.getDay()];

    const count = completionDates.filter((c) => c === dateStr).length;
    weeklyTrend.push({
      date: dateStr,
      dayLabel,
      completedCount: count,
    });
  }

  // 5. Most postponed tasks (tasks with snoozeUntil or recurring postponements)
  const postponedList: SnoozedTaskStat[] = allTasks
    .filter((t) => !t.isArchived && (t.snoozeUntil || t.reminderIntervalMinutes > 0))
    .slice(0, 5)
    .map((t) => ({
      taskId: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate || null,
    }));

  // 6. Daily briefing
  const todayStr = getTodayString();
  const overdueCount = allTasks.filter(
    (t) => !t.isCompleted && !t.isArchived && t.dueDate && t.dueDate < todayStr
  ).length;
  const todayCount = allTasks.filter(
    (t) => !t.isCompleted && !t.isArchived && t.dueDate === todayStr
  ).length;
  const completedTodayCount = completedTasks.filter(
    (t) => t.dueDate === todayStr || (t.completedAt && t.completedAt.startsWith(todayStr))
  ).length;

  const briefing = generateDailyBriefing({
    overdueCount,
    todayCount,
    completedTodayCount,
    currentStreak,
  });

  return {
    currentStreak,
    bestStreak,
    totalCompleted,
    completionRate,
    avgTimeToCompletionMinutes,
    weeklyTrend,
    mostPostponedTasks: postponedList,
    briefing,
  };
};
