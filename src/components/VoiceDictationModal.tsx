import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { parseNaturalLanguageTask, ParsedTaskInput } from '../utils/nlp';

interface VoiceDictationModalProps {
  visible: boolean;
  onClose: () => void;
  onTaskParsed: (task: ParsedTaskInput) => void;
}

const VOICE_SUGGESTIONS = [
  'Nag me to submit taxes tomorrow at 2pm',
  'Dentist appointment next Monday at 10am urgent',
  'Buy groceries every Friday',
  'Water plants daily at 8am',
  'Call mom tonight at 7pm high priority',
];

interface VoiceDictationContentProps {
  onClose: () => void;
  onTaskParsed: (task: ParsedTaskInput) => void;
}

const VoiceDictationContent: React.FC<VoiceDictationContentProps> = ({
  onClose,
  onTaskParsed,
}) => {
  const { colors, typography, radii, spacing, cardStyle, isDark } = useTheme();
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Animation values for microphone wave pulses
  const [pulseAnim1] = useState(() => new Animated.Value(1));
  const [pulseAnim2] = useState(() => new Animated.Value(1));
  const [waveAnim] = useState(() => new Animated.Value(0.4));
  const recognitionRef = useRef<any>(null);

  const parsed = parseNaturalLanguageTask(transcript);

  // Pulse animation loops when listening
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (isListening) {
      animLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim1, { toValue: 1.5, duration: 900, useNativeDriver: true }),
            Animated.timing(pulseAnim1, { toValue: 1, duration: 900, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(pulseAnim2, { toValue: 1.8, duration: 1200, useNativeDriver: true }),
            Animated.timing(pulseAnim2, { toValue: 1, duration: 1200, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(waveAnim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
        ])
      );
      animLoop.start();
    } else {
      pulseAnim1.setValue(1);
      pulseAnim2.setValue(1);
      waveAnim.setValue(0.4);
    }

    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [isListening, pulseAnim1, pulseAnim2, waveAnim]);

  // Start speech recognition if supported on platform
  const startListening = () => {
    setSpeechError(null);
    setTranscript('');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignored
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onstart = () => {
            setIsListening(true);
          };

          recognition.onresult = (event: any) => {
            let current = '';
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0].transcript;
            }
            setTranscript(current);
          };

          recognition.onerror = (event: any) => {
            console.warn('Speech recognition error:', event.error);
            setIsListening(false);
            if (event.error !== 'no-speech') {
              setSpeechError(`Voice error: ${event.error}`);
            }
          };

          recognition.onend = () => {
            setIsListening(false);
          };

          recognitionRef.current = recognition;
          recognition.start();
          return;
        } catch (e: any) {
          console.warn('Failed to start Web Speech API:', e);
        }
      }
    }

    // Default simulation/live listening state for environments without Web Speech
    setIsListening(true);
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
    }
  };

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        startListening();
      }
    }, 50);

    return () => {
      active = false;
      clearTimeout(timer);
      stopListening();
    };
  }, []);

  const handleSelectSuggestion = (sample: string) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Ignored
    }
    setTranscript(sample);
    stopListening();
  };

  const handleConfirmTask = () => {
    if (!transcript.trim()) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignored
    }

    stopListening();
    onTaskParsed(parsed);
    onClose();
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <View style={styles.overlay}>
      <View
        style={[
          styles.container,
          cardStyle,
          {
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            padding: spacing.xl,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: colors.primaryLight, borderRadius: radii.pill }]}>
            <Ionicons name="mic" size={14} color={colors.primary} />
            <Text style={[typography.micro, { color: colors.primary, fontWeight: '800', marginLeft: 6 }]}>
              NAGGY VOICE CAPTURE
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[typography.titleMedium, { color: colors.text, fontWeight: '800', marginTop: 12 }]}>
          What should Naggy remind you to do?
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4, lineHeight: 18 }]}>
          Speak naturally (e.g. &ldquo;Nag me to pay bill tomorrow at 5pm urgent&rdquo;)
        </Text>

        {/* Center Animated Mic Pulsing Stage */}
        <View style={styles.micStageContainer}>
          {/* Outer Wave 2 */}
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                backgroundColor: colors.primary + (isDark ? '25' : '15'),
                transform: [{ scale: pulseAnim2 }],
                opacity: isListening ? 0.6 : 0,
              },
            ]}
          />
          {/* Inner Wave 1 */}
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: colors.primary + (isDark ? '35' : '22'),
                transform: [{ scale: pulseAnim1 }],
                opacity: isListening ? 0.8 : 0,
              },
            ]}
          />

          {/* Center Mic Button */}
          <TouchableOpacity
            onPress={toggleMic}
            activeOpacity={0.85}
            style={[
              styles.micButton,
              {
                backgroundColor: isListening ? colors.primary : colors.surfaceSecondary,
                shadowColor: isListening ? colors.primary : '#000000',
                shadowOpacity: isListening ? 0.45 : 0.1,
              },
            ]}
          >
            <Ionicons
              name={isListening ? 'mic' : 'mic-outline'}
              size={36}
              color={isListening ? '#FFFFFF' : colors.text}
            />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <Text
            style={[
              typography.micro,
              {
                color: isListening ? colors.primary : colors.textMuted,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              },
            ]}
          >
            {isListening ? 'Listening... Speak now' : 'Tapped to pause. Tap mic to speak'}
          </Text>
        </View>

        {/* Realtime Transcript Card */}
        <View
          style={[
            styles.transcriptCard,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.borderSubtle,
              borderRadius: radii.md,
            },
          ]}
        >
          <Text
            style={[
              typography.bodyMedium,
              {
                color: transcript ? colors.text : colors.textMuted,
                fontStyle: transcript ? 'normal' : 'italic',
                minHeight: 44,
              },
            ]}
          >
            {transcript || 'Say something like: "Nag me to finish presentation Friday at 4pm"'}
          </Text>

          {speechError && (
            <Text style={[typography.micro, { color: colors.urgent, marginTop: 6 }]}>
              {speechError}
            </Text>
          )}
        </View>

        {/* NLP Breakdown preview pills if transcript present */}
        {!!transcript && (
          <View style={styles.detectedDetailsContainer}>
            <Text style={[typography.micro, { color: colors.textSecondary, fontWeight: '700', marginBottom: 6 }]}>
              PARSED DETAILS
            </Text>
            <View style={styles.pillsRow}>
              {/* Clean Title */}
              <View style={[styles.detailPill, { backgroundColor: colors.well, borderRadius: radii.pill }]}>
                <Ionicons name="checkbox-outline" size={12} color={colors.primary} />
                <Text numberOfLines={1} style={[typography.micro, { color: colors.text, maxWidth: 140 }]}>
                  {parsed.cleanTitle}
                </Text>
              </View>

              {/* Due Date */}
              {parsed.dueDate && (
                <View style={[styles.detailPill, { backgroundColor: colors.well, borderRadius: radii.pill }]}>
                  <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                  <Text style={[typography.micro, { color: colors.text }]}>
                    {parsed.dueDate}
                  </Text>
                </View>
              )}

              {/* Due Time */}
              {parsed.dueTime && (
                <View style={[styles.detailPill, { backgroundColor: colors.well, borderRadius: radii.pill }]}>
                  <Ionicons name="time-outline" size={12} color={colors.primary} />
                  <Text style={[typography.micro, { color: colors.text }]}>
                    {parsed.dueTime}
                  </Text>
                </View>
              )}

              {/* Priority */}
              {parsed.priority && parsed.priority !== 'none' && (
                <View style={[styles.detailPill, { backgroundColor: colors.urgentLight, borderRadius: radii.pill }]}>
                  <Ionicons name="flag" size={12} color={colors.urgent} />
                  <Text style={[typography.micro, { color: colors.urgent, textTransform: 'capitalize' }]}>
                    {parsed.priority}
                  </Text>
                </View>
              )}

              {/* Recurring */}
              {parsed.isRecurring && (
                <View style={[styles.detailPill, { backgroundColor: colors.primaryLight, borderRadius: radii.pill }]}>
                  <Ionicons name="repeat" size={12} color={colors.primary} />
                  <Text style={[typography.micro, { color: colors.primary }]}>
                    Recurring
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Quick Suggestion Chips */}
        <View style={{ marginTop: 12 }}>
          <Text style={[typography.micro, { color: colors.textSecondary, fontWeight: '600', marginBottom: 8 }]}>
            OR TAP A COMMON TASK
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {VOICE_SUGGESTIONS.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => handleSelectSuggestion(item)}
                activeOpacity={0.7}
                style={[
                  styles.suggestionChip,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.borderSubtle,
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Text style={[typography.micro, { color: colors.text }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Action Button: Schedule Nag */}
        <TouchableOpacity
          onPress={handleConfirmTask}
          disabled={!transcript.trim()}
          activeOpacity={0.8}
          style={[
            styles.confirmBtn,
            {
              backgroundColor: transcript.trim() ? colors.primary : colors.surfaceSecondary,
              borderRadius: radii.pill,
              marginTop: 18,
            },
          ]}
        >
          <Ionicons
            name="flash"
            size={18}
            color={transcript.trim() ? '#FFFFFF' : colors.textMuted}
          />
          <Text
            style={[
              typography.bodyMedium,
              {
                color: transcript.trim() ? '#FFFFFF' : colors.textMuted,
                fontWeight: '700',
                marginLeft: 8,
              },
            ]}
          >
            Schedule Voice Nag
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const VoiceDictationModal: React.FC<VoiceDictationModalProps> = ({
  visible,
  onClose,
  onTaskParsed,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      {visible && (
        <VoiceDictationContent
          onClose={onClose}
          onTaskParsed={onTaskParsed}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  closeBtn: {
    padding: 4,
  },
  micStageContainer: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pulseCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  transcriptCard: {
    padding: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  detectedDetailsContainer: {
    marginTop: 10,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
});
