import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useNotifications } from '../context/NotificationContext';

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  highlight: string;
}

const slides: Slide[] = [
  {
    icon: 'notifications',
    title: 'Persistent Reminders',
    subtitle: 'A reminder is not finished just because you swiped it away. Naggy keeps reminding you until you explicitly complete it.',
    highlight: 'Dismissing is not completing.',
  },
  {
    icon: 'repeat',
    title: 'Reliable Recurring Habits',
    subtitle: 'Take medicine at 8 AM, drink water every 2 hours, or review work every evening. Completing today prepares tomorrow without clutter.',
    highlight: 'Never forget daily routines.',
  },
  {
    icon: 'shield-checkmark',
    title: 'Local-First & Distraction-Free',
    subtitle: 'Zero accounts required. No ads, no cloud tracking. Everything is stored locally on your device with complete data export and control.',
    highlight: 'We nag. You get things done.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii, cardStyle } = useTheme();
  const { updateSettings } = useSettings();
  const { requestPermission } = useNotifications();

  const [currentSlide, setCurrentSlide] = useState(0);

  const handleFinish = async () => {
    // Request permission contextually on final step
    await requestPermission();
    updateSettings({ hasCompletedOnboarding: true });
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    updateSettings({ hasCompletedOnboarding: true });
    router.replace('/(tabs)');
  };

  const slide = slides[currentSlide];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Skip Button */}
      <View style={[styles.topRow, { paddingHorizontal: spacing.lg }]}>
        <View style={styles.brandRow}>
          <Text style={[typography.titleSmall, { color: colors.primary, fontWeight: '800' }]}>
            Naggy
          </Text>
        </View>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, fontWeight: '600' }]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Slide Content */}
      <View style={[styles.slideContent, { paddingHorizontal: spacing.xl }]}>
        {currentSlide === 0 ? (
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 120, height: 120, borderRadius: radii.xl }}
            resizeMode="contain"
          />
        ) : (
          <View
            style={[
              styles.iconCircle,
              cardStyle,
              { borderRadius: radii.pill, width: 100, height: 100 },
            ]}
          >
            <Ionicons name={slide.icon} size={48} color={colors.primary} />
          </View>
        )}

        <Text
          style={[
            typography.caption,
            {
              color: colors.primary,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              fontWeight: '700',
              marginTop: spacing.xl,
            },
          ]}
        >
          {slide.highlight}
        </Text>

        <Text
          style={[
            typography.titleLarge,
            { color: colors.text, textAlign: 'center', marginTop: spacing.xs, fontWeight: '800' },
          ]}
        >
          {slide.title}
        </Text>

        <Text
          style={[
            typography.bodyMedium,
            {
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: spacing.md,
              lineHeight: 22,
            },
          ]}
        >
          {slide.subtitle}
        </Text>
      </View>

      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }]}>
        {/* Pagination Dots */}
        <View style={styles.paginationDots}>
          {slides.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor: currentSlide === idx ? colors.primary : colors.surfaceSecondary,
                  width: currentSlide === idx ? 24 : 8,
                  borderRadius: radii.pill,
                },
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={[
            styles.nextBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: radii.pill,
              marginTop: spacing.lg,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 4,
            },
          ]}
        >
          <Text style={[typography.bodyLarge, { color: '#FFFFFF', fontWeight: '700' }]}>
            {currentSlide === slides.length - 1 ? 'Enable Reminders & Start' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {},
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
  },
  nextBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
