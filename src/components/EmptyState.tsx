import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'checkmark-done-circle-outline',
  title,
  description,
}) => {
  const { colors, typography, spacing, cardStyle } = useTheme();

  return (
    <View style={[styles.container, { paddingVertical: spacing.xxl }]}>
      <View
        style={[
          styles.iconCircle,
          cardStyle,
          {
            width: 72,
            height: 72,
            borderRadius: 36,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          },
        ]}
      >
        <Ionicons name={icon} size={32} color={colors.primary} />
      </View>
      <Text
        style={[
          typography.titleSmall,
          { color: colors.text, textAlign: 'center', fontWeight: '700' },
        ]}
      >
        {title}
      </Text>
      {!!description && (
        <Text
          style={[
            typography.bodySmall,
            {
              color: colors.textSecondary,
              marginTop: spacing.xs,
              textAlign: 'center',
              paddingHorizontal: spacing.lg,
              lineHeight: 20,
            },
          ]}
        >
          {description}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {},
});
