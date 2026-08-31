import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* App Header */}
        <View style={styles.header}>
          <Text style={styles.title}>HireLog</Text>
          <Text style={styles.subtitle}>Manage your job applications</Text>
        </View>

        {/* Dashboard Placeholder Area */}
        <View style={styles.dashboardPlaceholder}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Foundation Ready</Text>
          </View>
          <Text style={styles.placeholderTitle}>Application Dashboard</Text>
          <Text style={styles.placeholderDescription}>
            Your active job applications, tailored resumes, and outreach tracking will appear here.
          </Text>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>HireLog v1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 22,
  },
  dashboardPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 'auto',
  },
  badge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  placeholderDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
