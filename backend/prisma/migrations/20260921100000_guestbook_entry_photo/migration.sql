-- Photo facultative d'une entrée du livre d'or : additif uniquement (colonnes nullables), les
-- anciennes entrées et les médias existants restent valides sans aucune reprise de données.
ALTER TABLE "media" ADD COLUMN "thumb_url" TEXT,
ADD COLUMN "width" INTEGER,
ADD COLUMN "height" INTEGER;

ALTER TABLE "guestbook_entries" ADD COLUMN "photo_id" TEXT;

CREATE UNIQUE INDEX "guestbook_entries_photo_id_key" ON "guestbook_entries"("photo_id");

ALTER TABLE "guestbook_entries" ADD CONSTRAINT "guestbook_entries_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
