/**
 * The one palette of the site (TEISU system). Every page uses it; components read it as CSS
 * variables `--color-*` (set by PageShell) and the brand tokens in `src/styles/tokens.css`.
 * WebGL scenes read `--color-base`, so the HTML and the canvas never disagree.
 */
export const palette = {
  name: 'Watercolor Paper',
  base: '#F3EDE2',
  surface: '#EAE2D3',
  text: '#1D2733',
  muted: '#615F58',
  line: '#D6CDBC',
  accent: '#083366',
  secondary: '#EF3025',
} as const;
