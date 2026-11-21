#!/usr/bin/env node
/*
 * RATTRAPAGE des photos déjà enregistrées : complète `width`/`height` et la variante de galerie de 800 px (`thumbUrl`).
 *
 *   node scripts/backfill-media-variants.js                       -> SIMULATION (défaut) : liste, ne modifie RIEN
 *   node scripts/backfill-media-variants.js --invitation=<id>     -> limite à une invitation
 *   node scripts/backfill-media-variants.js --limit=20            -> limite le nombre de médias
 *   node scripts/backfill-media-variants.js --apply --confirm=JE-CONFIRME-LA-MODIFICATION   -> EXÉCUTION RÉELLE
 *
 * L'exécution réelle exige DEUX éléments explicites (--apply ET --confirm=...), et affiche d'abord la base visée.
 * Le script N'EFFACE JAMAIS rien : ni fichier, ni ligne. Il ajoute au plus (a) deux nombres et (b) un fichier de variante par photo.
 * Si la variante échoue, les dimensions sont tout de même enregistrées et l'image d'origine n'est jamais touchée.
 * Si l'écriture en base échoue, seul le fichier de variante que CE script vient d'écrire est retiré.
 *
 * Idempotent : un média déjà complet n'est pas sélectionné ; relancer le script ne produit aucune modification.
 */
const fs = require('fs/promises');
const path = require('path');

const CONFIRM_PHRASE = 'JE-CONFIRME-LA-MODIFICATION';
const VARIANT_WIDTH = 800;

function parseArgs(argv) {
  const opts = { apply: false, confirm: null, invitation: null, limit: null, help: false };
  for (const a of argv) {
    if (a === '--apply') opts.apply = true;
    else if (a.startsWith('--confirm=')) opts.confirm = a.slice('--confirm='.length);
    else if (a.startsWith('--invitation=')) opts.invitation = a.slice('--invitation='.length);
    else if (a.startsWith('--limit=')) opts.limit = parseInt(a.slice('--limit='.length), 10) || null;
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

// Médias à compléter : images de couverture/galerie sans dimensions, ou photos de galerie assez larges pour une variante et sans variante.
function needsWork(m) {
  if (!['cover', 'gallery'].includes(m.type)) return null;
  if (m.mimeType && !m.mimeType.startsWith('image/')) return null; // vidéos : ignorées
  const needDims = !(m.width > 0 && m.height > 0);
  const needVariant = m.type === 'gallery' && !m.thumbUrl && (needDims || m.width > VARIANT_WIDTH);
  return needDims || needVariant ? { needDims, needVariant } : null;
}

// Lecture de l'image d'origine : fichier local (/uploads/...) ou URL http(s) (R2). Lecture seule.
async function defaultReadOriginal(url, { uploadsDir }) {
  if (url.startsWith('/uploads/')) return fs.readFile(path.join(uploadsDir, url.replace('/uploads/', '')));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`lecture impossible (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

// Nom de la variante, calqué sur l'import : « <nom>.jpg » -> « <nom>-w800.jpg ».
function variantFilename(url) {
  const last = url.split('/').pop().split('?')[0];
  const base = last.replace(/\.[^.]+$/, '');
  return `${base}-w${VARIANT_WIDTH}.jpg`;
}

async function backfill({ prisma, storage, imageService, sharp, readOriginal, uploadsDir, opts = {}, log = console.log }) {
  const apply = Boolean(opts.apply);
  const where = { type: { in: ['cover', 'gallery'] } };
  if (opts.invitation) where.invitationId = opts.invitation;
  const all = await prisma.media.findMany({ where, orderBy: [{ invitationId: 'asc' }, { order: 'asc' }] });
  let todo = all.map((m) => ({ m, work: needsWork(m) })).filter((x) => x.work);
  if (opts.limit) todo = todo.slice(0, opts.limit);

  log(`${apply ? 'EXÉCUTION RÉELLE' : 'SIMULATION (aucune modification)'} — ${all.length} média(s) examiné(s), ${todo.length} à compléter.`);
  const report = { mode: apply ? 'apply' : 'dry-run', examined: all.length, selected: todo.length, updated: 0, variantsCreated: 0, failures: [], rows: [] };

  for (const { m, work } of todo) {
    const row = { id: m.id, invitationId: m.invitationId, type: m.type, url: m.url, needDims: work.needDims, needVariant: work.needVariant, status: 'prévu' };
    report.rows.push(row);
    const plan = [work.needDims ? 'mesurer width/height' : null, work.needVariant ? `créer ${variantFilename(m.url)} (800 px) et renseigner thumbUrl` : null].filter(Boolean).join(' + ');
    if (!apply) {
      log(`  [simulation] ${m.type.padEnd(7)} ${m.id}  ${m.url}\n               -> ${plan}`);
      continue;
    }

    let writtenVariantUrl = null;
    try {
      const original = await readOriginal(m.url, { uploadsDir });
      const meta = await sharp(original).metadata();
      const swap = (meta.orientation || 1) >= 5;
      const width = swap ? meta.height : meta.width;
      const height = swap ? meta.width : meta.height;
      if (!(width > 0 && height > 0)) throw new Error('dimensions illisibles');

      const data = {};
      if (work.needDims) { data.width = width; data.height = height; }

      if (work.needVariant) {
        try {
          const variant = await imageService.makeGalleryVariant(original);
          if (variant) {
            writtenVariantUrl = await storage.save(variant.buffer, variantFilename(m.url));
            data.thumbUrl = writtenVariantUrl;
          } else {
            row.note = 'image déjà étroite : pas de variante nécessaire';
          }
        } catch (err) {
          row.variantError = err.message; // les dimensions restent enregistrées ; l'original n'est jamais touché
          writtenVariantUrl = null;
        }
      }

      if (Object.keys(data).length === 0) { row.status = 'rien à écrire'; continue; }
      try {
        await prisma.media.update({ where: { id: m.id }, data });
      } catch (err) {
        if (writtenVariantUrl) await storage.remove(writtenVariantUrl); // uniquement le fichier écrit par ce script
        throw err;
      }
      row.status = 'mis à jour';
      row.applied = Object.keys(data);
      report.updated += 1;
      if (data.thumbUrl) report.variantsCreated += 1;
      log(`  [ok] ${m.type.padEnd(7)} ${m.id}  ${Object.keys(data).join(', ')}${row.variantError ? `  (variante en échec : ${row.variantError})` : ''}`);
    } catch (err) {
      row.status = 'échec';
      row.error = err.message;
      report.failures.push({ id: m.id, error: err.message });
      log(`  [échec] ${m.id}  ${m.url} : ${err.message} (rien n'a été supprimé)`);
    }
  }

  log(`Résumé : ${report.updated} média(s) mis à jour, ${report.variantsCreated} variante(s) créée(s), ${report.failures.length} échec(s).`);
  if (!apply && todo.length) log(`Aucune modification effectuée. Pour exécuter réellement : --apply --confirm=${CONFIRM_PHRASE} (après autorisation explicite).`);
  return report;
}

function describeDatabase() {
  try {
    const u = new URL(process.env.DATABASE_URL || '');
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return '(DATABASE_URL absente ou illisible)';
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Simulation par défaut. Exécution réelle : --apply --confirm=${CONFIRM_PHRASE}. Options : --invitation=<id> --limit=<n>. Voir l'en-tête du fichier.`);
    return;
  }
  if (opts.apply && opts.confirm !== CONFIRM_PHRASE) {
    console.error(`Refus : l'exécution réelle exige --apply ET --confirm=${CONFIRM_PHRASE}. Aucune modification effectuée.`);
    process.exit(2);
  }
  const env = require('../src/config/env');
  const prisma = require('../src/db/prismaClient');
  const storage = require('../src/services/storage/index.js');
  const imageService = require('../src/services/image.service');
  const sharp = require('sharp');
  console.log(`Base visée : ${describeDatabase()} | stockage : ${env.storageDriver}`);
  if (opts.apply) console.log('Exécution réelle autorisée par --confirm. Aucune suppression ne sera effectuée.');
  try {
    const report = await backfill({ prisma, storage, imageService, sharp, readOriginal: defaultReadOriginal, uploadsDir: env.uploadsDir, opts });
    process.exitCode = report.failures.length ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { backfill, needsWork, parseArgs, variantFilename, defaultReadOriginal, CONFIRM_PHRASE, VARIANT_WIDTH };

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
