-- ==========================================
-- Discord ホワイトリストテーブルの作成
-- (Discord IDのみで管理するシンプル版)
-- ==========================================

-- 1. ホワイトリストテーブルを作成
CREATE TABLE IF NOT EXISTS admin_whitelist (
    id BIGSERIAL PRIMARY KEY,
    discord_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by TEXT,
    notes TEXT
);

-- 2. RLSを有効化
ALTER TABLE admin_whitelist ENABLE ROW LEVEL SECURITY;

-- 3. ホワイトリストテーブルのRLSポリシー
-- 認証されたユーザーは読み取り可能（自分がホワイトリストに含まれているかチェックするため）
CREATE POLICY "Authenticated users can read whitelist"
ON admin_whitelist FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ホワイトリストに登録されたユーザーのみが追加・削除可能
CREATE POLICY "Whitelisted users can manage whitelist"
ON admin_whitelist FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM admin_whitelist
        WHERE discord_id = (auth.jwt()->>'user_metadata')::json->>'provider_id'
    )
);

-- 4. tournaments テーブルのRLSを有効化・更新
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Anyone can read tournaments" ON tournaments;
DROP POLICY IF EXISTS "Only authenticated users can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Only authenticated users can update tournaments" ON tournaments;
DROP POLICY IF EXISTS "Only authenticated users can delete tournaments" ON tournaments;
DROP POLICY IF EXISTS "Only whitelisted users can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Only whitelisted users can update tournaments" ON tournaments;
DROP POLICY IF EXISTS "Only whitelisted users can delete tournaments" ON tournaments;

-- 新しいポリシーを作成
-- 読み取りは誰でも可能
CREATE POLICY "Anyone can read tournaments"
ON tournaments FOR SELECT
USING (true);

-- 書き込みはホワイトリストに登録されたユーザーのみ（Discord IDのみでチェック）
CREATE POLICY "Only whitelisted users can insert tournaments"
ON tournaments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_whitelist
        WHERE discord_id = (auth.jwt()->>'user_metadata')::json->>'provider_id'
    )
);

CREATE POLICY "Only whitelisted users can update tournaments"
ON tournaments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM admin_whitelist
        WHERE discord_id = (auth.jwt()->>'user_metadata')::json->>'provider_id'
    )
);

CREATE POLICY "Only whitelisted users can delete tournaments"
ON tournaments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM admin_whitelist
        WHERE discord_id = (auth.jwt()->>'user_metadata')::json->>'provider_id'
    )
);

-- 5. news テーブルのRLSを有効化・更新
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Anyone can read news" ON news;
DROP POLICY IF EXISTS "Only authenticated users can insert news" ON news;
DROP POLICY IF EXISTS "Only authenticated users can update news" ON news;
DROP POLICY IF EXISTS "Only authenticated users can delete news" ON news;
DROP POLICY IF EXISTS "Only whitelisted users can insert news" ON news;
DROP POLICY IF EXISTS "Only whitelisted users can update news" ON news;
DROP POLICY IF EXISTS "Only whitelisted users can delete news" ON news;

-- 新しいポリシーを作成
CREATE POLICY "Anyone can read news"
ON news FOR SELECT
USING (true);

CREATE POLICY "Only whitelisted users can insert news"
ON news FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_whitelist
        WHERE discord_id = (auth.jwt()->>'user_metadata')::json->>'provider_id'
    )
);

CREATE POLICY "Only whitelisted users can update news"
ON news FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM admin_whitelist
        WHERE discord_id = (auth.jwt()->>'user_metadata')::json->>'provider_id'
    )
);

CREATE POLICY "Only whitelisted users can delete news"
ON news FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM admin_whitelist
        WHERE discord_id = (auth.jwt()->>'user_metadata')::json->>'provider_id'
    )
);

-- 6. 初期管理者の登録（重要！）
-- 【必須】以下のコメントを外して、あなたのDiscord情報に置き換えてください
-- Discord IDの取得方法:
--   1. Discord設定 > 詳細設定 > 開発者モードを有効化
--   2. 自分のアイコンを右クリック > IDをコピー

-- INSERT INTO admin_whitelist (discord_id, name, notes) VALUES
-- ('あなたのDiscord ID', 'あなたの名前', '初期管理者 - 最初の登録');

-- 例:
-- INSERT INTO admin_whitelist (discord_id, name, notes) VALUES
-- ('123456789012345678', '山田太郎', '初期管理者');

COMMENT ON TABLE admin_whitelist IS 'Discord認証を使用した管理者のホワイトリスト（Discord IDのみで管理）';
COMMENT ON COLUMN admin_whitelist.discord_id IS 'DiscordのユーザーID（プロバイダーID）- 必須';
COMMENT ON COLUMN admin_whitelist.name IS '管理者の名前 - 必須';
COMMENT ON COLUMN admin_whitelist.role IS '役割（admin, operator等）';
COMMENT ON COLUMN admin_whitelist.added_by IS 'この管理者を追加したユーザーの名前またはメール';
