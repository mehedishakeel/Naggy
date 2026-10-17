import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addDays } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useTasks } from '../../context/TaskContext';
import { useSettings } from '../../context/SettingsContext';
import { Priority, RecurrenceRule, RecurrenceFrequency, Subtask } from '../../types';
import {
  getTodayString,
  formatISODate,
  formatDisplayTime,
  getTimeAfterMinutes,
  getRelativeDueDescription,
} from '../../utils/date';
import { parseNaturalLanguageTask } from '../../utils/nlp';

export default function NewTaskModal() {
  const router = useRouter();
  const { colors, typography, spacing, radii, cardStyle } = useTheme();
  const { settings } = useSettings();
  const { lists, createTask } = useTasks();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(getTodayString());
  const [dueTime, setDueTime] = useState<string | null>('09:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [priority, setPriority] = useState<Priority>('none');
  const [listId, setListId] = useState<string | null>(null);

  // Recurrence
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);

  // Persistent Nagging
  const [remindAtDue, setRemindAtDue] = useState(true);
  const [reminderInterval, setReminderInterval] = useState<number>(settings.defaultReminderIntervalMinutes);
  const [escalate, setEscalate] = useState(settings.escalationEnabled);

  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Quick relative time offset handler
  const handleQuickOffset = (minutes: number) => {
    const { date, time } = getTimeAfterMinutes(minutes);
    setDueDate(date);
    setDueTime(time);
    setIsAllDay(false);
  };

  // Stepper hour/minute adjustment handler
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

  // Handle NLP title change
  const handleTitleChange = (val: string) => {
    setTitle(val);
  };

  const applyNLP = () => {
    const parsed = parseNaturalLanguageTask(title);
    if (parsed.hasParsedElements) {
      setTitle(parsed.cleanTitle);
      if (parsed.dueDate) setDueDate(parsed.dueDate);
      if (parsed.dueTime) {
        setDueTime(parsed.dueTime);
        setIsAllDay(false);
      }
      if (parsed.isRecurring && parsed.recurrenceRule) {
        setIsRecurring(true);
        setRecurrenceRule(parsed.recurrenceRule);
      }
      if (parsed.priority) setPriority(parsed.priority);
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: Subtask = {
      id: `sub-${Date.now()}-${subtasks.length}`,
      taskId: '',
      title: newSubtaskTitle.trim(),
      isCompleted: false,
      position: subtasks.length,
    };
    setSubtasks([...subtasks, newSub]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (idx: number) => {
    const updated = [...subtasks];
    updated.splice(idx, 1);
    setSubtasks(updated);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a task title');
      return;
    }

    await createTask({
      title: title.trim(),
      notes: notes.trim() || null,
      dueDate,
      dueTime: isAllDay ? null : dueTime,
      isAllDay,
      priority,
      listId,
      isRecurring,
      recurrenceRule: isRecurring ? recurrenceRule : null,
      remindAtDue,
      reminderIntervalMinutes: reminderInterval,
      escalateReminders: escalate,
      subtasks,
    });

    router.back();
  };

  const recurrenceFrequencies: { label: string; freq: RecurrenceFrequency }[] = [
    { label: 'Daily', freq: 'daily' },
    { label: 'Weekdays', freq: 'weekdays' },
    { label: 'Weekends', freq: 'weekends' },
    { label: 'Weekly', freq: 'weekly' },
    { label: 'Monthly', freq: 'monthly' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, paddingBottom: 60 }]}>
        {/* Title Input */}
        <View style={styles.titleContainer}>
          <TextInput
            value={title}
            onChangeText={handleTitleChange}
            placeholder="Task title (e.g. Exercise every day at 6pm)"
            placeholderTextColor={colors.textMuted}
            style={[typography.titleMedium, styles.titleInput, { color: colors.text }]}
            autoFocus
          />

          {/* NLP suggestion trigger */}
          {title.length > 5 && parseNaturalLanguageTask(title).hasParsedElements && (
            <TouchableOpacity
              onPress={applyNLP}
              style={[styles.nlpChip, { backgroundColor: colors.primaryLight, borderRadius: radii.pill }]}
            >
              <Ionicons name="sparkles" size={13} color={colors.primary} />
              <Text style={[typography.micro, { color: colors.primary, marginLeft: 4 }]}>
                Parse details from title
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notes Input */}
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes or description..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={[
            typography.bodyMedium,
            styles.notesInput,
            { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: radii.md },
          ]}
        />

        {/* 1. DUE DATE & TIME */}
        <View style={[styles.card, cardStyle, { borderRadius: radii.xl, marginTop: spacing.md }]}>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 8 }]}>
            DUE DATE
          </Text>
          <View style={styles.chipsRow}>
            <TouchableOpacity
              onPress={() => setDueDate(getTodayString())}
              style={[
                styles.chip,
                {
                  backgroundColor: dueDate === getTodayString() ? colors.primary : colors.surfaceSecondary,
                  borderRadius: radii.xs,
                },
              ]}
            >
              <Text style={[typography.micro, { color: dueDate === getTodayString() ? '#FFFFFF' : colors.text }]}>
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDueDate(formatISODate(addDays(new Date(), 1)))}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    dueDate === formatISODate(addDays(new Date(), 1)) ? colors.primary : colors.surfaceSecondary,
                  borderRadius: radii.xs,
                },
              ]}
            >
              <Text
                style={[
                  typography.micro,
                  {
                    color:
                      dueDate === formatISODate(addDays(new Date(), 1)) ? '#FFFFFF' : colors.text,
                  },
                ]}
              >
                Tomorrow
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDueDate(formatISODate(addDays(new Date(), 7)))}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    dueDate === formatISODate(addDays(new Date(), 7)) ? colors.primary : colors.surfaceSecondary,
                  borderRadius: radii.xs,
                },
              ]}
            >
              <Text
                style={[
                  typography.micro,
                  {
                    color:
                      dueDate === formatISODate(addDays(new Date(), 7)) ? '#FFFFFF' : colors.text,
                  },
                ]}
              >
                In 1 Week
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDueDate(null)}
              style={[
                styles.chip,
                {
                  backgroundColor: dueDate === null ? colors.primary : colors.surfaceSecondary,
                  borderRadius: radii.xs,
                },
              ]}
            >
              <Text style={[typography.micro, { color: dueDate === null ? '#FFFFFF' : colors.text }]}>
                No Due Date
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time & All-Day toggle */}
          {dueDate !== null && (
            <View style={{ marginTop: 14 }}>
              <View style={styles.switchRow}>
                <Text style={[typography.bodyMedium, { color: colors.text }]}>All-day task</Text>
                <Switch
                  value={isAllDay}
                  onValueChange={setIsAllDay}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>

              {!isAllDay && (
                <View style={{ marginTop: 12 }}>
                  {/* Quick offset chips (In 1 min, In 5 min, etc.) */}
                  <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
                    QUICK SCHEDULE (RELATIVE TO NOW)
                  </Text>
                  <View style={styles.chipsRow}>
                    {[
                      { label: '+1 min (Test)', mins: 1 },
                      { label: '+2 min', mins: 2 },
                      { label: '+5 min', mins: 5 },
                      { label: '+15 min', mins: 15 },
                      { label: '+30 min', mins: 30 },
                      { label: '+1 hour', mins: 60 },
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

                  {/* Digital Time Editor & Stepper */}
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 12, marginBottom: 6 }]}>
                    ASSIGN EXACT DUE TIME
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
                        {dueTime ? formatDisplayTime(dueTime) : '9:00 AM'}
                      </Text>
                    </View>
                  </View>

                  {/* Standard Presets */}
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 12, marginBottom: 6 }]}>
                    TIME PRESETS
                  </Text>
                  <View style={styles.chipsRow}>
                    {[
                      { label: '09:00 Morning', val: '09:00' },
                      { label: '12:00 Noon', val: '12:00' },
                      { label: '15:00 Afternoon', val: '15:00' },
                      { label: '18:00 Evening', val: '18:00' },
                      { label: '21:00 Night', val: '21:00' },
                    ].map((p) => (
                      <TouchableOpacity
                        key={p.val}
                        onPress={() => setDueTime(p.val)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: dueTime === p.val ? colors.primary : colors.surfaceSecondary,
                            borderRadius: radii.xs,
                          },
                        ]}
                      >
                        <Text style={[typography.micro, { color: dueTime === p.val ? '#FFFFFF' : colors.text }]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 2. RECURRENCE */}
        <View style={[styles.card, cardStyle, { borderRadius: radii.xl, marginTop: spacing.md }]}>
          <View style={styles.switchRow}>
            <View>
              <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '600' }]}>Recurring Schedule</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Task returns automatically until series completes
              </Text>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={(val) => {
                setIsRecurring(val);
                if (val && !recurrenceRule) {
                  setRecurrenceRule({ frequency: 'daily', interval: 1 });
                }
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {isRecurring && (
            <View style={{ marginTop: 12 }}>
              <View style={styles.chipsRow}>
                {recurrenceFrequencies.map((f) => (
                  <TouchableOpacity
                    key={f.freq}
                    onPress={() => setRecurrenceRule({ frequency: f.freq, interval: 1 })}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          recurrenceRule?.frequency === f.freq ? colors.primary : colors.surfaceSecondary,
                        borderRadius: radii.pill,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.micro,
                        {
                          color: recurrenceRule?.frequency === f.freq ? '#FFFFFF' : colors.text,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 3. PERSISTENT NAGGING REMINDERS */}
        <View style={[styles.card, cardStyle, { borderRadius: radii.xl, marginTop: spacing.md }]}>
          <View style={styles.switchRow}>
            <View>
              <Text style={[typography.bodyMedium, { color: colors.text }]}>Remind at due time</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Send initial notification when due
              </Text>
            </View>
            <Switch
              value={remindAtDue}
              onValueChange={setRemindAtDue}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
              Persistent Nag Interval
            </Text>
            <View style={styles.chipsRow}>
              {[
                { label: '1 min (Test)', val: 1 },
                { label: '2 min', val: 2 },
                { label: '5 min', val: 5 },
                { label: '10 min', val: 10 },
                { label: '15 min', val: 15 },
                { label: '30 min', val: 30 },
                { label: '1 hour', val: 60 },
                { label: 'Off', val: 0 },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.val}
                  onPress={() => setReminderInterval(opt.val)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: reminderInterval === opt.val ? colors.primary : colors.surfaceSecondary,
                      borderRadius: radii.xs,
                    },
                  ]}
                >
                  <Text style={[typography.micro, { color: reminderInterval === opt.val ? '#FFFFFF' : colors.text }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {reminderInterval > 0 && (
            <View style={[styles.switchRow, { marginTop: 12 }]}>
              <View>
                <Text style={[typography.bodyMedium, { color: colors.text }]}>Escalate if ignored</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Nags more frequently after 1 hour overdue
                </Text>
              </View>
              <Switch
                value={escalate}
                onValueChange={setEscalate}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          )}

          {/* Live Nagging Status Preview Banner */}
          {dueDate !== null && (
            <View
              style={[
                styles.nagStatusBanner,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                  borderRadius: radii.sm,
                  marginTop: 14,
                },
              ]}
            >
              <Ionicons name="notifications" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[typography.micro, { color: colors.primary, fontWeight: '700' }]}>
                  NAGGING REMINDER PREVIEW
                </Text>
                <Text style={[typography.caption, { color: colors.text, marginTop: 2 }]}>
                  {remindAtDue || reminderInterval > 0
                    ? `Starts ${getRelativeDueDescription(dueDate, isAllDay ? null : dueTime)} (${dueTime ? formatDisplayTime(dueTime) : 'All-day'})${reminderInterval > 0 ? ` and repeats every ${reminderInterval} minute${reminderInterval > 1 ? 's' : ''}` : ''} until you check this task off.`
                    : 'Reminders are turned off for this task.'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 4. PRIORITY & LIST */}
        <View style={[styles.card, cardStyle, { borderRadius: radii.xl, marginTop: spacing.md }]}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginBottom: 8 }]}>
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
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.micro,
                    {
                      color: priority === p ? '#FFFFFF' : colors.text,
                      textTransform: 'capitalize',
                      fontWeight: '700',
                    },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginTop: 14, marginBottom: 8 }]}>
            LIST
          </Text>
          <View style={styles.chipsRow}>
            <TouchableOpacity
              onPress={() => setListId(null)}
              style={[
                styles.chip,
                {
                  backgroundColor: listId === null ? colors.primary : colors.surfaceSecondary,
                  borderRadius: radii.pill,
                },
              ]}
            >
              <Text style={[typography.micro, { color: listId === null ? '#FFFFFF' : colors.text, fontWeight: '700' }]}>
                Inbox
              </Text>
            </TouchableOpacity>
            {lists.map((l) => (
              <TouchableOpacity
                key={l.id}
                onPress={() => setListId(l.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: listId === l.id ? l.color : colors.surfaceSecondary,
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Text style={[typography.micro, { color: listId === l.id ? '#FFFFFF' : colors.text, fontWeight: '700' }]}>
                  {l.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 5. SUBTASKS */}
        <View style={[styles.card, cardStyle, { borderRadius: radii.xl, marginTop: spacing.md }]}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginBottom: 8 }]}>
            SUBTASKS CHECKLIST
          </Text>

          {subtasks.map((s, idx) => (
            <View key={s.id} style={styles.subtaskRow}>
              <Ionicons name="checkbox-outline" size={16} color={colors.textSecondary} />
              <Text style={[typography.bodyMedium, { color: colors.text, flex: 1, marginLeft: 8 }]}>
                {s.title}
              </Text>
              <TouchableOpacity onPress={() => handleRemoveSubtask(idx)}>
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
            Create Task
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {},
  titleContainer: {
    marginBottom: 8,
  },
  titleInput: {
    paddingVertical: 8,
  },
  nlpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
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
});
