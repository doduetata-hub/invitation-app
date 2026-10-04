-- Cadrage des avatars du livre d'or sur le visage : additif uniquement (colonnes nullables), les
-- photos existantes restent valides sans reprise de données (focus_source NULL = pas encore analysée).
ALTER TABLE "media" ADD COLUMN "focus_x" DOUBLE PRECISION,
ADD COLUMN "focus_y" DOUBLE PRECISION,
ADD COLUMN "focus_source" TEXT;
