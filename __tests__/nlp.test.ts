import { parseNaturalLanguageTask } from '../src/utils/nlp';

describe('Natural Language Task Parser', () => {
  test('parses "Exercise every day at 6 PM"', () => {
    const input = 'Exercise every day at 6 PM';
    const result = parseNaturalLanguageTask(input);

    expect(result.cleanTitle).toBe('Exercise');
    expect(result.isRecurring).toBe(true);
    expect(result.recurrenceRule?.frequency).toBe('daily');
    expect(result.dueTime).toBe('18:00');
    expect(result.dueDate).toBeDefined();
  });

  test('parses "Pay electricity bill tomorrow at 10 AM"', () => {
    const input = 'Pay electricity bill tomorrow at 10 AM';
    const result = parseNaturalLanguageTask(input);

    expect(result.cleanTitle).toBe('Pay electricity bill');
    expect(result.dueTime).toBe('10:00');
    expect(result.dueDate).toBeDefined();
    expect(result.isRecurring).toBe(false);
  });

  test('parses "Study every weekday at 8 PM"', () => {
    const input = 'Study every weekday at 8 PM';
    const result = parseNaturalLanguageTask(input);

    expect(result.cleanTitle).toBe('Study');
    expect(result.isRecurring).toBe(true);
    expect(result.recurrenceRule?.frequency).toBe('weekdays');
    expect(result.dueTime).toBe('20:00');
  });

  test('parses priority keywords', () => {
    const input = 'Call doctor urgent at 2pm';
    const result = parseNaturalLanguageTask(input);

    expect(result.cleanTitle).toBe('Call doctor');
    expect(result.priority).toBe('urgent');
    expect(result.dueTime).toBe('14:00');
  });

  test('handles plain tasks without date/time safely', () => {
    const input = 'Buy organic apples';
    const result = parseNaturalLanguageTask(input);

    expect(result.cleanTitle).toBe('Buy organic apples');
    expect(result.hasParsedElements).toBe(false);
    expect(result.dueTime).toBeNull();
  });

  test('safely handles non-string input and caps oversized inputs to prevent ReDoS', () => {
    // Non-string
    const nonStringResult = parseNaturalLanguageTask(null as any);
    expect(nonStringResult.cleanTitle).toBe('');

    // Extremely long string (10,000 characters)
    const longInput = 'A'.repeat(10000);
    const longResult = parseNaturalLanguageTask(longInput);
    expect(longResult.cleanTitle.length).toBeLessThanOrEqual(500);
  });
});
