-- LINE push notification: store agent's LINE User ID (U...) for bot push messages
-- line_id = display name (e.g. "@mint"); line_user_id = push target (e.g. "U1234abc...")
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS line_user_id text;
