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
import { settingsRepository } from '@/database/repositories/settingsRepository';
import { profileSeeder } from '@/services/profile/profileSeeder';

export default function SettingsScreen() {
  const router = useRouter();

  const [apiKey, setApiKey] = useState('');
  const [compilerUrl, setCompilerUrl] = useState('');
  const [isSecure, setIsSecure] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Password Gate Modal State
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const storedKey = await settingsRepository.getGeminiApiKey();
        setApiKey(storedKey);

        const storedCompiler = await settingsRepository.getSetting('latex_compiler_url');
        setCompilerUrl(storedCompiler || '');
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await settingsRepository.setGeminiApiKey(apiKey.trim());
      await settingsRepository.setSetting('latex_compiler_url', compilerUrl.trim());
      AppToast.show('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      AppDialog.error('Save Failed', 'Unable to update settings. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenLoadProfile = () => {
    setPasswordInput('');
    setPasswordError(null);
    setIsPasswordModalVisible(true);
  };

  const handleVerifyPassword = () => {
    if (!profileSeeder.verifyPassword(passwordInput)) {
      setPasswordError('Incorrect password');
      return;
    }

    // Password is correct -> close password modal and prompt confirmation
    setIsPasswordModalVisible(false);
    setPasswordInput('');
    setPasswordError(null);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AppHeader title="Settings" subtitle="Preferences & Configuration" />

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Gemini AI API Key Configuration */}
          <Card style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Feather name="cpu" size={IconSizes.md} color={Colors.primary} />
              <Text style={Typography.sectionTitle}>Google Gemini API Key</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={Typography.caption}>API Key</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="AIzaSy..."
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={isSecure}
                  value={apiKey}
                  onChangeText={setApiKey}
                />
                <TouchableOpacity
                  style={styles.toggleBtn}
                  onPress={() => setIsSecure(!isSecure)}>
                  <Feather
                    name={isSecure ? 'eye' : 'eye-off'}
                    size={IconSizes.sm}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <Text style={Typography.caption}>
                Used to extract job requirements and draft tailored application emails.
              </Text>
            </View>
          </Card>

          {/* LaTeX Compiler Configuration */}
          <Card style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Feather name="file-text" size={IconSizes.md} color={Colors.primary} />
              <Text style={Typography.sectionTitle}>LaTeX PDF Compiler</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={Typography.caption}>Compiler Service URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://latexonline.cc/compile (default)"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                value={compilerUrl}
                onChangeText={setCompilerUrl}
              />
              <Text style={Typography.caption}>
                Leave blank to use the built-in compiler service.
              </Text>
            </View>
          </Card>

          {/* Profile Management / Seeding */}
          <Card style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Feather name="user" size={IconSizes.md} color={Colors.primary} />
              <Text style={Typography.sectionTitle}>Profile Data</Text>
            </View>

            <TouchableOpacity
              style={styles.profileActionRow}
              activeOpacity={0.7}
              onPress={handleOpenLoadProfile}>
              <View style={styles.profileActionTextContainer}>
                <Text style={Typography.itemTitle}>Load My Profile</Text>
                <Text style={Typography.caption}>Import the saved profile information</Text>
              </View>
              <Feather name="download" size={IconSizes.md} color={Colors.primary} />
            </TouchableOpacity>
          </Card>

          {/* Save Button */}
          <PrimaryButton
            title="Save Settings"
            icon="check"
            loading={isSaving}
            size="lg"
            onPress={handleSaveSettings}
            style={styles.saveBtn}
          />

          {/* Privacy Note */}
          <View style={styles.infoCard}>
            <Feather name="shield" size={IconSizes.sm} color={Colors.primary} />
            <Text style={styles.infoText}>
              All your profile data, resumes, drafts, and settings remain stored on your device.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Lightweight Password Gate Modal */}
      <Modal
        visible={isPasswordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPasswordModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={Typography.screenTitle}>Load My Profile</Text>
              <Text style={[Typography.caption, { marginTop: 2 }]}>Password</Text>
            </View>

            <TextInput
              style={[styles.input, styles.passwordInput, !!passwordError && styles.inputError]}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              autoFocus
              value={passwordInput}
              onChangeText={(text) => {
                setPasswordInput(text);
                if (passwordError) setPasswordError(null);
              }}
              onSubmitEditing={handleVerifyPassword}
            />

            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <SecondaryButton
                title="Cancel"
                onPress={() => setIsPasswordModalVisible(false)}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title="Continue"
                onPress={handleVerifyPassword}
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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  inputFlex: {
    flex: 1,
  },
  inputError: {
    borderColor: Colors.errorBorder,
  },
  toggleBtn: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  profileActionTextContainer: {
    flex: 1,
    gap: 2,
  },
  saveBtn: {
    marginTop: Spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primaryDark,
    lineHeight: 16,
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
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    gap: 2,
  },
  passwordInput: {
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: Colors.errorText,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
});
