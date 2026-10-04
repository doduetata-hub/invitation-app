// Cadrage d'un avatar rond sur le visage. Le serveur (ou l'admin, à la main) fournit le CENTRE du
// visage en pourcentage de l'image (photo.focusX / focusY, 0 à 100). `object-fit: cover` remplit le
// cercle avec le plus petit côté de la photo en entier : seule l'autre dimension est rognée, et
// `object-position` décide de la partie gardée. On en déduit donc la position qui amène le visage au
// centre du cercle, sans jamais dépasser les bords de l'image.
const clampPercent = (value) => Math.min(100, Math.max(0, value));

function axisPosition(centerPercent, size, other) {
  if (size <= other) return 50; // cet axe est déjà entièrement visible
  const centerPx = (centerPercent / 100) * size;
  return clampPercent(((centerPx - other / 2) / (size - other)) * 100);
}

// Cadrage par défaut sans visage connu : les visages sont statistiquement dans la moitié haute d'un
// portrait (12 % depuis le haut), un peu au-dessus du centre sinon (32 %).
function defaultPosition(photo) {
  const portrait = photo?.width && photo?.height && photo.width / photo.height < 0.85;
  return `50% ${portrait ? 12 : 32}%`;
}

export function hasFaceFocus(photo) {
  return Number.isFinite(photo?.focusX) && Number.isFinite(photo?.focusY);
}

export function avatarObjectPosition(photo) {
  if (!hasFaceFocus(photo) || !photo.width || !photo.height) return defaultPosition(photo);
  const x = photo.width > photo.height ? axisPosition(photo.focusX, photo.width, photo.height) : 50;
  const y = photo.height > photo.width ? axisPosition(photo.focusY, photo.height, photo.width) : 50;
  return `${x.toFixed(1)}% ${y.toFixed(1)}%`;
}
