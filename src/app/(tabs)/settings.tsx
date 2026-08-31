import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/components/common/AppHeader';
import { Card } from '@/components/common/Card';
import { PrimaryButton } from '@/components/common/Buttons';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { settingsRepository } from '@/database/repositories/settingsRepository';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [compilerUrl, setCompilerUrl] = useState('');
  const [isSecure, setIsSecure] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
      await settingsRepository.setGeminiApiKey(apiKey);
      await settingsRepository.setSetting('latex_compiler_url', compilerUrl.trim());
      Alert.alert('Saved', 'Settings updated.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
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
              <Text style={Typography.sectionTitle}>Gemini AI API Key</Text>
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
                Used exclusively for structured JD parsing on explicit request.
              </Text>
            </View>
          </Card>

          {/* LaTeX Compiler Configuration */}
          <Card style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Feather name="file-text" size={IconSizes.md} color={Colors.primary} />
              <Text style={Typography.sectionTitle}>LaTeX Compiler</Text>
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
                Leave blank for default service, or enter your local endpoint.
              </Text>
            </View>
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
              All profile data, resumes, drafts, and settings remain stored on-device.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={Typography.caption}>HireLog v1.0.0 • Local-First</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  card: {
    marginBottom: Spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
  toggleBtn: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  infoText: {
    fontSize: 12,
    color: Colors.primaryDark,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    alignItems: 'center',
  },
});
