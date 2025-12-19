# ユーザー登録問題のトラブルシューティングガイド

## 症状

ログインすると Supabase Authentication には表示されるが、users テーブルに反映されない。

## デバッグ手順

### 1. ブラウザコンソールの確認

1. `admin.html`にログイン
2. ブラウザのデベロッパーツールを開く（F12 キー）
3. Console タブを確認
4. 以下のログメッセージを探す：

```
🔧 [ensureUserInDatabase] Starting...
🔧 [ensureUserInDatabase] authUser: {...}
🔧 [ensureUserInDatabase] Supabase client obtained
👤 Ensuring user in database: {...}
🔍 Checking for existing user...
🔍 Existing user check result: null
➕ Creating new user with pending role...
➕ Insert data: {...}
```

### 2. エラーメッセージの確認

もしエラーが発生している場合、以下のようなメッセージが表示されます：

```
❌ Error creating user: {...}
❌ Error details: {...}
```

#### よくあるエラーとその対処法

##### エラー 1: "relation 'users' does not exist"

**原因**: users テーブルが作成されていない
**対処法**:

1. Supabase 管理画面を開く
2. SQL Editor に移動
3. `create_users_table_fixed.sql`の内容を貼り付けて実行

##### エラー 2: "new row violates row-level security policy"

**原因**: RLS ポリシーが厳しすぎる
**対処法**:

1. `create_users_table_fixed.sql`を使用してテーブルを再作成
2. このバージョンはテスト用に緩やかなポリシーを使用しています

##### エラー 3: "duplicate key value violates unique constraint"

**原因**: 既にユーザーが存在している（通常は問題なし）
**対処法**:

- これは通常のエラーではなく、更新処理に切り替わるべき
- ログで「Updating existing user...」が表示されているか確認

### 3. Supabase 管理画面での確認

#### users テーブルの存在確認

1. Supabase 管理画面を開く
2. Table Editor に移動
3. `users`テーブルが存在するか確認

#### RLS ポリシーの確認

1. users テーブルを開く
2. 右上の「RLS」ボタンをクリック
3. 以下のポリシーが設定されているか確認：
   - `Authenticated users can view all users`
   - `Authenticated users can insert`
   - `Authenticated users can update`
   - `Authenticated users can delete`

#### 手動でのユーザー挿入テスト

1. SQL Editor を開く
2. 以下の SQL を実行してテスト：

```sql
-- 認証済みユーザーのUIDを確認
SELECT auth.uid();

-- テストユーザーを挿入
INSERT INTO users (id, email, username, role)
VALUES (
    auth.uid(),
    'test@example.com',
    'Test User',
    'pending'
);

-- 挿入されたか確認
SELECT * FROM users WHERE id = auth.uid();
```

### 4. テーブル再作成手順

もし問題が解決しない場合、テーブルを完全に再作成します：

```sql
-- 1. 既存のテーブルを削除（注意：データも削除されます）
DROP TABLE IF EXISTS users CASCADE;

-- 2. create_users_table_fixed.sqlの内容を実行
-- （ファイルの内容をコピー&ペースト）
```

### 5. 確認用 SQL クエリ

以下のクエリで現在の状態を確認できます：

```sql
-- 1. テーブルの存在確認
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'users'
);

-- 2. RLSが有効か確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'users';

-- 3. RLSポリシー一覧
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'users';

-- 4. 全ユーザー一覧
SELECT * FROM users;

-- 5. 自分のauth情報
SELECT auth.uid(), auth.email();
```

## 最終チェックリスト

- [ ] users テーブルが存在する
- [ ] RLS が正しく設定されている（緩やかなポリシー）
- [ ] ブラウザコンソールにエラーが表示されていない
- [ ] `ensureUserInDatabase`の成功ログが表示される
- [ ] Table Editor で users テーブルにデータが表示される

## 解決しない場合

以下の情報を収集してください：

1. ブラウザコンソールの全ログ（特に ❌ マーク付きのエラー）
2. Supabase 管理画面の RLS ポリシー設定のスクリーンショット
3. `SELECT * FROM users;`の実行結果
4. Supabase Authentication に表示されているユーザーの UID

これらの情報があれば、問題を特定できます。
