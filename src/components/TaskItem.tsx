import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Task } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getDueStatusText } from '../utils/date';
import { formatRecurrenceRule } from '../utils/recurrence';
import { PriorityBadge } from './PriorityBadge';

interface TaskItemProps {
  task: Task;
  onPress: () => void;
  onToggleComplete: () => void;
  onLongPress?: () => void;
  onSnoozeQuick?: () => void;
  onDelete?: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onPress,
  onToggleComplete,
  onLongPress,
  onSnoozeQuick,
  onDelete,
}) => {
  const { colors, typography, radii, spacing, cardStyle } = useTheme();
  const [translateX] = useState(() => new Animated.Value(0));

  const dueStatus = getDueStatusText(task.dueDate, task.dueTime);
  const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  const closeSwipe = React.useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Trigger on horizontal drag, ignoring vertical scrolling gestures
          return (
            Math.abs(gestureState.dx) > 12 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
          );
        },
        onPanResponderMove: (_, gestureState) => {
          // Clamp swipe translation between -125 and 125
          const clamped = Math.max(-125, Math.min(125, gestureState.dx));
          translateX.setValue(clamped);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 75) {
            // Swipe right past threshold: Complete Task
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {
              // Ignored
            }
            Animated.timing(translateX, {
              toValue: 350,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              onToggleComplete();
              translateX.setValue(0);
            });
          } else if (gestureState.dx < -65) {
            // Swipe left: Snap open quick action buttons
            Animated.spring(translateX, {
              toValue: -110,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          } else {
            // Reset to center
            closeSwipe();
          }
        },
      }),
    [translateX, onToggleComplete, closeSwipe]
  );

  return (
    <View style={[styles.outerWrapper, { marginBottom: spacing.md }]}>
      {/* Background Action Layer */}
      <View
        style={[
          styles.actionBackground,
          {
            borderRadius: radii.lg,
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
      >
        {/* Left Green Reveal (Swipe Right to Complete) */}
        <View
          style={[
            styles.leftActionReveal,
            {
              backgroundColor: colors.success,
              borderRadius: radii.lg,
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={[typography.micro, { color: '#FFFFFF', fontWeight: '700', marginLeft: 6 }]}>
            Complete
          </Text>
        </View>

        {/* Right Actions (Swipe Left for Snooze & Delete) */}
        <View style={styles.rightActionsReveal}>
          {onSnoozeQuick && (
            <TouchableOpacity
              onPress={() => {
                closeSwipe();
                onSnoozeQuick();
              }}
              activeOpacity={0.8}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.high,
                  borderTopLeftRadius: radii.lg,
                  borderBottomLeftRadius: radii.lg,
                },
              ]}
            >
              <Ionicons name="alarm-outline" size={18} color="#FFFFFF" />
              <Text style={[typography.micro, { color: '#FFFFFF', fontWeight: '700', marginTop: 2 }]}>
                +15m
              </Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              onPress={() => {
                closeSwipe();
                onDelete();
              }}
              activeOpacity={0.8}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.urgent,
                  borderTopRightRadius: radii.lg,
                  borderBottomRightRadius: radii.lg,
                },
              ]}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
              <Text style={[typography.micro, { color: '#FFFFFF', fontWeight: '700', marginTop: 2 }]}>
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Front Swipable Task Card */}
      <Animated.View
        style={[
          styles.container,
          cardStyle,
          {
            transform: [{ translateX }],
            borderColor: dueStatus.isOverdue && !task.isCompleted ? colors.urgent : cardStyle.borderColor,
            borderRadius: radii.lg,
            padding: spacing.md,
            opacity: task.isCompleted ? 0.72 : 1,
            shadowOpacity: task.isCompleted ? 0.08 : cardStyle.shadowOpacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            closeSwipe();
            onPress();
          }}
          onLongPress={onLongPress}
          style={styles.innerTouchable}
        >
          <View style={styles.row}>
            {/* Soft Tactile Squircle Checkbox */}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={onToggleComplete}
              style={[
                styles.checkbox,
                {
                  borderColor: task.isCompleted ? colors.success : colors.border,
                  backgroundColor: task.isCompleted ? colors.success : colors.surfaceSecondary,
                  borderRadius: radii.pill,
                },
              ]}
            >
              {task.isCompleted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </TouchableOpacity>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <PriorityBadge priority={task.priority} compact />
                <Text
                  numberOfLines={2}
                  style={[
                    typography.bodyLarge,
                    {
                      color: task.isCompleted ? colors.textMuted : colors.text,
                      textDecorationLine: task.isCompleted ? 'line-through' : 'none',
                      flex: 1,
                      fontWeight: task.isCompleted ? '400' : '500',
                    },
                  ]}
                >
                  {task.title}
                </Text>
              </View>

              {/* Notes preview if present */}
              {!!task.notes && (
                <Text
                  numberOfLines={1}
                  style={[
                    typography.bodySmall,
                    { color: colors.textSecondary, marginTop: spacing.xxs },
                  ]}
                >
                  {task.notes}
                </Text>
              )}

              {/* Metadata badges row */}
              <View style={[styles.metaRow, { marginTop: spacing.xs }]}>
                {/* Due date status */}
                {!!task.dueDate && (
                  <View
                    style={[
                      styles.metaBadge,
                      {
                        backgroundColor: dueStatus.isOverdue
                          ? colors.urgentLight
                          : colors.surfaceSecondary,
                        borderRadius: radii.xs,
                      },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={12}
                      color={dueStatus.isOverdue ? colors.urgent : colors.textSecondary}
                      style={styles.metaIcon}
                    />
                    <Text
                      style={[
                        typography.micro,
                        {
                          color: dueStatus.isOverdue ? colors.urgent : colors.textSecondary,
                        },
                      ]}
                    >
                      {dueStatus.text}
                    </Text>
                  </View>
                )}

                {/* Recurrence badge */}
                {task.isRecurring && (
                  <View
                    style={[
                      styles.metaBadge,
                      { backgroundColor: colors.surfaceSecondary, borderRadius: radii.xs },
                    ]}
                  >
                    <Ionicons
                      name="repeat"
                      size={12}
                      color={colors.primary}
                      style={styles.metaIcon}
                    />
                    <Text style={[typography.micro, { color: colors.primary }]}>
                      {formatRecurrenceRule(task.recurrenceRule)}
                    </Text>
                  </View>
                )}

                {/* Persistent Nag Interval badge */}
                {task.reminderIntervalMinutes > 0 && !task.isCompleted && (
                  <View
                    style={[
                      styles.metaBadge,
                      { backgroundColor: colors.primaryLight, borderRadius: radii.xs },
                    ]}
                  >
                    <Ionicons
                      name="notifications"
                      size={11}
                      color={colors.primary}
                      style={styles.metaIcon}
                    />
                    <Text style={[typography.micro, { color: colors.primary }]}>
                      Nag: {task.reminderIntervalMinutes}m
                      {task.escalateReminders ? ' ⚡' : ''}
                    </Text>
                  </View>
                )}

                {/* Subtasks progress */}
                {totalSubtasks > 0 && (
                  <View
                    style={[
                      styles.metaBadge,
                      { backgroundColor: colors.surfaceSecondary, borderRadius: radii.xs },
                    ]}
                  >
                    <Ionicons
                      name="checkbox-outline"
                      size={11}
                      color={colors.textSecondary}
                      style={styles.metaIcon}
                    />
                    <Text style={[typography.micro, { color: colors.textSecondary }]}>
                      {completedSubtasks}/{totalSubtasks}
                    </Text>
                  </View>
                )}

                {/* Snooze indicator */}
                {!!task.snoozeUntil && !task.isCompleted && (
                  <View
                    style={[
                      styles.metaBadge,
                      { backgroundColor: colors.highLight, borderRadius: radii.xs },
                    ]}
                  >
                    <Ionicons
                      name="alarm-outline"
                      size={11}
                      color={colors.high}
                      style={styles.metaIcon}
                    />
                    <Text style={[typography.micro, { color: colors.high }]}>
                      Snoozed
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Snooze Button if overdue */}
            {dueStatus.isOverdue && !task.isCompleted && onSnoozeQuick && (
              <TouchableOpacity
                onPress={onSnoozeQuick}
                style={[
                  styles.quickSnoozeBtn,
                  { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill },
                ]}
              >
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'relative',
  },
  actionBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  leftActionReveal: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 140,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
  },
  rightActionsReveal: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 110,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    borderWidth: 1,
  },
  innerTouchable: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  metaIcon: {
    marginRight: 4,
  },
  quickSnoozeBtn: {
    padding: 6,
    marginLeft: 8,
    alignSelf: 'center',
  },
});
