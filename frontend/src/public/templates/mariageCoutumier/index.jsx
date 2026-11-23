import makeTemplate from '../soireeKit/makeTemplate';

// MARIAGE COUTUMIER — parchemin crème, brun chaud et or : grande photo qui s'efface dans le papier, « Save the Date » en capitales,
// noms en écriture dorée, calendrier sur bandeau brun, roses aux angles.
export default makeTemplate({
  key: 'mariage-coutumier',
  name: 'Mariage Coutumier',
  theme: 'coutumier',
  hero: 'fade',
  calendar: 'brown',
  tokens: {
    colorBg: '#f3eee3', colorSurface: '#fbf8f1', colorPrimary: '#5b4033', colorSecondary: '#a8802f', colorText: '#4a352b', colorTextMuted: '#76645a', colorAccent: '#8b6a58',
    fontHeading: "'SK Display', 'Bodoni 72', Didot, Georgia, serif", fontBody: "'SK Serif', Garamond, Georgia, serif", radius: '10px',
  },
});
