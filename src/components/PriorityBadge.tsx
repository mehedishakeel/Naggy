import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Priority } from '../types';
import { useTheme } from '../context/ThemeContext';

interface PriorityBadgeProps {
  priority: Priority;
  compact?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, compact = false }) => {
  const { colors, typography, radii } = useTheme();

  if (priority === 'none') return null;

  let label = 'Low';
  let badgeColor = colors.low;
  let bg = colors.lowLight;

  if (priority === 'urgent') {
    label = 'Urgent';
    badgeColor = colors.urgent;
    bg = colors.urgentLight;
  } else if (priority === 'high') {
    label = 'High';
    badgeColor = colors.high;
    bg = colors.highLight;
  } else if (priority === 'normal') {
    label = 'Normal';
    badgeColor = colors.normal;
    bg = colors.normalLight;
  }

  if (compact) {
    return (
      <View style={[styles.compactDot, { backgroundColor: badgeColor }]} />
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: radii.pill }]}>
      <Text style={[typography.micro, { color: badgeColor, fontWeight: '700' }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  compactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
});
