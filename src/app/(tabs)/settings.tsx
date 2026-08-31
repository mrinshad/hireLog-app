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

import { settingsRepository } from '@/database/repositories/settingsRepository';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [isSecure, setIsSecure] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const storedKey = await settingsRepository.getGeminiApiKey();
        setApiKey(storedKey);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
    loadSettings();
  }, []);

  const handleSaveApiKey = async () => {
    try {
      setIsSaving(true);
      await settingsRepository.setGeminiApiKey(apiKey);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      Alert.alert('Saved', 'Gemini API key has been saved securely to local storage.');
    } catch (error) {
      console.error('Failed to save API key:', error);
      Alert.alert('Error', 'Failed to save API key.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>App preferences and AI configuration</Text>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Gemini AI API Key Configuration */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>✨</Text>
              </View>
              <View style={styles.cardTitleArea}>
                <Text style={styles.cardTitle}>Gemini AI Configuration</Text>
                <Text style={styles.cardSubtext}>
                  Powers structured Job Description analysis and skills extraction.
                </Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>API Key Status: </Text>
              {apiKey.trim() ? (
                <View style={styles.configuredBadge}>
                  <Text style={styles.configuredText}>✓ Configured</Text>
                </View>
              ) : (
                <View style={styles.missingBadge}>
                  <Text style={styles.missingText}>⚠️ Not Configured</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gemini API Key</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="AIzaSy..."
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={isSecure}
                  value={apiKey}
                  onChangeText={(text) => {
                    setApiKey(text);
                    setIsSaved(false);
                  }}
                />
                <TouchableOpacity
                  style={styles.toggleBtn}
                  onPress={() => setIsSecure(!isSecure)}>
                  <Text style={styles.toggleText}>{isSecure ? 'Show' : 'Hide'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>
                Your key is stored locally in your on-device SQLite database and never sent to external servers other than the official Google Gemini API.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSaveApiKey}
              disabled={isSaving}>
              <Text style={styles.saveBtnText}>
                {isSaving ? 'Saving...' : isSaved ? '✓ Saved' : 'Save API Key'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Privacy & Truth Notice */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🔒 Privacy & Data Truth Principle</Text>
            <Text style={styles.infoText}>
              HireLog only uses Gemini for language parsing of raw Job Descriptions. Gemini is never used to fabricate personal details or invent unverified experience.
            </Text>
          </View>

          {/* App Info Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>HireLog v1.0.0 • Local-first Career Tool</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  cardTitleArea: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  configuredBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  configuredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  missingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  missingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  inputFlex: {
    flex: 1,
  },
  toggleBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 14,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#2563EB',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
