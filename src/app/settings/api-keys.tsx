import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/components/common/AppHeader';
import { Card } from '@/components/common/Card';
import { DestructiveButton, PrimaryButton, SecondaryButton } from '@/components/common/Buttons';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { AppDialog, AppToast } from '@/context/DialogContext';
import {
  AiModelItem,
  ApiKeyItem,
  apiKeyRepository,
} from '@/database/repositories/apiKeyRepository';
import { geminiClient } from '@/services/gemini/client';

export default function ApiKeysScreen() {
  const router = useRouter();

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [models, setModels] = useState<AiModelItem[]>([]);
  const [activeKey, setActiveKey] = useState<ApiKeyItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [revealedKeyIds, setRevealedKeyIds] = useState<Record<string, boolean>>({});

  // Add API Key Modal State
  const [isAddKeyModalVisible, setIsAddKeyModalVisible] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyModel, setNewKeyModel] = useState('');
  const [newKeyIsActive, setNewKeyIsActive] = useState(true);
  const [isSecureInput, setIsSecureInput] = useState(true);

  // Add Model Modal State
  const [isAddModelModalVisible, setIsAddModelModalVisible] = useState(false);
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [keysList, modelsList, active] = await Promise.all([
        apiKeyRepository.getAllApiKeys(),
        apiKeyRepository.getAllModels(),
        apiKeyRepository.getActiveApiKey(),
      ]);

      setApiKeys(keysList);
      setModels(modelsList);
      setActiveKey(active);

      // Set default selected model for new key creation
      const defaultModel = modelsList.find((m) => m.isDefault)?.modelId || modelsList[0]?.modelId || 'gemini-2.5-flash';
      setNewKeyModel(defaultModel);
    } catch (err) {
      console.error('Failed to load API keys & models:', err);
      AppDialog.error('Loading Error', 'Failed to load API configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSetActiveKey = async (key: ApiKeyItem) => {
    try {
      await apiKeyRepository.setActiveApiKey(key.id);
      AppToast.show(`"${key.label}" is now active`, 'success');
      await loadData();
    } catch (err) {
      console.error('Failed to activate API key:', err);
      AppDialog.error('Error', 'Failed to set active API key.');
    }
  };

  const handleDeleteKey = (key: ApiKeyItem) => {
    AppDialog.confirm(
      'Delete API Key?',
      `Are you sure you want to delete "${key.label}"?`,
      async () => {
        try {
          await apiKeyRepository.deleteApiKey(key.id);
          AppToast.show('API key deleted', 'info');
          await loadData();
        } catch (err) {
          console.error('Failed to delete API key:', err);
          AppDialog.error('Delete Error', 'Failed to delete API key.');
        }
      },
      'Delete',
      'Cancel'
    );
  };

  const handleSaveNewKey = async () => {
    if (!newKeyValue.trim()) {
      AppDialog.alert('Missing API Key', 'Please enter a valid Google Gemini API key.');
      return;
    }

    const label = newKeyLabel.trim() || `Gemini Key (${new Date().toLocaleDateString()})`;

    try {
      await apiKeyRepository.saveApiKey({
        label,
        apiKey: newKeyValue.trim(),
        defaultModel: newKeyModel || 'gemini-2.5-flash',
        isActive: newKeyIsActive,
      });

      AppToast.show('API Key saved successfully', 'success');
      setIsAddKeyModalVisible(false);
      setNewKeyLabel('');
      setNewKeyValue('');
      await loadData();
    } catch (err: any) {
      console.error('Failed to save API key:', err);
      AppDialog.error('Save Failed', err.message || 'Could not save API key.');
    }
  };

  const handleSaveNewModel = async () => {
    if (!newModelId.trim()) {
      AppDialog.alert('Missing Model ID', 'Please enter a Gemini model ID (e.g. gemini-2.5-flash).');
      return;
    }

    try {
      await apiKeyRepository.addModel({
        modelId: newModelId.trim(),
        displayName: newModelName.trim() || newModelId.trim(),
      });

      AppToast.show('Model added to catalog', 'success');
      setIsAddModelModalVisible(false);
      setNewModelId('');
      setNewModelName('');
      await loadData();
    } catch (err: any) {
      console.error('Failed to add model:', err);
      AppDialog.error('Add Failed', err.message || 'Could not add model.');
    }
  };

  const handleSetDefaultModel = async (model: AiModelItem) => {
    try {
      await apiKeyRepository.setDefaultModel(model.modelId);
      AppToast.show(`Default model set to ${model.modelId}`, 'success');
      await loadData();
    } catch (err) {
      console.error('Failed to set default model:', err);
    }
  };

  const handleTestConnection = async () => {
    if (!activeKey) {
      AppDialog.alert('No Active Key', 'Please add and activate an API key first.');
      return;
    }

    try {
      setIsTesting(true);
      AppToast.show('Testing API connection...', 'info');

      const testResult = await geminiClient.generateJson<{ status: string; message: string }>(
        'Respond with a JSON object: {"status": "ok", "message": "API key and model active"}'
      );

      if (testResult && testResult.status === 'ok') {
        AppDialog.alert(
          'Connection Successful! ✅',
          `Successfully verified with model: ${activeKey.defaultModel || 'gemini-2.5-flash'}`
        );
      } else {
        AppDialog.alert('Connection Response', JSON.stringify(testResult));
      }
    } catch (err: any) {
      console.error('API Key test failed:', err);
      AppDialog.error(
        'Connection Failed ❌',
        err.message || 'Unable to connect to Gemini API. Please check the API key and permissions.'
      );
    } finally {
      setIsTesting(false);
    }
  };

  const toggleRevealKey = (id: string) => {
    setRevealedKeyIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyKey = async (key: string) => {
    await Clipboard.setStringAsync(key);
    AppToast.show('API key copied to clipboard', 'info');
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 10) return '••••••••••••';
    return `${key.slice(0, 7)}••••••••${key.slice(-4)}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AppHeader
          title="AI & API Keys"
          subtitle="Dynamic Models & Gemini Configuration"
          showBack
          onBack={() => router.back()}
        />

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={[Typography.caption, { marginTop: 12 }]}>Loading configuration...</Text>
            </View>
          ) : (
            <>
              {/* Active API Key Hero Card */}
              <Card style={styles.activeHeroCard}>
                <View style={styles.heroTopRow}>
                  <View style={styles.activeBadge}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeBadgeText}>ACTIVE KEY</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={handleTestConnection}
                    disabled={isTesting}>
                    {isTesting ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <Feather name="zap" size={14} color={Colors.primary} />
                        <Text style={styles.testButtonText}>Test Connection</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {activeKey ? (
                  <View style={styles.heroContent}>
                    <Text style={styles.heroKeyLabel}>{activeKey.label}</Text>
                    <Text style={styles.heroKeyMasked}>{maskKey(activeKey.apiKey)}</Text>
                    <View style={styles.heroModelTag}>
                      <Feather name="cpu" size={13} color={Colors.primary} />
                      <Text style={styles.heroModelTagText}>
                        Model: {activeKey.defaultModel || 'gemini-2.5-flash'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noActiveKeyBox}>
                    <Feather name="alert-circle" size={24} color={Colors.warning} />
                    <Text style={styles.noActiveKeyText}>No active API key configured.</Text>
                    <Text style={styles.noActiveKeySub}>
                      Add an API key below to enable JD Analysis, Resume Tailoring, and Email Generation.
                    </Text>
                  </View>
                )}
              </Card>

              {/* Configured API Keys Section */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleGroup}>
                  <Feather name="key" size={18} color={Colors.primary} />
                  <Text style={Typography.sectionTitle}>Configured Keys ({apiKeys.length})</Text>
                </View>
                <TouchableOpacity
                  style={styles.addSmallBtn}
                  onPress={() => {
                    const defaultModel =
                      models.find((m) => m.isDefault)?.modelId ||
                      activeKey?.defaultModel ||
                      models[0]?.modelId ||
                      'gemini-2.5-flash';
                    setNewKeyModel(defaultModel);
                    setIsAddKeyModalVisible(true);
                  }}>
                  <Feather name="plus" size={15} color={Colors.primary} />
                  <Text style={styles.addSmallBtnText}>Add Key</Text>
                </TouchableOpacity>
              </View>

              {apiKeys.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Feather name="shield" size={32} color={Colors.textMuted} />
                  <Text style={[Typography.sectionTitle, { marginTop: 8 }]}>No API Keys Added</Text>
                  <Text style={[Typography.caption, { textAlign: 'center', marginTop: 4 }]}>
                    Tap "+ Add Key" above to configure your Google Gemini API key.
                  </Text>
                </Card>
              ) : (
                apiKeys.map((k) => {
                  const isRevealed = Boolean(revealedKeyIds[k.id]);
                  return (
                    <Card key={k.id} style={[styles.keyCard, k.isActive && styles.keyCardActive]}>
                      <View style={styles.keyCardHeader}>
                        <TouchableOpacity
                          style={styles.keyRadioRow}
                          onPress={() => handleSetActiveKey(k)}>
                          <View
                            style={[
                              styles.radioOuter,
                              k.isActive && { borderColor: Colors.primary },
                            ]}>
                            {k.isActive && <View style={styles.radioInner} />}
                          </View>
                          <Text style={styles.keyItemLabel}>{k.label}</Text>
                        </TouchableOpacity>

                        {k.isActive && (
                          <View style={styles.inUseBadge}>
                            <Text style={styles.inUseBadgeText}>In Use</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.keyValueRow}>
                        <Text style={styles.keyValueText}>
                          {isRevealed ? k.apiKey : maskKey(k.apiKey)}
                        </Text>
                        <View style={styles.keyActionsRow}>
                          <TouchableOpacity
                            style={styles.iconActionBtn}
                            onPress={() => toggleRevealKey(k.id)}>
                            <Feather
                              name={isRevealed ? 'eye-off' : 'eye'}
                              size={16}
                              color={Colors.textMuted}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.iconActionBtn}
                            onPress={() => handleCopyKey(k.apiKey)}>
                            <Feather name="copy" size={16} color={Colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.iconActionBtn}
                            onPress={() => handleDeleteKey(k)}>
                            <Feather name="trash-2" size={16} color={Colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.keyFooterRow}>
                        <Text style={styles.keyModelSub}>Model: {k.defaultModel}</Text>
                        {!k.isActive && (
                          <TouchableOpacity onPress={() => handleSetActiveKey(k)}>
                            <Text style={styles.makeActiveText}>Set as Active</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </Card>
                  );
                })
              )}

              {/* Models Catalog Section */}
              <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                <View style={styles.sectionTitleGroup}>
                  <Feather name="cpu" size={18} color={Colors.primary} />
                  <Text style={Typography.sectionTitle}>Available AI Models ({models.length})</Text>
                </View>
                <TouchableOpacity
                  style={styles.addSmallBtn}
                  onPress={() => setIsAddModelModalVisible(true)}>
                  <Feather name="plus" size={15} color={Colors.primary} />
                  <Text style={styles.addSmallBtnText}>Add Model</Text>
                </TouchableOpacity>
              </View>

              <Card style={styles.modelsCard}>
                {models.map((m, idx) => (
                  <View
                    key={m.id}
                    style={[
                      styles.modelRow,
                      idx < models.length - 1 && styles.modelRowBorder,
                    ]}>
                    <View style={styles.modelInfo}>
                      <View style={styles.modelTitleRow}>
                        <Text style={styles.modelIdText}>{m.modelId}</Text>
                        {m.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.modelDisplayName}>{m.displayName}</Text>
                    </View>

                    {!m.isDefault && (
                      <TouchableOpacity
                        style={styles.setDefaultBtn}
                        onPress={() => handleSetDefaultModel(m)}>
                        <Text style={styles.setDefaultBtnText}>Make Default</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </Card>
            </>
          )}
        </ScrollView>

        {/* Add API Key Modal */}
        <Modal
          visible={isAddKeyModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsAddKeyModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={Typography.sectionTitle}>Add Gemini API Key</Text>
                <TouchableOpacity onPress={() => setIsAddKeyModalVisible(false)}>
                  <Feather name="x" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Key Label (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Primary Gemini Key"
                    placeholderTextColor={Colors.textMuted}
                    value={newKeyLabel}
                    onChangeText={setNewKeyLabel}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>API Key</Text>
                  <View style={styles.modalInputRow}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                      placeholder="AIzaSy..."
                      placeholderTextColor={Colors.textMuted}
                      value={newKeyValue}
                      onChangeText={setNewKeyValue}
                      secureTextEntry={isSecureInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setIsSecureInput(!isSecureInput)}>
                      <Feather
                        name={isSecureInput ? 'eye' : 'eye-off'}
                        size={18}
                        color={Colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Assigned Default Model</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.modelChipsScroll}>
                    {models.map((m) => {
                      const isSelected = newKeyModel === m.modelId;
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[
                            styles.modelChip,
                            isSelected && styles.modelChipSelected,
                          ]}
                          onPress={() => setNewKeyModel(m.modelId)}>
                          <Text
                            style={[
                              styles.modelChipText,
                              isSelected && styles.modelChipTextSelected,
                            ]}>
                            {m.modelId}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.inputLabel}>Set as Active Key immediately</Text>
                  <Switch
                    value={newKeyIsActive}
                    onValueChange={setNewKeyIsActive}
                    thumbColor={newKeyIsActive ? Colors.primary : Colors.surface}
                    trackColor={{ false: Colors.border, true: Colors.primary + '66' }}
                  />
                </View>

                <View style={styles.modalActions}>
                  <SecondaryButton
                    title="Cancel"
                    onPress={() => setIsAddKeyModalVisible(false)}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton
                    title="Save Key"
                    onPress={handleSaveNewKey}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Model Modal */}
        <Modal
          visible={isAddModelModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsAddModelModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={Typography.sectionTitle}>Add Custom AI Model</Text>
                <TouchableOpacity onPress={() => setIsAddModelModalVisible(false)}>
                  <Feather name="x" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Model ID (Exact Gemini Name)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. gemini-2.5-flash or gemini-3.0-pro"
                    placeholderTextColor={Colors.textMuted}
                    value={newModelId}
                    onChangeText={setNewModelId}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Display Label</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Gemini 2.5 Flash"
                    placeholderTextColor={Colors.textMuted}
                    value={newModelName}
                    onChangeText={setNewModelName}
                  />
                </View>

                <View style={styles.modalActions}>
                  <SecondaryButton
                    title="Cancel"
                    onPress={() => setIsAddModelModalVisible(false)}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton
                    title="Add Model"
                    onPress={handleSaveNewModel}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
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
    padding: Spacing.md,
    paddingBottom: 40,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeHeroCard: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderColor: Colors.primary + '40',
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    gap: 4,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  heroContent: {
    marginTop: 4,
  },
  heroKeyLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  heroKeyMasked: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Colors.textMuted,
    marginVertical: 4,
  },
  heroModelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  heroModelTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  noActiveKeyBox: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  noActiveKeyText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 6,
  },
  noActiveKeySub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '14',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    gap: 4,
  },
  addSmallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyCard: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  keyCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  keyCardActive: {
    borderColor: Colors.primary + '60',
    borderWidth: 1.5,
  },
  keyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keyRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Colors.primary,
  },
  keyItemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  inUseBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  inUseBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  keyValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  keyValueText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Colors.textMuted,
    flex: 1,
  },
  keyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    padding: 6,
  },
  keyFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopColor: Colors.border,
    borderTopWidth: 0.5,
    paddingTop: 6,
    marginTop: 2,
  },
  keyModelSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  makeActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  modelsCard: {
    padding: Spacing.sm,
  },
  modelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  modelRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  modelInfo: {
    flex: 1,
  },
  modelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modelIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  defaultBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.success,
  },
  modelDisplayName: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  setDefaultBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  setDefaultBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalForm: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopRightRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  modelChip: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modelChipSelected: {
    backgroundColor: Colors.primary + '18',
    borderColor: Colors.primary,
  },
  modelChipText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  modelChipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
});
