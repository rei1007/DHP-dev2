# アカウント管理機能 - データベース構造

## 概要

運営ダッシュボードにアカウント管理機能を追加しました。

### 機能概要

- **自動登録**: Discord 認証でログイン時、自動的に users テーブルにユーザー情報が登録されます
- **ロール管理**: ユーザーは「未承認」または「運営」のロールを持ちます
- **アクセス制御**: 現段階では、すべての認証済みアカウントが運営ダッシュボードにアクセスできます
- **将来の実装**: 最終的には運営ロールを持つアカウントのみがアクセスできるように制限します

## 必要な Supabase テーブル構造

### `users` テーブル

このテーブルは、アプリケーションのユーザー情報を管理します。

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT,
    username TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### カラム説明:

- `id`: ユーザーの一意識別子（UUID） - Supabase Auth のユーザーと同じ ID
- `email`: ユーザーのメールアドレス
- `username`: ユーザー名（Discord 認証時に自動取得）
- `avatar_url`: ユーザーのアバター画像 URL（Discord 認証時に自動取得）
- `role`: ユーザーのロール
  - `'pending'`: 未承認（デフォルト）- 新規登録時の初期状態
  - `'admin'`: 運営 - 運営ダッシュボードへのフルアクセス権限
- `created_at`: アカウント作成日時
- `updated_at`: 最終更新日時

## Row Level Security (RLS) ポリシー

### 推奨する RLS ポリシー

```sql
-- RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

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
```

## 実装された機能

### 1. ログイン時の自動ユーザー登録

- Discord 認証でログインすると、自動的に users テーブルにユーザー情報が登録されます
- 新規ユーザーは「pending」（未承認）ロールで登録されます
- 既存ユーザーの場合は、ユーザー名やアバター URL が自動更新されます

### 2. アカウント一覧表示

- すべての登録アカウントをカード形式（グリッドレイアウト）で表示
- 各カードには以下を表示:
  - アバター画像（または頭文字のイニシャル）
  - ユーザー名
  - メールアドレス
  - ロール（クリック可能なボタン）
  - 登録日
  - 削除ボタン

### 3. ロール管理

- **ロールの種類**:
  - `pending`: 未承認（初期状態）
  - `admin`: 運営
- **ロール変更**: ロールボタンをクリックすると、未承認 ⇔ 運営の切り替えが可能
- 確認ダイアログによる誤操作防止

### 4. アカウント削除

- 各カードの削除ボタンからアカウント情報を削除可能
- 削除前に確認ダイアログを表示
- 削除は取り消し不可

### 5. 統計情報

- 運営アカウント数（紫グラデーション）
- 未承認アカウント数（黄色グラデーション）

## 今後の実装予定

### 将来的な機能追加（最終段階）

現在は、すべての認証済みユーザーが運営ダッシュボードにアクセスできます。
最終段階では、以下の制限を追加します:

1. **アクセス制限の追加** (`auth.js`の`requireAuth`関数または`ensureUserInDatabase`関数を修正)

   ```javascript
   // ensureUserInDatabase関数の最後に以下を追加
   // ユーザーのロールを確認
   const { data: userData } = await client
     .from("users")
     .select("role")
     .eq("id", authUser.id)
     .single();

   // 運営ロールを持たないユーザーはアクセス不可
   if (!userData || userData.role !== "admin") {
     alert("運営ダッシュボードへのアクセス権限がありません");
     window.location.href = "index.html";
     throw new Error("Unauthorized");
   }
   ```

## 使い方

1. 運営ダッシュボード（`admin.html`）に Discord 認証でログイン
2. ログイン時に users テーブルに自動登録されます（初回は「未承認」ロール）
3. サイドバーから「アカウント管理」をクリック
4. アカウント一覧が表示される
5. 各アカウントに対して:
   - ロールボタンをクリックしてロール変更
   - 削除ボタンでアカウント情報を削除

## 注意事項

- 現段階では、すべての認証済みユーザーが運営ダッシュボードにアクセス可能です
- `users`テーブルが存在しない場合、エラーが発生します
- Supabase の管理画面で`create_users_table.sql`を実行してテーブルを作成してください
- アカウント削除は取り消せません
