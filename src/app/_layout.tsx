import React, { useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { SettingsProvider } from '../context/SettingsContext';
import { NotificationProvider, useNotifications } from '../context/NotificationContext';
import { TaskProvider, useTasks } from '../context/TaskContext';
import { UndoToast } from '../components/UndoToast';
import { FullScreenAlarmModal } from '../components/FullScreenAlarmModal';
import { initDatabase } from '../database';

function NavigationStack() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { activeAlarmTask, dismissAlarm } = useNotifications();
  const { completeTask, snoozeTask } = useTasks();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="task/new"
          options={{
            presentation: 'modal',
            title: 'New Task',
            headerBackTitle: 'Cancel',
          }}
        />
        <Stack.Screen
          name="task/[id]"
          options={{
            title: 'Task Details',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            title: 'Search',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="list/[id]"
          options={{
            title: 'List',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
      <UndoToast />
      <FullScreenAlarmModal
        visible={!!activeAlarmTask}
        task={activeAlarmTask}
        onComplete={async (taskId) => {
          await completeTask(taskId);
        }}
        onSnooze={async (taskId, mins) => {
          await snoozeTask(taskId, mins);
        }}
        onDismiss={dismissAlarm}
        onOpenDetails={(taskId) => {
          router.push(`/task/${taskId}`);
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  const [isReady] = useState(() => {
    try {
      initDatabase();
      return true;
    } catch (e) {
      console.error('Failed to initialize database:', e);
      return true;
    }
  });

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F7F4' }}>
        <ActivityIndicator size="large" color="#FF5A45" />
      </View>
    );
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <SettingsProvider>
          <NotificationProvider>
            <TaskProvider>
              <NavigationStack />
            </TaskProvider>
          </NotificationProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
