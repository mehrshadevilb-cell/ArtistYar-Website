-- Day 3 migration-history reconciliation marker (NO schema change).
-- Documents that production schema as of 2026-09-30 is the operational baseline.
-- Does not invent historical schema_migrations rows for pre-history objects.
-- See docs/migration-reconciliation-day3.md in the repository.

DO $$ BEGIN
  RAISE NOTICE 'ArtistYar Day 3 schema reconciliation baseline marker applied';
END $$;
