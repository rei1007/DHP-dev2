-- ==========================================
-- 🔒 セキュリティ修正: ロール変更権限の厳格化
-- ==========================================
-- 
-- 【重要】このSQLは緊急のセキュリティパッチです
-- 現在の実装では、ユーザーが自分のロールを'admin'に変更できてしまいます
-- このSQLを実行して、脆弱性を修正してください
--
-- 実行前に必ずバックアップを取ってください
-- ==========================================

-- ==========================================
-- ステップ1: 不正なadminロールのチェック
-- ==========================================

-- 不正なadminがいないか確認
SELECT 
    id, 
    email, 
    username, 
    role, 
    created_at,
    updated_at
FROM users 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- ↑ このクエリの結果を確認してください
-- 見覚えのないadminがいる場合は、以下で削除またはpendingに変更:
-- UPDATE users SET role = 'pending' WHERE id = '不正なユーザーのID';

-- ==========================================
-- ステップ2: 既存のポリシーを削除
-- ==========================================

-- usersテーブルの既存のUPDATEポリシーを削除
DROP POLICY IF EXISTS "Admin or self can update users" ON users;
DROP POLICY IF EXISTS "Authenticated users can update" ON users;

-- ==========================================
-- ステップ3: 新しい安全なポリシーを作成
-- ==========================================

-- 3-1. adminのみがユーザー情報を更新可能
CREATE POLICY "Admins can update all users"
    ON users
    FOR UPDATE
    TO authenticated
    USING (
        -- 更新を実行しているユーザーがadminの場合のみ許可
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        -- 更新を実行しているユーザーがadminの場合のみ許可
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 注意: このポリシーにより、一般ユーザーは自分の情報も更新できなくなります
-- もし、ユーザーが自分のプロフィール（username, avatar_url等）を更新できるようにする場合は、
-- 以下のポリシーも追加してください（ただし、roleフィールドは除外）

-- ==========================================
-- オプション: ユーザーが自分のプロフィールを更新可能にする
-- ==========================================

-- ユーザーが自分のusername, avatar_urlのみ更新可能
-- ただし、roleとemailは変更不可
CREATE POLICY "Users can update own profile"
    ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        -- roleとemailが変更されていないことを確認
        role = (SELECT role FROM users WHERE id = auth.uid()) AND
        email = (SELECT email FROM users WHERE id = auth.uid())
    );

-- ==========================================
-- ステップ4: 監査ログの実装（推奨）
-- ==========================================

-- 監査ログテーブルの作成
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id UUID,
    action TEXT NOT NULL,
    target_user_id UUID,
    old_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- adminのみが監査ログを閲覧可能
CREATE POLICY "Admins can view audit logs"
    ON audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ログ挿入は誰でも可能（アプリケーションから）
CREATE POLICY "Anyone can insert audit logs"
    ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- トリガー関数の作成
CREATE OR REPLACE FUNCTION log_user_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- roleが変更された場合のみログを記録
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO audit_logs (
            actor_user_id, 
            action, 
            target_user_id, 
            old_value, 
            new_value
        )
        VALUES (
            -- 現在のユーザーID（JWTから取得）
            (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
            'role_change',
            NEW.id,
            OLD.role,
            NEW.role
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーの設定
DROP TRIGGER IF EXISTS audit_user_role_change ON users;
CREATE TRIGGER audit_user_role_change
    BEFORE UPDATE ON users
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION log_user_role_change();

-- ==========================================
-- ステップ5: 確認
-- ==========================================

-- ポリシーの確認
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd;

-- テスト: 自分のロールを変更してみる（失敗するはず）
-- UPDATE users SET role = 'admin' WHERE id = auth.uid();
-- → エラー: new row violates row-level security policy

-- ==========================================
-- ステップ6: 追加のセキュリティ対策（オプション）
-- ==========================================

-- roleフィールドにデフォルト値を設定（念のため）
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'pending';

-- roleフィールドがNULLにならないようにする
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- ==========================================
-- 完了
-- ==========================================

-- セキュリティパッチの適用が完了しました
-- 
-- 確認事項:
-- 1. ✅ adminユーザーが正しく設定されているか
-- 2. ✅ 不正なadminがいないか
-- 3. ✅ ポリシーが正しく適用されているか
-- 4. ✅ 監査ログが記録されるか
--
-- テスト:
-- - 一般ユーザーで自分のロールを変更しようとする → 失敗するはず
-- - adminユーザーで他のユーザーのロールを変更する → 成功するはず
