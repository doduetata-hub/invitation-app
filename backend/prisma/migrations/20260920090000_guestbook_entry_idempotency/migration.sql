-- AlterTable
ALTER TABLE "guestbook_entries" ADD COLUMN     "submission_key" TEXT;
ALTER TABLE "guestbook_entries" ADD COLUMN     "edit_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "guestbook_entries_submission_key_key" ON "guestbook_entries"("submission_key");

-- CreateIndex
CREATE UNIQUE INDEX "guestbook_entries_edit_token_key" ON "guestbook_entries"("edit_token");
