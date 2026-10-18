import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTasks } from '../../context/TaskContext';
import { exportBackupJSON, exportTasksCSV } from '../../utils/backup';
import { clearCompletedTasks, resetDatabase } from '../../database';
import { MissedOccurrencePolicy, AlarmTone } from '../../types';

import { getCurrentAppVersion, promptForUpdates } from '../../services/updates';
import {
  AVAILABLE_TONES,
  previewAlarmTone,
  previewVoiceNag,
  stopAlarmSoundAndSpeech,
} from '../../services/alarmSound';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii, mode, setThemeMode, cardStyle } = useTheme();
  const { settings, updateSettings, refreshSettings } = useSettings();
  const { permissionState, requestPermission, reconcile } = useNotifications();
  const { refreshTasks, overdueTasks, todayTasks } = useTasks();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [playingTone, setPlayingTone] = useState<AlarmTone | null>(null);
  const [isSpeakingVoice, setIsSpeakingVoice] = useState(false);
  const currentVersion = getCurrentAppVersion();


  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      await promptForUpdates({ silentIfCurrent: false });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handlePreviewTone = async (toneId: AlarmTone) => {
    if (playingTone === toneId) {
      await stopAlarmSoundAndSpeech();
      setPlayingTone(null);
      return;
    }
    setPlayingTone(toneId);
    await previewAlarmTone(toneId, settings.alarmVolume);
    setTimeout(() => {
      setPlayingTone((curr) => (curr === toneId ? null : curr));
    }, 3200);
  };

  const handlePreviewVoice = async () => {
    if (isSpeakingVoice) {
      await stopAlarmSoundAndSpeech();
      setIsSpeakingVoice(false);
      return;
    }
    setIsSpeakingVoice(true);
    await previewVoiceNag('Review project proposal', settings.alarmVolume);
    setTimeout(() => {
      setIsSpeakingVoice(false);
    }, 3500);
  };


  const handleOpenSystemSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleExportJSON = async () => {
    const result = await exportBackupJSON();
    if (!result.success) {
      Alert.alert('Export Failed', result.error || 'Could not export backup');
    }
  };

  const handleExportCSV = async () => {
    const result = await exportTasksCSV();
    if (!result.success) {
      Alert.alert('Export Failed', result.error || 'Could not export CSV');
    }
  };

  const handleClearCompleted = () => {
    Alert.alert(
      'Clear Completed Tasks',
      'Are you sure you want to permanently delete all completed tasks?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearCompletedTasks();
            refreshTasks();
          },
        },
      ]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Application Data',
      'This will erase all tasks, lists, and settings. This action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Everything',
          style: 'destructive',
          onPress: () => {
            resetDatabase();
            refreshSettings();
            refreshTasks();
            reconcile();
          },
        },
      ]
    );
  };

  const intervalOptions = [5, 10, 15, 30, 60];
  const snoozeOptions = [5, 15, 30, 60];
  const missedOptions: { label: string; value: MissedOccurrencePolicy }[] = [
    { label: 'Keep as overdue', value: 'keep_overdue' },
    { label: 'Skip to next', value: 'skip' },
    { label: 'Reschedule for today', value: 'reschedule_today' },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}>
        <Text style={[typography.titleLarge, { color: colors.text, fontWeight: '800' }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: spacing.lg, paddingBottom: 84 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. APPEARANCE */}
        <View style={styles.section}>
          <Text style={[typography.caption, styles.sectionTitle, { color: colors.textSecondary, fontWeight: '700' }]}>
            APPEARANCE
          </Text>
          <View style={[styles.card, cardStyle, { borderRadius: radii.xl }]}>
            <View style={styles.themeSelectorRow}>
              {(['system', 'light', 'dark'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setThemeMode(m)}
                  activeOpacity={0.8}
                  style={[
                    styles.themeBtn,
                    {
                      backgroundColor: mode === m ? colors.primary : colors.surfaceSecondary,
                      borderRadius: radii.pill,
                      shadowColor: mode === m ? colors.primary : 'transparent',
                      shadowOpacity: mode === m ? 0.35 : 0,
                      shadowRadius: 6,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.bodySmall,
                      { color: mode === m ? '#FFFFFF' : colors.text, fontWeight: '700', textTransform: 'capitalize' },
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 2. NOTIFICATIONS & PERSISTENT NAGGING */}
        <View style={styles.section}>
          <Text style={[typography.caption, styles.sectionTitle, { color: colors.textSecondary, fontWeight: '700' }]}>
            PERSISTENT REMINDERS
          </Text>
          <View style={[styles.card, cardStyle, { borderRadius: radii.xl }]}>
            {/* Global Reminders Toggle */}
            <View style={[styles.settingRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <View style={styles.rowLabelContainer}>
                <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '600' }]}>Enable Reminders</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Schedule notifications for upcoming and due tasks
                </Text>
              </View>
              <Switch
                value={settings.remindersEnabled}
                onValueChange={(val) => {
                  updateSettings({ remindersEnabled: val });
                  reconcile();
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {/* Default Nagging Interval */}
            <View style={[styles.settingColumn, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1, padding: 14 }]}>
              <Text style={[typography.bodyMedium, { color: colors.text }]}>Default Nag Interval</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 8 }]}>
                How often Naggy reminds you when an active task is due
              </Text>
              <View style={styles.optionsRow}>
                {intervalOptions.map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    onPress={() => {
                      updateSettings({ defaultReminderIntervalMinutes: mins });
                      reconcile();
                    }}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor:
                          settings.defaultReminderIntervalMinutes === mins ? colors.primary : colors.surfaceSecondary,
                        borderRadius: radii.xs,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.micro,
                        {
                          color: settings.defaultReminderIntervalMinutes === mins ? '#FFFFFF' : colors.text,
                        },
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Default Snooze Duration */}
            <View style={[styles.settingColumn, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1, padding: 14 }]}>
              <Text style={[typography.bodyMedium, { color: colors.text }]}>Default Snooze</Text>
              <View style={[styles.optionsRow, { marginTop: 6 }]}>
                {snoozeOptions.map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    onPress={() => updateSettings({ defaultSnoozeMinutes: mins })}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor:
                          settings.defaultSnoozeMinutes === mins ? colors.primary : colors.surfaceSecondary,
                        borderRadius: radii.xs,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.micro,
                        {
                          color: settings.defaultSnoozeMinutes === mins ? '#FFFFFF' : colors.text,
                        },
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quiet Hours */}
            <View style={[styles.settingRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <View style={styles.rowLabelContainer}>
                <Text style={[typography.bodyMedium, { color: colors.text }]}>Quiet Hours</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Pause reminders between 10:00 PM and 7:00 AM
                </Text>
              </View>
              <Switch
                value={settings.quietHoursEnabled}
                onValueChange={(val) => {
                  updateSettings({ quietHoursEnabled: val });
                  reconcile();
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {/* Escalation Toggle */}
            <View style={[styles.settingRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <View style={styles.rowLabelContainer}>
                <Text style={[typography.bodyMedium, { color: colors.text }]}>Escalate Overdue Reminders</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Increase nag frequency if task is ignored for 1+ hours
                </Text>
              </View>
              <Switch
                value={settings.escalationEnabled}
                onValueChange={(val) => {
                  updateSettings({ escalationEnabled: val });
                  reconcile();
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {/* Permission Check & Status */}
            <TouchableOpacity
              onPress={permissionState.granted ? handleOpenSystemSettings : requestPermission}
              style={[styles.settingRow, { borderBottomWidth: 0 }]}
            >
              <View style={styles.rowLabelContainer}>
                <Text style={[typography.bodyMedium, { color: colors.text }]}>Notification Permissions</Text>
                <Text
                  style={[
                    typography.caption,
                    { color: permissionState.granted ? colors.success : colors.urgent },
                  ]}
                >
                  {permissionState.granted ? 'Permission active' : 'Permission missing / disabled'}
                </Text>
              </View>
              <Ionicons
                name={permissionState.granted ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={permissionState.granted ? colors.success : colors.urgent}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ALARM TONES & VOICE NAGGING */}
        <View style={styles.section}>
          <Text style={[typography.caption, styles.sectionTitle, { color: colors.textSecondary }]}>
            ALARM TONES & VOICE NAGGING
          </Text>
          <View
            style={[
              styles.card,
              cardStyle,
              { borderRadius: radii.xl },
            ]}
          >
            {/* Audible Sound Master Toggle */}
            <View style={[styles.settingRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <View style={styles.rowLabelContainer}>
                <Text style={[typography.bodyMedium, { color: colors.text }]}>Audible Alarm Sounds</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Play audible tones during full-screen persistent alarms
                </Text>
              </View>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(val) => updateSettings({ soundEnabled: val })}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {/* Voice Nagging Toggle */}
            <View style={[styles.settingRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <View style={styles.rowLabelContainer}>
                <Text style={[typography.bodyMedium, { color: colors.text }]}>Spoken Voice Nagging</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Reads the overdue task title aloud until completed or snoozed
                </Text>
              </View>
              <Switch
                value={settings.voiceNaggingEnabled}
                onValueChange={(val) => updateSettings({ voiceNaggingEnabled: val })}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {/* Test Voice Button */}
            {settings.voiceNaggingEnabled && (
              <View
                style={[
                  styles.settingRow,
                  {
                    borderBottomColor: colors.borderSubtle,
                    borderBottomWidth: 1,
                    backgroundColor: colors.surfaceSecondary,
                  },
                ]}
              >
                <View style={styles.rowLabelContainer}>
                  <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '600' }]}>
                    Test Voice Synthesizer
                  </Text>
                  <Text style={[typography.micro, { color: colors.textSecondary }]}>
                    Preview how Naggy speaks task alerts
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handlePreviewVoice}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: radii.pill,
                    gap: 6,
                  }}
                >
                  <Ionicons
                    name={isSpeakingVoice ? 'stop' : 'volume-high'}
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={[typography.micro, { color: '#FFFFFF', fontWeight: '700' }]}>
                    {isSpeakingVoice ? 'Speaking...' : 'Play Sample'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Alarm Volume Selector */}
            <View
              style={[
                styles.settingColumn,
                { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1, padding: 14 },
              ]}
            >
              <Text style={[typography.bodyMedium, { color: colors.text }]}>Alarm Volume</Text>
              <View style={[styles.optionsRow, { marginTop: 8 }]}>
                {[
                  { label: '50%', val: 0.5 },
                  { label: '80%', val: 0.8 },
                  { label: '100% (Max)', val: 1.0 },
                ].map((vol) => (
                  <TouchableOpacity
                    key={vol.val}
                    onPress={() => updateSettings({ alarmVolume: vol.val })}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor:
                          settings.alarmVolume === vol.val ? colors.primary : colors.surfaceSecondary,
                        borderRadius: radii.xs,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.micro,
                        {
                          color: settings.alarmVolume === vol.val ? '#FFFFFF' : colors.text,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {vol.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tone Selector */}
            <View style={{ padding: 14 }}>
              <Text style={[typography.bodyMedium, { color: colors.text }]}>Alarm Tone Selection</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 10 }]}>
                Choose your desired audio alert or test tones
              </Text>

              {AVAILABLE_TONES.map((tone) => {
                const isSelected = settings.alarmTone === tone.id;
                const isPlaying = playingTone === tone.id;

                return (
                  <View
                    key={tone.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      marginBottom: 6,
                      backgroundColor: isSelected ? colors.surfaceSecondary : 'transparent',
                      borderRadius: radii.sm,
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: colors.border,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => updateSettings({ alarmTone: tone.id })}
                      style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={[typography.bodySmall, { color: colors.text, fontWeight: isSelected ? '700' : '500' }]}>
                          {tone.label}
                        </Text>
                        <Text style={[typography.micro, { color: colors.textSecondary, marginTop: 2 }]}>
                          {tone.description}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {tone.id !== 'none' && (
                      <TouchableOpacity
                        onPress={() => handlePreviewTone(tone.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                        style={{
                          padding: 6,
                          borderRadius: radii.pill,
                          backgroundColor: isPlaying ? colors.primary : colors.surfaceSecondary,
                          marginLeft: 8,
                        }}
                      >
                        <Ionicons
                          name={isPlaying ? 'volume-high' : 'play-outline'}
                          size={16}
                          color={isPlaying ? '#FFFFFF' : colors.primary}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* ANDROID WIDGET & STICKY LOCK SCREEN */}
        <View style={styles.section}>
          <Text style={[typography.caption, styles.sectionTitle, { color: colors.textSecondary }]}>
            ANDROID WIDGET & STICKY LOCK SCREEN
          </Text>
          <View
            style={[
              styles.card,
              cardStyle,
              { borderRadius: radii.xl },
            ]}
          >
            {/* Sticky Lock Screen Toggle */}
            <View style={[styles.settingRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <View style={styles.rowLabelContainer}>
                <Text style={[typography.bodyMedium, { color: colors.text }]}>Sticky Lock Screen Nag</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Pins top overdue task to lock screen with un-swipeable ongoing priority
                </Text>
              </View>
              <Switch
                value={settings.stickyNotificationEnabled}
                onValueChange={(val) => {
                  updateSettings({ stickyNotificationEnabled: val });
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {/* Glanceable Widget Card Preview */}
            <View style={{ padding: 14 }}>
              <Text style={[typography.bodyMedium, { color: colors.text, marginBottom: 4 }]}>
                Home Screen Glanceable Widget
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 12 }]}>
                Stay accountable with instant glanceable task stats directly on your Android home screen
              </Text>

              {/* Widget Mockup Card */}
              <View
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: radii.md,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="notifications" size={16} color={colors.primary} />
                    <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                      NAGGY GLANCE
                    </Text>
                  </View>
                  <Text style={[typography.micro, { color: colors.textSecondary }]}>
                    Live Sync Active
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.surface,
                      borderRadius: radii.xs,
                      padding: 10,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.borderSubtle,
                    }}
                  >
                    <Text style={[typography.titleMedium, { color: colors.urgent, fontWeight: '800' }]}>
                      {overdueTasks.length}
                    </Text>
                    <Text style={[typography.micro, { color: colors.textSecondary, textTransform: 'uppercase' }]}>
                      Overdue Nags
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.surface,
                      borderRadius: radii.xs,
                      padding: 10,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.borderSubtle,
                    }}
                  >
                    <Text style={[typography.titleMedium, { color: colors.primary, fontWeight: '800' }]}>
                      {todayTasks.length}
                    </Text>
                    <Text style={[typography.micro, { color: colors.textSecondary, textTransform: 'uppercase' }]}>
                      {"Today's Due"}
                    </Text>
                  </View>
                </View>

                {overdueTasks.length > 0 ? (
                  <View style={{ backgroundColor: colors.surface, padding: 8, borderRadius: radii.xs }}>
                    <Text style={[typography.micro, { color: colors.urgent, fontWeight: '700' }]}>
                      ⚠️ NEXT TO COMPLETE:
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '600', marginTop: 2 }]} numberOfLines={1}>
                      {overdueTasks[0].title}
                    </Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: colors.surface, padding: 8, borderRadius: radii.xs }}>
                    <Text style={[typography.micro, { color: colors.success, fontWeight: '600' }]}>
                      ✓ All caught up! No overdue tasks pending.
                    </Text>
                  </View>
                )}
              </View>

              {/* Instructions */}
              <View style={{ marginTop: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} style={{ marginTop: 2 }} />
                <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, lineHeight: 18 }]}>
                  To add the widget: Long-press any empty space on your Android home screen, tap <Text style={{ fontWeight: '700', color: colors.text }}>Widgets</Text>, select <Text style={{ fontWeight: '700', color: colors.text }}>Naggy</Text>, and drag it to your screen.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. RECURRING TASKS POLICY */}
        <View style={styles.section}>
          <Text style={[typography.caption, styles.sectionTitle, { color: colors.textSecondary }]}>
            RECURRING TASKS
          </Text>
          <View style={[styles.card, cardStyle, { borderRadius: radii.xl, padding: 16 }]}>
            <Text style={[typography.bodyMedium, { color: colors.text }]}>Missed Occurrences Policy</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 10 }]}>
              What happens if a device is offline or an occurrence is missed
            </Text>
            {missedOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => updateSettings({ missedOccurrencePolicy: opt.value })}
                style={[
                  styles.radioRow,
                  {
                    backgroundColor:
                      settings.missedOccurrencePolicy === opt.value
                        ? colors.surfaceSecondary
                        : 'transparent',
                    borderRadius: radii.sm,
                  },
                ]}
              >
                <Ionicons
                  name={
                    settings.missedOccurrencePolicy === opt.value
                      ? 'radio-button-on'
                      : 'radio-button-off'
                  }
                  size={18}
                  color={settings.missedOccurrencePolicy === opt.value ? colors.primary : colors.textSecondary}
                />
                <Text style={[typography.bodySmall, { color: colors.text, marginLeft: 10 }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 4. DATA PORTABILITY & BACKUP */}
        <View style={styles.section}>
          <Text style={[typography.caption, styles.sectionTitle, { color: colors.textSecondary }]}>
            DATA & BACKUP
          </Text>
          <View style={[styles.card, cardStyle, { borderRadius: radii.xl }]}>
            <TouchableOpacity
              onPress={handleExportJSON}
              style={[styles.actionRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="download-outline" size={18} color={colors.primary} />
                <Text style={[typography.bodyMedium, { color: colors.text, marginLeft: 12 }]}>
                  Export Backup (JSON)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExportCSV}
              style={[styles.actionRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                <Text style={[typography.bodyMedium, { color: colors.text, marginLeft: 12 }]}>
                  Export Tasks (CSV)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClearCompleted}
              style={[styles.actionRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="trash-outline" size={18} color={colors.urgent} />
                <Text style={[typography.bodyMedium, { color: colors.urgent, marginLeft: 12 }]}>
                  Clear Completed Tasks
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResetData}
              style={[styles.actionRow, { borderBottomWidth: 0 }]}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.urgent} />
                <Text style={[typography.bodyMedium, { color: colors.urgent, marginLeft: 12 }]}>
                  Reset All Application Data
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. ABOUT & UPDATES */}
        <View style={styles.section}>
          <Text style={[typography.caption, styles.sectionTitle, { color: colors.textSecondary }]}>
            ABOUT & UPDATES
          </Text>
          <View style={[styles.card, cardStyle, { borderRadius: radii.xl, padding: 18 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Image
                source={require('../../../assets/logo.png')}
                style={{ width: 48, height: 48, borderRadius: radii.md, marginRight: 14 }}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[typography.bodyLarge, { color: colors.text, fontWeight: '800' }]}>
                    Naggy v{currentVersion}
                  </Text>
                </View>
                <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                  We nag. You get things done.
                </Text>
              </View>
            </View>

            <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18, marginBottom: 16 }]}>
              100% Local-First. All tasks, reminders, and schedules live entirely on your device SQLite database. No tracking, no ads, no cloud sync required.
            </Text>

            <TouchableOpacity
              onPress={handleCheckUpdate}
              disabled={isCheckingUpdate}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primary,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: radii.pill,
                gap: 8,
                marginBottom: 8,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.35,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              {isCheckingUpdate ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="cloud-download" size={18} color="#FFFFFF" />
              )}
              <Text style={[typography.bodyMedium, { color: '#FFFFFF', fontWeight: '700' }]}>
                {isCheckingUpdate ? 'Checking GitHub Releases...' : 'Check for App Updates'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL('https://github.com/mehedishakeel/Naggy')}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 6,
                gap: 6,
              }}
            >
              <Ionicons name="logo-github" size={16} color={colors.textSecondary} />
              <Text style={[typography.bodySmall, { color: colors.textSecondary, fontWeight: '500' }]}>
                View on GitHub (mehedishakeel/Naggy)
              </Text>
            </TouchableOpacity>
          </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeSelectorRow: {
    flexDirection: 'row',
    padding: 6,
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  settingColumn: {},
  rowLabelContainer: {
    flex: 1,
    paddingRight: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
