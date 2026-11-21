import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../src/admin/admin.css';
import MediaUploader from '../../src/admin/components/MediaUploader';

// Rend MediaUploader (miniatures de l'administration) SANS backend ni base : aucune requête API n'est émise au rendu.
// ?type=gallery|cover  — jeu de médias fixe : 2 photos avec variante, 1 sans, 1 vidéo, 1 couverture portant (à tort) un thumbUrl.
const type = new URLSearchParams(location.search).get('type') || 'gallery';
const W = '/photos/web';
const media = [
  { id: 'g1', type: 'gallery', order: 0, mimeType: 'image/jpeg', url: `${W}/gallery-01.jpg`, thumbUrl: `${W}/thumbs/gallery-01.jpg` },
  { id: 'g2', type: 'gallery', order: 1, mimeType: 'image/jpeg', url: `${W}/gallery-02.jpg`, thumbUrl: `${W}/thumbs/gallery-02.jpg` },
  { id: 'g3', type: 'gallery', order: 2, mimeType: 'image/jpeg', url: `${W}/gallery-03.jpg`, thumbUrl: null },
  { id: 'g4', type: 'gallery', order: 3, mimeType: 'video/mp4', url: `${W}/clip.mp4`, thumbUrl: null },
  { id: 'c1', type: 'cover', order: 0, mimeType: 'image/jpeg', url: `${W}/cover.jpg`, thumbUrl: `${W}/thumbs/gallery-04.jpg` },
];
ReactDOM.createRoot(document.getElementById('root')).render(<MediaUploader invitationId="x" type={type} media={media} onChange={() => {}} />);
