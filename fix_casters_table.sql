-- castersテーブルのx_account_idカラムのNOT NULL制約を削除
-- 実況解説者は初回ログイン時にXアカウント情報を持っていない可能性があるため、
-- nullを許可し、後からプロフィール設定で入力できるようにします

ALTER TABLE casters 
ALTER COLUMN x_account_id DROP NOT NULL;

-- 同様に、他のSNS関連フィールドもnullを許可
ALTER TABLE casters 
ALTER COLUMN x_url DROP NOT NULL;

ALTER TABLE casters 
ALTER COLUMN youtube_url DROP NOT NULL;

-- コメント: 
-- これらのフィールドは初回ログイン時には設定されていないため、
-- プロフィール設定画面で後から入力できるようにします
