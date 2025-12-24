-- ==========================================
-- adminsテーブルにdiscord_idカラムを追加
-- ==========================================
-- このSQLスクリプトをSupabaseのSQLエディタで実行してください

-- discord_idカラムを追加（既に存在する場合はスキップ）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'admins' 
        AND column_name = 'discord_id'
    ) THEN
        ALTER TABLE public.admins 
        ADD COLUMN discord_id TEXT;
        
        -- インデックスを追加
        CREATE INDEX idx_admins_discord_id ON public.admins(discord_id);
        
        -- コメントを追加
        COMMENT ON COLUMN public.admins.discord_id IS 'Discord ユーザーID（数字のみ、17-19桁）';
    END IF;
END $$;
