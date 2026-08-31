import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface CardProps extends ViewProps {
  variant?: 'default' | 'subtle' | 'outlined';
}

export function Card({ style, variant = 'default', children, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'subtle' && styles.subtle,
        variant === 'outlined' && styles.outlined,
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  subtle: {
    backgroundColor: Colors.surfaceSubtle,
    borderColor: Colors.borderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderColor: Colors.borderDark,
    shadowOpacity: 0,
    elevation: 0,
  },
});
