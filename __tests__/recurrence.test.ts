import {
  calculateNextOccurrence,
  reconcileMissedOccurrences,
  formatRecurrenceRule,
} from '../src/utils/recurrence';
import { RecurrenceRule } from '../src/types';

describe('Recurrence Engine', () => {
  test('calculates daily occurrence correctly', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
    const next = calculateNextOccurrence('2026-10-13', rule);
    expect(next).toBe('2026-10-14');
  });

  test('calculates custom interval (every 3 days)', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 3 };
    const next = calculateNextOccurrence('2026-10-13', rule);
    expect(next).toBe('2026-10-16');
  });

  test('skips weekends for weekday recurring tasks', () => {
    const rule: RecurrenceRule = { frequency: 'weekdays', interval: 1 };
    // Friday 2026-10-16
    const next = calculateNextOccurrence('2026-10-16', rule);
    // Should jump over Saturday (17) and Sunday (18) to Monday (19)
    expect(next).toBe('2026-10-19');
  });

  test('calculates weekly specific days (e.g. Mon, Wed, Fri)', () => {
    // 2026-10-12 is Monday (1). Days: Mon(1), Wed(3), Fri(5)
    const rule: RecurrenceRule = { frequency: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] };
    const next = calculateNextOccurrence('2026-10-12', rule);
    expect(next).toBe('2026-10-14'); // Wednesday

    const nextAfterWed = calculateNextOccurrence('2026-10-14', rule);
    expect(nextAfterWed).toBe('2026-10-16'); // Friday

    const nextAfterFri = calculateNextOccurrence('2026-10-16', rule);
    expect(nextAfterFri).toBe('2026-10-19'); // Following Monday
  });

  test('monthly recurrence advances 1 month', () => {
    const rule: RecurrenceRule = { frequency: 'monthly', interval: 1 };
    const next = calculateNextOccurrence('2026-10-15', rule);
    expect(next).toBe('2026-11-15');
  });

  test('missed occurrence policy "skip" steps forward to today or future', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
    const pastDueDate = '2026-09-01'; // Over a month ago
    const today = new Date('2026-10-13T09:00:00');

    const reconciled = reconcileMissedOccurrences(pastDueDate, rule, 'skip', today);
    expect(reconciled >= '2026-10-13').toBe(true);
  });

  test('missed occurrence policy "keep_overdue" keeps past due date', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
    const pastDueDate = '2026-10-01';
    const today = new Date('2026-10-13T09:00:00');

    const reconciled = reconcileMissedOccurrences(pastDueDate, rule, 'keep_overdue', today);
    expect(reconciled).toBe('2026-10-01');
  });

  test('formatRecurrenceRule produces clean descriptions', () => {
    expect(formatRecurrenceRule({ frequency: 'daily', interval: 1 })).toBe('Every day');
    expect(formatRecurrenceRule({ frequency: 'weekdays', interval: 1 })).toBe('Every weekday (Mon-Fri)');
    expect(formatRecurrenceRule({ frequency: 'weekly', interval: 2 })).toBe('Every 2 weeks');
  });
});
