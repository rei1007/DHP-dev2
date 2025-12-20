-- ==========================================
-- データベーススキーマ更新スクリプト
-- 実況解説者管理機能の実装
-- ==========================================

-- 1. usersテーブルをadminsテーブルに変更
-- (既存のusersテーブルをリネーム)
ALTER TABLE users RENAME TO admins;

-- 2. castersテーブルに新しいフィールドを追加

-- 運営メモ（実況解説者本人は閲覧不可）
ALTER TABLE casters 
ADD COLUMN IF NOT EXISTS staff_notes TEXT;

-- 大学杯実況解説履歴（配列形式で大会IDを保存）
ALTER TABLE casters 
ADD COLUMN IF NOT EXISTS tournament_history INTEGER[];

-- 3. castersテーブルのRLSポリシーを設定

-- RLSを有効化
ALTER TABLE casters ENABLE ROW LEVEL SECURITY;

-- ポリシー: 本人は自分のデータのみ参照可能（staff_notesとtournament_historyは除外）
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

-- ポリシー: 本人は自分のデータのみ更新可能
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

-- ポリシー: 新規登録は誰でも可能（初回ログイン時）
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

-- 4. castersテーブルにビューを作成（実況解説者用：staff_notesとtournament_historyを除外）
CREATE OR REPLACE VIEW casters_self_view AS
SELECT 
    id,
    user_id,
    name,
    icon_type,
    icon_url,
    discord_avatar_url,
    x_account_id,
    x_url,
    youtube_account_id,
    youtube_url,
    xp_area,
    xp_yagura,
    xp_hoko,
    xp_asari,
    main_weapons,
    tournament_achievements,
    casting_history,
    notes_to_staff,
    created_at,
    updated_at
FROM casters
WHERE user_id = auth.uid();

-- ビューに対するRLSポリシー
ALTER TABLE casters_self_view ENABLE ROW LEVEL SECURITY;

CREATE POLICY "casters_self_view_select" ON casters_self_view
FOR SELECT
USING (user_id = auth.uid());

-- 5. コメント追加
COMMENT ON COLUMN casters.staff_notes IS '運営メモ（実況解説者本人は閲覧不可）';
COMMENT ON COLUMN casters.tournament_history IS '大学杯実況解説履歴（大会IDの配列）';
COMMENT ON TABLE admins IS '運営アカウント管理テーブル（旧users）';

-- 完了メッセージ
DO $$ 
BEGIN 
    RAISE NOTICE '✅ データベーススキーマの更新が完了しました';
END $$;
