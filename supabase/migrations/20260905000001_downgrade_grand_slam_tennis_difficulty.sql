-- Grand Slam Tennis Tournaments was seeded as 'very-high' in
-- 20260903000001_add_list_difficulty_tier.sql; drop it to 'high' (15 pts/item
-- instead of 20 -- see src/lib/difficulty.ts).
update public.lists set difficulty_tier = 'high'
  where slug = 'grand-slam-tennis';
