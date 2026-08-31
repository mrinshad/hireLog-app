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
import { SKILL_CATEGORIES, Skill, SkillCategory } from '@/types/profile';

interface SkillsModalProps {
  visible: boolean;
  skills: Skill[];
  onClose: () => void;
  onSaveSkills: (skills: Skill[]) => void;
}

export function SkillsModal({ visible, skills, onClose, onSaveSkills }: SkillsModalProps) {
  const [skillList, setSkillList] = useState<Skill[]>(skills);
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory>('Programming Languages');
  const [skillName, setSkillName] = useState('');
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Sync with prop when modal opens
  React.useEffect(() => {
    setSkillList(skills);
    setEditingSkillId(null);
    setSkillName('');
    setError('');
  }, [skills, visible]);

  const handleAddOrUpdate = () => {
    const trimmed = skillName.trim();
    if (!trimmed) {
      setError('Skill name cannot be empty');
      return;
    }

    if (editingSkillId) {
      // Update existing
      setSkillList((prev) =>
        prev.map((item) =>
          item.id === editingSkillId
            ? { ...item, name: trimmed, category: selectedCategory }
            : item
        )
      );
      setEditingSkillId(null);
    } else {
      // Add new
      const newSkill: Skill = {
        id: Date.now().toString(),
        name: trimmed,
        category: selectedCategory,
      };
      setSkillList((prev) => [...prev, newSkill]);
    }

    setSkillName('');
    setError('');
  };

  const handleEdit = (skill: Skill) => {
    setEditingSkillId(skill.id);
    setSkillName(skill.name);
    setSelectedCategory(skill.category);
    setError('');
  };

  const handleDelete = (id: string, name: string) => {
    AppDialog.confirm(
      'Remove Skill',
      `Are you sure you want to remove "${name}" from your profile?`,
      () => {
        setSkillList((prev) => prev.filter((item) => item.id !== id));
        if (editingSkillId === id) {
          setEditingSkillId(null);
          setSkillName('');
        }
      },
      'Remove',
      'Cancel',
      true
    );
  };

  const handleDone = () => {
    onSaveSkills(skillList);
    onClose();
  };

  // Group skills by category for display
  const categorizedSkills = SKILL_CATEGORIES.map((cat) => ({
    category: cat,
    items: skillList.filter((s) => s.category === cat),
  }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Skills ({skillList.length})</Text>
          <TouchableOpacity onPress={handleDone} style={styles.saveBtn}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Add / Edit Input Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingSkillId ? 'Edit Skill' : 'Add New Skill'}
            </Text>

            <TextInput
              style={[styles.input, !!error && styles.inputError]}
              placeholder="e.g. TypeScript, React Native, PostgreSQL..."
              placeholderTextColor="#94A3B8"
              value={skillName}
              onChangeText={(text) => {
                setSkillName(text);
                if (error) setError('');
              }}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.categoryLabel}>Select Category:</Text>
            <View style={styles.categoryChips}>
              {SKILL_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    selectedCategory === cat && styles.chipActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}>
                  <Text
                    style={[
                      styles.chipText,
                      selectedCategory === cat && styles.chipTextActive,
                    ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionRow}>
              {editingSkillId && (
                <TouchableOpacity
                  style={styles.cancelEditBtn}
                  onPress={() => {
                    setEditingSkillId(null);
                    setSkillName('');
                    setError('');
                  }}>
                  <Text style={styles.cancelEditText}>Cancel Edit</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, editingSkillId && styles.actionBtnFlex]}
                onPress={handleAddOrUpdate}>
                <Text style={styles.actionBtnText}>
                  {editingSkillId ? 'Update Skill' : '+ Add Skill'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Categorized Skills List */}
          <Text style={styles.sectionHeader}>Your Skills by Category</Text>

          {skillList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No skills added yet.</Text>
              <Text style={styles.emptySubtext}>
                Add your technical and domain skills above to prepare for JD matching.
              </Text>
            </View>
          ) : (
            categorizedSkills
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <View key={group.category} style={styles.categoryGroup}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle}>{group.category}</Text>
                    <Text style={styles.groupCount}>{group.items.length}</Text>
                  </View>
                  <View style={styles.skillsWrapper}>
                    {group.items.map((skill) => (
                      <View key={skill.id} style={styles.skillBadge}>
                        <Text style={styles.skillText}>{skill.name}</Text>
                        <TouchableOpacity
                          style={styles.skillActionBtn}
                          onPress={() => handleEdit(skill)}>
                          <Text style={styles.skillEditText}>✎</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.skillActionBtn}
                          onPress={() => handleDelete(skill.id, skill.name)}>
                          <Text style={styles.skillDeleteText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              ))
          )}
        </ScrollView>
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
  formCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
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
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 12,
    marginBottom: 8,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelEditBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelEditText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  actionBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionBtnFlex: {
    flex: 1,
  },
  actionBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  categoryGroup: {
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  groupCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  skillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 6,
  },
  skillText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  skillActionBtn: {
    padding: 4,
  },
  skillEditText: {
    fontSize: 13,
    color: '#2563EB',
  },
  skillDeleteText: {
    fontSize: 13,
    color: '#EF4444',
  },
});
