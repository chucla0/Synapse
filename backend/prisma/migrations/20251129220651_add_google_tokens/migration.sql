/*
  Warnings:

  - A unique constraint covering the columns `[googleEventId]` on the table `events` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "agendas" ADD COLUMN     "googleCalendarId" TEXT;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "googleEventId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "googleAccessToken" TEXT,
ADD COLUMN     "googleRefreshToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "events_googleEventId_key" ON "events"("googleEventId");
