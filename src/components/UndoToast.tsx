import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTasks } from '../context/TaskContext';

export const UndoToast: React.FC = () => {
  const { colors, typography, radii, spacing } = useTheme();
  const { undoAction, undo, dismissUndo } = useTasks();

  useEffect(() => {
    if (undoAction) {
      const timer = setTimeout(() => {
        dismissUndo();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [undoAction, dismissUndo]);

  if (!undoAction) return null;

  const label =
    undoAction.type === 'complete'
      ? `Completed: ${undoAction.previousTask.title}`
      : `Deleted: ${undoAction.previousTask.title}`;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.text,
          borderRadius: radii.lg,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[typography.bodySmall, styles.label, { color: colors.background }]}
      >
        {label}
      </Text>
      <TouchableOpacity
        onPress={undo}
        style={[styles.btn, { backgroundColor: colors.primary, borderRadius: radii.sm }]}
      >
        <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
          Undo
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  label: {
    flex: 1,
    marginRight: 12,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
