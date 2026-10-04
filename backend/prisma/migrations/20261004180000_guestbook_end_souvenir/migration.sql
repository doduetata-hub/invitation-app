-- Fin du livre d'or et lien « Souvenir » des mariés : additif uniquement (colonnes nullables), les
-- invitations existantes restent valides sans reprise de données (livre d'or ouvert, pas de lien).
ALTER TABLE "invitations" ADD COLUMN "guestbook_closed_at" TIMESTAMP(3),
ADD COLUMN "souvenir_token" TEXT;

CREATE UNIQUE INDEX "invitations_souvenir_token_key" ON "invitations"("souvenir_token");
