import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';

interface ProfileSectionCardProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  summary: string;
  itemCount?: number;
  onEdit: () => void;
  actionLabel?: string;
}

export function ProfileSectionCard({
  title,
  icon,
  summary,
  itemCount,
  onEdit,
  actionLabel = 'Edit',
}: ProfileSectionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={styles.iconCircle}>
            <Feather name={icon} size={IconSizes.md} color={Colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.nameRow}>
              <Text style={Typography.itemTitle}>{title}</Text>
              {typeof itemCount === 'number' && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{itemCount}</Text>
                </View>
              )}
            </View>
            <Text style={Typography.supporting} numberOfLines={2}>
              {summary || 'Not provided yet'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={onEdit}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel} ${title}`}>
          <Feather name="edit-2" size={12} color={Colors.primary} />
          <Text style={styles.editButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countBadge: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
});
