ALTER TABLE storychat_member_profiles
ADD COLUMN IF NOT EXISTS nickname TEXT;

UPDATE storychat_member_profiles profile
SET nickname = account.display_name
FROM storychat_accounts account
WHERE account.account_id = profile.account_id
  AND (profile.nickname IS NULL OR BTRIM(profile.nickname) = '');

ALTER TABLE storychat_member_profiles
ALTER COLUMN nickname SET NOT NULL;
