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

import { Education } from '@/types/profile';

interface EducationModalProps {
  visible: boolean;
  educationList: Education[];
  onClose: () => void;
  onSaveEducation: (education: Education[]) => void;
}

const EMPTY_EDUCATION: Omit<Education, 'id'> = {
  degree: '',
  institution: '',
  location: '',
  startDate: '',
  endDate: '',
  description: '',
};

export function EducationModal({
  visible,
  educationList,
  onClose,
  onSaveEducation,
}: EducationModalProps) {
  const [list, setList] = useState<Education[]>(educationList);
  const [isEditingFormOpen, setIsEditingFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Education, 'id'>>(EMPTY_EDUCATION);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    setList(educationList);
    setIsEditingFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_EDUCATION);
    setErrors({});
  }, [educationList, visible]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_EDUCATION);
    setErrors({});
    setIsEditingFormOpen(true);
  };

  const openEditForm = (edu: Education) => {
    setEditingId(edu.id);
    setForm({
      degree: edu.degree,
      institution: edu.institution,
      location: edu.location,
      startDate: edu.startDate,
      endDate: edu.endDate,
      description: edu.description || '',
    });
    setErrors({});
    setIsEditingFormOpen(true);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.degree.trim()) {
      newErrors.degree = 'Degree / Qualification is required';
    }
    if (!form.institution.trim()) {
      newErrors.institution = 'Institution is required';
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
                degree: form.degree.trim(),
                institution: form.institution.trim(),
                location: form.location.trim(),
                startDate: form.startDate.trim(),
                endDate: form.endDate.trim(),
                description: form.description?.trim() || '',
              }
            : item
        )
      );
    } else {
      const newItem: Education = {
        ...form,
        id: Date.now().toString(),
        degree: form.degree.trim(),
        institution: form.institution.trim(),
        location: form.location.trim(),
        startDate: form.startDate.trim(),
        endDate: form.endDate.trim(),
        description: form.description?.trim() || '',
      };
      setList((prev) => [newItem, ...prev]);
    }

    setIsEditingFormOpen(false);
  };

  const handleDelete = (id: string, degree: string) => {
    Alert.alert('Delete Education', `Are you sure you want to delete "${degree}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setList((prev) => prev.filter((item) => item.id !== id));
        },
      },
    ]);
  };

  const handleDone = () => {
    onSaveEducation(list);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Education ({list.length})</Text>
          <TouchableOpacity onPress={handleDone} style={styles.saveBtn}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        {isEditingFormOpen ? (
          /* Education Add/Edit Form */
          <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {editingId ? 'Edit Education' : 'Add Education Entry'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Degree / Qualification <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.degree && styles.inputError]}
                placeholder="e.g. B.S. in Computer Science"
                placeholderTextColor="#94A3B8"
                value={form.degree}
                onChangeText={(text) => {
                  setForm((p) => ({ ...p, degree: text }));
                  if (errors.degree) setErrors((p) => ({ ...p, degree: '' }));
                }}
              />
              {errors.degree ? <Text style={styles.errorText}>{errors.degree}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Institution / University <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.institution && styles.inputError]}
                placeholder="e.g. University of California, Berkeley"
                placeholderTextColor="#94A3B8"
                value={form.institution}
                onChangeText={(text) => {
                  setForm((p) => ({ ...p, institution: text }));
                  if (errors.institution) setErrors((p) => ({ ...p, institution: '' }));
                }}
              />
              {errors.institution ? <Text style={styles.errorText}>{errors.institution}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Berkeley, CA"
                placeholderTextColor="#94A3B8"
                value={form.location}
                onChangeText={(text) => setForm((p) => ({ ...p, location: text }))}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.col]}>
                <Text style={styles.label}>Start Year / Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2018"
                  placeholderTextColor="#94A3B8"
                  value={form.startDate}
                  onChangeText={(text) => setForm((p) => ({ ...p, startDate: text }))}
                />
              </View>

              <View style={[styles.inputGroup, styles.col]}>
                <Text style={styles.label}>End Year / Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2022"
                  placeholderTextColor="#94A3B8"
                  value={form.endDate}
                  onChangeText={(text) => setForm((p) => ({ ...p, endDate: text }))}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description / Honors / GPA</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Minor in Mathematics, Dean's List, Magna Cum Laude..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={form.description}
                onChangeText={(text) => setForm((p) => ({ ...p, description: text }))}
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelFormBtn}
                onPress={() => setIsEditingFormOpen(false)}>
                <Text style={styles.cancelFormText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveFormBtn} onPress={handleSaveItem}>
                <Text style={styles.saveFormText}>{editingId ? 'Update' : 'Add Entry'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          /* Education List View */
          <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.addNewButton} onPress={openAddForm}>
              <Text style={styles.addNewButtonText}>+ Add Education Entry</Text>
            </TouchableOpacity>

            {list.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No education history added yet.</Text>
                <Text style={styles.emptySubtext}>
                  Add degrees, universities, or academic programs.
                </Text>
              </View>
            ) : (
              list.map((edu) => (
                <View key={edu.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTitleArea}>
                      <Text style={styles.itemDegree}>{edu.degree}</Text>
                      <Text style={styles.itemInstitution}>{edu.institution}</Text>
                      <Text style={styles.itemMeta}>
                        {edu.startDate ? `${edu.startDate} – ` : ''}
                        {edu.endDate || 'Present'} {edu.location ? `• ${edu.location}` : ''}
                      </Text>
                    </View>
                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.editIconBtn}
                        onPress={() => openEditForm(edu)}>
                        <Text style={styles.editIconText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteIconBtn}
                        onPress={() => handleDelete(edu.id, edu.degree)}>
                        <Text style={styles.deleteIconText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {edu.description ? (
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {edu.description}
                    </Text>
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
  itemDegree: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemInstitution: {
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
  itemDescription: {
    fontSize: 13,
    color: '#475569',
    marginTop: 8,
    lineHeight: 18,
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
  textArea: {
    minHeight: 70,
    paddingTop: 10,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
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
