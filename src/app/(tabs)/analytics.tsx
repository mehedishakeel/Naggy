import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTasks } from '../../context/TaskContext';
import { computeAccountabilityMetrics } from '../../services/analytics';
import { PriorityBadge } from '../../components/PriorityBadge';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii, cardStyle } = useTheme();
  const { tasks } = useTasks();

  const metrics = useMemo(() => {
    return computeAccountabilityMetrics(tasks);
  }, [tasks]);

  const maxWeeklyCount = Math.max(1, ...metrics.weeklyTrend.map((d) => d.completedCount));

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}>
        <View>
          <Text style={[typography.caption, { color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700' }]}>
            PERFORMANCE & HABITS
          </Text>
          <Text style={[typography.titleLarge, { color: colors.text, marginTop: spacing.xxs, fontWeight: '800' }]}>
            Nag Analytics
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: spacing.lg, paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Daily Accountability Briefing Card */}
        <View
          style={[
            styles.briefingCard,
            cardStyle,
            {
              borderRadius: radii.xl,
              padding: 18,
              marginBottom: 16,
            },
          ]}
        >
          <View style={styles.briefingHeader}>
            <View style={[styles.periodBadge, { backgroundColor: colors.primaryLight, borderRadius: radii.pill }]}>
              <Ionicons
                name={
                  metrics.briefing.period === 'morning'
                    ? 'sunny'
                    : metrics.briefing.period === 'afternoon'
                    ? 'partly-sunny'
                    : 'moon'
                }
                size={14}
                color={colors.primary}
              />
              <Text style={[typography.micro, { color: colors.primary, fontWeight: '700', marginLeft: 4, textTransform: 'uppercase' }]}>
                {metrics.briefing.period} Briefing
              </Text>
            </View>
          </View>

          <Text style={[typography.titleSmall, { color: colors.text, marginTop: 10, fontWeight: '800' }]}>
            {metrics.briefing.headline}
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 6, lineHeight: 20 }]}>
            {metrics.briefing.summary}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceSecondary,
              padding: 12,
              borderRadius: radii.md,
              marginTop: 14,
              gap: 8,
            }}
          >
            <Ionicons name="bulb" size={16} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.text, flex: 1, fontWeight: '600' }]}>
              {metrics.briefing.actionAdvice}
            </Text>
          </View>
        </View>

        {/* 2. Key Metrics Grid */}
        <View style={styles.grid}>
          {/* Current Streak */}
          <View
            style={[
              styles.statCard,
              cardStyle,
              {
                borderRadius: radii.lg,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[typography.caption, { color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' }]}>
                Streak
              </Text>
              <Ionicons name="flame" size={20} color="#FF5A45" />
            </View>
            <Text style={[typography.titleLarge, { color: colors.text, marginTop: 8, fontWeight: '800' }]}>
              {metrics.currentStreak}{' '}
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>days</Text>
            </Text>
            <Text style={[typography.micro, { color: colors.textMuted, marginTop: 4 }]}>
              Best: {metrics.bestStreak} days
            </Text>
          </View>

          {/* Completion Rate */}
          <View
            style={[
              styles.statCard,
              cardStyle,
              {
                borderRadius: radii.lg,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[typography.caption, { color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' }]}>
                Rate
              </Text>
              <Ionicons name="checkmark-done-circle" size={20} color={colors.primary} />
            </View>
            <Text style={[typography.titleLarge, { color: colors.text, marginTop: 8, fontWeight: '800' }]}>
              {metrics.completionRate}%
            </Text>
            <Text style={[typography.micro, { color: colors.textMuted, marginTop: 4 }]}>
              {metrics.totalCompleted} tasks completed
            </Text>
          </View>

          {/* Average Time to Action */}
          <View
            style={[
              styles.statCard,
              cardStyle,
              {
                borderRadius: radii.lg,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[typography.caption, { color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' }]}>
                Time to Action
              </Text>
              <Ionicons name="timer-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[typography.titleLarge, { color: colors.text, marginTop: 8, fontWeight: '800' }]}>
              {metrics.avgTimeToCompletionMinutes > 0 ? `${metrics.avgTimeToCompletionMinutes}m` : '<10m'}
            </Text>
            <Text style={[typography.micro, { color: colors.textMuted, marginTop: 4 }]}>
              Avg delay past due time
            </Text>
          </View>

          {/* Total Disciplined */}
          <View
            style={[
              styles.statCard,
              cardStyle,
              {
                borderRadius: radii.lg,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[typography.caption, { color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' }]}>
                Disciplined
              </Text>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            </View>
            <Text style={[typography.titleLarge, { color: colors.text, marginTop: 8, fontWeight: '800' }]}>
              {metrics.totalCompleted}
            </Text>
            <Text style={[typography.micro, { color: colors.textMuted, marginTop: 4 }]}>
              Total closed with Naggy
            </Text>
          </View>
        </View>

        {/* 3. 7-Day Completion Velocity Chart */}
        <View
          style={[
            styles.chartCard,
            cardStyle,
            {
              borderRadius: radii.xl,
              padding: 18,
              marginTop: 16,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '700' }]}>
                7-Day Activity Velocity
              </Text>
              <Text style={[typography.micro, { color: colors.textSecondary, marginTop: 2 }]}>
                Daily completed tasks over the past week
              </Text>
            </View>
            <Ionicons name="bar-chart" size={18} color={colors.primary} />
          </View>

          <View style={styles.chartRow}>
            {metrics.weeklyTrend.map((day) => {
              const heightPercent = Math.max(12, Math.round((day.completedCount / maxWeeklyCount) * 100));
              const isToday = day.date === new Date().toISOString().split('T')[0];

              return (
                <View key={day.date} style={styles.barCol}>
                  <Text style={[typography.micro, { color: colors.textSecondary, marginBottom: 4, fontWeight: '600' }]}>
                    {day.completedCount}
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPercent}%`,
                          backgroundColor: isToday ? colors.primary : colors.surfaceTertiary,
                          borderRadius: radii.pill,
                          shadowColor: isToday ? colors.primary : 'transparent',
                          shadowOpacity: isToday ? 0.35 : 0,
                          shadowRadius: 4,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      typography.micro,
                      {
                        color: isToday ? colors.primary : colors.textMuted,
                        marginTop: 6,
                        fontWeight: isToday ? '700' : '500',
                      },
                    ]}
                  >
                    {day.dayLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 4. Most Postponed / Nagged Tasks */}
        <View style={{ marginTop: 20 }}>
          <Text style={[typography.caption, styles.sectionTitle, { color: colors.textSecondary }]}>
            FREQUENTLY POSTPONED TASKS
          </Text>

          {metrics.mostPostponedTasks.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                cardStyle,
                {
                  borderRadius: radii.xl,
                  padding: 20,
                  alignItems: 'center',
                },
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
              <Text style={[typography.bodyMedium, { color: colors.text, marginTop: 8, fontWeight: '700' }]}>
                No Persistent Procrastinations!
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
                You finish tasks without repeatedly hitting snooze. Outstanding discipline!
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.card,
                cardStyle,
                { borderRadius: radii.xl, overflow: 'hidden' },
              ]}
            >
              {metrics.mostPostponedTasks.map((t, idx) => (
                <TouchableOpacity
                  key={t.taskId}
                  onPress={() => router.push(`/task/${t.taskId}`)}
                  activeOpacity={0.7}
                  style={[
                    styles.postponedRow,
                    {
                      borderBottomColor: colors.borderSubtle,
                      borderBottomWidth: idx < metrics.mostPostponedTasks.length - 1 ? 1 : 0,
                      padding: 12,
                    },
                  ]}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                      {t.title}
                    </Text>
                    <Text style={[typography.micro, { color: colors.textSecondary, marginTop: 2 }]}>
                      Due {t.dueDate || 'Unscheduled'} • Repeatedly snoozed
                    </Text>
                  </View>
                  <PriorityBadge priority={t.priority as any} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 8,
  },
  content: {
    paddingTop: 12,
  },
  sectionTitle: {
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  briefingCard: {
    borderWidth: 1,
  },
  briefingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 14,
    borderWidth: 1,
  },
  chartCard: {
    borderWidth: 1,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 24,
    height: 70,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
  },
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyCard: {
    borderWidth: 1,
  },
  postponedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
