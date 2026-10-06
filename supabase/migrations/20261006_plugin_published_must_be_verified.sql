-- Enforce public publication invariants at the database layer.
-- Applied after quarantining invalid historical rows (generic title / failed verification).
-- status='published' requires verified identity + no review flag + non-empty final caption.

alter table public.telegram_plugin_posts
  drop constraint if exists telegram_plugin_posts_published_must_be_verified;

alter table public.telegram_plugin_posts
  add constraint telegram_plugin_posts_published_must_be_verified
  check (
    status <> 'published'
    or (
      verification_status = 'verified'
      and review_required = false
      and final_caption is not null
      and length(trim(final_caption)) > 0
    )
  );
