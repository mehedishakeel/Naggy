import {
  isTaskOverdue,
  combineDateAndTime,
  formatDisplayDate,
  formatDisplayTime,
  getDueStatusText,
} from '../src/utils/date';

describe('Date & Time Utilities', () => {
  test('combineDateAndTime sets hours and minutes correctly', () => {
    const combined = combineDateAndTime('2026-10-15', '08:30');
    expect(combined.getFullYear()).toBe(2026);
    expect(combined.getMonth()).toBe(9); // 0-indexed: October
    expect(combined.getDate()).toBe(15);
    expect(combined.getHours()).toBe(8);
    expect(combined.getMinutes()).toBe(30);
  });

  test('isTaskOverdue returns true when due date and time is in past', () => {
    const pastDate = '2026-10-10';
    const pastTime = '08:00';
    const now = new Date('2026-10-13T10:00:00');

    expect(isTaskOverdue(pastDate, pastTime, now)).toBe(true);
  });

  test('isTaskOverdue returns false when due date and time is in future', () => {
    const futureDate = '2026-10-20';
    const futureTime = '18:00';
    const now = new Date('2026-10-13T10:00:00');

    expect(isTaskOverdue(futureDate, futureTime, now)).toBe(false);
  });

  test('formatDisplayTime formats 24h to 12h with AM/PM', () => {
    expect(formatDisplayTime('08:00')).toBe('8:00 AM');
    expect(formatDisplayTime('18:30')).toBe('6:30 PM');
    expect(formatDisplayTime('00:15')).toBe('12:15 AM');
  });

  test('getDueStatusText detects overdue minutes correctly', () => {
    const now = new Date('2026-10-13T10:25:00');
    const result = getDueStatusText('2026-10-13', '10:00', now);

    expect(result.isOverdue).toBe(true);
    expect(result.text).toContain('Overdue by 25m');
  });
});
