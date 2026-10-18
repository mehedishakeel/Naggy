import { addDays, getDay } from 'date-fns';
import { Priority, RecurrenceRule } from '../types';
import { formatISODate, getTodayString, getTimeAfterMinutes } from './date';

export interface ParsedTaskInput {
  cleanTitle: string;
  dueDate?: string | null;
  dueTime?: string | null;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule | null;
  priority?: Priority;
  hasParsedElements: boolean;
  explanation?: string;
}

export const parseNaturalLanguageTask = (input: string): ParsedTaskInput => {
  if (typeof input !== 'string') {
    return {
      cleanTitle: '',
      dueDate: null,
      dueTime: null,
      isRecurring: false,
      recurrenceRule: null,
      hasParsedElements: false,
    };
  }

  // Security: Cap maximum input length to 500 characters to prevent ReDoS / excessive regex compute
  let title = input.slice(0, 500).trim();
  if (!title) {
    return {
      cleanTitle: '',
      dueDate: null,
      dueTime: null,
      isRecurring: false,
      recurrenceRule: null,
      hasParsedElements: false,
    };
  }

  let dueDate: string | null = null;
  let dueTime: string | null = null;
  let isRecurring = false;
  let recurrenceRule: RecurrenceRule | null = null;
  let priority: Priority | undefined = undefined;
  const explanations: string[] = [];

  // 1. Detect Priority markers
  if (/\b(urgent|p1)\b/i.test(title)) {
    priority = 'urgent';
    title = title.replace(/\b(urgent|p1)\b/i, '').trim();
    explanations.push('Priority: Urgent');
  } else if (/\b(high priority|important|p2)\b/i.test(title)) {
    priority = 'high';
    title = title.replace(/\b(high priority|important|p2)\b/i, '').trim();
    explanations.push('Priority: High');
  } else if (/\b(low priority|p4)\b/i.test(title)) {
    priority = 'low';
    title = title.replace(/\b(low priority|p4)\b/i, '').trim();
    explanations.push('Priority: Low');
  }

  // 2. Detect Recurrence patterns:
  // "every weekday", "every day", "daily", "every weekend", "every monday", "every week", "every month"
  const weekdayRegex = /\b(every\s+weekday|on\s+weekdays)\b/i;
  const weekendRegex = /\b(every\s+weekend|on\s+weekends)\b/i;
  const dailyRegex = /\b(every\s+day|daily)\b/i;
  const weeklyDayRegex = /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
  const weeklyRegex = /\b(every\s+week|weekly)\b/i;
  const monthlyRegex = /\b(every\s+month|monthly)\b/i;

  if (weekdayRegex.test(title)) {
    isRecurring = true;
    recurrenceRule = { frequency: 'weekdays', interval: 1, daysOfWeek: [1, 2, 3, 4, 5] };
    dueDate = getTodayString();
    title = title.replace(weekdayRegex, '').trim();
    explanations.push('Repeats: Weekdays');
  } else if (weekendRegex.test(title)) {
    isRecurring = true;
    recurrenceRule = { frequency: 'weekends', interval: 1, daysOfWeek: [0, 6] };
    dueDate = getTodayString();
    title = title.replace(weekendRegex, '').trim();
    explanations.push('Repeats: Weekends');
  } else if (dailyRegex.test(title)) {
    isRecurring = true;
    recurrenceRule = { frequency: 'daily', interval: 1 };
    dueDate = getTodayString();
    title = title.replace(dailyRegex, '').trim();
    explanations.push('Repeats: Daily');
  } else if (weeklyDayRegex.test(title)) {
    const match = title.match(weeklyDayRegex);
    if (match) {
      const dayName = match[1].toLowerCase();
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      const dayIdx = dayMap[dayName];
      isRecurring = true;
      recurrenceRule = { frequency: 'weekly', interval: 1, daysOfWeek: [dayIdx] };
      // compute next occurrence of that day
      const today = new Date();
      const currentDay = getDay(today);
      const daysToAdd = (dayIdx - currentDay + 7) % 7;
      dueDate = formatISODate(addDays(today, daysToAdd === 0 ? 0 : daysToAdd));
      title = title.replace(weeklyDayRegex, '').trim();
      explanations.push(`Repeats: Every ${match[1]}`);
    }
  } else if (weeklyRegex.test(title)) {
    isRecurring = true;
    recurrenceRule = { frequency: 'weekly', interval: 1 };
    dueDate = getTodayString();
    title = title.replace(weeklyRegex, '').trim();
    explanations.push('Repeats: Weekly');
  } else if (monthlyRegex.test(title)) {
    isRecurring = true;
    recurrenceRule = { frequency: 'monthly', interval: 1 };
    dueDate = getTodayString();
    title = title.replace(monthlyRegex, '').trim();
    explanations.push('Repeats: Monthly');
  }

  // 3. Detect Due Dates (if not set by recurrence or overridden)
  // "today", "tomorrow", "day after tomorrow", "next monday", etc.
  const todayRegex = /\b(today)\b/i;
  const tomorrowRegex = /\b(tomorrow)\b/i;
  const dayAfterTomorrowRegex = /\b(day after tomorrow)\b/i;

  if (dayAfterTomorrowRegex.test(title)) {
    dueDate = formatISODate(addDays(new Date(), 2));
    title = title.replace(dayAfterTomorrowRegex, '').trim();
    explanations.push('Due: Day after tomorrow');
  } else if (tomorrowRegex.test(title)) {
    dueDate = formatISODate(addDays(new Date(), 1));
    title = title.replace(tomorrowRegex, '').trim();
    explanations.push('Due: Tomorrow');
  } else if (todayRegex.test(title)) {
    dueDate = getTodayString();
    title = title.replace(todayRegex, '').trim();
    explanations.push('Due: Today');
  }

  // 4. Detect Times:
  // Relative offset: "in 5 minutes", "in 10 mins", "in 1 hour", "in 30 min"
  const relativeTimeRegex = /\bin\s+(\d+)\s*(mins?|minutes?|hours?|hrs?)\b/i;
  const relMatch = title.match(relativeTimeRegex);

  if (relMatch) {
    const amount = parseInt(relMatch[1], 10);
    const unit = relMatch[2].toLowerCase();
    const minutes = unit.startsWith('h') ? amount * 60 : amount;
    const { date, time } = getTimeAfterMinutes(minutes);
    dueDate = date;
    dueTime = time;
    title = title.replace(relMatch[0], '').trim();
    explanations.push(`Due in ${amount} ${unit} (${time})`);
  } else {
    // "at 6:30pm", "at 6pm", "at 8 am", "6:30 pm", "18:00", "8am"
    const timeRegex = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
    const time24Regex = /\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i;

    const timeMatch = title.match(timeRegex);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridian = timeMatch[3].toLowerCase();

      if (meridian === 'pm' && hours < 12) hours += 12;
      if (meridian === 'am' && hours === 12) hours = 0;

      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      dueTime = `${formattedHours}:${formattedMinutes}`;

      title = title.replace(timeMatch[0], '').trim();
      explanations.push(`Time: ${dueTime}`);

      // If a time was specified but no date yet, default to today
      if (!dueDate) {
        dueDate = getTodayString();
      }
    } else {
      const time24Match = title.match(time24Regex);
      if (time24Match) {
        const hours = time24Match[1].padStart(2, '0');
        const minutes = time24Match[2];
        dueTime = `${hours}:${minutes}`;
        title = title.replace(time24Match[0], '').trim();
        explanations.push(`Time: ${dueTime}`);
        if (!dueDate) {
          dueDate = getTodayString();
        }
      }
    }
  }

  // Clean extra spaces, leading/trailing punctuation like commas or "at"
  title = title
    .replace(/\s+/g, ' ')
    .replace(/^[,.\s-]+|[,.\s-]+$/g, '')
    .trim();

  // If title became empty after stripping everything, keep original
  const cleanTitle = title || input.trim();
  const hasParsedElements = !!(dueDate || dueTime || isRecurring || priority);

  return {
    cleanTitle,
    dueDate,
    dueTime,
    isRecurring,
    recurrenceRule,
    priority,
    hasParsedElements,
    explanation: explanations.join(' • '),
  };
};
