import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTasks } from '../../context/TaskContext';
import { useNotifications } from '../../context/NotificationContext';
import { Priority, Subtask } from '../../types';
import {
  getDueStatusText,
  formatDisplayTime,
  getTimeAfterMinutes,
  getRelativeDueDescription,
} from '../../utils/date';
import { formatRecurrenceRule } from '../../utils/recurrence';

let subtaskIdSeq = 0;
const createSubtaskId = (prefix: string) => `${prefix}-${Date.now()}-${++subtaskIdSeq}`;

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, typography, spacing, radii, cardStyle } = useTheme();
  const { tasks, updateTask, completeTask, reopenTask, deleteTask, snoozeTask, createTask } = useTasks();
  const { triggerAlarm } = useNotifications();

  const task = tasks.find((t) => t.id === id);

  const [title, setTitle] = useState(task?.title || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [dueDate, setDueDate] = useState<string | null>(task?.dueDate || null);
  const [dueTime, setDueTime] = useState<string | null>(task?.dueTime || null);
  const [isAllDay, setIsAllDay] = useState(task?.isAllDay || false);
  const [priority, setPriority] = useState<Priority>(task?.priority || 'none');
  const [reminderInterval, setReminderInterval] = useState(task?.reminderIntervalMinutes || 10);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Quick offset handler
  const handleQuickOffset = (minutes: number) => {
    const { date, time } = getTimeAfterMinutes(minutes);
    setDueDate(date);
    setDueTime(time);
    setIsAllDay(false);
  };

  // Hour/minute adjust handler
  const adjustDueTime = (hourDelta: number, minuteDelta: number) => {
    const current = dueTime || '09:00';
    const [h, m] = current.split(':').map((v) => parseInt(v, 10));
    let newH = (isNaN(h) ? 9 : h) + hourDelta;
    let newM = (isNaN(m) ? 0 : m) + minuteDelta;

    if (newM >= 60) {
      newH += Math.floor(newM / 60);
      newM = newM % 60;
    } else if (newM < 0) {
      newH -= 1;
      newM = 60 + (newM % 60);
    }

    if (newH >= 24) newH = newH % 24;
    else if (newH < 0) newH = 24 + (newH % 24);

    const formatted = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    setDueTime(formatted);
    setIsAllDay(false);
  };

  if (!task) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[typography.bodyLarge, { color: colors.textSecondary }]}>
          Task not found.
        </Text>
      </View>
    );
  }

  const dueStatus = getDueStatusText(task.dueDate, task.dueTime);

  const handleToggleComplete = async () => {
    if (task.isCompleted) {
      await reopenTask(task.id);
    } else {
      await completeTask(task.id);
      router.back();
    }
  };

  const handleToggleSubtask = (subId: string) => {
    const updated = subtasks.map((s) =>
      s.id === subId ? { ...s, isCompleted: !s.isCompleted } : s
    );
    setSubtasks(updated);
    updateTask({ ...task, subtasks: updated });
  };

  const handleAddSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    const subId = createSubtaskId(`sub-${task.id}`);
    const newSub: Subtask = {
      id: subId,
      taskId: task.id,
      title: trimmed,
      isCompleted: false,
      position: subtasks.length,
    };
    const updated = [...subtasks, newSub];
    setSubtasks(updated);
    setNewSubtaskTitle('');
    updateTask({ ...task, subtasks: updated });
  };

  const handleRemoveSubtask = (subId: string) => {
    const updated = subtasks.filter((s) => s.id !== subId);
    setSubtasks(updated);
    updateTask({ ...task, subtasks: updated });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Task title cannot be empty');
      return;
    }

    await updateTask({
      ...task,
      title: title.trim(),
      notes: notes.trim() || null,
      dueDate,
      dueTime: isAllDay ? null : dueTime,
      isAllDay,
      priority,
      reminderIntervalMinutes: reminderInterval,
      subtasks,
    });

    router.back();
  };

  const handleDuplicate = async () => {
    await createTask({
      title: `${task.title} (Copy)`,
      notes: task.notes,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      isAllDay: task.isAllDay,
      priority: task.priority,
      listId: task.listId,
      reminderIntervalMinutes: task.reminderIntervalMinutes,
      escalateReminders: task.escalateReminders,
      subtasks: task.subtasks?.map((s) => ({ ...s, id: createSubtaskId('sub-dup') })),
    });
    router.back();
  };

  const handleDelete = () => {
    if (task.isRecurring) {
      Alert.alert(
        'Delete Recurring Task',
        'Do you want to delete only this occurrence or the entire recurring series?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'This Occurrence Only',
            onPress: async () => {
              await deleteTask(task.id, false);
              router.back();
            },
          },
          {
            text: 'Entire Series',
            style: 'destructive',
            onPress: async () => {
              await deleteTask(task.id, true);
              router.back();
            },
          },
        ]
      );
    } else {
      Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(task.id);
            router.back();
          },
        },
      ]);
    }
  };

  const handleSnooze = async (minutes: number) => {
    await snoozeTask(task.id, minutes);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, paddingBottom: 60 }]}>
        {/* Top Completion Header */}
        <View style={styles.topActionRow}>
          <TouchableOpacity
            onPress={handleToggleComplete}
            activeOpacity={0.8}
            style={[
              styles.completeBtn,
              {
                backgroundColor: task.isCompleted ? colors.surfaceSecondary : colors.successLight,
                borderColor: task.isCompleted ? colors.border : colors.success,
                borderRadius: radii.pill,
              },
            ]}
          >
            <Ionicons
              name={task.isCompleted ? 'refresh' : 'checkmark'}
              size={18}
              color={task.isCompleted ? colors.textSecondary : colors.success}
            />
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: task.isCompleted ? colors.textSecondary : colors.success,
                  marginLeft: 8,
                  fontWeight: '700',
                },
              ]}
            >
              {task.isCompleted ? 'Reopen Task' : 'Mark as Complete'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Title Input */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Task title"
          placeholderTextColor={colors.textMuted}
          style={[typography.titleMedium, styles.titleInput, { color: colors.text, fontWeight: '700' }]}
        />

        {/* Notes Input */}
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={[
            typography.bodyMedium,
            styles.notesInput,
            { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: radii.md },
          ]}
        />

        {/* Status & Nagging Card */}
        <View style={[styles.card, cardStyle, { borderRadius: radii.xl, marginTop: spacing.md }]}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginBottom: 8 }]}>
            STATUS & SCHEDULE
          </Text>

          <View style={styles.infoRow}>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Due:</Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: dueStatus.isOverdue ? colors.urgent : colors.text, fontWeight: '600' },
              ]}
            >
              {dueStatus.text}
            </Text>
          </View>

          {/* Quick Reschedule relative to now */}
          <View style={{ marginTop: 10 }}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
              QUICK RESCHEDULE (RELATIVE TO NOW)
            </Text>
            <View style={styles.chipsRow}>
              {[
                { label: '+1m (Test)', mins: 1 },
                { label: '+2m', mins: 2 },
                { label: '+5m', mins: 5 },
                { label: '+15m', mins: 15 },
                { label: '+30m', mins: 30 },
                { label: '+1h', mins: 60 },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.mins}
                  onPress={() => handleQuickOffset(opt.mins)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: radii.xs,
                    },
                  ]}
                >
                  <Text style={[typography.micro, { color: colors.primary, fontWeight: '600' }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Time Stepper Editor */}
          <View style={{ marginTop: 10 }}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>
              ADJUST DUE TIME
            </Text>
            <View
              style={[
                styles.timeStepperContainer,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
            >
              <View style={styles.stepperCol}>
                <Text style={[typography.micro, { color: colors.textMuted, marginBottom: 2 }]}>HOUR</Text>
                <View style={styles.stepperBtns}>
                  <TouchableOpacity
                    onPress={() => adjustDueTime(-1, 0)}
                    style={[styles.stepperBtn, { backgroundColor: colors.surface, borderRadius: radii.xs }]}
                  >
                    <Ionicons name="remove" size={16} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[typography.bodyLarge, { color: colors.text, marginHorizontal: 8, fontWeight: '600' }]}>
                    {dueTime ? dueTime.split(':')[0] : '09'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => adjustDueTime(1, 0)}
                    style={[styles.stepperBtn, { backgroundColor: colors.surface, borderRadius: radii.xs }]}
                  >
                    <Ionicons name="add" size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[typography.titleLarge, { color: colors.textMuted, marginHorizontal: 4 }]}>:</Text>

              <View style={styles.stepperCol}>
                <Text style={[typography.micro, { color: colors.textMuted, marginBottom: 2 }]}>MINUTE</Text>
                <View style={styles.stepperBtns}>
                  <TouchableOpacity
                    onPress={() => adjustDueTime(0, -1)}
                    style={[styles.stepperBtn, { backgroundColor: colors.surface, borderRadius: radii.xs }]}
                  >
                    <Ionicons name="remove" size={16} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[typography.bodyLarge, { color: colors.text, marginHorizontal: 8, fontWeight: '600' }]}>
                    {dueTime ? dueTime.split(':')[1] : '00'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => adjustDueTime(0, 1)}
                    style={[styles.stepperBtn, { backgroundColor: colors.surface, borderRadius: radii.xs }]}
                  >
                    <Ionicons name="add" size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.timePreviewBadge}>
                <Text style={[typography.bodyLarge, { color: colors.primary, fontWeight: '700' }]}>
                  {dueTime ? formatDisplayTime(dueTime) : 'All-day'}
                </Text>
              </View>
            </View>
          </View>

          {task.isRecurring && (
            <View style={[styles.infoRow, { marginTop: 8 }]}>
              <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Recurrence:</Text>
              <Text style={[typography.bodyMedium, { color: colors.primary, fontWeight: '600' }]}>
                {formatRecurrenceRule(task.recurrenceRule)}
              </Text>
            </View>
          )}

          {/* Priority selector */}
          <View style={{ marginTop: 10 }}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
              PRIORITY
            </Text>
            <View style={styles.chipsRow}>
              {(['none', 'low', 'normal', 'high', 'urgent'] as Priority[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: priority === p ? colors.primary : colors.surfaceSecondary,
                      borderRadius: radii.xs,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.micro,
                      {
                        color: priority === p ? '#FFFFFF' : colors.text,
                        textTransform: 'capitalize',
                      },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Nagging interval selector */}
          <View style={{ marginTop: 12 }}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
              NAGGING REPEAT INTERVAL
            </Text>
            <View style={styles.chipsRow}>
              {[
                { label: '1m (Test)', mins: 1 },
                { label: '2m', mins: 2 },
                { label: '5m', mins: 5 },
                { label: '10m', mins: 10 },
                { label: '15m', mins: 15 },
                { label: '30m', mins: 30 },
                { label: '1h', mins: 60 },
                { label: 'Off', mins: 0 },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.mins}
                  onPress={() => setReminderInterval(opt.mins)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: reminderInterval === opt.mins ? colors.primary : colors.surfaceSecondary,
                      borderRadius: radii.xs,
                    },
                  ]}
                >
                  <Text style={[typography.micro, { color: reminderInterval === opt.mins ? '#FFFFFF' : colors.text }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Live Nagging Status Preview Banner */}
          {dueDate !== null && (
            <View
              style={[
                styles.nagStatusBanner,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                  borderRadius: radii.sm,
                  marginTop: 12,
                },
              ]}
            >
              <Ionicons name="notifications" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[typography.micro, { color: colors.primary, fontWeight: '700' }]}>
                  NAGGING POLICY
                </Text>
                <Text style={[typography.caption, { color: colors.text, marginTop: 2 }]}>
                  {reminderInterval > 0
                    ? `Starts ${getRelativeDueDescription(dueDate, isAllDay ? null : dueTime)} (${dueTime ? formatDisplayTime(dueTime) : 'All-day'}) and repeats every ${reminderInterval}m until completed.`
                    : 'Persistent nagging disabled.'}
                </Text>
              </View>
            </View>
          )}

          {/* Quick Snooze Buttons */}
          {!task.isCompleted && (
            <View style={{ marginTop: 12 }}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
                SNOOZE REMINDER
              </Text>
              <View style={styles.chipsRow}>
                {[15, 30, 60].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    onPress={() => handleSnooze(mins)}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.surfaceSecondary, borderRadius: radii.xs },
                    ]}
                  >
                    <Text style={[typography.micro, { color: colors.text }]}>
                      +{mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => handleSnooze(1440)}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.surfaceSecondary, borderRadius: radii.xs },
                  ]}
                >
                  <Text style={[typography.micro, { color: colors.text }]}>
                    Tomorrow
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Preview Full-Screen Nag Alarm Button */}
              <TouchableOpacity
                onPress={() => triggerAlarm(task)}
                style={[
                  styles.alarmActionBtn,
                  {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.primary,
                    borderRadius: radii.sm,
                    marginTop: 12,
                  },
                ]}
              >
                <Ionicons name="alarm" size={18} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginLeft: 8 }]}>
                  Preview Full-Screen Nag Alarm
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Subtasks Checklist */}
        <View style={[styles.card, cardStyle, { borderRadius: radii.xl, marginTop: spacing.md }]}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginBottom: 8 }]}>
            SUBTASKS ({subtasks.filter((s) => s.isCompleted).length}/{subtasks.length})
          </Text>

          {subtasks.map((s) => (
            <View key={s.id} style={styles.subtaskRow}>
              <TouchableOpacity onPress={() => handleToggleSubtask(s.id)}>
                <Ionicons
                  name={s.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={s.isCompleted ? colors.success : colors.textSecondary}
                />
              </TouchableOpacity>
              <Text
                style={[
                  typography.bodyMedium,
                  {
                    color: s.isCompleted ? colors.textMuted : colors.text,
                    textDecorationLine: s.isCompleted ? 'line-through' : 'none',
                    flex: 1,
                    marginLeft: 10,
                  },
                ]}
              >
                {s.title}
              </Text>
              <TouchableOpacity onPress={() => handleRemoveSubtask(s.id)}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={[styles.addSubtaskRow, { marginTop: 8 }]}>
            <TextInput
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              placeholder="Add checklist item..."
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={handleAddSubtask}
              style={[
                typography.bodyMedium,
                styles.subtaskInput,
                { color: colors.text, backgroundColor: colors.surfaceSecondary, borderRadius: radii.md },
              ]}
            />
            {newSubtaskTitle.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleAddSubtask}
                style={[styles.addSubtaskBtn, { backgroundColor: colors.primary, borderRadius: radii.pill }]}
              >
                <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.85}
          style={[
            styles.saveBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: radii.pill,
              marginTop: spacing.xl,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 4,
            },
          ]}
        >
          <Text style={[typography.bodyLarge, { color: '#FFFFFF', fontWeight: '700' }]}>
            Save Changes
          </Text>
        </TouchableOpacity>

        {/* Secondary Actions: Duplicate & Delete */}
        <View style={styles.bottomSecondaryActions}>
          <TouchableOpacity
            onPress={handleDuplicate}
            activeOpacity={0.7}
            style={[styles.secondaryActionBtn, { borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.surfaceSecondary }]}
          >
            <Ionicons name="copy-outline" size={16} color={colors.text} />
            <Text style={[typography.bodySmall, { color: colors.text, marginLeft: 6, fontWeight: '600' }]}>
              Duplicate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            activeOpacity={0.7}
            style={[styles.secondaryActionBtn, { borderColor: colors.urgentLight, borderRadius: radii.pill, backgroundColor: colors.urgentLight }]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.urgent} />
            <Text style={[typography.bodySmall, { color: colors.urgent, marginLeft: 6, fontWeight: '700' }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {},
  topActionRow: {
    marginBottom: 12,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
  },
  titleInput: {
    paddingVertical: 8,
  },
  notesInput: {
    minHeight: 80,
    padding: 12,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  card: {
    padding: 14,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtaskInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addSubtaskBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSecondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
  },
  timeStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  stepperCol: {
    alignItems: 'center',
  },
  stepperBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePreviewBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  nagStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
  },
  alarmActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
  },
});
