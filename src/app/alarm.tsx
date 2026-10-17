import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTasks } from '../context/TaskContext';
import { useTheme } from '../context/ThemeContext';
import { FullScreenAlarmModal } from '../components/FullScreenAlarmModal';

export default function AlarmScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const { tasks, completeTask, snoozeTask } = useTasks();

  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
          Alarm task resolved or not found.
        </Text>
      </View>
    );
  }

  return (
    <FullScreenAlarmModal
      visible={true}
      task={task}
      onComplete={async (id) => {
        await completeTask(id);
        router.back();
      }}
      onSnooze={async (id, mins) => {
        await snoozeTask(id, mins);
        router.back();
      }}
      onDismiss={() => {
        router.back();
      }}
      onOpenDetails={(id) => {
        router.replace(`/task/${id}`);
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
