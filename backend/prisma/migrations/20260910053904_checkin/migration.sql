-- AlterTable
ALTER TABLE "guests" ADD COLUMN     "checked_in_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "rsvps" ADD COLUMN     "checked_in_at" TIMESTAMP(3);
