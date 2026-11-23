import makeTemplate from '../soireeKit/makeTemplate';

// SOIRÉE IVOIRE — soirée dansante : papier ivoire, encre brune, deux photos séparées par une déchirure, calendrier sur bandeau sombre.
export default makeTemplate({
  key: 'soiree-ivoire',
  name: 'Soirée Ivoire',
  theme: 'ivoire',
  hero: 'split',
  calendar: 'dark',
  tokens: {
    colorBg: '#fbfaf7', colorSurface: '#ffffff', colorPrimary: '#4b2c24', colorSecondary: '#7a4a3a', colorText: '#3d2a24', colorTextMuted: '#6e5d55', colorAccent: '#b3262e',
    fontHeading: "'SK Display', 'Bodoni 72', Didot, Georgia, serif", fontBody: "'SK Serif', Garamond, Georgia, serif", radius: '10px',
  },
});
