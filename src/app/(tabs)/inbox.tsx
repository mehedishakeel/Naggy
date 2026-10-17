import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTasks } from '../../context/TaskContext';

const LIST_COLORS = [
  '#FF5A45', // coral
  '#3B82F6', // blue
  '#10B981', // green
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EC4899', // pink
  '#14B8A6', // teal
];

const LIST_ICONS = ['list', 'briefcase', 'person', 'heart', 'repeat', 'cart', 'book', 'home', 'star'];

export default function InboxListsScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii, cardStyle } = useTheme();
  const { lists, tasks, createList } = useTasks();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedColor, setSelectedColor] = useState(LIST_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(LIST_ICONS[0]);

  // Count uncategorized tasks in Inbox
  const inboxCount = tasks.filter((t) => !t.listId && !t.isCompleted && !t.isArchived).length;
  const completedTotal = tasks.filter((t) => t.isCompleted && !t.isArchived).length;

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    await createList(newListName.trim(), selectedColor, selectedIcon);
    setNewListName('');
    setIsModalVisible(false);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}>
        <Text style={[typography.titleLarge, { color: colors.text, fontWeight: '800' }]}>Lists & Inbox</Text>
        <TouchableOpacity
          onPress={() => setIsModalVisible(true)}
          activeOpacity={0.8}
          style={[
            styles.addBtn,
            cardStyle,
            { borderRadius: radii.pill, width: 42, height: 42 },
          ]}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: spacing.lg, paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Built-in Inbox */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/list/inbox')}
          style={[
            styles.listRow,
            cardStyle,
            { borderRadius: radii.lg, marginBottom: spacing.md, padding: 14 },
          ]}
        >
          <View style={styles.listLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryLight, borderRadius: radii.md }]}>
              <Ionicons name="file-tray" size={20} color={colors.primary} />
            </View>
            <Text style={[typography.bodyLarge, { color: colors.text, fontWeight: '700', marginLeft: 14 }]}>
              Inbox
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
              {inboxCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Section title: Custom Lists */}
        <View style={[styles.sectionHeading, { marginTop: spacing.sm, marginBottom: spacing.sm }]}>
          <Text style={[typography.caption, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700' }]}>
            Custom Lists
          </Text>
        </View>

        {/* Custom Lists */}
        {lists.map((l) => (
          <TouchableOpacity
            key={l.id}
            activeOpacity={0.7}
            onPress={() => router.push(`/list/${l.id}`)}
            style={[
              styles.listRow,
              cardStyle,
              { borderRadius: radii.lg, marginBottom: spacing.md, padding: 14 },
            ]}
          >
            <View style={styles.listLeft}>
              <View style={[styles.iconBox, { backgroundColor: `${l.color}1A`, borderRadius: radii.md }]}>
                <Ionicons name={l.icon as any} size={20} color={l.color} />
              </View>
              <Text style={[typography.bodyLarge, { color: colors.text, fontWeight: '700', marginLeft: 14 }]}>
                {l.name}
              </Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
                {l.taskCount || 0}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Section: Archive / Completed */}
        <View style={[styles.sectionHeading, { marginTop: spacing.sm, marginBottom: spacing.sm }]}>
          <Text style={[typography.caption, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700' }]}>
            Archive
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/list/completed')}
          style={[
            styles.listRow,
            cardStyle,
            { borderRadius: radii.lg, marginBottom: spacing.md, padding: 14 },
          ]}
        >
          <View style={styles.listLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.successLight, borderRadius: radii.md }]}>
              <Ionicons name="checkmark-done" size={20} color={colors.success} />
            </View>
            <Text style={[typography.bodyLarge, { color: colors.text, fontWeight: '700', marginLeft: 14 }]}>
              All Completed Tasks
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
              {completedTotal}
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal: Create List */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              cardStyle,
              { borderRadius: radii.xl, padding: spacing.xl },
            ]}
          >
            <Text style={[typography.titleSmall, { color: colors.text, fontWeight: '700', marginBottom: spacing.md }]}>
              New Custom List
            </Text>

            <TextInput
              value={newListName}
              onChangeText={setNewListName}
              placeholder="List name (e.g. Shopping, Projects)"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.modalInput,
                typography.bodyMedium,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 12,
                },
              ]}
            />

            {/* Color selection */}
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs }]}>
              Color
            </Text>
            <View style={styles.colorRow}>
              {LIST_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorDot,
                    {
                      backgroundColor: c,
                      borderColor: selectedColor === c ? colors.text : 'transparent',
                    },
                  ]}
                />
              ))}
            </View>

            {/* Icon selection */}
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs }]}>
              Icon
            </Text>
            <View style={styles.iconRow}>
              {LIST_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setSelectedIcon(ic)}
                  style={[
                    styles.iconSelectBtn,
                    {
                      backgroundColor: selectedIcon === ic ? colors.primaryLight : colors.surfaceSecondary,
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  <Ionicons
                    name={ic as any}
                    size={18}
                    color={selectedIcon === ic ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Modal Actions */}
            <View style={[styles.modalActions, { marginTop: spacing.xl }]}>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                activeOpacity={0.7}
                style={[styles.modalBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md }]}
              >
                <Text style={[typography.bodyMedium, { color: colors.textSecondary, fontWeight: '600' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateList}
                activeOpacity={0.8}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radii.md,
                    marginLeft: spacing.sm,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.35,
                    shadowRadius: 6,
                    elevation: 3,
                  },
                ]}
              >
                <Text style={[typography.bodyMedium, { color: '#FFFFFF', fontWeight: '700' }]}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: 12,
  },
  sectionHeading: {},
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderWidth: 1,
  },
  modalInput: {
    paddingVertical: 10,
    borderWidth: 1,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconSelectBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
