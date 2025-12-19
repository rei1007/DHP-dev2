-- ==========================================
-- ユーザー管理テーブル
-- ==========================================

-- usersテーブルの作成
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT,
    username TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==========================================
-- Row Level Security (RLS) ポリシー
-- ==========================================

-- RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- すべての認証済みユーザーが自分のレコードを読み取り可能
CREATE POLICY "Users can view own data"
    ON users
    FOR SELECT
    USING (auth.uid() = id);

-- 運営ロールを持つユーザーはすべてのユーザーを閲覧可能
CREATE POLICY "Admins can view all users"
    ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 運営ロールを持つユーザーは他のユーザーのロールを更新可能
CREATE POLICY "Admins can update user roles"
    ON users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- すべての認証済みユーザーが自分のレコードを挿入可能（初回ログイン時用）
CREATE POLICY "Users can insert own data"
    ON users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

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
COMMENT ON COLUMN users.id IS 'ユーザーの一意識別子（UUID）';
COMMENT ON COLUMN users.email IS 'ユーザーのメールアドレス';
COMMENT ON COLUMN users.username IS 'ユーザー名（Discord認証時に取得）';
COMMENT ON COLUMN users.avatar_url IS 'ユーザーのアバター画像URL';
COMMENT ON COLUMN users.role IS 'ユーザーのロール（user: 一般ユーザー、admin: 運営）';
COMMENT ON COLUMN users.created_at IS 'アカウント作成日時';
COMMENT ON COLUMN users.updated_at IS '最終更新日時';
