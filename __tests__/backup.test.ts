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

  test('rejects corrupted list records', () => {
    const corrupted = {
      version: 1,
      lists: [{ id: 123 }], // missing name, non-string id
      tasks: [{ id: 'task-1', title: 'Valid' }],
    };

    const res = validateBackupPayload(corrupted);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('list records');
  });

  test('sanitizes and strips unauthorized settings properties (property injection defense)', () => {
    const payload = {
      version: 1,
      lists: [{ id: 'list-1', name: 'Work' }],
      tasks: [{ id: 'task-1', title: 'Valid' }],
      settings: {
        theme: 'dark',
        __proto__: { admin: true },
        maliciousKey: 'drop table tasks',
        remindersEnabled: true,
      },
    };

    const res = validateBackupPayload(payload);
    expect(res.isValid).toBe(true);
    expect(payload.settings.theme).toBe('dark');
    expect(payload.settings.remindersEnabled).toBe(true);
    expect((payload.settings as any).maliciousKey).toBeUndefined();
  });
});
