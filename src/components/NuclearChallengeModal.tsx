import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { NuclearChallengeType } from '../types';

interface NuclearChallengeModalProps {
  visible: boolean;
  type?: NuclearChallengeType;
  actionTitle?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface MathProblem {
  question: string;
  correctAnswer: number;
  options: number[];
}

const generateMathProblem = (): MathProblem => {
  const operations = ['+', '-', '*'];
  const op = operations[Math.floor(Math.random() * operations.length)];
  let a = 0;
  let b = 0;
  let correctAnswer = 0;

  if (op === '+') {
    a = Math.floor(Math.random() * 35) + 15;
    b = Math.floor(Math.random() * 35) + 15;
    correctAnswer = a + b;
  } else if (op === '-') {
    a = Math.floor(Math.random() * 40) + 30;
    b = Math.floor(Math.random() * 25) + 10;
    correctAnswer = a - b;
  } else {
    // Multiplication with single-digit times teen
    a = Math.floor(Math.random() * 7) + 3;
    b = Math.floor(Math.random() * 12) + 6;
    correctAnswer = a * b;
  }

  // Generate 3 plausible distractors
  const distractors = new Set<number>();
  const offsets = [-10, -2, -1, 1, 2, 10, 5, -5];
  while (distractors.size < 3) {
    const offset = offsets[Math.floor(Math.random() * offsets.length)];
    const fake = correctAnswer + offset;
    if (fake !== correctAnswer && fake > 0) {
      distractors.add(fake);
    }
  }

  const options = Array.from(distractors).concat(correctAnswer);
  // Shuffle options
  options.sort(() => Math.random() - 0.5);

  return {
    question: `${a} ${op === '*' ? '×' : op} ${b} = ?`,
    correctAnswer,
    options,
  };
};

const NuclearChallengeContent: React.FC<{
  type: NuclearChallengeType;
  actionTitle: string;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ type, actionTitle, onSuccess, onCancel }) => {
  const { colors, typography, radii, spacing, cardStyle } = useTheme();
  const [problem, setProblem] = useState<MathProblem>(() => generateMathProblem());
  const [tapStep, setTapStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeAnim] = useState(() => new Animated.Value(0));

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleSelectOption = (choice: number) => {
    if (choice === problem.correctAnswer) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignored
      }
      onSuccess();
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Ignored
      }
      triggerShake();
      setErrorMessage('Incorrect! New problem generated.');
      setProblem(generateMathProblem());
    }
  };

  const handleTapStep = (number: number) => {
    if (number === tapStep) {
      if (tapStep === 5) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // Ignored
        }
        onSuccess();
      } else {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {
          // Ignored
        }
        setTapStep((prev) => prev + 1);
        setErrorMessage(null);
      }
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Ignored
      }
      triggerShake();
      setErrorMessage('Wrong order! Resetting to step 1.');
      setTapStep(1);
    }
  };

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.challengeCard,
          cardStyle,
          {
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            padding: spacing.xl,
            transform: [{ translateX: shakeAnim }],
          },
        ]}
      >
        {/* Header Badge */}
        <View style={styles.header}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: colors.urgentLight,
                borderColor: colors.urgent,
                borderRadius: radii.pill,
              },
            ]}
          >
            <Ionicons name="flame" size={14} color={colors.urgent} />
            <Text style={[typography.micro, { color: colors.urgent, fontWeight: '800', marginLeft: 4 }]}>
              NUCLEAR PROOF OF ACTION
            </Text>
          </View>
          <Text style={[typography.titleMedium, { color: colors.text, fontWeight: '800', marginTop: 10 }]}>
            {"Prove You're Awake! 🧠"}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
            Solve before you can {actionTitle.toLowerCase()}
          </Text>
        </View>

        {/* Error notice */}
        {errorMessage && (
          <View style={[styles.errorBanner, { backgroundColor: colors.urgentLight, borderRadius: radii.md }]}>
            <Ionicons name="close-circle" size={16} color={colors.urgent} />
            <Text style={[typography.caption, { color: colors.urgent, fontWeight: '700', marginLeft: 6 }]}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Challenge Body */}
        {type === 'math' ? (
          <View style={styles.body}>
            <View
              style={[
                styles.equationBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: radii.lg,
                },
              ]}
            >
              <Text style={[typography.titleLarge, { fontSize: 32, color: colors.text, fontWeight: '900', letterSpacing: 1 }]}>
                {problem.question}
              </Text>
            </View>

            <View style={styles.optionsGrid}>
              {problem.options.map((opt, idx) => (
                <TouchableOpacity
                  key={`${opt}-${idx}`}
                  onPress={() => handleSelectOption(opt)}
                  activeOpacity={0.7}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: radii.lg,
                    },
                  ]}
                >
                  <Text style={[typography.titleLarge, { color: colors.text, fontWeight: '800' }]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.body}>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }]}>
              Tap the numbers in order: <Text style={{ color: colors.primary, fontWeight: '800' }}>{tapStep}</Text> of 5
            </Text>
            <View style={styles.tapRow}>
              {[1, 2, 3, 4, 5].map((num) => {
                const isDone = num < tapStep;
                const isCurrent = num === tapStep;
                return (
                  <TouchableOpacity
                    key={num}
                    onPress={() => handleTapStep(num)}
                    activeOpacity={0.7}
                    style={[
                      styles.tapCircle,
                      {
                        backgroundColor: isDone
                          ? colors.success
                          : isCurrent
                          ? colors.primary
                          : colors.surfaceSecondary,
                        borderColor: isCurrent ? colors.primary : colors.border,
                        borderRadius: radii.pill,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.titleMedium,
                        {
                          color: isDone || isCurrent ? '#FFFFFF' : colors.text,
                          fontWeight: '800',
                        },
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Footer cancel / back */}
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton} activeOpacity={0.7}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Back to Nagging Alarm
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export const NuclearChallengeModal: React.FC<NuclearChallengeModalProps> = ({
  visible,
  type = 'math',
  actionTitle = 'Silence Alarm',
  onSuccess,
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <NuclearChallengeContent
        type={type}
        actionTitle={actionTitle}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  challengeCard: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
  },
  header: {
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginTop: 14,
    justifyContent: 'center',
  },
  body: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  equationBox: {
    width: '100%',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  optionButton: {
    width: '48%',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tapRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
  },
  tapCircle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
});
