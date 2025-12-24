-- ==========================================
-- 運営ホワイトリストテーブル作成SQL
-- ==========================================
-- このSQLスクリプトをSupabaseのSQLエディタで実行してください

-- admin_whitelistテーブルの作成
CREATE TABLE IF NOT EXISTS public.admin_whitelist (
    id BIGSERIAL PRIMARY KEY,
    discord_id TEXT NOT NULL UNIQUE,
    note TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_admin_whitelist_discord_id ON public.admin_whitelist(discord_id);

-- RLS (Row Level Security) の有効化
ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;

-- すべての認証済みユーザーが読み取り可能なポリシー
CREATE POLICY "Allow authenticated users to read whitelist"
    ON public.admin_whitelist
    FOR SELECT
    TO authenticated
    USING (true);

-- 認証済みユーザーのみが挿入可能なポリシー
CREATE POLICY "Allow authenticated users to insert whitelist"
    ON public.admin_whitelist
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 認証済みユーザーのみが削除可能なポリシー
CREATE POLICY "Allow authenticated users to delete whitelist"
    ON public.admin_whitelist
    FOR DELETE
    TO authenticated
    USING (true);

-- コメントの追加
COMMENT ON TABLE public.admin_whitelist IS '運営ロール自動付与のためのDiscord IDホワイトリスト';
COMMENT ON COLUMN public.admin_whitelist.discord_id IS 'Discord ID (数字のみ、17-19桁)';
COMMENT ON COLUMN public.admin_whitelist.note IS 'メモ（追加理由、申請者など）';
COMMENT ON COLUMN public.admin_whitelist.created_at IS '登録日時';
