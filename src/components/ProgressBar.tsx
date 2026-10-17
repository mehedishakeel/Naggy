import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ProgressBarProps {
  completed: number;
  total: number;
  percentage: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ completed, total, percentage }) => {
  const { colors, typography, radii, spacing, isDark } = useTheme();

  if (total === 0) return null;

  return (
    <View style={[styles.container, { marginBottom: spacing.lg }]}>
      <View style={styles.textRow}>
        <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600', letterSpacing: 0.3 }]}>
          Daily Progress
        </Text>
        <Text style={[typography.caption, { color: colors.text, fontWeight: '700' }]}>
          {completed}/{total} ({percentage}%)
        </Text>
      </View>
      <View
        style={[
          styles.track,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(148, 163, 184, 0.25)',
            borderWidth: 1,
            borderRadius: radii.pill,
            height: 10,
            marginTop: spacing.xs,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              backgroundColor: percentage === 100 ? colors.success : colors.primary,
              width: `${Math.min(100, Math.max(0, percentage))}%`,
              borderRadius: radii.pill,
              shadowColor: percentage === 100 ? colors.success : colors.primary,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.4,
              shadowRadius: 4,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
    padding: 1.5,
  },
  fill: {
    height: '100%',
  },
});
