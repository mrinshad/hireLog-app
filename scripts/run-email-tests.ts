import { runEmailComposerTests } from '../src/services/email/__tests__/emailComposer.test';

const { total, passed, failed } = runEmailComposerTests();

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`All ${passed}/${total} Email Composer tests passed successfully!`);
}
