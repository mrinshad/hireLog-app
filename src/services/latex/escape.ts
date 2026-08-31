const LATEX_ESCAPE_MAP: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  '$': '\\$',
  '#': '\\#',
  '_': '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
  '<': '\\textless{}',
  '>': '\\textgreater{}',
};

const LATEX_ESCAPE_REGEX = /[\\&%$#_{}~^<>]/g;

/**
 * Safely escapes special LaTeX characters in user-supplied strings using a single-pass replacer.
 */
export function escapeLatex(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(LATEX_ESCAPE_REGEX, (match) => LATEX_ESCAPE_MAP[match] || match);
}

/**
 * Escapes text and converts multi-line bullet points or newlines into clean LaTeX items.
 */
export function escapeMultilineToItems(text: string | null | undefined): string[] {
  if (!text) return [];

  return text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[•\-*]\s*/, '')) // Remove leading bullet markers
    .map(escapeLatex);
}
