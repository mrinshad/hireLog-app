import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  icon?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PrimaryButton({
  title,
  icon,
  loading = false,
  size = 'md',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.primaryBtn,
        isSm ? styles.btnSm : isLg ? styles.btnLg : styles.btnMd,
        disabled && styles.btnDisabled,
        style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator size="small" color={Colors.textInverse} />
      ) : (
        <>
          {icon && (
            <Feather
              name={icon}
              size={isSm ? IconSizes.xs : IconSizes.sm}
              color={Colors.textInverse}
              style={styles.btnIcon}
            />
          )}
          <Text
            style={[
              styles.primaryBtnText,
              isSm ? styles.textSm : isLg ? styles.textLg : styles.textMd,
            ]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  title,
  icon,
  loading = false,
  size = 'md',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.secondaryBtn,
        isSm ? styles.btnSm : isLg ? styles.btnLg : styles.btnMd,
        disabled && styles.btnDisabled,
        style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <>
          {icon && (
            <Feather
              name={icon}
              size={isSm ? IconSizes.xs : IconSizes.sm}
              color={Colors.textPrimary}
              style={styles.btnIcon}
            />
          )}
          <Text
            style={[
              styles.secondaryBtnText,
              isSm ? styles.textSm : isLg ? styles.textLg : styles.textMd,
            ]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function DestructiveButton({
  title,
  icon = 'trash-2',
  loading = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[styles.destructiveBtn, disabled && styles.btnDisabled, style]}
      {...props}>
      {loading ? (
        <ActivityIndicator size="small" color={Colors.error} />
      ) : (
        <>
          {icon && (
            <Feather
              name={icon}
              size={IconSizes.sm}
              color={Colors.error}
              style={styles.btnIcon}
            />
          )}
          <Text style={styles.destructiveBtnText}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

interface IconButtonProps extends TouchableOpacityProps {
  icon: keyof typeof Feather.glyphMap;
  size?: number;
  color?: string;
}

export function IconButton({
  icon,
  size = IconSizes.md,
  color = Colors.textSecondary,
  style,
  ...props
}: IconButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.iconBtn, style]}
      {...props}>
      <Feather name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  primaryBtnText: {
    color: Colors.textInverse,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  secondaryBtnText: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  destructiveBtn: {
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  destructiveBtnText: {
    color: Colors.error,
    fontWeight: '600',
    fontSize: 14,
  },
  btnSm: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
  },
  btnMd: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
  },
  btnLg: {
    paddingVertical: 13,
    paddingHorizontal: Spacing.xl,
  },
  textSm: {
    fontSize: 12,
  },
  textMd: {
    fontSize: 14,
  },
  textLg: {
    fontSize: 15,
  },
  btnIcon: {
    marginRight: 2,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  iconBtn: {
    padding: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
