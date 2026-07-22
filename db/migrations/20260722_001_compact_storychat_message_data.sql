-- Canonical message fields already live in dedicated columns. Keep only
-- optional generation/UI metadata in message_data to avoid storing the full
-- (potentially large) message body twice.
--
-- This migration is idempotent and must be deployed after the application
-- version that reconstructs messages from the dedicated columns.
BEGIN;

UPDATE storychat_messages
SET message_data = message_data - 'id' - 'type' - 'content' - 'timestamp'
WHERE message_data ?| ARRAY['id', 'type', 'content', 'timestamp'];

COMMIT;
