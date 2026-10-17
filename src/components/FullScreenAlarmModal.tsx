import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { Task, Subtask } from '../types';
import { formatDisplayTime, getDueStatusText } from '../utils/date';
import { PriorityBadge } from './PriorityBadge';
import { getSettings } from '../database';
import { startAlarmSoundAndSpeech, stopAlarmSoundAndSpeech } from '../services/alarmSound';




interface FullScreenAlarmModalProps {
  visible: boolean;
  task: Task | null;
  onComplete: (taskId: string) => Promise<void>;
  onSnooze: (taskId: string, minutes: number) => Promise<void>;
  onDismiss: () => void;
  onOpenDetails: (taskId: string) => void;
  onToggleSubtask?: (subtask: Subtask) => void;
}

export const FullScreenAlarmModal: React.FC<FullScreenAlarmModalProps> = ({
  visible,
  task,
  onComplete,
  onSnooze,
  onDismiss,
  onOpenDetails,
}) => {
  const { colors, typography, radii, spacing, cardStyle } = useTheme();
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [rotateAnim] = useState(() => new Animated.Value(0));

  // Pulse & vibrate like an alarm when visible
  useEffect(() => {
    if (!visible || !task) return;

    // 1. Initial alarm haptic
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Ignored
    }

    // 2. Periodic alarm pulse haptics
    const hapticInterval = setInterval(() => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {
        // Ignored
      }
    }, 2500);

    // 3. Start audible tone & voice nagging if enabled
    try {
      const currentSettings = getSettings();
      if (currentSettings.soundEnabled) {
        startAlarmSoundAndSpeech({
          taskTitle: task.title,
          tone: currentSettings.alarmTone,
          voiceEnabled: currentSettings.voiceNaggingEnabled,
          volume: currentSettings.alarmVolume,
        });
      }
    } catch {
      // Audio or voice nagging fallback
    }

    // 4. Visual pulse loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(rotateAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.timing(rotateAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
            Animated.timing(rotateAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      stopAlarmSoundAndSpeech();
      clearInterval(hapticInterval);
      pulseLoop.stop();
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
    };
  }, [visible, task, pulseAnim, rotateAnim]);

  if (!task) return null;

  const dueStatus = getDueStatusText(task.dueDate, task.dueTime);
  const nagInterval = task.reminderIntervalMinutes || 10;

  const bellSpin = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={false}
      onRequestClose={async () => {
        await stopAlarmSoundAndSpeech();
        onDismiss();
      }}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { padding: spacing.xl, paddingBottom: 60 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Alarm Badge & Icon */}
          <View style={styles.header}>
            <View
              style={[
                styles.alarmPill,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                  borderRadius: radii.pill,
                },
              ]}
            >
              <View style={[styles.pulseDot, { backgroundColor: colors.primary }]} />
              <Text style={[typography.micro, { color: colors.primary, fontWeight: '800', marginLeft: 6 }]}>
                PERSISTENT NAG ALARM ACTIVE
              </Text>
            </View>

            {/* Pulsing Alarm Bell Center */}
            <View style={styles.bellWrapper}>
              <Animated.View
                style={[
                  styles.pulsingHalo,
                  {
                    backgroundColor: colors.primaryLight,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.bellIconCircle,
                  {
                    backgroundColor: colors.primary,
                    transform: [{ rotate: bellSpin }],
                    shadowColor: colors.primary,
                  },
                ]}
              >
                <Ionicons name="notifications" size={42} color="#FFFFFF" />
              </Animated.View>
            </View>

            <Text style={[typography.caption, { color: colors.urgent, fontWeight: '800', marginTop: 12, letterSpacing: 0.5 }]}>
              {dueStatus.text.toUpperCase()}
            </Text>
          </View>

          {/* Task Title & Details Card */}
          <View
            style={[
              styles.card,
              cardStyle,
              {
                borderRadius: radii.xl,
                marginTop: spacing.lg,
                padding: spacing.xl,
              },
            ]}
          >
            <View style={styles.titleRow}>
              <Text style={[typography.titleLarge, styles.titleText, { color: colors.text, fontWeight: '800' }]}>
                {task.title}
              </Text>
              {task.priority !== 'none' && <PriorityBadge priority={task.priority} />}
            </View>

            {/* Scheduled Time Meta */}
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginLeft: 6, fontWeight: '500' }]}>
                {task.dueTime ? formatDisplayTime(task.dueTime) : 'All-day'} • {dueStatus.text}
              </Text>
            </View>

            {/* Notes description */}
            {!!task.notes && (
              <View
                style={[
                  styles.notesBox,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: radii.md,
                    marginTop: 14,
                    padding: 12,
                  },
                ]}
              >
                <Text style={[typography.bodyMedium, { color: colors.text }]}>{task.notes}</Text>
              </View>
            )}

            {/* Subtasks / Checklist count */}
            {!!task.subtasks && task.subtasks.length > 0 && (
              <View style={[styles.subtasksInfo, { marginTop: 14 }]}>
                <Ionicons name="checkbox-outline" size={16} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.text, marginLeft: 6, fontWeight: '600' }]}>
                  {task.subtasks.filter((s) => s.isCompleted).length} of {task.subtasks.length} checklist items completed
                </Text>
              </View>
            )}
          </View>

          {/* Persistent Nagging Warning Box */}
          <View
            style={[
              styles.warningCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: radii.lg,
                marginTop: spacing.md,
                padding: 14,
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 8, flex: 1, lineHeight: 18 }]}>
              Closing this screen will <Text style={{ fontWeight: '700', color: colors.text }}>NOT</Text> finish the task. Naggy will keep alarming every {nagInterval} minute{nagInterval > 1 ? 's' : ''} until you explicitly mark it done!
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={[styles.actionSection, { marginTop: spacing.xl }]}>
            {/* 1. Primary Giant Complete Button */}
            <TouchableOpacity
              onPress={async () => {
                await stopAlarmSoundAndSpeech();
                await onComplete(task.id);
                onDismiss();
              }}
              activeOpacity={0.85}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.pill,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.45,
                  shadowRadius: 10,
                  elevation: 6,
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={[typography.bodyLarge, styles.primaryBtnText]}>
                Mark as Complete
              </Text>
            </TouchableOpacity>

            {/* 2. Snooze Options */}
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginTop: 20, marginBottom: 10, textAlign: 'center', letterSpacing: 0.5 }]}>
              OR SNOOZE ALARM
            </Text>
            <View style={styles.snoozeRow}>
              {[
                { label: '5m', mins: 5 },
                { label: '10m', mins: 10 },
                { label: '15m', mins: 15 },
                { label: '30m', mins: 30 },
              ].map((s) => (
                <TouchableOpacity
                  key={s.mins}
                  onPress={async () => {
                    await stopAlarmSoundAndSpeech();
                    await onSnooze(task.id, s.mins);
                    onDismiss();
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.snoozeBtn,
                    cardStyle,
                    {
                      borderRadius: radii.pill,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                    },
                  ]}
                >
                  <Ionicons name="alarm-outline" size={14} color={colors.text} />
                  <Text style={[typography.micro, { color: colors.text, fontWeight: '700', marginLeft: 4 }]}>
                    +{s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 3. Secondary Actions */}
            <View style={styles.secondaryRow}>
              <TouchableOpacity
                onPress={async () => {
                  await stopAlarmSoundAndSpeech();
                  onDismiss();
                  onOpenDetails(task.id);
                }}
                style={styles.linkBtn}
              >
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                  View Task Details
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  await stopAlarmSoundAndSpeech();
                  onDismiss();
                }}
                style={styles.linkBtn}
              >
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Dismiss for now (Nags in {nagInterval}m)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 60,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    width: '100%',
  },
  alarmPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 24,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bellWrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsingHalo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  bellIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5A45',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    width: '100%',
    padding: 18,
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleText: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  notesBox: {
    padding: 10,
  },
  subtasksInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    width: '100%',
  },
  actionSection: {
    width: '100%',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 8,
  },
  snoozeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  snoozeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 4,
  },
  linkBtn: {
    paddingVertical: 6,
  },
});
