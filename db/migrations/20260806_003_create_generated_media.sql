CREATE TABLE IF NOT EXISTS storychat_generated_media (
  generated_media_id BIGSERIAL PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES storychat_accounts(account_id) ON DELETE CASCADE,
  media_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  provider VARCHAR(30),
  work_id TEXT,
  room_key TEXT,
  character_id TEXT,
  message_id TEXT,
  title VARCHAR(200),
  client_created_at TIMESTAMPTZ NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  source VARCHAR(20) NOT NULL DEFAULT 'generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, media_id)
);

CREATE INDEX IF NOT EXISTS storychat_generated_media_account_created_idx
ON storychat_generated_media (account_id, client_created_at DESC);

CREATE INDEX IF NOT EXISTS storychat_generated_media_account_room_idx
ON storychat_generated_media (account_id, room_key, client_created_at DESC);
