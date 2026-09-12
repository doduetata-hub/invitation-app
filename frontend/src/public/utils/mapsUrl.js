export function buildMapsQuery({ latitude, longitude, venueName, address }) {
  return latitude && longitude
    ? `${latitude},${longitude}`
    : [venueName, address].filter(Boolean).join(', ');
}

export function buildMapsUrl(invitation) {
  const query = buildMapsQuery(invitation);
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildMapsEmbedUrl(invitation) {
  const query = buildMapsQuery(invitation);
  if (!query) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
}
