import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { AppDialog } from '@/context/DialogContext';
import { Certification } from '@/types/profile';

interface CertificationsModalProps {
  visible: boolean;
  certifications: Certification[];
  onClose: () => void;
  onSaveCertifications: (certifications: Certification[]) => void;
}

const EMPTY_CERTIFICATION: Omit<Certification, 'id'> = {
  name: '',
  issuingOrganization: '',
  issueDate: '',
  credentialId: '',
  credentialUrl: '',
};

export function CertificationsModal({
  visible,
  certifications,
  onClose,
  onSaveCertifications,
}: CertificationsModalProps) {
  const [list, setList] = useState<Certification[]>(certifications);
  const [isEditingFormOpen, setIsEditingFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Certification, 'id'>>(EMPTY_CERTIFICATION);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    setList(certifications);
    setIsEditingFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_CERTIFICATION);
    setErrors({});
  }, [certifications, visible]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_CERTIFICATION);
    setErrors({});
    setIsEditingFormOpen(true);
  };

  const openEditForm = (cert: Certification) => {
    setEditingId(cert.id);
    setForm({
      name: cert.name,
      issuingOrganization: cert.issuingOrganization,
      issueDate: cert.issueDate,
      credentialId: cert.credentialId || '',
      credentialUrl: cert.credentialUrl || '',
    });
    setErrors({});
    setIsEditingFormOpen(true);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) {
      newErrors.name = 'Certification Name is required';
    }
    if (!form.issuingOrganization.trim()) {
      newErrors.issuingOrganization = 'Issuing Organization is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveItem = () => {
    if (!validate()) return;

    if (editingId) {
      setList((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...form,
                id: editingId,
                name: form.name.trim(),
                issuingOrganization: form.issuingOrganization.trim(),
                issueDate: form.issueDate.trim(),
                credentialId: form.credentialId?.trim() || '',
                credentialUrl: form.credentialUrl?.trim() || '',
              }
            : item
        )
      );
    } else {
      const newItem: Certification = {
        ...form,
        id: Date.now().toString(),
        name: form.name.trim(),
        issuingOrganization: form.issuingOrganization.trim(),
        issueDate: form.issueDate.trim(),
        credentialId: form.credentialId?.trim() || '',
        credentialUrl: form.credentialUrl?.trim() || '',
      };
      setList((prev) => [newItem, ...prev]);
    }

    setIsEditingFormOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    AppDialog.confirm(
      'Delete Certification',
      `Are you sure you want to remove "${name}" from your profile?`,
      () => {
        setList((prev) => prev.filter((item) => item.id !== id));
      },
      'Delete',
      'Cancel',
      true
    );
  };

  const handleDone = () => {
    onSaveCertifications(list);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Certifications ({list.length})</Text>
          <TouchableOpacity onPress={handleDone} style={styles.saveBtn}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        {isEditingFormOpen ? (
          /* Certification Add/Edit Form */
          <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {editingId ? 'Edit Certification' : 'Add Certification'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Certification Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="e.g. AWS Certified Solutions Architect"
                placeholderTextColor="#94A3B8"
                value={form.name}
                onChangeText={(text) => {
                  setForm((p) => ({ ...p, name: text }));
                  if (errors.name) setErrors((p) => ({ ...p, name: '' }));
                }}
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Issuing Organization <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.issuingOrganization && styles.inputError]}
                placeholder="e.g. Amazon Web Services"
                placeholderTextColor="#94A3B8"
                value={form.issuingOrganization}
                onChangeText={(text) => {
                  setForm((p) => ({ ...p, issuingOrganization: text }));
                  if (errors.issuingOrganization)
                    setErrors((p) => ({ ...p, issuingOrganization: '' }));
                }}
              />
              {errors.issuingOrganization ? (
                <Text style={styles.errorText}>{errors.issuingOrganization}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Issue Date</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. May 2023"
                placeholderTextColor="#94A3B8"
                value={form.issueDate}
                onChangeText={(text) => setForm((p) => ({ ...p, issueDate: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Credential ID (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. ABC-12345678"
                placeholderTextColor="#94A3B8"
                value={form.credentialId}
                onChangeText={(text) => setForm((p) => ({ ...p, credentialId: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Credential URL (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. https://www.credly.com/badges/..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                value={form.credentialUrl}
                onChangeText={(text) => setForm((p) => ({ ...p, credentialUrl: text }))}
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelFormBtn}
                onPress={() => setIsEditingFormOpen(false)}>
                <Text style={styles.cancelFormText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveFormBtn} onPress={handleSaveItem}>
                <Text style={styles.saveFormText}>{editingId ? 'Update' : 'Add Certification'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          /* Certifications List View */
          <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.addNewButton} onPress={openAddForm}>
              <Text style={styles.addNewButtonText}>+ Add Certification</Text>
            </TouchableOpacity>

            {list.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No certifications added yet.</Text>
                <Text style={styles.emptySubtext}>
                  Add verified technical credentials, licenses, or professional awards.
                </Text>
              </View>
            ) : (
              list.map((cert) => (
                <View key={cert.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTitleArea}>
                      <Text style={styles.itemCertName}>{cert.name}</Text>
                      <Text style={styles.itemOrg}>{cert.issuingOrganization}</Text>
                      {cert.issueDate ? (
                        <Text style={styles.itemMeta}>Issued: {cert.issueDate}</Text>
                      ) : null}
                    </View>
                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.editIconBtn}
                        onPress={() => openEditForm(cert)}>
                        <Text style={styles.editIconText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteIconBtn}
                        onPress={() => handleDelete(cert.id, cert.name)}>
                        <Text style={styles.deleteIconText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {cert.credentialId ? (
                    <Text style={styles.itemCredId}>ID: {cert.credentialId}</Text>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  addNewButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addNewButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  emptyContainer: {
    padding: 28,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  itemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitleArea: {
    flex: 1,
    marginRight: 8,
  },
  itemCertName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemOrg: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editIconBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editIconText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  deleteIconBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteIconText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  itemCredId: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
  },
  formHeader: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
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
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelFormBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelFormText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600',
  },
  saveFormBtn: {
    flex: 2,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveFormText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
