-- Re-create Comment table scoped to tasting items instead of events.
-- Existing comments (if any) are dropped — the schema change is not backwards-compatible.

DROP TABLE "Comment";

CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "tastingItemId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_tastingItemId_fkey"
  FOREIGN KEY ("tastingItemId") REFERENCES "TastingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
