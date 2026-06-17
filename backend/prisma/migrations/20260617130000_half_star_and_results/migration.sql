-- Ratings now support half-star granularity on a 0.5–10 scale.
ALTER TABLE "Rating" ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION;

-- Admin can reveal the results/ranking overview to all participants.
ALTER TABLE "Event" ADD COLUMN "resultsRevealed" BOOLEAN NOT NULL DEFAULT false;
