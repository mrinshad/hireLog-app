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
import { AppDialog } from '@/context/DialogContext';

import { Project } from '@/types/profile';

interface ProjectsModalProps {
  visible: boolean;
  projects: Project[];
  onClose: () => void;
  onSaveProjects: (projects: Project[]) => void;
}

const EMPTY_PROJECT: Omit<Project, 'id'> = {
  projectName: '',
  description: '',
  projectTypeOrDomain: '',
  technologies: '',
  featuresOrWorkDone: '',
  myContribution: '',
};

export function ProjectsModal({
  visible,
  projects,
  onClose,
  onSaveProjects,
}: ProjectsModalProps) {
  const [list, setList] = useState<Project[]>(projects);
  const [isEditingFormOpen, setIsEditingFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Project, 'id'>>(EMPTY_PROJECT);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    setList(projects);
    setIsEditingFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_PROJECT);
    setErrors({});
  }, [projects, visible]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_PROJECT);
    setErrors({});
    setIsEditingFormOpen(true);
  };

  const openEditForm = (proj: Project) => {
    setEditingId(proj.id);
    setForm({
      projectName: proj.projectName,
      description: proj.description,
      projectTypeOrDomain: proj.projectTypeOrDomain,
      technologies: proj.technologies,
      featuresOrWorkDone: proj.featuresOrWorkDone,
      myContribution: proj.myContribution,
    });
    setErrors({});
    setIsEditingFormOpen(true);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.projectName.trim()) {
      newErrors.projectName = 'Project Name is required';
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
                projectName: form.projectName.trim(),
                description: form.description.trim(),
                projectTypeOrDomain: form.projectTypeOrDomain.trim(),
                technologies: form.technologies.trim(),
                featuresOrWorkDone: form.featuresOrWorkDone.trim(),
                myContribution: form.myContribution.trim(),
              }
            : item
        )
      );
    } else {
      const newItem: Project = {
        ...form,
        id: Date.now().toString(),
        projectName: form.projectName.trim(),
        description: form.description.trim(),
        projectTypeOrDomain: form.projectTypeOrDomain.trim(),
        technologies: form.technologies.trim(),
        featuresOrWorkDone: form.featuresOrWorkDone.trim(),
        myContribution: form.myContribution.trim(),
      };
      setList((prev) => [newItem, ...prev]);
    }

    setIsEditingFormOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    AppDialog.confirm(
      'Delete Project',
      `Are you sure you want to remove project "${name}" from your profile?`,
      () => {
        setList((prev) => prev.filter((item) => item.id !== id));
      },
      'Delete',
      'Cancel',
      true
    );
  };

  const handleDone = () => {
    onSaveProjects(list);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Projects ({list.length})</Text>
          <TouchableOpacity onPress={handleDone} style={styles.saveBtn}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        {isEditingFormOpen ? (
          /* Project Add/Edit Form */
          <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {editingId ? 'Edit Project' : 'Add New Project'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Project Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.projectName && styles.inputError]}
                placeholder="e.g. HireLog Mobile App"
                placeholderTextColor="#94A3B8"
                value={form.projectName}
                onChangeText={(text) => {
                  setForm((p) => ({ ...p, projectName: text }));
                  if (errors.projectName) setErrors((p) => ({ ...p, projectName: '' }));
                }}
              />
              {errors.projectName ? <Text style={styles.errorText}>{errors.projectName}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Project Type / Domain</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mobile Application / Career Tech"
                placeholderTextColor="#94A3B8"
                value={form.projectTypeOrDomain}
                onChangeText={(text) => setForm((p) => ({ ...p, projectTypeOrDomain: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Technologies</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. React Native, Expo, TypeScript, SQLite"
                placeholderTextColor="#94A3B8"
                value={form.technologies}
                onChangeText={(text) => setForm((p) => ({ ...p, technologies: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="High-level overview of the project and its goals..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={form.description}
                onChangeText={(text) => setForm((p) => ({ ...p, description: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Features / Work Done</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Key features implemented, architecture details, performance gains..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={form.featuresOrWorkDone}
                onChangeText={(text) => setForm((p) => ({ ...p, featuresOrWorkDone: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>My Specific Contribution</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What exactly did you design, lead, or build?..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={form.myContribution}
                onChangeText={(text) => setForm((p) => ({ ...p, myContribution: text }))}
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelFormBtn}
                onPress={() => setIsEditingFormOpen(false)}>
                <Text style={styles.cancelFormText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveFormBtn} onPress={handleSaveItem}>
                <Text style={styles.saveFormText}>{editingId ? 'Update' : 'Add Project'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          /* Projects List View */
          <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.addNewButton} onPress={openAddForm}>
              <Text style={styles.addNewButtonText}>+ Add Project</Text>
            </TouchableOpacity>

            {list.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No projects added yet.</Text>
                <Text style={styles.emptySubtext}>
                  Add projects to allow the JD matching system to select your most relevant work.
                </Text>
              </View>
            ) : (
              list.map((proj) => (
                <View key={proj.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTitleArea}>
                      <Text style={styles.itemProjectName}>{proj.projectName}</Text>
                      {proj.projectTypeOrDomain ? (
                        <Text style={styles.itemDomain}>{proj.projectTypeOrDomain}</Text>
                      ) : null}
                    </View>
                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.editIconBtn}
                        onPress={() => openEditForm(proj)}>
                        <Text style={styles.editIconText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteIconBtn}
                        onPress={() => handleDelete(proj.id, proj.projectName)}>
                        <Text style={styles.deleteIconText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {proj.technologies ? (
                    <View style={styles.techContainer}>
                      <Text style={styles.techLabel}>Tech: </Text>
                      <Text style={styles.techText}>{proj.technologies}</Text>
                    </View>
                  ) : null}

                  {proj.description ? (
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {proj.description}
                    </Text>
                  ) : null}

                  {proj.myContribution ? (
                    <Text style={styles.itemContribution} numberOfLines={2}>
                      <Text style={styles.boldLabel}>Contribution: </Text>
                      {proj.myContribution}
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
  itemProjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemDomain: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
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
  itemContribution: {
    fontSize: 13,
    color: '#334155',
    marginTop: 6,
    lineHeight: 18,
  },
  boldLabel: {
    fontWeight: '600',
    color: '#1E293B',
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
    minHeight: 80,
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
