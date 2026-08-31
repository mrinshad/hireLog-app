import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { STATUS_CONFIG } from '@/services/tracking/trackingHelpers';
import { JobStatus } from '@/types/job';

interface StatusBadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Draft;
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
        isSm ? styles.badgeSm : styles.badgeMd,
      ]}>
      <Feather
        name={config.featherIcon as any}
        size={isSm ? 11 : 13}
        color={config.text}
        style={styles.icon}
      />
      <Text
        style={[
          styles.text,
          { color: config.text },
          isSm ? styles.textSm : styles.textMd,
        ]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  badgeSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    gap: 4,
  },
  badgeMd: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 6,
  },
  icon: {
    marginRight: 1,
  },
  text: {
    fontWeight: '600',
  },
  textSm: {
    fontSize: 11,
    lineHeight: 14,
  },
  textMd: {
    fontSize: 13,
    lineHeight: 16,
  },
});
