-- The 6 Disney resort destinations operating worldwide (as distinct from
-- the individual theme parks within each -- e.g. Walt Disney World alone
-- has 4 -- this list is one row per resort, not per park). metadata holds
-- the location, same shape as new-7-wonders.
insert into public.lists (slug, name, description, category, list_group, difficulty_tier) values
  (
    'disney-parks',
    'Disney Parks',
    'The 6 Disney resort destinations around the world.',
    'Theme Parks',
    'places',
    'medium'
  );

with target_list as (
  select id from public.lists where slug = 'disney-parks'
)
insert into public.list_items (list_id, name, code, sort_order, metadata)
select target_list.id, v.name, v.code, v.sort_order, v.metadata
from target_list, (values
  ('Disneyland Paris', 'DLP', 1, '{"location":"Marne-la-Vallée, France"}'::jsonb),
  ('Disneyland Resort', 'DLR', 2, '{"location":"Anaheim, California"}'::jsonb),
  ('Hong Kong Disneyland', 'HKD', 3, '{"location":"Lantau Island, Hong Kong"}'::jsonb),
  ('Shanghai Disney Resort', 'SDR', 4, '{"location":"Pudong, Shanghai"}'::jsonb),
  ('Tokyo Disney Resort', 'TDR', 5, '{"location":"Urayasu, Chiba, Japan"}'::jsonb),
  ('Walt Disney World Resort', 'WDW', 6, '{"location":"Lake Buena Vista, Florida"}'::jsonb)
) as v(name, code, sort_order, metadata);
