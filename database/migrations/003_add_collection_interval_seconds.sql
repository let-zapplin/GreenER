BEGIN;

ALTER TABLE metrics
  ADD COLUMN collection_interval_seconds DOUBLE PRECISION;

ALTER TABLE metrics
  ADD CONSTRAINT chk_metrics_collection_interval_seconds
  CHECK (
    collection_interval_seconds IS NULL
    OR (
      collection_interval_seconds > 0
      AND collection_interval_seconds < 'Infinity'::DOUBLE PRECISION
    )
  );

COMMIT;
