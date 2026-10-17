import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  getDay,
  isBefore,
  startOfDay,
} from 'date-fns';
import { RecurrenceRule, MissedOccurrencePolicy } from '../types';
import { parseISODate, formatISODate, getTodayString } from './date';

export const calculateNextOccurrence = (
  baseDateStr: string,
  rule: RecurrenceRule,
  referenceDate: Date = new Date()
): string => {
  const baseDate = parseISODate(baseDateStr);
  const interval = Math.max(1, rule.interval || 1);

  switch (rule.frequency) {
    case 'daily': {
      let next = addDays(baseDate, interval);
      return formatISODate(next);
    }

    case 'weekdays': {
      let next = addDays(baseDate, 1);
      while (getDay(next) === 0 || getDay(next) === 6) {
        // Skip Sunday (0) and Saturday (6)
        next = addDays(next, 1);
      }
      return formatISODate(next);
    }

    case 'weekends': {
      let next = addDays(baseDate, 1);
      while (getDay(next) !== 0 && getDay(next) !== 6) {
        // Find Saturday (6) or Sunday (0)
        next = addDays(next, 1);
      }
      return formatISODate(next);
    }

    case 'weekly': {
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // Sort desired days of week
        const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);
        const currentDayOfWeek = getDay(baseDate);

        // Find the next day in the current week cycle
        const nextDayInWeek = sortedDays.find((d) => d > currentDayOfWeek);
        if (nextDayInWeek !== undefined) {
          const daysToAdd = nextDayInWeek - currentDayOfWeek;
          return formatISODate(addDays(baseDate, daysToAdd));
        }

        // Otherwise wrap around to the first day of the next interval week
        const firstDay = sortedDays[0];
        const daysUntilEndOfWeek = 7 - currentDayOfWeek;
        const weeksToSkip = (interval - 1) * 7;
        const next = addDays(baseDate, daysUntilEndOfWeek + weeksToSkip + firstDay);
        return formatISODate(next);
      }

      // Plain weekly without specific days
      const next = addWeeks(baseDate, interval);
      return formatISODate(next);
    }

    case 'monthly': {
      const next = addMonths(baseDate, interval);
      return formatISODate(next);
    }

    case 'yearly': {
      const next = addYears(baseDate, interval);
      return formatISODate(next);
    }

    case 'custom':
    default: {
      const next = addDays(baseDate, interval);
      return formatISODate(next);
    }
  }
};

export const reconcileMissedOccurrences = (
  dueDateStr: string,
  rule: RecurrenceRule,
  policy: MissedOccurrencePolicy,
  now: Date = new Date()
): string => {
  const dueDate = parseISODate(dueDateStr);
  const today = startOfDay(now);

  // If due date is already today or in the future, return as is
  if (!isBefore(dueDate, today)) {
    return dueDateStr;
  }

  if (policy === 'keep_overdue') {
    return dueDateStr;
  }

  if (policy === 'reschedule_today') {
    return getTodayString();
  }

  // policy === 'skip': step forward until we reach today or the future
  let candidate = dueDateStr;
  let safetyLimit = 100; // prevent runaway loops
  while (safetyLimit > 0) {
    const candidateDate = parseISODate(candidate);
    if (!isBefore(candidateDate, today)) {
      return candidate;
    }
    candidate = calculateNextOccurrence(candidate, rule, now);
    safetyLimit--;
  }

  return getTodayString();
};

export const formatRecurrenceRule = (rule?: RecurrenceRule | null): string => {
  if (!rule) return 'Does not repeat';

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  switch (rule.frequency) {
    case 'daily':
      return rule.interval === 1 ? 'Every day' : `Every ${rule.interval} days`;

    case 'weekdays':
      return 'Every weekday (Mon-Fri)';

    case 'weekends':
      return 'Every weekend (Sat-Sun)';

    case 'weekly': {
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        if (rule.daysOfWeek.length === 7) return 'Every day';
        const days = rule.daysOfWeek.map((d) => dayNames[d]).join(', ');
        return rule.interval === 1 ? `Every ${days}` : `Every ${rule.interval} weeks on ${days}`;
      }
      return rule.interval === 1 ? 'Every week' : `Every ${rule.interval} weeks`;
    }

    case 'monthly':
      return rule.interval === 1 ? 'Every month' : `Every ${rule.interval} months`;

    case 'yearly':
      return rule.interval === 1 ? 'Every year' : `Every ${rule.interval} years`;

    case 'custom':
      return `Every ${rule.interval} days`;

    default:
      return 'Repeats';
  }
};
