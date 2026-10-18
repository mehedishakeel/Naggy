import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useTasks } from '../../context/TaskContext';
import { useSettings } from '../../context/SettingsContext';
import { useNotifications } from '../../context/NotificationContext';
import { TaskItem } from '../../components/TaskItem';
import { QuickAddBar } from '../../components/QuickAddBar';
import { ProgressBar } from '../../components/ProgressBar';
import { EmptyState } from '../../components/EmptyState';
import { TagFilterBar, filterTasksByTag } from '../../components/TagFilterBar';
import { Task } from '../../types';
import { ParsedTaskInput } from '../../utils/nlp';
import { getTodayString } from '../../utils/date';

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii, cardStyle } = useTheme();
  const { settings } = useSettings();
  const { triggerAlarm } = useNotifications();
  const {
    lists,
    overdueTasks,
    todayTasks,
    completedTasks,
    todayProgress,
    completeTask,
    reopenTask,
    snoozeTask,
    deleteTask,
    createTask,
  } = useTasks();

  const [showCompleted, setShowCompleted] = useState(false);
  const [snoozeModalTask, setSnoozeModalTask] = useState<Task | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Check onboarding on first launch
  useEffect(() => {
    if (!settings.hasCompletedOnboarding) {
      router.replace('/onboarding');
    }
  }, [settings.hasCompletedOnboarding, router]);

  // Dynamic greeting based on hour
  const currentHour = new Date().getHours();
  let greeting = 'Good morning';
  if (currentHour >= 12 && currentHour < 17) greeting = 'Good afternoon';
  if (currentHour >= 17) greeting = 'Good evening';

  const todayDateFormatted = format(new Date(), 'EEEE, MMMM d');

  const handleQuickAdd = async (parsed: ParsedTaskInput) => {
    await createTask({
      title: parsed.cleanTitle,
      dueDate: parsed.dueDate || getTodayString(),
      dueTime: parsed.dueTime || null,
      isRecurring: parsed.isRecurring,
      recurrenceRule: parsed.recurrenceRule,
      priority: parsed.priority || 'none',
    });
  };

  const handleSnoozeSelect = async (minutes: number) => {
    if (snoozeModalTask) {
      await snoozeTask(snoozeModalTask.id, minutes);
      setSnoozeModalTask(null);
    }
  };

  const completedTodayTasks = completedTasks.filter(
    (t) => t.dueDate === getTodayString() || (t.completedAt && t.completedAt.startsWith(getTodayString()))
  );

  const filteredOverdue = filterTasksByTag(overdueTasks, selectedTag, lists);
  const filteredToday = filterTasksByTag(todayTasks, selectedTag, lists);
  const totalFiltered = filteredOverdue.length + filteredToday.length;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}>
        <View style={styles.headerTitles}>
          <Text style={[typography.caption, { color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700' }]}>
            {todayDateFormatted}
          </Text>
          <Text style={[typography.titleLarge, { color: colors.text, marginTop: spacing.xxs, fontWeight: '800' }]}>
            {greeting}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push('/search')}
            activeOpacity={0.8}
            style={[
              styles.headerBtn,
              cardStyle,
              { borderRadius: radii.pill },
            ]}
          >
            <Ionicons name="search" size={19} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/task/new')}
            activeOpacity={0.8}
            style={[
              styles.headerBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radii.pill,
                marginLeft: spacing.sm,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.35,
                shadowRadius: 6,
                elevation: 4,
              },
            ]}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg, paddingBottom: 170 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Daily Progress Bar */}
        <ProgressBar
          completed={todayProgress.completed}
          total={todayProgress.total}
          percentage={todayProgress.percentage}
        />

        {/* Smart Tag Filter Chips */}
        <TagFilterBar
          tasks={[...overdueTasks, ...todayTasks]}
          lists={lists}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
        />

        {/* 1. OVERDUE SECTION */}
        {filteredOverdue.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTag}>
                <Ionicons name="warning" size={15} color={colors.urgent} style={{ marginRight: 6 }} />
                <Text style={[typography.titleSmall, { color: colors.urgent }]}>
                  Overdue
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => triggerAlarm(filteredOverdue[0])}
                  style={[
                    styles.ringAlarmHeaderBtn,
                    { backgroundColor: colors.urgentLight, borderRadius: radii.pill },
                  ]}
                >
                  <Ionicons name="alarm" size={12} color={colors.urgent} />
                  <Text style={[typography.micro, { color: colors.urgent, fontWeight: '700', marginLeft: 4 }]}>
                    Ring Alarm
                  </Text>
                </TouchableOpacity>
                <View style={[styles.badgeCount, { backgroundColor: colors.urgentLight, borderRadius: radii.pill }]}>
                  <Text style={[typography.micro, { color: colors.urgent }]}>
                    {filteredOverdue.length}
                  </Text>
                </View>
              </View>
            </View>

            {filteredOverdue.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onPress={() => router.push(`/task/${task.id}`)}
                onToggleComplete={() => completeTask(task.id)}
                onLongPress={() => setSnoozeModalTask(task)}
                onSnoozeQuick={() => setSnoozeModalTask(task)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </View>
        )}

        {/* 2. TODAY SECTION */}
        {filteredToday.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.titleSmall, { color: colors.text }]}>
                Today
              </Text>
              <View style={[styles.badgeCount, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
                <Text style={[typography.micro, { color: colors.textSecondary }]}>
                  {filteredToday.length}
                </Text>
              </View>
            </View>

            {filteredToday.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onPress={() => router.push(`/task/${task.id}`)}
                onToggleComplete={() => completeTask(task.id)}
                onLongPress={() => setSnoozeModalTask(task)}
                onSnoozeQuick={() => setSnoozeModalTask(task)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </View>
        )}

        {/* Empty State when no tasks or tag filter has no results */}
        {totalFiltered === 0 && (
          <EmptyState
            icon={selectedTag ? 'funnel-outline' : completedTodayTasks.length > 0 ? 'checkmark-circle' : 'sunny-outline'}
            title={
              selectedTag
                ? `No tasks matching ${selectedTag}`
                : completedTodayTasks.length > 0
                ? 'All clear! Great job today 🎉'
                : 'No tasks for today'
            }
            description={
              selectedTag
                ? 'Try tapping "All" or choosing another tag filter chip.'
                : completedTodayTasks.length > 0
                ? 'All scheduled responsibilities are taken care of.'
                : 'Enjoy your free time, or use the quick add bar below to schedule a task.'
            }
          />
        )}

        {/* 3. COMPLETED SECTION */}
        {completedTodayTasks.length > 0 && (
          <View style={[styles.section, { marginTop: spacing.lg }]}>
            <TouchableOpacity
              onPress={() => setShowCompleted(!showCompleted)}
              style={styles.completedToggle}
            >
              <Ionicons
                name={showCompleted ? 'chevron-down' : 'chevron-forward'}
                size={16}
                color={colors.textSecondary}
              />
              <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: 6, fontWeight: '500' }]}>
                Completed ({completedTodayTasks.length})
              </Text>
            </TouchableOpacity>

            {showCompleted &&
              completedTodayTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onPress={() => router.push(`/task/${task.id}`)}
                  onToggleComplete={() => reopenTask(task.id)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Quick Add Bar right above tab bar */}
      <View style={[styles.bottomBar, { bottom: 72 + insets.bottom, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }]}>
        <QuickAddBar
          onAddTask={handleQuickAdd}
          onOpenFullModal={() => router.push('/task/new')}
        />
      </View>

      {/* Quick Snooze Modal */}
      <Modal
        visible={!!snoozeModalTask}
        transparent
        animationType="fade"
        onRequestClose={() => setSnoozeModalTask(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSnoozeModalTask(null)}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              cardStyle,
              { borderRadius: radii.xl, padding: spacing.xl },
            ]}
          >
            <Text style={[typography.titleSmall, { color: colors.text, fontWeight: '700' }]}>
              Snooze Reminder
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md }]}>
              {snoozeModalTask?.title}
            </Text>

            {[
              { min: 5, label: '5 minutes' },
              { min: 15, label: '15 minutes' },
              { min: 30, label: '30 minutes' },
              { min: 60, label: '1 hour' },
              { min: 1440, label: 'Tomorrow morning' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.min}
                onPress={() => handleSnoozeSelect(opt.min)}
                activeOpacity={0.7}
                style={[
                  styles.snoozeOption,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: radii.md,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginBottom: 8,
                  },
                ]}
              >
                <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '600' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setSnoozeModalTask(null)}
              activeOpacity={0.8}
              style={[
                styles.cancelBtn,
                { backgroundColor: colors.well, borderRadius: radii.md, marginTop: spacing.xs },
              ]}
            >
              <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center', fontWeight: '600' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitles: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 170,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ringAlarmHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeCount: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 74,
    left: 0,
    right: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {},
  snoozeOption: {},
  cancelBtn: {
    paddingVertical: 12,
  },
});
