-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('AVAILABLE', 'AWAY', 'BUSY');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "links" JSONB,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "workingHours" JSONB;
