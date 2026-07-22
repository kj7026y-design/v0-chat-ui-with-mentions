-- chat_room_id is the canonical relation to both the owning account and the
-- room key. Remove the duplicated legacy identifiers and their write indexes.
-- Abort instead of losing ownership information if an unmigrated row exists.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM storychat_messages
    WHERE chat_room_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot remove legacy room identifiers: chat_room_id contains NULL rows';
  END IF;
END
$$;

ALTER TABLE storychat_messages
  ALTER COLUMN chat_room_id SET NOT NULL;

ALTER TABLE storychat_messages
  DROP CONSTRAINT IF EXISTS storychat_messages_admin_id_room_id_message_id_key;

DROP INDEX IF EXISTS storychat_messages_room_cursor_idx;

ALTER TABLE storychat_messages
  DROP COLUMN IF EXISTS admin_id,
  DROP COLUMN IF EXISTS room_id;

COMMIT;
