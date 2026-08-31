import { geminiClient, GeminiError } from './client';
import { JobAnalysis } from '@/types/job';

const JD_ANALYSIS_SYSTEM_PROMPT = `
You are a precise, objective Job Description (JD) Analyzer.
Your task is to convert raw Job Descriptions into clean, structured JSON data.

IMPORTANT TRUTH & ACCURACY RULES:
1. Extract information ONLY if it is explicitly present in the provided Job Description text.
2. NEVER infer, assume, guess, or invent missing information.
3. If a field is not explicitly mentioned in the text, set its value to null (or empty array [] for lists).
   - If salary is not stated: "salary": null
   - If application email is not stated: "applicationEmail": null
   - If company name is not stated: "company": null
   - If education is not specified: "educationRequirement": null
4. Never add technologies or skills that are not explicitly stated in the JD, even if they are commonly associated with other mentioned tools.
5. Separate skills into:
   - "requiredSkills": skills, tools, frameworks, and technologies explicitly listed as required, essential, or core.
   - "preferredSkills": skills listed as nice-to-have, bonus, plus, preferred, or optional.
   - Each skill must be a clean, concise name (e.g. "TypeScript", "React Native", "PostgreSQL", "AWS", "Docker", "REST APIs"), not a paragraph.
6. Extract responsibilities and other requirements as concise bullet strings.

OUTPUT JSON SCHEMA:
{
  "company": string or null,
  "role": string or null,
  "location": string or null,
  "experienceRequirement": string or null,
  "educationRequirement": string or null,
  "salary": string or null,
  "employmentType": string or null,
  "workMode": string or null,
  "applicationEmail": string or null,
  "applicationUrl": string or null,
  "requiredSkills": string[],
  "preferredSkills": string[],
  "responsibilities": string[],
  "otherRequirements": string[]
}
`;

/**
 * Runtime validation and sanitization for JobAnalysis.
 */
function validateAndSanitizeAnalysis(data: any): JobAnalysis {
  if (!data || typeof data !== 'object') {
    throw new GeminiError('Invalid JSON structure returned by Gemini.', 'INVALID_RESPONSE');
  }

  const toStringOrNull = (val: any): string | null => {
    if (typeof val === 'string' && val.trim().length > 0 && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'n/a') {
      return val.trim();
    }
    return null;
  };

  const toStringArray = (val: any): string[] => {
    if (!Array.isArray(val)) return [];
    return val
      .map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
      .filter((item) => item.length > 0);
  };

  return {
    company: toStringOrNull(data.company),
    role: toStringOrNull(data.role),
    location: toStringOrNull(data.location),
    experienceRequirement: toStringOrNull(data.experienceRequirement),
    educationRequirement: toStringOrNull(data.educationRequirement),
    salary: toStringOrNull(data.salary),
    employmentType: toStringOrNull(data.employmentType),
    workMode: toStringOrNull(data.workMode),
    applicationEmail: toStringOrNull(data.applicationEmail),
    applicationUrl: toStringOrNull(data.applicationUrl),
    requiredSkills: toStringArray(data.requiredSkills),
    preferredSkills: toStringArray(data.preferredSkills),
    responsibilities: toStringArray(data.responsibilities),
    otherRequirements: toStringArray(data.otherRequirements),
    analyzedAt: new Date().toISOString(),
  };
}

export const jdAnalyzer = {
  /**
   * Analyzes a raw Job Description using the Gemini API.
   * Preserves raw JD and returns strongly-typed JobAnalysis.
   */
  async analyze(rawJobDescription: string): Promise<JobAnalysis> {
    const trimmedJD = rawJobDescription.trim();

    if (!trimmedJD) {
      throw new GeminiError('Cannot analyze an empty Job Description.', 'INVALID_RESPONSE');
    }

    const userPrompt = `Please analyze the following Job Description according to your system instructions:\n\n---\n${trimmedJD}\n---`;

    const rawResult = await geminiClient.generateJson<any>(userPrompt, {
      systemInstruction: JD_ANALYSIS_SYSTEM_PROMPT,
      temperature: 0.1,
    });

    return validateAndSanitizeAnalysis(rawResult);
  },
};
