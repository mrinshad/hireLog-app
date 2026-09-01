import { geminiClient, GeminiError } from './client';
import { errorLogger } from '@/services/logging/errorLogger';
import { GenerateEmailInput } from '@/types/email';

const EMAIL_SYSTEM_PROMPT = `
You are an expert job application email assistant.
Your task is to write a short, natural, high-impact job application email body that an HR manager or engineering lead can read in 30 seconds.

IMPORTANT RULES:
1. Return JSON in the schema: { "body": "email text here..." }
2. Keep the email body CONCISE (2 to 3 short paragraphs, around 80-130 words).
3. Sound human, confident, and professional. Avoid robotic phrases like "I am writing to express my enthusiastic interest in...", "dynamic environment", or "synergy".
4. State the target role and company in the opening sentence.
5. Highlight ONLY the verified matching technologies and relevant project/experience provided in the prompt.
6. Reference that the candidate's tailored resume is attached for review.
7. Do NOT generate a subject line.
8. Do NOT generate the sign-off / signature (the app attaches the candidate signature separately).
9. Never invent unmentioned technologies, ungrounded years of experience, or fake metrics.
`;

export const emailGenerator = {
  /**
   * Generates a concise, truthful job application email body using Gemini.
   */
  async generateEmailBody(input: GenerateEmailInput): Promise<string> {
    const roleText = input.role || 'the advertised position';
    const companyText = input.company ? ` at ${input.company}` : '';
    const skillsText =
      input.matchedSkills.length > 0
        ? `Matching key skills: ${input.matchedSkills.slice(0, 5).join(', ')}.`
        : '';
    const expText =
      input.topExperienceCompany && input.topExperienceRole
        ? `Relevant experience: ${input.topExperienceRole} at ${input.topExperienceCompany}.`
        : '';
    const projText =
      input.topProjectName
        ? `Relevant project: ${input.topProjectName}${input.topProjectDomain ? ` (${input.topProjectDomain})` : ''}.`
        : '';

    const userPrompt = `
Generate a concise job application email body for:
- Candidate Name: ${input.candidateName || 'Candidate'}
- Target Role: ${roleText}
- Target Company: ${companyText || 'Company'}
- ${skillsText}
- ${expText}
- ${projText}

Remember: Return JSON with { "body": "..." } and do NOT include the signature.
`.trim();

    try {
      const response = await geminiClient.generateJson<{ body: string }>(userPrompt, {
        systemInstruction: EMAIL_SYSTEM_PROMPT,
        temperature: 0.2,
      });

      if (!response || !response.body || typeof response.body !== 'string') {
        throw new GeminiError('Gemini returned an invalid email structure.', 'INVALID_RESPONSE');
      }

      return response.body.trim();
    } catch (error: any) {
      await errorLogger.logError('emailGenerator.generateEmailBody', error, {
        role: input.role,
        company: input.company,
      });
      if (error instanceof GeminiError) {
        throw error;
      }
      throw new GeminiError(
        error.message || 'Failed to generate email body with Gemini.',
        'UNKNOWN'
      );
    }
  },
};
