import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Task } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { PriorityBadge } from './PriorityBadge';
import { previewVoiceNag, stopAlarmSoundAndSpeech } from '../services/alarmSound';

interface FocusTimerModalProps {
  visible: boolean;
  task?: Task | null;
  onClose: () => void;
  onCompleteTask?: (taskId: string) => void;
}

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const PRESETS: Record<TimerMode, { label: string; minutes: number; icon: string }> = {
  focus: { label: 'Focus Sprint', minutes: 25, icon: 'flash' },
  shortBreak: { label: 'Short Break', minutes: 5, icon: 'cafe' },
  longBreak: { label: 'Long Break', minutes: 15, icon: 'leaf' },
};

interface FocusTimerContentProps {
  task?: Task | null;
  onClose: () => void;
  onCompleteTask?: (taskId: string) => void;
}

const FocusTimerContent: React.FC<FocusTimerContentProps> = ({
  task,
  onClose,
  onCompleteTask,
}) => {
  const { colors, typography, radii, cardStyle } = useTheme();
  const { settings } = useSettings();

  const [mode, setMode] = useState<TimerMode>('focus');
  const [totalSeconds, setTotalSeconds] = useState<number>(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [hasFinished, setHasFinished] = useState<boolean>(false);

  const endTimeRef = useRef<number | null>(null);

  // Main countdown loop
  useEffect(() => {
    if (!isActive) return;

    endTimeRef.current = Date.now() + secondsLeft * 1000;
    const timer = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);

      if (remaining <= 0) {
        setSecondsLeft(0);
        setIsActive(false);
        setHasFinished(true);

        // Audio & Haptic Anti-Distraction Alert
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // Ignored
        }

        if (settings.voiceNaggingEnabled) {
          const nagMessage =
            mode === 'focus'
              ? `Focus session completed! Knock out ${task?.title || 'your task'} now.`
              : 'Break is up! Ready to conquer your next sprint?';
          previewVoiceNag(nagMessage, settings.alarmVolume, settings.naggyPersona);
        }
      } else {
        setSecondsLeft(remaining);
      }
    }, 500);

    return () => {
      clearInterval(timer);
    };
  }, [isActive, secondsLeft, mode, settings.voiceNaggingEnabled, settings.alarmVolume, settings.naggyPersona, task?.title]);

  const togglePlayPause = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignored
    }

    if (hasFinished) {
      // Restart
      const initial = PRESETS[mode].minutes * 60;
      setSecondsLeft(initial);
      setHasFinished(false);
      setIsActive(true);
      return;
    }

    setIsActive((prev) => !prev);
  };

  const handleReset = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignored
    }
    setIsActive(false);
    setHasFinished(false);
    stopAlarmSoundAndSpeech();
    const initial = PRESETS[mode].minutes * 60;
    setSecondsLeft(initial);
    endTimeRef.current = null;
  };

  const handleSelectMode = (newMode: TimerMode) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Ignored
    }
    setMode(newMode);
    setIsActive(false);
    setHasFinished(false);
    stopAlarmSoundAndSpeech();
    const initial = PRESETS[newMode].minutes * 60;
    setTotalSeconds(initial);
    setSecondsLeft(initial);
  };

  const handleCompleteTask = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignored
    }
    stopAlarmSoundAndSpeech();
    if (task && onCompleteTask) {
      onCompleteTask(task.id);
    }
    onClose();
  };

  // Time format: mm:ss
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  return (
    <View style={styles.overlay}>
      <View
        style={[
          styles.container,
          cardStyle,
          {
            backgroundColor: colors.background,
            borderRadius: radii.xl,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: radii.pill,
                backgroundColor: colors.primary + '20',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="timer" size={18} color={colors.primary} />
            </View>
            <Text style={[typography.titleSmall, { color: colors.text, fontWeight: '800' }]}>
              Pomodoro Focus Mode
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              stopAlarmSoundAndSpeech();
              onClose();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Connected Task Card */}
        {task ? (
          <View
            style={[
              styles.taskPreviewCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderRadius: radii.md,
                borderLeftWidth: 4,
                borderLeftColor: colors.primary,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <PriorityBadge priority={task.priority} compact />
              <Text
                numberOfLines={1}
                style={[typography.bodyMedium, { color: colors.text, fontWeight: '700', flex: 1 }]}
              >
                {task.title}
              </Text>
            </View>
            {task.notes ? (
              <Text numberOfLines={1} style={[typography.micro, { color: colors.textSecondary }]}>
                {task.notes}
              </Text>
            ) : null}
          </View>
        ) : (
          <View
            style={[
              styles.taskPreviewCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderRadius: radii.md,
              },
            ]}
          >
            <Text style={[typography.bodySmall, { color: colors.textSecondary, fontStyle: 'italic' }]}>
              Free Focus Sprint (No linked task)
            </Text>
          </View>
        )}

        {/* Mode Selector Tabs */}
        <View style={[styles.modeTabsRow, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
          {(['focus', 'shortBreak', 'longBreak'] as const).map((m) => {
            const isSelected = mode === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => handleSelectMode(m)}
                style={[
                  styles.modeTab,
                  {
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                    borderRadius: radii.pill,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={PRESETS[m].icon as any}
                  size={14}
                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    typography.micro,
                    {
                      color: isSelected ? '#FFFFFF' : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {PRESETS[m].minutes}m
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Circular / Ring Progress & Digital Timer Display */}
        <View style={styles.timerDisplayContainer}>
          <View
            style={[
              styles.timerOuterRing,
              {
                borderColor: isActive ? colors.primary : colors.border,
                backgroundColor: colors.surface,
                borderRadius: 100,
              },
            ]}
          >
            <Text
              style={[
                {
                  fontSize: 42,
                  lineHeight: 48,
                  fontWeight: '900',
                  fontVariant: ['tabular-nums'],
                  letterSpacing: -1,
                  color: hasFinished ? colors.success : colors.text,
                },
              ]}
            >
              {timeDisplay}
            </Text>
            <Text
              style={[
                typography.micro,
                {
                  color: hasFinished ? colors.success : isActive ? colors.primary : colors.textMuted,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginTop: 4,
                },
              ]}
            >
              {hasFinished ? 'Session Finished!' : isActive ? 'Deep Focus Active' : 'Ready'}
            </Text>
          </View>

          {/* Linear Progress Indicator */}
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: hasFinished ? colors.success : colors.primary,
                  borderRadius: radii.pill,
                },
              ]}
            />
          </View>
        </View>

        {/* Action Controls: Start/Pause & Reset */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={handleReset}
            activeOpacity={0.7}
            style={[
              styles.secondaryControlBtn,
              {
                backgroundColor: colors.surfaceSecondary,
                borderRadius: radii.pill,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={togglePlayPause}
            activeOpacity={0.85}
            style={[
              styles.primaryControlBtn,
              {
                backgroundColor: hasFinished ? colors.success : isActive ? colors.surfaceSecondary : colors.primary,
                borderRadius: radii.pill,
                borderWidth: isActive ? 1 : 0,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name={hasFinished ? 'refresh' : isActive ? 'pause' : 'play'}
              size={22}
              color={isActive ? colors.text : '#FFFFFF'}
            />
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: isActive ? colors.text : '#FFFFFF',
                  fontWeight: '800',
                  marginLeft: 6,
                },
              ]}
            >
              {hasFinished ? 'Restart' : isActive ? 'Pause' : 'Start Focus'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Complete Linked Task Button */}
        {task && (
          <TouchableOpacity
            onPress={handleCompleteTask}
            activeOpacity={0.8}
            style={[
              styles.completeTaskBtn,
              {
                backgroundColor: colors.success + '15',
                borderColor: colors.success,
                borderRadius: radii.md,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={[typography.bodySmall, { color: colors.success, fontWeight: '700' }]}>
              Complete Task & End Session
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export const FocusTimerModal: React.FC<FocusTimerModalProps> = ({
  visible,
  task,
  onClose,
  onCompleteTask,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      {visible && (
        <FocusTimerContent
          task={task}
          onClose={onClose}
          onCompleteTask={onCompleteTask}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 6,
  },
  taskPreviewCard: {
    padding: 12,
    marginBottom: 16,
  },
  modeTabsRow: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  timerDisplayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  timerOuterRing: {
    width: 190,
    height: 190,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  progressBarTrack: {
    height: 6,
    width: '85%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 10,
  },
  secondaryControlBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryControlBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  completeTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
  },
});
