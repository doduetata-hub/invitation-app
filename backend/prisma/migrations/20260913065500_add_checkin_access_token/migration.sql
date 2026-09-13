-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "checkin_access_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "invitations_checkin_access_token_key" ON "invitations"("checkin_access_token");
