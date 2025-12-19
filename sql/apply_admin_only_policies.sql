-- ==========================================
-- Row Level Security (RLS) ポリシーの厳格化
-- 運営ロール（admin）を持つユーザーのみが書き込み可能
-- ==========================================

-- ==========================================
-- usersテーブルのポリシー更新
-- ==========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
DROP POLICY IF EXISTS "Authenticated users can insert" ON users;
DROP POLICY IF EXISTS "Authenticated users can update" ON users;
DROP POLICY IF EXISTS "Authenticated users can delete" ON users;

-- 新しい厳格なポリシーを作成

-- 1. 閲覧: すべての認証済みユーザーが閲覧可能
CREATE POLICY "Authenticated users can view all users"
    ON users
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. 挿入: 自分のレコードのみ挿入可能（初回登録用）
CREATE POLICY "Users can insert own data"
    ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 3. 更新: adminまたは自分のレコードのみ更新可能
CREATE POLICY "Admin or self can update users"
    ON users
    FOR UPDATE
    TO authenticated
    USING (
        -- 自分のレコードまたはadminロールを持つ場合
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. 削除: adminのみ削除可能
CREATE POLICY "Admins can delete users"
    ON users
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ==========================================
-- tournamentsテーブルのポリシー
-- ==========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Anyone can view tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can update tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can delete tournaments" ON tournaments;

-- RLSを有効化（まだの場合）
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- 1. 閲覧: 誰でも閲覧可能（公開情報）
CREATE POLICY "Anyone can view tournaments"
    ON tournaments
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 2. 挿入: adminのみ
CREATE POLICY "Admins can insert tournaments"
    ON tournaments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. 更新: adminのみ
CREATE POLICY "Admins can update tournaments"
    ON tournaments
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. 削除: adminのみ
CREATE POLICY "Admins can delete tournaments"
    ON tournaments
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ==========================================
-- newsテーブルのポリシー
-- ==========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Anyone can view news" ON news;
DROP POLICY IF EXISTS "Authenticated users can insert news" ON news;
DROP POLICY IF EXISTS "Authenticated users can update news" ON news;
DROP POLICY IF EXISTS "Authenticated users can delete news" ON news;

-- RLSを有効化（まだの場合）
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- 1. 閲覧: 誰でも閲覧可能（公開情報）
CREATE POLICY "Anyone can view news"
    ON news
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 2. 挿入: adminのみ
CREATE POLICY "Admins can insert news"
    ON news
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. 更新: adminのみ
CREATE POLICY "Admins can update news"
    ON news
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. 削除: adminのみ
CREATE POLICY "Admins can delete news"
    ON news
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ==========================================
-- 確認用クエリ
-- ==========================================

-- すべてのポリシーを確認
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('users', 'tournaments', 'news')
ORDER BY tablename, cmd;

-- RLSが有効か確認
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'tournaments', 'news');
