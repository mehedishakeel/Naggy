import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTasks } from '../context/TaskContext';
import { TaskItem } from '../components/TaskItem';
import { EmptyState } from '../components/EmptyState';

export default function SearchScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii, cardStyle } = useTheme();
  const { tasks, completeTask, reopenTask, deleteTask, snoozeTask } = useTasks();

  const [query, setQuery] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'pending' | 'completed'>('all');

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();

    return tasks.filter((t) => {
      if (t.isArchived) return false;

      // Filter state
      if (filterState === 'pending' && t.isCompleted) return false;
      if (filterState === 'completed' && !t.isCompleted) return false;

      // Query match
      if (!q) return true;

      const titleMatch = t.title.toLowerCase().includes(q);
      const notesMatch = t.notes ? t.notes.toLowerCase().includes(q) : false;
      const priorityMatch = t.priority.toLowerCase().includes(q);

      return titleMatch || notesMatch || priorityMatch;
    });
  }, [tasks, query, filterState]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Input Box */}
      <View style={[styles.searchBoxContainer, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <View
          style={[
            styles.searchBar,
            cardStyle,
            {
              borderRadius: radii.xl,
              paddingHorizontal: spacing.md,
              paddingVertical: 4,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks, notes, priority..."
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={[typography.bodyMedium, styles.input, { color: colors.text }]}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <View style={[styles.filterRow, { marginTop: spacing.md }]}>
          {(['all', 'pending', 'completed'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setFilterState(filter)}
              activeOpacity={0.8}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filterState === filter ? colors.primary : colors.surfaceSecondary,
                  borderRadius: radii.pill,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  shadowColor: filterState === filter ? colors.primary : 'transparent',
                  shadowOpacity: filterState === filter ? 0.35 : 0,
                  shadowRadius: 6,
                },
              ]}
            >
              <Text
                style={[
                  typography.micro,
                  {
                    color: filterState === filter ? '#FFFFFF' : colors.textSecondary,
                    textTransform: 'capitalize',
                    fontWeight: '700',
                  },
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Results List */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: spacing.lg, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
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
            icon="search-outline"
            title="No matching tasks"
            description={query ? `No tasks found for "${query}"` : 'No tasks match the filter.'}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBoxContainer: {},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderWidth: 1,
  },
  input: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  content: {
    paddingTop: 12,
  },
});
