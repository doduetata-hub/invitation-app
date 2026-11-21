import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../src/admin/admin.css';
import InvitationPage from '../../src/public/InvitationPage';
import { buildScenario } from './scenarios.js';

// ?key=<clé du template>&scenario=<nom>   (voir scenarios.js)
const params = new URLSearchParams(window.location.search);
const key = params.get('key') || 'generic';
const scenario = params.get('scenario') || 'full';

// Simule l'envoi du RSVP sans backend : résout après un court délai, mémorise la dernière soumission
// pour que les tests puissent la lire (window.__lastRsvp).
async function onRsvpSubmit(form, extra) {
  window.__lastRsvp = { form, extra };
  await new Promise((r) => setTimeout(r, 150));
}

// Option ?photos=1 : remplace les images abstraites par les photographies déposées dans e2e/fixtures/photos (voir son README).
//  - Convention : fixtures/photos/web/cover.jpg + gallery-01.jpg … gallery-NN.jpg (+ web/manifest.json avec les dimensions,
//    + web/thumbs/gallery-NN.jpg en 480 px). À défaut : tout fichier image de fixtures/photos/ (le nom « cover* » = couverture).
//  - &nodims=1 : dimensions omises (état actuel de l'application pour les photos de galerie) ; &nothumbs=1 : sans vignettes.
// Les dimensions viennent du manifeste : AUCUNE image n'est préchargée pour les mesurer (le chargement différé reste réel).
const WEB = import.meta.glob('../fixtures/photos/web/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' });
const THUMBS = import.meta.glob('../fixtures/photos/web/thumbs/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' });
const MANIFEST = import.meta.glob('../fixtures/photos/web/manifest.json', { eager: true, import: 'default' });
const LOOSE = import.meta.glob('../fixtures/photos/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', { eager: true, query: '?url', import: 'default' });

function measure(url) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => resolve({ w: null, h: null });
    im.src = url;
  });
}

const base = (p) => p.split('/').pop();

async function withRealPhotos(inv, scenario, { noDims, noThumbs }) {
  const useWeb = Object.keys(WEB).length > 0;
  const entries = Object.entries(useWeb ? WEB : LOOSE).sort(([a], [b]) => base(a).localeCompare(base(b)));
  if (entries.length === 0) return inv;
  const manifest = Object.values(MANIFEST)[0] || {};
  const thumbByName = Object.fromEntries(Object.entries(THUMBS).map(([p, u]) => [base(p), u]));
  const isCover = ([name]) => /^(cover|couverture)/i.test(base(name));
  const coverEntry = entries.find(isCover);
  const galleryEntries = entries.filter((e) => !isCover(e));
  const toMedia = async ([name, url], i, type) => {
    const file = base(name);
    let dims = manifest[file] ? { w: manifest[file].w, h: manifest[file].h } : null;
    if (!dims && !noDims) dims = await measure(url); // hors convention : mesure (précharge l'image)
    return {
      id: `${type}-${i}`, type, url, mimeType: 'image/jpeg', order: i,
      width: noDims || !dims ? null : dims.w, height: noDims || !dims ? null : dims.h,
      thumbUrl: noThumbs || type === 'cover' ? null : thumbByName[file] || null,
    };
  };
  const hadCover = inv.media.some((m) => m.type === 'cover');
  // Toutes les photographies de galerie par défaut (19 photos = 1 couverture + 18) ; scénarios « vide » et « une photo » respectés.
  const want = { 'gallery-empty': 0, 'gallery-one': 1 }[scenario] ?? galleryEntries.length;
  const media = [];
  if (hadCover && (coverEntry || entries[0])) media.push(await toMedia(coverEntry || entries[0], 0, 'cover'));
  for (let i = 0; i < want && i < galleryEntries.length; i++) media.push(await toMedia(galleryEntries[i], i, 'gallery'));
  return { ...inv, media };
}

async function start() {
  let invitation = buildScenario(key, scenario);
  if (params.get('photos') === '1') invitation = await withRealPhotos(invitation, scenario, { noDims: params.get('nodims') === '1', noThumbs: params.get('nothumbs') === '1' });
  ReactDOM.createRoot(document.getElementById('root')).render(
    <InvitationPage invitation={invitation} slug="e2e" onRsvpSubmit={onRsvpSubmit} />
  );
}
start();
