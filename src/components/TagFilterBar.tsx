import React from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Task, TaskList } from '../types';

interface TagFilterBarProps {
  tasks: Task[];
  lists?: TaskList[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export interface TagInfo {
  tag: string;
  count: number;
}

/**
 * Extracts distinct tags from tasks (from `#tag` in title/notes, list names, and urgent priority)
 */
export const extractTagsFromTasks = (tasks: Task[], lists: TaskList[] = []): TagInfo[] => {
  const counts = new Map<string, number>();
  const listMap = new Map(lists.map((l) => [l.id, l.name.toLowerCase()]));

  for (const t of tasks) {
    if (t.isArchived) continue;

    const matchedTags = new Set<string>();

    // 1. Check title and notes for #hashtag
    const text = `${t.title} ${t.notes || ''}`;
    const matches = text.match(/#([a-zA-Z0-9_\-]+)/g);
    if (matches) {
      for (const m of matches) {
        matchedTags.add(m.toLowerCase());
      }
    }

    // 2. Check task's associated list
    if (t.listId && listMap.has(t.listId)) {
      matchedTags.add(`#${listMap.get(t.listId)!}`);
    }

    // 3. Urgent priority tag
    if (t.priority === 'urgent') {
      matchedTags.add('#urgent');
    }

    for (const tag of matchedTags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Filters a task list by the selected tag
 */
export const filterTasksByTag = (
  tasks: Task[],
  selectedTag: string | null,
  lists: TaskList[] = []
): Task[] => {
  if (!selectedTag || selectedTag === 'all') return tasks;

  const target = selectedTag.toLowerCase().replace(/^#/, '');
  const listMap = new Map(lists.map((l) => [l.id, l.name.toLowerCase()]));

  return tasks.filter((t) => {
    // 1. Text match `#tag` or `tag`
    const text = `${t.title} ${t.notes || ''}`.toLowerCase();
    if (text.includes(`#${target}`)) return true;

    // 2. List match
    if (t.listId && listMap.get(t.listId) === target) return true;

    // 3. Priority match
    if (target === 'urgent' && t.priority === 'urgent') return true;

    return false;
  });
};

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  tasks,
  lists = [],
  selectedTag,
  onSelectTag,
}) => {
  const { colors, typography, radii, spacing, cardStyle } = useTheme();
  const availableTags = extractTagsFromTasks(tasks, lists);

  if (availableTags.length === 0) {
    return null;
  }

  const activeTag = selectedTag || 'all';

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg }]}
      >
        {/* 'All' Chip */}
        <TouchableOpacity
          onPress={() => onSelectTag(null)}
          activeOpacity={0.7}
          style={[
            styles.chip,
            activeTag === 'all'
              ? {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                  borderRadius: radii.pill,
                }
              : {
                  ...cardStyle,
                  borderRadius: radii.pill,
                },
          ]}
        >
          <Text
            style={[
              typography.micro,
              styles.chipText,
              {
                color: activeTag === 'all' ? '#FFFFFF' : colors.text,
                fontWeight: activeTag === 'all' ? '800' : '600',
              },
            ]}
          >
            All
          </Text>
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor:
                  activeTag === 'all' ? 'rgba(255,255,255,0.25)' : colors.surfaceSecondary,
                borderRadius: radii.pill,
              },
            ]}
          >
            <Text
              style={[
                typography.micro,
                {
                  color: activeTag === 'all' ? '#FFFFFF' : colors.textSecondary,
                  fontSize: 10,
                  fontWeight: '700',
                },
              ]}
            >
              {tasks.filter((t) => !t.isArchived).length}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Dynamic Tag Chips */}
        {availableTags.map(({ tag, count }) => {
          const isSelected = activeTag.toLowerCase() === tag.toLowerCase();

          return (
            <TouchableOpacity
              key={tag}
              onPress={() => onSelectTag(isSelected ? null : tag)}
              activeOpacity={0.7}
              style={[
                styles.chip,
                isSelected
                  ? {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      borderRadius: radii.pill,
                    }
                  : {
                      ...cardStyle,
                      borderRadius: radii.pill,
                    },
              ]}
            >
              <Text
                style={[
                  typography.micro,
                  styles.chipText,
                  {
                    color: isSelected ? '#FFFFFF' : colors.text,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {tag}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor:
                      isSelected ? 'rgba(255,255,255,0.25)' : colors.surfaceSecondary,
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.micro,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                      fontSize: 10,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 6,
  },
  chipText: {
    textTransform: 'capitalize',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
});
