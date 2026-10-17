import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTasks } from '../../context/TaskContext';
import { TaskItem } from '../../components/TaskItem';
import { EmptyState } from '../../components/EmptyState';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, typography, spacing, radii } = useTheme();
  const { lists, tasks, completeTask, reopenTask, deleteTask, snoozeTask, deleteList } = useTasks();


  const isInbox = id === 'inbox';
  const isCompleted = id === 'completed';
  const customList = lists.find((l) => l.id === id);

  let title = 'Inbox';
  let listColor = colors.primary;
  let listIcon: any = 'file-tray';

  if (isCompleted) {
    title = 'Completed Tasks';
    listColor = colors.success;
    listIcon = 'checkmark-done';
  } else if (customList) {
    title = customList.name;
    listColor = customList.color;
    listIcon = customList.icon;
  }

  const filteredTasks = tasks.filter((t) => {
    if (t.isArchived) return false;
    if (isCompleted) return t.isCompleted;
    if (isInbox) return !t.listId && !t.isCompleted;
    return t.listId === id && !t.isCompleted;
  });

  const handleDeleteList = () => {
    if (!customList) return;
    Alert.alert(
      `Delete "${customList.name}"`,
      'What should happen to the tasks in this list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move Tasks to Inbox',
          onPress: async () => {
            await deleteList(customList.id, false);
            router.back();
          },
        },
        {
          text: 'Delete List & Tasks',
          style: 'destructive',
          onPress: async () => {
            await deleteList(customList.id, true);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Info */}
      <View style={[styles.listHeader, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBox, { backgroundColor: `${listColor}1A`, borderRadius: radii.md }]}>
            <Ionicons name={listIcon} size={22} color={listColor} />
          </View>
          <Text style={[typography.titleLarge, { color: colors.text, marginLeft: 12, flex: 1, fontWeight: '800' }]}>
            {title}
          </Text>

          {customList && (
            <TouchableOpacity
              onPress={handleDeleteList}
              activeOpacity={0.7}
              style={[styles.deleteListBtn, { backgroundColor: colors.urgentLight, borderRadius: radii.pill }]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.urgent} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.countBadge, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill, alignSelf: 'flex-start', marginTop: 8 }]}>
          <Text style={[typography.micro, { color: colors.textSecondary, fontWeight: '700' }]}>
            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
          </Text>
        </View>
      </View>

      {/* Task List */}
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
            icon="checkmark-circle-outline"
            title="List is clear"
            description="No tasks currently in this list."
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
  listHeader: {
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteListBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  content: {
    paddingTop: 14,
  },
});
