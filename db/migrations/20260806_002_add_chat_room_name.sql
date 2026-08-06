ALTER TABLE storychat_chat_rooms
ADD COLUMN IF NOT EXISTS room_name VARCHAR(100);

UPDATE storychat_chat_rooms
SET room_name = character_name
WHERE room_name IS NULL OR BTRIM(room_name) = '';

ALTER TABLE storychat_chat_rooms
ALTER COLUMN room_name SET DEFAULT '알 수 없는 캐릭터';

ALTER TABLE storychat_chat_rooms
ALTER COLUMN room_name SET NOT NULL;
