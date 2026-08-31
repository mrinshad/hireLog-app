import { runLatexRendererTests } from '../src/services/latex/__tests__/latexRenderer.test';

const { total, passed, failed } = runLatexRendererTests();

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`All ${passed}/${total} LaTeX renderer tests passed successfully!`);
}
