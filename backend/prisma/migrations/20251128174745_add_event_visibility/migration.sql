-- AlterTable
ALTER TABLE "events" ADD COLUMN     "visibleToStudents" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_SharedEvents" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SharedEvents_AB_unique" ON "_SharedEvents"("A", "B");

-- CreateIndex
CREATE INDEX "_SharedEvents_B_index" ON "_SharedEvents"("B");

-- AddForeignKey
ALTER TABLE "_SharedEvents" ADD CONSTRAINT "_SharedEvents_A_fkey" FOREIGN KEY ("A") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SharedEvents" ADD CONSTRAINT "_SharedEvents_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
