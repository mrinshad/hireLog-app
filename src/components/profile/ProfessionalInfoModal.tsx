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

import { ProfessionalInfo } from '@/types/profile';

interface ProfessionalInfoModalProps {
  visible: boolean;
  initialData: ProfessionalInfo;
  onClose: () => void;
  onSave: (data: ProfessionalInfo) => void;
}

export function ProfessionalInfoModal({
  visible,
  initialData,
  onClose,
  onSave,
}: ProfessionalInfoModalProps) {
  const [formData, setFormData] = useState<ProfessionalInfo>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(initialData);
    setErrors({});
  }, [initialData, visible]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.professionalTitle.trim()) {
      newErrors.professionalTitle = 'Professional Title is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave({
        professionalTitle: formData.professionalTitle.trim(),
        professionalSummary: formData.professionalSummary.trim(),
      });
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Professional Info</Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} contentContainerStyle={styles.scrollContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Professional Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.professionalTitle && styles.inputError]}
                placeholder="e.g. Senior Full-Stack Engineer"
                placeholderTextColor="#94A3B8"
                value={formData.professionalTitle}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, professionalTitle: text }));
                  if (errors.professionalTitle) setErrors((prev) => ({ ...prev, professionalTitle: '' }));
                }}
              />
              {errors.professionalTitle ? (
                <Text style={styles.errorText}>{errors.professionalTitle}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Professional Summary</Text>
              <Text style={styles.hint}>
                A concise overview of your background, experience, and key strengths. (Editable manually)
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Experienced software engineer with 5+ years building scalable mobile and web applications..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={formData.professionalSummary}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, professionalSummary: text }))}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  cancelBtn: {
    padding: 6,
  },
  cancelText: {
    fontSize: 15,
    color: '#64748B',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});
