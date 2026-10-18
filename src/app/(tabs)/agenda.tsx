import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { addDays, format, isSameDay } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useTasks } from '../../context/TaskContext';
import { TaskItem } from '../../components/TaskItem';
import { EmptyState } from '../../components/EmptyState';
import { TagFilterBar, filterTasksByTag } from '../../components/TagFilterBar';
import { formatISODate, formatDisplayDate } from '../../utils/date';

export default function AgendaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii, cardStyle } = useTheme();
  const { tasks, lists, completeTask, reopenTask, deleteTask, snoozeTask } = useTasks();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Generate 14 days strip starting from today
  const daysStrip = React.useMemo(
    () => Array.from({ length: 14 }).map((_, idx) => addDays(new Date(), idx)),
    []
  );

  const selectedDateStr = formatISODate(selectedDate);
  const tasksForSelectedDate = tasks.filter(
    (t) => !t.isArchived && t.dueDate === selectedDateStr
  );
  const filteredTasks = filterTasksByTag(tasksForSelectedDate, selectedTag, lists);

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Title */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}>
        <Text style={[typography.titleLarge, { color: colors.text, fontWeight: '800' }]}>Agenda</Text>
      </View>

      {/* Horizontal Date Picker Strip */}
      <View style={styles.stripContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.stripScroll, { paddingHorizontal: spacing.lg }]}
        >
          {daysStrip.map((d, index) => {
            const isSelected = isSameDay(d, selectedDate);
            const dateStr = formatISODate(d);
            const hasTasks = tasks.some((t) => !t.isCompleted && !t.isArchived && t.dueDate === dateStr);

            return (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedDate(d)}
                activeOpacity={0.8}
                style={[
                  styles.dayCard,
                  isSelected
                    ? {
                        backgroundColor: colors.primary,
                        borderRadius: radii.md,
                        marginRight: spacing.sm,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        elevation: 4,
                      }
                    : {
                        ...cardStyle,
                        borderRadius: radii.md,
                        marginRight: spacing.sm,
                      },
                ]}
              >
                <Text
                  style={[
                    typography.micro,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                      textTransform: 'uppercase',
                      fontWeight: '700',
                    },
                  ]}
                >
                  {format(d, 'EEE')}
                </Text>
                <Text
                  style={[
                    typography.titleSmall,
                    {
                      color: isSelected ? '#FFFFFF' : colors.text,
                      marginTop: 2,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {format(d, 'd')}
                </Text>

                {/* Task indicator dot */}
                {hasTasks && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: isSelected ? '#FFFFFF' : colors.primary },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Smart Tag Filter Chips */}
      <TagFilterBar
        tasks={tasksForSelectedDate}
        lists={lists}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
      />

      {/* Agenda Task List */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: spacing.lg, paddingBottom: 84 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dayHeadingRow}>
          <Text style={[typography.titleSmall, { color: colors.text, fontWeight: '700' }]}>
            {formatDisplayDate(selectedDateStr)}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
            <Text style={[typography.micro, { color: colors.textSecondary, fontWeight: '600' }]}>
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </Text>
          </View>
        </View>

        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onPress={() => router.push(`/task/${task.id}`)}
              onToggleComplete={() =>
                task.isCompleted ? reopenTask(task.id) : completeTask(task.id)
              }
              onSnoozeQuick={() => snoozeTask(task.id, 15)}
              onDelete={() => deleteTask(task.id)}
            />
          ))
        ) : (
          <EmptyState
            icon={selectedTag ? 'funnel-outline' : 'calendar-outline'}
            title={selectedTag ? `No tasks matching ${selectedTag}` : 'Nothing scheduled'}
            description={
              selectedTag
                ? 'Try tapping "All" or choosing another tag filter chip.'
                : 'No tasks due on this day.'
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 8,
  },
  stripContainer: {
    paddingBottom: 12,
  },
  stripScroll: {
    flexDirection: 'row',
  },
  dayCard: {
    width: 56,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
  },
  content: {
    paddingTop: 16,
  },
  dayHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
});
