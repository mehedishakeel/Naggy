import { validateBackupPayload } from '../src/utils/backup';

describe('Backup Validation', () => {
  test('validates valid backup structure', () => {
    const valid = {
      version: 1,
      exportedAt: '2026-10-13T00:00:00Z',
      settings: {},
      lists: [{ id: 'list-1', name: 'Work' }],
      tasks: [
        { id: 'task-1', title: 'Task 1', isCompleted: false },
        { id: 'task-2', title: 'Task 2', isCompleted: true },
      ],
    };

    const res = validateBackupPayload(valid);
    expect(res.isValid).toBe(true);
  });

  test('rejects payload missing tasks array', () => {
    const invalid = {
      version: 1,
      lists: [],
    };

    const res = validateBackupPayload(invalid);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('tasks');
  });

  test('rejects payload missing lists array', () => {
    const invalid = {
      version: 1,
      tasks: [],
    };

    const res = validateBackupPayload(invalid);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('lists');
  });

  test('rejects tasks with missing titles', () => {
    const corrupted = {
      version: 1,
      lists: [],
      tasks: [{ id: 'task-1' }], // missing title
    };

    const res = validateBackupPayload(corrupted);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('corrupted');
  });
});
