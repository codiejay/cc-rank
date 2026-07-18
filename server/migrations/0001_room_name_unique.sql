-- 0001_room_name_unique
--
-- Enforce globally-unique, case-insensitive room names.
--
-- WARNING: this CREATE UNIQUE INDEX will FAIL if the rooms table already
-- contains two or more rows whose names collide case-insensitively
-- (e.g. "Crew" and "crew"). De-duplicate first — rename or delete the
-- offending rooms — then re-run. Find collisions with:
--
--   SELECT lower(name) AS n, COUNT(*) c FROM rooms GROUP BY n HAVING c > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_name ON rooms(lower(name));
