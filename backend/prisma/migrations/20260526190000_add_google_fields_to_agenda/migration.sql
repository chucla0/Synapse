-- AlterTable
ALTER TABLE "agendas" ADD COLUMN "googleCalendarId" TEXT,
ADD COLUMN "googleChannelId" TEXT,
ADD COLUMN "googleResourceId" TEXT,
ADD COLUMN "googleChannelExpiration" TIMESTAMP(3);
