import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Colors, IconSizes, Spacing, Typography } from '@/constants/theme';
import { PrimaryButton } from './Buttons';

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  actionLabel?: string;
  actionIcon?: keyof typeof Feather.glyphMap;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'inbox',
  title,
  actionLabel,
  actionIcon,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name={icon} size={IconSizes.xl} color={Colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <PrimaryButton
          title={actionLabel}
          icon={actionIcon}
          onPress={onAction}
          style={styles.actionBtn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.sectionTitle,
    fontSize: 17,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  actionBtn: {
    paddingHorizontal: Spacing.xl,
  },
});
