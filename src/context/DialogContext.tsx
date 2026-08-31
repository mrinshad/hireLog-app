import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { DestructiveButton, PrimaryButton, SecondaryButton } from '@/components/common/Buttons';

export type DialogType = 'info' | 'success' | 'warning' | 'error' | 'confirm' | 'destructive';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface DialogOptions {
  title: string;
  message: string;
  type?: DialogType;
  buttons?: DialogButton[];
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface ToastOptions {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

interface DialogContextValue {
  showDialog: (options: DialogOptions) => void;
  hideDialog: () => void;
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

let globalShowDialog: ((options: DialogOptions) => void) | null = null;
let globalShowToast: ((message: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number) => void) | null = null;

export const AppDialog = {
  show: (options: DialogOptions) => {
    if (globalShowDialog) {
      globalShowDialog(options);
    } else {
      console.warn('AppDialog.show called before DialogProvider mounted');
    }
  },
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false
  ) => {
    AppDialog.show({
      title,
      message,
      type: isDestructive ? 'destructive' : 'confirm',
      buttons: [
        { text: cancelText, style: 'cancel' },
        { text: confirmText, style: isDestructive ? 'destructive' : 'default', onPress: onConfirm },
      ],
    });
  },
  alert: (title: string, message: string, onDismiss?: () => void) => {
    AppDialog.show({
      title,
      message,
      type: 'info',
      buttons: [{ text: 'OK', style: 'default', onPress: onDismiss }],
    });
  },
  success: (title: string, message: string, onDismiss?: () => void) => {
    AppDialog.show({
      title,
      message,
      type: 'success',
      buttons: [{ text: 'Done', style: 'default', onPress: onDismiss }],
    });
  },
  error: (title: string, message: string, onDismiss?: () => void) => {
    AppDialog.show({
      title,
      message,
      type: 'error',
      buttons: [{ text: 'Got It', style: 'default', onPress: onDismiss }],
    });
  },
};

export const AppToast = {
  show: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'success', duration = 2800) => {
    if (globalShowToast) {
      globalShowToast(message, type, duration);
    } else {
      console.warn('AppToast.show called before DialogProvider mounted');
    }
  },
};

export const useDialog = (): DialogContextValue => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogConfig, setDialogConfig] = useState<DialogOptions | null>(null);
  const [toastConfig, setToastConfig] = useState<ToastOptions | null>(null);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(20)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showDialog = (options: DialogOptions) => {
    setDialogConfig(options);
  };

  const hideDialog = () => {
    setDialogConfig(null);
  };

  const showToast = (
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'success',
    duration = 2800
  ) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToastConfig({ message, type, duration });

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    toastTimeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: 20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToastConfig(null);
      });
    }, duration);
  };

  useEffect(() => {
    globalShowDialog = showDialog;
    globalShowToast = showToast;
    return () => {
      globalShowDialog = null;
      globalShowToast = null;
    };
  }, []);

  const getDialogIcon = (type: DialogType = 'info') => {
    switch (type) {
      case 'success':
        return { name: 'check-circle' as const, color: Colors.success, bg: Colors.successBg };
      case 'warning':
        return { name: 'alert-triangle' as const, color: Colors.warning, bg: Colors.warningBg };
      case 'error':
        return { name: 'alert-circle' as const, color: Colors.error, bg: Colors.errorBg };
      case 'destructive':
        return { name: 'trash-2' as const, color: Colors.error, bg: Colors.errorBg };
      case 'confirm':
        return { name: 'help-circle' as const, color: Colors.primary, bg: Colors.primaryLight };
      default:
        return { name: 'info' as const, color: Colors.primary, bg: Colors.primaryLight };
    }
  };

  const getToastIcon = (type: string = 'info') => {
    switch (type) {
      case 'success':
        return 'check-circle' as const;
      case 'error':
        return 'alert-circle' as const;
      case 'warning':
        return 'alert-triangle' as const;
      default:
        return 'info' as const;
    }
  };

  const buttons = dialogConfig?.buttons && dialogConfig.buttons.length > 0
    ? dialogConfig.buttons
    : [
        ...(dialogConfig?.cancelText
          ? [{ text: dialogConfig.cancelText, style: 'cancel' as const, onPress: dialogConfig.onCancel }]
          : []),
        {
          text: dialogConfig?.confirmText || 'OK',
          style: dialogConfig?.type === 'destructive' ? ('destructive' as const) : ('default' as const),
          onPress: dialogConfig?.onConfirm,
        },
      ];

  return (
    <DialogContext.Provider value={{ showDialog, hideDialog, showToast }}>
      {children}

      {/* In-App Dialog Modal */}
      {dialogConfig && (
        <Modal
          visible={!!dialogConfig}
          transparent
          animationType="fade"
          onRequestClose={hideDialog}>
          <TouchableWithoutFeedback onPress={hideDialog}>
            <View style={styles.backdrop}>
              <TouchableWithoutFeedback>
                <View style={styles.dialogCard}>
                  {/* Icon Badge */}
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: getDialogIcon(dialogConfig.type).bg },
                    ]}>
                    <Feather
                      name={getDialogIcon(dialogConfig.type).name}
                      size={24}
                      color={getDialogIcon(dialogConfig.type).color}
                    />
                  </View>

                  {/* Title & Message */}
                  <Text style={styles.dialogTitle}>{dialogConfig.title}</Text>
                  <Text style={styles.dialogMessage}>{dialogConfig.message}</Text>

                  {/* Action Buttons */}
                  <View style={styles.buttonRow}>
                    {buttons.map((btn, index) => {
                      const handlePress = async () => {
                        hideDialog();
                        if (btn.onPress) {
                          await btn.onPress();
                        }
                      };

                      if (btn.style === 'destructive') {
                        return (
                          <DestructiveButton
                            key={index}
                            title={btn.text}
                            onPress={handlePress}
                            size="md"
                            style={styles.dialogBtn}
                          />
                        );
                      }

                      if (btn.style === 'cancel') {
                        return (
                          <SecondaryButton
                            key={index}
                            title={btn.text}
                            onPress={handlePress}
                            size="md"
                            style={styles.dialogBtn}
                          />
                        );
                      }

                      return (
                        <PrimaryButton
                          key={index}
                          title={btn.text}
                          onPress={handlePress}
                          size="md"
                          style={styles.dialogBtn}
                        />
                      );
                    })}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Floating In-App Toast */}
      {toastConfig && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}>
          <View style={styles.toastContent}>
            <Feather
              name={getToastIcon(toastConfig.type)}
              size={18}
              color={Colors.textInverse}
            />
            <Text style={styles.toastText} numberOfLines={2}>
              {toastConfig.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </DialogContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  dialogMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  dialogBtn: {
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 50,
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    gap: Spacing.sm,
    maxWidth: 380,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textInverse,
    flex: 1,
  },
});
