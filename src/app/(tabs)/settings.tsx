import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/components/common/AppHeader';
import { Card } from '@/components/common/Card';
import { PrimaryButton, SecondaryButton } from '@/components/common/Buttons';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { AppDialog, AppToast } from '@/context/DialogContext';
import { ApiKeyItem, apiKeyRepository } from '@/database/repositories/apiKeyRepository';
import { deviceAuthService } from '@/services/auth/deviceAuthService';
import { errorLogger } from '@/services/logging/errorLogger';
import { profileSeeder } from '@/services/profile/profileSeeder';

export default function SettingsScreen() {
  const router = useRouter();

  const [activeKey, setActiveKey] = useState<ApiKeyItem | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Modal Gate State for API Keys (Fallback PIN)
  const [isApiKeyPinModalVisible, setIsApiKeyPinModalVisible] = useState(false);
  const [apiKeyPinInput, setApiKeyPinInput] = useState('');
  const [apiKeyPinError, setApiKeyPinError] = useState<string | null>(null);

  // Profile Password Gate Modal State
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [profilePinInput, setProfilePinInput] = useState('');
  const [profilePinError, setProfilePinError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      const active = await apiKeyRepository.getActiveApiKey();
      setActiveKey(active);
    } catch (error) {
      await errorLogger.logError('SettingsScreen.loadSettings', error);
      console.error('Failed to load active settings:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * Protected entry to API Keys configuration.
   * Prompts native Android biometrics / device PIN / lock first.
   */
  const handleOpenApiKeys = async () => {
    try {
      setIsAuthenticating(true);
      const authResult = await deviceAuthService.promptNativeAuth(
        'Unlock AI & API Keys Configuration'
      );

      if (authResult.success) {
        router.push('/settings/api-keys' as any);
        return;
      }

      if (authResult.fallbackNeeded) {
        // Fallback to app PIN gate modal
        setApiKeyPinInput('');
        setApiKeyPinError(null);
        setIsApiKeyPinModalVisible(true);
      }
    } catch (err) {
      console.warn('Auth check error:', err);
      setApiKeyPinInput('');
      setApiKeyPinError(null);
      setIsApiKeyPinModalVisible(true);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleVerifyApiKeyPin = () => {
    if (!profileSeeder.verifyPassword(apiKeyPinInput)) {
      setApiKeyPinError('Incorrect PIN / Password');
      return;
    }

    setIsApiKeyPinModalVisible(false);
    setApiKeyPinInput('');
    setApiKeyPinError(null);
    router.push('/settings/api-keys' as any);
  };

  const handleOpenLoadProfile = () => {
    setProfilePinInput('');
    setProfilePinError(null);
    setIsProfileModalVisible(true);
  };

  const handleVerifyProfilePassword = () => {
    if (!profileSeeder.verifyPassword(profilePinInput)) {
      setProfilePinError('Incorrect password');
      return;
    }

    setIsProfileModalVisible(false);
    setProfilePinInput('');
    setProfilePinError(null);

    AppDialog.confirm(
      'Load user details?',
      'This will add/replace the current profile information with the saved profile.',
      async () => {
        try {
          await profileSeeder.seedOwnerProfile();
          AppToast.show('Profile loaded successfully', 'success');
          router.push('/(tabs)/profile');
        } catch (err: any) {
          console.error('Failed to load profile details:', err);
          AppDialog.error('Seeding Error', err.message || 'Failed to load profile.');
        }
      },
      'Load Details',
      'Cancel'
    );
  };

  const maskKey = (key?: string) => {
    if (!key || key.length < 10) return '••••••••••••';
    return `${key.slice(0, 7)}••••••••${key.slice(-4)}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AppHeader title="Settings" subtitle="Preferences & Security Configuration" />

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Dynamic AI & API Keys Configuration Gate */}
          <Card style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.headerLeftGroup}>
                <Feather name="cpu" size={IconSizes.md} color={Colors.primary} />
                <Text style={Typography.sectionTitle}>AI & API Key Configuration</Text>
              </View>
              <View style={styles.lockBadge}>
                <Feather name="lock" size={12} color={Colors.primary} />
                <Text style={styles.lockBadgeText}>SECURED</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.apiKeyActionCard}
              activeOpacity={0.7}
              onPress={handleOpenApiKeys}>
              <View style={styles.apiKeyInfoLeft}>
                <Text style={styles.keyHeroLabel}>
                  {activeKey ? activeKey.label : 'No Active Key Configured'}
                </Text>
                <Text style={styles.keyHeroSub}>
                  {activeKey
                    ? `${maskKey(activeKey.apiKey)} • ${activeKey.defaultModel}`
                    : 'Tap to configure Google Gemini API keys & AI models'}
                </Text>
              </View>
              <View style={styles.chevronWrap}>
                <Feather name="chevron-right" size={20} color={Colors.primary} />
              </View>
            </TouchableOpacity>

            <Text style={[Typography.caption, { marginTop: 8 }]}>
              Protected by Android biometric / screen lock credentials. Configure multiple API keys, assign default models, and register custom models.
            </Text>
          </Card>

          {/* Profile Management / Seeding */}
          <Card style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.headerLeftGroup}>
                <Feather name="user" size={IconSizes.md} color={Colors.primary} />
                <Text style={Typography.sectionTitle}>Profile Data</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.profileActionRow}
              activeOpacity={0.7}
              onPress={handleOpenLoadProfile}>
              <View style={styles.profileActionTextContainer}>
                <Text style={Typography.itemTitle}>Load My Profile</Text>
                <Text style={Typography.caption}>Import the saved verified candidate information</Text>
              </View>
              <Feather name="download" size={IconSizes.md} color={Colors.primary} />
            </TouchableOpacity>
          </Card>

          {/* Privacy Note */}
          <View style={styles.infoCard}>
            <Feather name="shield" size={IconSizes.sm} color={Colors.primary} />
            <Text style={styles.infoText}>
              All your profile data, resumes, drafts, and API keys remain stored locally in your device's SQLite database.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* API Keys Fallback PIN Gate Modal */}
      <Modal
        visible={isApiKeyPinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsApiKeyPinModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Feather name="lock" size={24} color={Colors.primary} />
              <Text style={[Typography.screenTitle, { marginTop: 6 }]}>Security Verification</Text>
              <Text style={[Typography.caption, { marginTop: 2, textAlign: 'center' }]}>
                Enter PIN / Password to access API keys
              </Text>
            </View>

            <TextInput
              style={[styles.input, styles.passwordInput, !!apiKeyPinError && styles.inputError]}
              placeholder="PIN / Password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              autoFocus
              value={apiKeyPinInput}
              onChangeText={(text) => {
                setApiKeyPinInput(text);
                if (apiKeyPinError) setApiKeyPinError(null);
              }}
              onSubmitEditing={handleVerifyApiKeyPin}
            />

            {apiKeyPinError ? <Text style={styles.errorText}>{apiKeyPinError}</Text> : null}

            <View style={styles.modalActions}>
              <SecondaryButton
                title="Cancel"
                onPress={() => setIsApiKeyPinModalVisible(false)}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title="Unlock"
                onPress={handleVerifyApiKeyPin}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Profile Password Gate Modal */}
      <Modal
        visible={isProfileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsProfileModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Feather name="user-check" size={24} color={Colors.primary} />
              <Text style={[Typography.screenTitle, { marginTop: 6 }]}>Load My Profile</Text>
              <Text style={[Typography.caption, { marginTop: 2 }]}>Security PIN</Text>
            </View>

            <TextInput
              style={[styles.input, styles.passwordInput, !!profilePinError && styles.inputError]}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              autoFocus
              value={profilePinInput}
              onChangeText={(text) => {
                setProfilePinInput(text);
                if (profilePinError) setProfilePinError(null);
              }}
              onSubmitEditing={handleVerifyProfilePassword}
            />

            {profilePinError ? <Text style={styles.errorText}>{profilePinError}</Text> : null}

            <View style={styles.modalActions}>
              <SecondaryButton
                title="Cancel"
                onPress={() => setIsProfileModalVisible(false)}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title="Continue"
                onPress={handleVerifyProfilePassword}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '14',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  lockBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  apiKeyActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: 4,
  },
  apiKeyInfoLeft: {
    flex: 1,
  },
  keyHeroLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  keyHeroSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  chevronWrap: {
    marginLeft: Spacing.sm,
  },
  profileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.xs,
  },
  profileActionTextContainer: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: {
    ...Typography.caption,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  passwordInput: {
    textAlign: 'center',
    letterSpacing: 4,
    fontSize: 18,
    marginBottom: Spacing.sm,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
