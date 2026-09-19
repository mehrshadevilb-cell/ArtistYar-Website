create index if not exists practice_records_telegram_id_idx
on public.practice_records ((metadata->>'telegramId'));

create index if not exists practice_records_played_at_game_idx
on public.practice_records (played_at desc, game_id);
