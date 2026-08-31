import React, { useState } from 'react';
import {
  Alert,
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
import Feather from '@expo/vector-icons/Feather';
import { Colors, IconSizes, Radius, Spacing, Typography } from '@/constants/theme';
import { AppDialog } from '@/context/DialogContext';
import { Experience } from '@/types/profile';

interface ExperienceModalProps {
  visible: boolean;
  experiences: Experience[];
  onClose: () => void;
  onSaveExperiences: (experiences: Experience[]) => void;
}

const EMPTY_EXPERIENCE: Omit<Experience, 'id'> = {
  company: '',
  jobTitle: '',
  location: '',
  startDate: '',
  endDate: '',
  currentlyWorking: false,
  description: '',
  technologies: '',
};

export function ExperienceModal({
  visible,
  experiences,
  onClose,
  onSaveExperiences,
}: ExperienceModalProps) {
  const [list, setList] = useState<Experience[]>(experiences);
  const [isEditingFormOpen, setIsEditingFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Experience, 'id'>>(EMPTY_EXPERIENCE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    setList(experiences);
    setIsEditingFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_EXPERIENCE);
    setErrors({});
  }, [experiences, visible]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_EXPERIENCE);
    setErrors({});
    setIsEditingFormOpen(true);
  };

  const openEditForm = (exp: Experience) => {
    setEditingId(exp.id);
    setForm({
      company: exp.company,
      jobTitle: exp.jobTitle,
      location: exp.location,
      startDate: exp.startDate,
      endDate: exp.endDate,
      currentlyWorking: exp.currentlyWorking,
      description: exp.description,
      technologies: exp.technologies,
    });
    setErrors({});
    setIsEditingFormOpen(true);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.company.trim()) {
      newErrors.company = 'Company name is required';
    }
    if (!form.jobTitle.trim()) {
      newErrors.jobTitle = 'Job title is required';
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
                company: form.company.trim(),
                jobTitle: form.jobTitle.trim(),
                location: form.location.trim(),
                startDate: form.startDate.trim(),
                endDate: form.currentlyWorking ? 'Present' : form.endDate.trim(),
                description: form.description.trim(),
                technologies: form.technologies.trim(),
              }
            : item
        )
      );
    } else {
      const newItem: Experience = {
        ...form,
        id: Date.now().toString(),
        company: form.company.trim(),
        jobTitle: form.jobTitle.trim(),
        location: form.location.trim(),
        startDate: form.startDate.trim(),
        endDate: form.currentlyWorking ? 'Present' : form.endDate.trim(),
        description: form.description.trim(),
        technologies: form.technologies.trim(),
      };
      setList((prev) => [newItem, ...prev]);
    }

    setIsEditingFormOpen(false);
  };

  const handleDelete = (id: string, company: string) => {
    AppDialog.confirm(
      'Delete Experience',
      `Are you sure you want to remove your experience at "${company}" from your profile?`,
      () => {
        setList((prev) => prev.filter((item) => item.id !== id));
      },
      'Delete',
      'Cancel',
      true
    );
  };

  const handleDone = () => {
    onSaveExperiences(list);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Work Experience ({list.length})</Text>
          <TouchableOpacity onPress={handleDone} style={styles.saveBtn}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        {isEditingFormOpen ? (
          /* Experience Add/Edit Form */
          <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {editingId ? 'Edit Work Experience' : 'Add Work Experience'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Company <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.company && styles.inputError]}
                placeholder="e.g. Acme Corp"
                placeholderTextColor="#94A3B8"
                value={form.company}
                onChangeText={(text) => {
                  setForm((p) => ({ ...p, company: text }));
                  if (errors.company) setErrors((p) => ({ ...p, company: '' }));
                }}
              />
              {errors.company ? <Text style={styles.errorText}>{errors.company}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Job Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.jobTitle && styles.inputError]}
                placeholder="e.g. Lead Frontend Developer"
                placeholderTextColor="#94A3B8"
                value={form.jobTitle}
                onChangeText={(text) => {
                  setForm((p) => ({ ...p, jobTitle: text }));
                  if (errors.jobTitle) setErrors((p) => ({ ...p, jobTitle: '' }));
                }}
              />
              {errors.jobTitle ? <Text style={styles.errorText}>{errors.jobTitle}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. New York, NY (or Remote)"
                placeholderTextColor="#94A3B8"
                value={form.location}
                onChangeText={(text) => setForm((p) => ({ ...p, location: text }))}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>I am currently working here</Text>
              <Switch
                value={form.currentlyWorking}
                onValueChange={(val) =>
                  setForm((p) => ({
                    ...p,
                    currentlyWorking: val,
                    endDate: val ? 'Present' : p.endDate === 'Present' ? '' : p.endDate,
                  }))
                }
                thumbColor={form.currentlyWorking ? '#2563EB' : '#CBD5E1'}
                trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.col]}>
                <Text style={styles.label}>Start Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mar 2021"
                  placeholderTextColor="#94A3B8"
                  value={form.startDate}
                  onChangeText={(text) => setForm((p) => ({ ...p, startDate: text }))}
                />
              </View>

              {!form.currentlyWorking && (
                <View style={[styles.inputGroup, styles.col]}>
                  <Text style={styles.label}>End Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Jan 2024"
                    placeholderTextColor="#94A3B8"
                    value={form.endDate}
                    onChangeText={(text) => setForm((p) => ({ ...p, endDate: text }))}
                  />
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Technologies & Skills Used</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. React, TypeScript, GraphQL, Node.js, AWS"
                placeholderTextColor="#94A3B8"
                value={form.technologies}
                onChangeText={(text) => setForm((p) => ({ ...p, technologies: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Responsibilities & Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Led migration to Next.js; improved performance by 35%..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
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
                <Text style={styles.saveFormText}>{editingId ? 'Update' : 'Add Experience'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          /* Experience List View */
          <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.addNewButton} onPress={openAddForm}>
              <Text style={styles.addNewButtonText}>+ Add Work Experience</Text>
            </TouchableOpacity>

            {list.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No work experience added yet.</Text>
                <Text style={styles.emptySubtext}>
                  Add your past and current roles to build a rich foundation for JD-tailored resumes.
                </Text>
              </View>
            ) : (
              list.map((exp) => (
                <View key={exp.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTitleArea}>
                      <Text style={styles.itemJobTitle}>{exp.jobTitle}</Text>
                      <Text style={styles.itemCompany}>{exp.company}</Text>
                      <Text style={styles.itemMeta}>
                        {exp.startDate} – {exp.currentlyWorking ? 'Present' : exp.endDate || 'Present'}{' '}
                        {exp.location ? `• ${exp.location}` : ''}
                      </Text>
                    </View>
                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.editIconBtn}
                        onPress={() => openEditForm(exp)}>
                        <Text style={styles.editIconText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteIconBtn}
                        onPress={() => handleDelete(exp.id, exp.company)}>
                        <Text style={styles.deleteIconText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {exp.technologies ? (
                    <View style={styles.techContainer}>
                      <Text style={styles.techLabel}>Tech: </Text>
                      <Text style={styles.techText}>{exp.technologies}</Text>
                    </View>
                  ) : null}

                  {exp.description ? (
                    <Text style={styles.itemDescription} numberOfLines={3}>
                      {exp.description}
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
  itemJobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemCompany: {
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
  techContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  techLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  techText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
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
    minHeight: 90,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
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
