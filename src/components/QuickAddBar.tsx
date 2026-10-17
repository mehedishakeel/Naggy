import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { parseNaturalLanguageTask, ParsedTaskInput } from '../utils/nlp';
import { formatDisplayDate, formatDisplayTime } from '../utils/date';
import { formatRecurrenceRule } from '../utils/recurrence';

interface QuickAddBarProps {
  onAddTask: (parsed: ParsedTaskInput) => void;
  onOpenFullModal: () => void;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({ onAddTask, onOpenFullModal }) => {
  const { colors, typography, radii, spacing, cardStyle, isDark } = useTheme();
  const [text, setText] = useState('');

  const parsed = parseNaturalLanguageTask(text);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAddTask(parsed);
    setText('');
  };

  return (
    <View
      style={[
        styles.wrapper,
        cardStyle,
        {
          borderRadius: radii.xl,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          shadowRadius: 16,
        },
      ]}
    >
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Quick add: 'Exercise every day at 6pm'..."
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          style={[
            typography.bodyMedium,
            styles.input,
            { color: colors.text },
          ]}
        />

        {text.trim().length > 0 ? (
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.8}
            style={[
              styles.submitBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radii.pill,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.35,
                shadowRadius: 6,
                elevation: 3,
              },
            ]}
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onOpenFullModal}
            activeOpacity={0.7}
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.surfaceSecondary,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(148,163,184,0.2)',
              },
            ]}
          >
            <Ionicons name="options-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* NLP Detected elements chips preview */}
      {parsed.hasParsedElements && text.trim().length > 3 && (
        <View style={[styles.chipsRow, { marginTop: spacing.xs }]}>
          {!!parsed.dueDate && (
            <View style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
              <Ionicons name="calendar-outline" size={11} color={colors.primary} />
              <Text style={[typography.micro, { color: colors.primary, marginLeft: 4, fontWeight: '600' }]}>
                {formatDisplayDate(parsed.dueDate)}
              </Text>
            </View>
          )}

          {!!parsed.dueTime && (
            <View style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
              <Ionicons name="time-outline" size={11} color={colors.primary} />
              <Text style={[typography.micro, { color: colors.primary, marginLeft: 4, fontWeight: '600' }]}>
                {formatDisplayTime(parsed.dueTime)}
              </Text>
            </View>
          )}

          {parsed.isRecurring && (
            <View style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
              <Ionicons name="repeat" size={11} color={colors.normal} />
              <Text style={[typography.micro, { color: colors.normal, marginLeft: 4, fontWeight: '600' }]}>
                {formatRecurrenceRule(parsed.recurrenceRule)}
              </Text>
            </View>
          )}

          {!!parsed.priority && (
            <View style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
              <Text style={[typography.micro, { color: colors.urgent, fontWeight: '700' }]}>
                !{parsed.priority}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  submitBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
