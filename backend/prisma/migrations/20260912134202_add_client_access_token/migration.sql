-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "client_access_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "invitations_client_access_token_key" ON "invitations"("client_access_token");
