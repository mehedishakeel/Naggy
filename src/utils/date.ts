import {
  format,
  parse,
  isToday,
  isTomorrow,
  isYesterday,
  isBefore,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  startOfDay,
  endOfDay,
} from 'date-fns';

export const ISO_DATE_FORMAT = 'yyyy-MM-dd';
export const TIME_FORMAT = 'HH:mm';

export const getTodayString = (): string => {
  return format(new Date(), ISO_DATE_FORMAT);
};

export const getCurrentTimeString = (): string => {
  return format(new Date(), TIME_FORMAT);
};

export const parseISODate = (dateString: string): Date => {
  return parse(dateString, ISO_DATE_FORMAT, new Date());
};

export const formatISODate = (date: Date): string => {
  return format(date, ISO_DATE_FORMAT);
};

export const combineDateAndTime = (dateStr: string, timeStr?: string | null): Date => {
  const base = parseISODate(dateStr);
  if (!timeStr) {
    return startOfDay(base);
  }
  const [hours, minutes] = timeStr.split(':').map((v) => parseInt(v, 10));
  const result = new Date(base);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
};

export const formatDisplayDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const date = parseISODate(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';

  const currentYear = new Date().getFullYear();
  if (date.getFullYear() === currentYear) {
    return format(date, 'EEE, MMM d');
  }
  return format(date, 'MMM d, yyyy');
};

export const formatDisplayTime = (timeStr?: string | null): string => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  const dummy = new Date();
  dummy.setHours(h, m, 0, 0);
  return format(dummy, 'h:mm a');
};

export const isTaskOverdue = (
  dueDate?: string | null,
  dueTime?: string | null,
  now = new Date()
): boolean => {
  if (!dueDate) return false;
  if (!dueTime) {
    // All day task is overdue only after end of day
    const dueDayEnd = endOfDay(parseISODate(dueDate));
    return isBefore(dueDayEnd, now);
  }
  const dueDateTime = combineDateAndTime(dueDate, dueTime);
  return isBefore(dueDateTime, now);
};

export const getDueStatusText = (
  dueDate?: string | null,
  dueTime?: string | null,
  now = new Date()
): { text: string; isOverdue: boolean; isToday: boolean } => {
  if (!dueDate) {
    return { text: 'No due date', isOverdue: false, isToday: false };
  }

  const date = parseISODate(dueDate);
  const isDueToday = isToday(date);
  const overdue = isTaskOverdue(dueDate, dueTime, now);

  if (overdue) {
    if (dueTime) {
      const dueDateTime = combineDateAndTime(dueDate, dueTime);
      const diffMins = differenceInMinutes(now, dueDateTime);
      if (diffMins < 60) {
        return { text: `Overdue by ${diffMins}m`, isOverdue: true, isToday: isDueToday };
      }
      const diffHours = differenceInHours(now, dueDateTime);
      if (diffHours < 24) {
        return { text: `Overdue by ${diffHours}h`, isOverdue: true, isToday: isDueToday };
      }
      const diffDays = differenceInDays(now, dueDateTime);
      return { text: `Overdue by ${diffDays}d`, isOverdue: true, isToday: isDueToday };
    }
    const diffDays = differenceInDays(now, date);
    return {
      text: diffDays > 0 ? `Overdue by ${diffDays}d` : 'Overdue',
      isOverdue: true,
      isToday: isDueToday,
    };
  }

  // Not overdue
  if (isDueToday) {
    if (dueTime) {
      return { text: `Today at ${formatDisplayTime(dueTime)}`, isOverdue: false, isToday: true };
    }
    return { text: 'Today', isOverdue: false, isToday: true };
  }

  if (isTomorrow(date)) {
    if (dueTime) {
      return { text: `Tomorrow at ${formatDisplayTime(dueTime)}`, isOverdue: false, isToday: false };
    }
    return { text: 'Tomorrow', isOverdue: false, isToday: false };
  }

  const formattedDate = formatDisplayDate(dueDate);
  if (dueTime) {
    return { text: `${formattedDate} at ${formatDisplayTime(dueTime)}`, isOverdue: false, isToday: false };
  }
  return { text: formattedDate, isOverdue: false, isToday: false };
};

/**
 * Returns date and time string after given minutes from now (or reference date)
 */
export const getTimeAfterMinutes = (
  minutes: number,
  fromDate = new Date()
): { date: string; time: string } => {
  const target = new Date(fromDate.getTime() + minutes * 60 * 1000);
  return {
    date: formatISODate(target),
    time: format(target, TIME_FORMAT),
  };
};

/**
 * Returns human-readable relative description for when nagging will trigger
 */
export const getRelativeDueDescription = (
  dueDate: string,
  dueTime?: string | null,
  now = new Date()
): string => {
  const target = combineDateAndTime(dueDate, dueTime);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    const pastMins = Math.floor(Math.abs(diffMs) / 60000);
    return pastMins === 0 ? 'starting right now' : `due ${pastMins}m ago (starts immediately)`;
  }
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins === 0) {
    return 'in less than a minute';
  }
  if (diffMins < 60) {
    return `in ${diffMins} min`;
  }
  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  if (diffHours < 24) {
    return remMins > 0 ? `in ${diffHours}h ${remMins}m` : `in ${diffHours}h`;
  }
  const diffDays = Math.round(diffMins / (60 * 24));
  return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
};
