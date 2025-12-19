# アカウント管理機能 - データベース構造

## 概要

運営ダッシュボードにアカウント管理機能を追加しました。
現段階では、すべてのアカウントが運営ダッシュボードにアクセスできますが、将来的には運営ロールを持つアカウントのみがアクセスできるように制限できます。

## 必要な Supabase テーブル構造

### `users` テーブル

このテーブルは、アプリケーションのユーザー情報を管理します。

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT,
    username TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### カラム説明:

- `id`: ユーザーの一意識別子（UUID）
- `email`: ユーザーのメールアドレス
- `username`: ユーザー名（Discord 認証時に取得）
- `avatar_url`: ユーザーのアバター画像 URL（Discord 認証時に取得）
- `role`: ユーザーのロール（`'user'` または `'admin'`）
  - `'user'`: 一般ユーザー（デフォルト）
  - `'admin'`: 運営ロール（運営ダッシュボードへのアクセス権限）
- `created_at`: アカウント作成日時
- `updated_at`: 最終更新日時

## Row Level Security (RLS) ポリシー

### 推奨する RLS ポリシー

```sql
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
```

## 実装された機能

### 1. アカウント一覧表示

- すべての登録アカウントをカード形式で表示
- ユーザー名、メールアドレス、登録日、ロールを表示
- アバター画像がある場合は表示、ない場合はイニシャルを表示

### 2. ロール管理

- **運営ロール付与**: 一般ユーザーに運営ロールを付与
- **運営ロール削除**: 運営ユーザーから運営ロールを削除
- 確認ダイアログによる誤操作防止

### 3. 統計情報

- 運営アカウント数
- 一般アカウント数

## 今後の実装予定

### 将来的な機能追加（最終段階）

現在は、すべての認証済みユーザーが運営ダッシュボードにアクセスできます。
最終段階では、以下の制限を追加します:

1. **アクセス制限の追加** (`auth.js`の`requireAuth`関数を修正)

   ```javascript
   export async function requireAuth() {
     const user = await getCurrentUser();

     if (!user) {
       console.log("User not authenticated, redirecting to login...");
       window.location.href = "login.html";
       return null;
     }

     // ユーザーのロールを確認
     const { data: userData } = await supabaseClient
       .from("users")
       .select("role")
       .eq("id", user.id)
       .single();

     // 運営ロールを持たないユーザーはアクセス不可
     if (!userData || userData.role !== "admin") {
       alert("運営ダッシュボードへのアクセス権限がありません");
       window.location.href = "index.html";
       return null;
     }

     return user;
   }
   ```

2. **初回ログイン時のユーザー登録**
   Discord 認証後、`users`テーブルにユーザー情報を自動登録する処理を追加

## 使い方

1. 運営ダッシュボード（`admin.html`）にアクセス
2. サイドバーから「アカウント管理」をクリック
3. アカウント一覧が表示される
4. 各アカウントに対して、運営ロールの付与/削除が可能

## 注意事項

- 現段階では、すべての認証済みユーザーが運営ダッシュボードにアクセス可能です
- `users`テーブルが存在しない場合、エラーが発生します
- Supabase の管理画面で上記のテーブルを作成してください
