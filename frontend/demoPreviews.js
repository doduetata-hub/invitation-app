// Aperçu des liens de démonstration dans WhatsApp, Messenger… Ces applications lisent le HTML sans exécuter l'application :
// à la compilation, chaque modèle reçoit donc sa page dist/demo/<clé>/index.html, copie de index.html avec son titre et son image.
// Nouveau modèle : l'ajouter ci-dessous et déposer son image (1200 × 630, JPEG léger) dans public/demo-previews/<clé>.jpg.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const TEMPLATES = {
  'mariage-elegant': 'Mariage Élégant',
  'mariage-moderne': 'Mariage Moderne',
  'mariage-romantique': 'Mariage Romantique',
  'mariage-traditionnel': 'Mariage Traditionnel',
  anniversaire: 'Anniversaire',
  bapteme: 'Baptême',
  fiancailles: 'Fiançailles',
  professionnel: 'Événement professionnel',
  'luxury-wedding-gold': 'Luxury Wedding Gold',
  'soiree-ivoire': 'Soirée Ivoire',
  'mariage-coutumier': 'Mariage Coutumier',
  'soiree-gala': 'Soirée Gala',
  'rosace-noire': 'Rosace Noire',
  'la-porte': 'La Porte',
  'la-serre': 'La Serre',
  embarquement: "L'Embarquement",
  'les-lanternes': 'Les Lanternes',
  'lever-de-rideau': 'Le Lever de rideau',
};

const DESCRIPTION = "Modèle de démonstration : ouvrez le lien pour découvrir l'invitation comme vos invités la verront.";

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Les aperçus exigent des adresses complètes. Sur Vercel : PUBLIC_BASE_URL (déjà utilisée par le serveur), sinon le domaine de
// production fourni par la plateforme. En local, aucune des deux : les adresses restent relatives.
function siteUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.PUBLIC_BASE_URL || (host ? `https://${host}` : '')).replace(/\/+$/, '');
}

function previewTags(key, name, base) {
  const title = escapeHtml(`Invitation « ${name} » — Josué & Sephora`);
  const description = escapeHtml(DESCRIPTION);
  const image = `${base}/demo-previews/${key}.jpg`;
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${base}/demo/${key}" />`,
    `<meta property="og:image" content="${image}" />`,
    '<meta property="og:image:type" content="image/jpeg" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta name="twitter:card" content="summary_large_image" />',
  ].join('\n    ');
}

export default function demoPreviews() {
  let outDir;
  return {
    name: 'demo-previews',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const indexFile = path.join(outDir, 'index.html');
      if (!existsSync(indexFile)) return; // compilation interrompue : l'erreur d'origine suffit
      const html = readFileSync(indexFile, 'utf8');
      const titleTag = /<title>[\s\S]*?<\/title>/;
      if (!titleTag.test(html)) throw new Error('demo-previews : balise <title> introuvable dans index.html');
      const base = siteUrl();
      Object.entries(TEMPLATES).forEach(([key, name]) => {
        if (!existsSync(path.join(outDir, 'demo-previews', `${key}.jpg`))) throw new Error(`demo-previews : image manquante pour ${key}`);
        const dir = path.join(outDir, 'demo', key);
        mkdirSync(dir, { recursive: true });
        writeFileSync(path.join(dir, 'index.html'), html.replace(titleTag, () => previewTags(key, name, base)));
      });
    },
  };
}
