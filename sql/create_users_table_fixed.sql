-- ==========================================
-- ユーザー管理テーブル
-- ==========================================

-- 既存のポリシーとテーブルを削除（再作成用）
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update user roles" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP TABLE IF EXISTS users;

-- usersテーブルの作成
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT,
    username TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ==========================================
-- Row Level Security (RLS) ポリシー
-- ==========================================

-- RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全員閲覧可能（テスト用）
CREATE POLICY "Authenticated users can view all users"
    ON users
    FOR SELECT
    TO authenticated
    USING (true);

-- 認証済みユーザーは全員挿入可能（テスト用）
CREATE POLICY "Authenticated users can insert"
    ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 認証済みユーザーは全員更新可能（テスト用）
CREATE POLICY "Authenticated users can update"
    ON users
    FOR UPDATE
    TO authenticated
    USING (true);

-- 認証済みユーザーは全員削除可能（テスト用）
CREATE POLICY "Authenticated users can delete"
    ON users
    FOR DELETE
    TO authenticated
    USING (true);

-- ==========================================
-- トリガー: updated_atの自動更新
-- ==========================================

-- updated_atを自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- usersテーブルにトリガーを設定
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- コメント
-- ==========================================

COMMENT ON TABLE users IS 'アプリケーションのユーザー情報を管理するテーブル';
COMMENT ON COLUMN users.id IS 'ユーザーの一意識別子（UUID） - Supabase AuthのユーザーIDと同じ';
COMMENT ON COLUMN users.email IS 'ユーザーのメールアドレス';
COMMENT ON COLUMN users.username IS 'ユーザー名（Discord認証時に自動取得）';
COMMENT ON COLUMN users.avatar_url IS 'ユーザーのアバター画像URL';
COMMENT ON COLUMN users.role IS 'ユーザーのロール（pending: 未承認、admin: 運営）';
COMMENT ON COLUMN users.created_at IS 'アカウント作成日時';
COMMENT ON COLUMN users.updated_at IS '最終更新日時';
