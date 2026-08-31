import { runResumeCustomizerTests } from '../src/services/resume/__tests__/resumeCustomizer.test';

const { total, passed, failed } = runResumeCustomizerTests();

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`All ${passed}/${total} resume customization tests passed successfully!`);
}
