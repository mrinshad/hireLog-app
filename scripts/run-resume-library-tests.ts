import { runResumeLibraryTests } from '../src/services/latex/__tests__/resumeLibrary.test';

const { total, passed, failed } = runResumeLibraryTests();

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`All ${passed}/${total} Resume Library tests passed successfully!`);
}
