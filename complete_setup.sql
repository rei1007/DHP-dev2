-- ==========================================
-- 統合セットアップスクリプト
-- 実況解説者管理機能の完全セットアップ
-- ==========================================

-- ========================================
-- Step 1: usersテーブルをadminsにリネーム
-- ========================================
DO $$ 
BEGIN
    -- テーブルが存在するかチェック
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE users RENAME TO admins;
        RAISE NOTICE '✅ usersテーブルをadminsにリネームしました';
    ELSE
        RAISE NOTICE 'ℹ️ usersテーブルは既にリネーム済みまたは存在しません';
    END IF;
END $$;

-- ========================================
-- Step 2: castersテーブルを作成
-- ========================================

-- 既存のテーブルがあれば削除（開発環境のみ）
DROP TABLE IF EXISTS casters CASCADE;

-- castersテーブルを作成
CREATE TABLE casters (
    -- 基本フィールド
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- プロフィール情報
    name TEXT NOT NULL,
    
    -- アイコン設定
    icon_type TEXT DEFAULT 'discord' CHECK (icon_type IN ('discord', 'url', 'other')),
    icon_url TEXT,
    discord_avatar_url TEXT,
    
    -- SNSアカウント情報（NULLを許可）
    x_account_id TEXT,
    x_url TEXT,
    youtube_account_id TEXT,
    youtube_url TEXT,
    
    -- XP情報
    xp_area INTEGER,
    xp_yagura INTEGER,
    xp_hoko INTEGER,
    xp_asari INTEGER,
    
    -- モチブキ（配列）
    main_weapons TEXT[],
    
    -- 大会実績（配列）
    tournament_achievements TEXT[],
    
    -- 実況解説実績（配列）
    casting_history TEXT[],
    
    -- 運営への伝達事項
    notes_to_staff TEXT,
    
    -- 運営専用フィールド
    staff_notes TEXT,
    tournament_history INTEGER[],
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

RAISE NOTICE '✅ castersテーブルを作成しました';

-- ========================================
-- Step 3: インデックスを作成
-- ========================================

CREATE INDEX idx_casters_user_id ON casters(user_id);
CREATE INDEX idx_casters_name ON casters(name);

RAISE NOTICE '✅ インデックスを作成しました';

-- ========================================
-- Step 4: RLSを有効化
-- ========================================

ALTER TABLE casters ENABLE ROW LEVEL SECURITY;

RAISE NOTICE '✅ RLSを有効化しました';

-- ========================================
-- Step 5: RLSポリシーを作成
-- ========================================

-- ポリシー: 本人または運営は参照可能
CREATE POLICY "casters_select_own" ON casters
FOR SELECT
USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
        SELECT 1 FROM admins 
        WHERE admins.id = auth.uid() 
        AND admins.role = 'admin'
    )
);

-- ポリシー: 本人または運営は更新可能
CREATE POLICY "casters_update_own" ON casters
FOR UPDATE
USING (
    auth.uid() = user_id
    OR 
    EXISTS (
        SELECT 1 FROM admins 
        WHERE admins.id = auth.uid() 
        AND admins.role = 'admin'
    )
);

-- ポリシー: 新規登録は認証済みユーザーなら誰でも可能（初回ログイン時）
CREATE POLICY "casters_insert_own" ON casters
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ポリシー: 削除は運営のみ可能
CREATE POLICY "casters_delete_admin_only" ON casters
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM admins 
        WHERE admins.id = auth.uid() 
        AND admins.role = 'admin'
    )
);

RAISE NOTICE '✅ RLSポリシーを作成しました';

-- ========================================
-- Step 6: コメントを追加
-- ========================================

COMMENT ON TABLE admins IS '運営アカウント管理テーブル（旧users）';
COMMENT ON TABLE casters IS '実況解説者情報テーブル';
COMMENT ON COLUMN casters.id IS '実況解説者ID（UUID）';
COMMENT ON COLUMN casters.user_id IS '認証ユーザーID（auth.users参照）';
COMMENT ON COLUMN casters.name IS '実況解説者名';
COMMENT ON COLUMN casters.icon_type IS 'アイコンタイプ: discord, url, other';
COMMENT ON COLUMN casters.icon_url IS 'カスタムアイコンURL';
COMMENT ON COLUMN casters.discord_avatar_url IS 'DiscordアバターURL';
COMMENT ON COLUMN casters.x_account_id IS 'XアカウントID（@なし）';
COMMENT ON COLUMN casters.x_url IS 'XプロフィールURL';
COMMENT ON COLUMN casters.youtube_account_id IS 'YouTubeアカウントID';
COMMENT ON COLUMN casters.youtube_url IS 'YouTube URL';
COMMENT ON COLUMN casters.xp_area IS 'ガチエリア最高XP';
COMMENT ON COLUMN casters.xp_yagura IS 'ガチヤグラ最高XP';
COMMENT ON COLUMN casters.xp_hoko IS 'ガチホコ最高XP';
COMMENT ON COLUMN casters.xp_asari IS 'ガチアサリ最高XP';
COMMENT ON COLUMN casters.main_weapons IS 'モチブキ（最大3つ）';
COMMENT ON COLUMN casters.tournament_achievements IS '大会実績（配列）';
COMMENT ON COLUMN casters.casting_history IS '実況解説実績（配列）';
COMMENT ON COLUMN casters.notes_to_staff IS '運営への伝達事項';
COMMENT ON COLUMN casters.staff_notes IS '運営メモ（実況解説者本人は閲覧不可）';
COMMENT ON COLUMN casters.tournament_history IS '大学杯実況解説履歴（大会IDの配列）';

RAISE NOTICE '✅ コメントを追加しました';

-- ========================================
-- 完了メッセージ
-- ========================================

DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ セットアップが完了しました！';
    RAISE NOTICE '';
    RAISE NOTICE '作成されたテーブル:';
    RAISE NOTICE '  - admins (旧users)';
    RAISE NOTICE '  - casters';
    RAISE NOTICE '';
    RAISE NOTICE 'RLSポリシー:';
    RAISE NOTICE '  - 本人と運営のみアクセス可能';
    RAISE NOTICE '========================================';
END $$;
