-- CreateEnum
CREATE TYPE "GuestbookSource" AS ENUM ('DIGITAL', 'QR');

-- CreateEnum
CREATE TYPE "GuestbookStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "guestbook_entries" (
    "id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "rsvp_id" TEXT,
    "qr_token_id" TEXT,
    "source" "GuestbookSource" NOT NULL,
    "guestName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "table_number" TEXT,
    "status" "GuestbookStatus" NOT NULL DEFAULT 'PENDING',
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guestbook_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guestbook_qr_tokens" (
    "id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "table_number" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guestbook_qr_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guestbook_entries_rsvp_id_key" ON "guestbook_entries"("rsvp_id");

-- CreateIndex
CREATE UNIQUE INDEX "guestbook_qr_tokens_token_key" ON "guestbook_qr_tokens"("token");

-- AddForeignKey
ALTER TABLE "guestbook_entries" ADD CONSTRAINT "guestbook_entries_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guestbook_entries" ADD CONSTRAINT "guestbook_entries_rsvp_id_fkey" FOREIGN KEY ("rsvp_id") REFERENCES "rsvps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guestbook_entries" ADD CONSTRAINT "guestbook_entries_qr_token_id_fkey" FOREIGN KEY ("qr_token_id") REFERENCES "guestbook_qr_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guestbook_qr_tokens" ADD CONSTRAINT "guestbook_qr_tokens_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: rapatrie tout message RSVP deja existant dans le livre d'or numerique, en
-- PENDING pour re-validation par l'admin (voir point 9 de la demande) ; jamais de doublon
-- possible ensuite grace a la contrainte unique sur guestbook_entries.rsvp_id.
INSERT INTO "guestbook_entries" (id, invitation_id, rsvp_id, source, "guestName", message, status, created_at, updated_at)
SELECT gen_random_uuid(), r.invitation_id, r.id, 'DIGITAL', r.name, trim(r.message), 'PENDING', r.responded_at, r.responded_at
FROM "rsvps" r
WHERE r.message IS NOT NULL AND trim(r.message) <> '';
