import { extractTagsFromTasks, filterTasksByTag } from '../src/components/TagFilterBar';
import { Task, TaskList } from '../src/types';

describe('Smart Tag Filter Bar & Extraction', () => {
  const dummyLists: TaskList[] = [
    { id: 'list-work', name: 'Work', color: '#8B5CF6', icon: 'briefcase', position: 0 },
    { id: 'list-health', name: 'Health', color: '#10B981', icon: 'heart', position: 1 },
  ];

  const sampleTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Review quarterly report #finance #work',
      dueDate: '2026-10-18',
      dueTime: '10:00',
      isAllDay: false,
      priority: 'urgent',
      listId: 'list-work',
      isRecurring: false,
      remindAtDue: true,
      reminderIntervalMinutes: 10,
      escalateReminders: false,
      isCompleted: false,
      isArchived: false,
      createdAt: '2026-10-18T00:00:00.000Z',
      updatedAt: '2026-10-18T00:00:00.000Z',
    },
    {
      id: 'task-2',
      title: 'Go for a 5k jog',
      notes: 'Remember to stretch #fitness',
      dueDate: '2026-10-18',
      dueTime: '17:00',
      isAllDay: false,
      priority: 'normal',
      listId: 'list-health',
      isRecurring: false,
      remindAtDue: true,
      reminderIntervalMinutes: 10,
      escalateReminders: false,
      isCompleted: false,
      isArchived: false,
      createdAt: '2026-10-18T00:00:00.000Z',
      updatedAt: '2026-10-18T00:00:00.000Z',
    },
  ];

  test('extracts hashtags from titles and notes, list names, and urgent priority', () => {
    const tags = extractTagsFromTasks(sampleTasks, dummyLists);
    const tagNames = tags.map((t) => t.tag);

    expect(tagNames).toContain('#finance');
    expect(tagNames).toContain('#work');
    expect(tagNames).toContain('#urgent');
    expect(tagNames).toContain('#fitness');
    expect(tagNames).toContain('#health');
  });

  test('filters tasks accurately by tag', () => {
    const financeFiltered = filterTasksByTag(sampleTasks, '#finance', dummyLists);
    expect(financeFiltered.length).toBe(1);
    expect(financeFiltered[0].id).toBe('task-1');

    const fitnessFiltered = filterTasksByTag(sampleTasks, '#fitness', dummyLists);
    expect(fitnessFiltered.length).toBe(1);
    expect(fitnessFiltered[0].id).toBe('task-2');

    const healthFiltered = filterTasksByTag(sampleTasks, '#health', dummyLists);
    expect(healthFiltered.length).toBe(1);
    expect(healthFiltered[0].id).toBe('task-2');

    const allFiltered = filterTasksByTag(sampleTasks, 'all', dummyLists);
    expect(allFiltered.length).toBe(2);

    const nullFiltered = filterTasksByTag(sampleTasks, null, dummyLists);
    expect(nullFiltered.length).toBe(2);
  });
});
