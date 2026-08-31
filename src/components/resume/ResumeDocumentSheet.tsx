import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { CustomizedResume } from '@/types/resume';

interface ResumeDocumentSheetProps {
  resume: CustomizedResume;
}

export const ResumeDocumentSheet: React.FC<ResumeDocumentSheetProps> = ({ resume }) => {
  const {
    personalDetails,
    summary,
    skills,
    experience,
    projects,
    education,
    certifications,
  } = resume;

  const contactItems: string[] = [];
  if (personalDetails?.phone) contactItems.push(personalDetails.phone);
  if (personalDetails?.email) contactItems.push(personalDetails.email);
  if (personalDetails?.location) contactItems.push(personalDetails.location);
  if (personalDetails?.linkedIn) contactItems.push('LinkedIn');
  if (personalDetails?.github) contactItems.push('GitHub');
  if (personalDetails?.portfolio) contactItems.push('Portfolio');

  // Group skills by category
  const skillsByCategory = (skills || []).reduce<Record<string, string[]>>((acc, s) => {
    const cat = s.category || 'Technical Skills';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s.name);
    return acc;
  }, {});

  return (
    <View style={styles.sheetPaper}>
      {/* Document Header */}
      <View style={styles.header}>
        <Text style={styles.candidateName}>{personalDetails?.fullName || 'Candidate Name'}</Text>
        {contactItems.length > 0 && (
          <Text style={styles.contactRow}>{contactItems.join('  •  ')}</Text>
        )}
      </View>

      {/* Summary Section */}
      {summary && summary.trim().length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Summary</Text>
          <View style={styles.headingDivider} />
          <Text style={styles.bodyText}>{summary}</Text>
        </View>
      )}

      {/* Technical Skills Section */}
      {Object.keys(skillsByCategory).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Technical Skills</Text>
          <View style={styles.headingDivider} />
          <View style={styles.skillsList}>
            {Object.entries(skillsByCategory).map(([category, skillNames]) => (
              <View key={category} style={styles.skillRow}>
                <Text style={styles.skillCategoryTitle}>{category}: </Text>
                <Text style={styles.skillItemsText}>{skillNames.join(', ')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Experience Section */}
      {experience && experience.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Experience</Text>
          <View style={styles.headingDivider} />
          <View style={styles.itemsList}>
            {experience.map((exp, idx) => (
              <View key={exp.profileId || idx} style={styles.itemBlock}>
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemPrimaryTitle}>{exp.jobTitle}</Text>
                  <Text style={styles.itemDateText}>
                    {exp.startDate} – {exp.endDate}
                  </Text>
                </View>
                <View style={styles.itemSubRow}>
                  <Text style={styles.itemCompanyText}>{exp.company}</Text>
                  {exp.location ? <Text style={styles.itemLocationText}>{exp.location}</Text> : null}
                </View>

                {exp.description ? (
                  <View style={styles.descriptionArea}>
                    {exp.description
                      .split('\n')
                      .filter((line) => line.trim().length > 0)
                      .map((line, lIdx) => (
                        <View key={lIdx} style={styles.bulletRow}>
                          <Text style={styles.bulletDot}>•</Text>
                          <Text style={styles.bulletText}>{line.trim()}</Text>
                        </View>
                      ))}
                  </View>
                ) : null}

                {exp.technologies ? (
                  <Text style={styles.technologiesText}>
                    <Text style={{ fontWeight: '600' }}>Technologies: </Text>
                    {exp.technologies}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Projects Section */}
      {projects && projects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Projects</Text>
          <View style={styles.headingDivider} />
          <View style={styles.itemsList}>
            {projects.map((proj, idx) => (
              <View key={proj.profileId || idx} style={styles.itemBlock}>
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemPrimaryTitle}>{proj.projectName}</Text>
                  {proj.projectTypeOrDomain ? (
                    <Text style={styles.projectDomainText}>| {proj.projectTypeOrDomain}</Text>
                  ) : null}
                </View>

                {proj.description ? <Text style={styles.bodyText}>{proj.description}</Text> : null}
                {proj.featuresOrWorkDone ? (
                  <View style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{proj.featuresOrWorkDone}</Text>
                  </View>
                ) : null}
                {proj.myContribution ? (
                  <View style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{proj.myContribution}</Text>
                  </View>
                ) : null}

                {proj.technologies ? (
                  <Text style={styles.technologiesText}>
                    <Text style={{ fontWeight: '600' }}>Technologies: </Text>
                    {proj.technologies}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Education Section */}
      {education && education.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Education</Text>
          <View style={styles.headingDivider} />
          <View style={styles.itemsList}>
            {education.map((edu, idx) => (
              <View key={edu.profileId || idx} style={styles.itemBlock}>
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemPrimaryTitle}>{edu.institution}</Text>
                  {edu.startDate || edu.endDate ? (
                    <Text style={styles.itemDateText}>
                      {edu.startDate ? `${edu.startDate} – ` : ''}
                      {edu.endDate}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.itemSubRow}>
                  <Text style={styles.itemCompanyText}>{edu.degree}</Text>
                  {edu.location ? <Text style={styles.itemLocationText}>{edu.location}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Certifications Section */}
      {certifications && certifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Certifications</Text>
          <View style={styles.headingDivider} />
          <View style={styles.itemsList}>
            {certifications.map((cert, idx) => (
              <View key={cert.profileId || idx} style={styles.certRow}>
                <Text style={styles.certName}>{cert.name}</Text>
                <Text style={styles.certIssuer}>
                  {cert.issuingOrganization} {cert.issueDate ? `(${cert.issueDate})` : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sheetPaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  header: {
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  candidateName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  contactRow: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    gap: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headingDivider: {
    height: 1,
    backgroundColor: '#0F172A',
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#1E293B',
  },
  skillsList: {
    gap: 3,
  },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  skillCategoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  skillItemsText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  itemsList: {
    gap: Spacing.sm,
  },
  itemBlock: {
    gap: 2,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  itemPrimaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  projectDomainText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#475569',
  },
  itemDateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  itemSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCompanyText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#334155',
  },
  itemLocationText: {
    fontSize: 11,
    color: '#64748B',
  },
  descriptionArea: {
    marginTop: 2,
    gap: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletDot: {
    fontSize: 12,
    lineHeight: 16,
    color: '#0F172A',
  },
  bulletText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#1E293B',
    flex: 1,
  },
  technologiesText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  certRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  certName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  certIssuer: {
    fontSize: 11,
    color: '#64748B',
  },
});
