export const DEFAULT_TOKENS = {
  colorBg: '#faf9f7',
  colorSurface: '#ffffff',
  colorPrimary: '#8a8578',
  colorSecondary: '#c9a15a',
  colorText: '#2b2926',
  colorTextMuted: '#6b6660',
  colorAccent: '#c9a15a',
  fontHeading: "'Playfair Display', serif",
  fontBody: "'Cormorant Garamond', serif",
  radius: '10px',
};

export function tokensToCssVars(tokens) {
  const merged = { ...DEFAULT_TOKENS, ...tokens };
  return {
    '--color-bg': merged.colorBg,
    '--color-surface': merged.colorSurface,
    '--color-primary': merged.colorPrimary,
    '--color-secondary': merged.colorSecondary,
    '--color-text': merged.colorText,
    '--color-text-muted': merged.colorTextMuted,
    '--color-accent': merged.colorAccent,
    '--font-heading': merged.fontHeading,
    '--font-body': merged.fontBody,
    '--radius': merged.radius,
  };
}
