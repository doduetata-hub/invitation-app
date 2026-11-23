import makeTemplate from '../soireeKit/makeTemplate';

// SOIRÉE DE GALA — blanc et or champagne : une grande photo au bord déchiré, calendrier posé sur une photo du couple.
export default makeTemplate({
  key: 'soiree-gala',
  name: 'Soirée de Gala',
  theme: 'gala',
  hero: 'torn',
  calendar: 'overlay',
  tokens: {
    colorBg: '#ffffff', colorSurface: '#fbf8f2', colorPrimary: '#3d2f27', colorSecondary: '#9a7b3c', colorText: '#3d2f27', colorTextMuted: '#76675d', colorAccent: '#9a7b3c',
    fontHeading: "'SK Display', 'Bodoni 72', Didot, Georgia, serif", fontBody: "'SK Serif', Garamond, Georgia, serif", radius: '10px',
  },
});
