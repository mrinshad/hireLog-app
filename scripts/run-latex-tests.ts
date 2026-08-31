import { runLatexRendererTests } from '../src/services/latex/__tests__/latexRenderer.test';

async function main() {
  const r1 = runLatexRendererTests();

  if (r1.failed > 0) {
    process.exit(1);
  } else {
    console.log(`All ${r1.passed}/${r1.total} LaTeX renderer tests passed successfully!`);
  }
}

main();
