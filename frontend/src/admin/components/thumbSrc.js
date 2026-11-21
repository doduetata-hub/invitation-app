// Miniature d'administration (90 px) : la variante légère de la galerie (Media.thumbUrl, 800 px) quand elle existe, sinon l'image
// principale. La couverture n'utilise jamais la variante.
export function thumbSrc(m, type) {
  return type === 'gallery' && m.type === 'gallery' && m.thumbUrl ? m.thumbUrl : m.url;
}
