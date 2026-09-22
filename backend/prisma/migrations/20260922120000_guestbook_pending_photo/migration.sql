-- Photo modifiable même après approbation du message : additif uniquement (colonnes nullables /
-- valeur par défaut), les entrées existantes restent valides sans aucune reprise de données.
ALTER TABLE "guestbook_entries" ADD COLUMN "pending_photo_id" TEXT,
ADD COLUMN "pending_photo_removed" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "guestbook_entries_pending_photo_id_key" ON "guestbook_entries"("pending_photo_id");

ALTER TABLE "guestbook_entries" ADD CONSTRAINT "guestbook_entries_pending_photo_id_fkey" FOREIGN KEY ("pending_photo_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
