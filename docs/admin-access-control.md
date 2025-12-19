# 運営ロールによるアクセス制限 - 実装ガイド

## 概要

このドキュメントでは、運営ロール（admin）を持つアカウントのみが運営ダッシュボードにアクセスし、各種テーブルへの書き込みができるようにする実装について説明します。

## 実装内容

### 1. **運営ダッシュボードへのアクセス制限**

#### 実装場所: `public/js/auth.js`

`ensureUserInDatabase()`関数の最後で、ユーザーのロールをチェックしています：

```javascript
// ユーザーのロールを確認
const { data: userRole } = await client
  .from("users")
  .select("role")
  .eq("id", authUser.id)
  .single();

// 運営ロール以外はアクセス拒否
if (userRole.role !== "admin") {
  alert(
    "運営ダッシュボードへのアクセス権限がありません。\n\n運営ロールが付与されるまでお待ちください。"
  );
  window.location.href = "index.html";
  throw new Error("Unauthorized: User role is not admin");
}
```

#### 動作フロー

1. ユーザーが Discord 認証でログイン
2. `requireAuth()`が呼ばれる
3. `ensureUserInDatabase()`でユーザー情報を users テーブルに登録/更新
4. ユーザーのロールを確認
5. **ロールが`admin`でない場合**:
   - アラートを表示
   - `index.html`にリダイレクト
   - エラーをスロー
6. **ロールが`admin`の場合**:
   - アクセスを許可
   - 運営ダッシュボードを表示

### 2. **データベースレベルでのアクセス制限（RLS）**

#### 実装場所: `sql/apply_admin_only_policies.sql`

Supabase の Row Level Security (RLS) を使用して、データベースレベルでアクセスを制限します。

#### ポリシー概要

##### **users テーブル**

- **SELECT**: すべての認証済みユーザーが閲覧可能
- **INSERT**: 自分のレコードのみ挿入可能（初回登録用）
- **UPDATE**: admin または自分のレコードのみ更新可能
- **DELETE**: admin のみ削除可能

##### **tournaments テーブル**

- **SELECT**: 誰でも閲覧可能（公開情報）
- **INSERT**: admin のみ
- **UPDATE**: admin のみ
- **DELETE**: admin のみ

##### **news テーブル**

- **SELECT**: 誰でも閲覧可能（公開情報）
- **INSERT**: admin のみ
- **UPDATE**: admin のみ
- **DELETE**: admin のみ

## セットアップ手順

### ステップ 1: SQL ポリシーの適用

1. Supabase 管理画面を開く
2. SQL Editor に移動
3. `sql/apply_admin_only_policies.sql`の内容をコピー&ペースト
4. 実行（Run）

これにより、以下が実行されます：

- 既存の緩やかなポリシーを削除
- 新しい厳格なポリシーを適用
- RLS を各テーブルで有効化

### ステップ 2: 動作確認

#### 2.1 未承認ユーザーでのテスト

1. 新しい Discord アカウントでログイン
2. 期待される動作:
   - users テーブルに`pending`ロールで登録される
   - アラートが表示される: 「運営ダッシュボードへのアクセス権限がありません」
   - `index.html`にリダイレクトされる

#### 2.2 運営ロールの付与

1. 既存の admin アカウントでログイン
2. 「アカウント管理」タブを開く
3. テストユーザーのロールボタン（未承認）をクリック
4. ロールが「運営」に変更される

#### 2.3 運営ユーザーでのテスト

1. ロールを変更したアカウントで再ログイン
2. 期待される動作:
   - 運営ダッシュボードにアクセスできる
   - 大会やお知らせの作成・編集・削除ができる

## セキュリティ層

このシステムは**2 段階のセキュリティ**を実装しています：

### 第 1 層: アプリケーションレベル（auth.js）

- JavaScript でロールをチェック
- UI レベルでのアクセス制御
- ユーザーエクスペリエンスの向上

### 第 2 層: データベースレベル（RLS）

- Supabase のポリシーで制御
- データベース直接アクセスも防御
- より強固なセキュリティ

### なぜ 2 層必要なのか？

1. **アプリケーションレベル**:

   - ユーザーに即座にフィードバックを提供
   - 不要な UI を表示しない

2. **データベースレベル**:
   - API を直接叩く攻撃を防ぐ
   - JavaScript を改ざんしても無効

## トラブルシューティング

### 問題: admin でもアクセスできない

**確認事項**:

1. users テーブルでロールが`admin`になっているか確認

   ```sql
   SELECT id, email, username, role FROM users WHERE email = 'your-email@example.com';
   ```

2. ブラウザのコンソールでエラーを確認
   - `🔒 User role: admin`が表示されているか

**解決策**:

- ロールが`pending`の場合、手動で admin に変更:
  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
  ```

### 問題: RLS ポリシーエラーが発生する

**確認事項**:

1. RLS が有効になっているか確認

   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('users', 'tournaments', 'news');
   ```

2. ポリシーが正しく設定されているか確認
   ```sql
   SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('users', 'tournaments', 'news');
   ```

**解決策**:

- `apply_admin_only_policies.sql`を再実行

### 問題: 大会やお知らせが作成できない

**確認事項**:

1. ログインユーザーのロールを確認
2. ブラウザのコンソールでエラーメッセージを確認

**解決策**:

- ロールが`admin`でない場合、アカウント管理から変更
- RLS ポリシーエラーの場合、SQL を再実行

## 初回セットアップ時の注意

### 最初の管理者アカウントの作成

最初の admin ユーザーを作成する方法：

1. **方法 1: 手動でロールを変更**

   ```sql
   -- 自分のメールアドレスでadminに設定
   UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
   ```

2. **方法 2: SQL Editor で直接挿入**

   ```sql
   -- 自分のAuth UIDを確認
   SELECT auth.uid();

   -- adminロールで挿入
   INSERT INTO users (id, email, username, role)
   VALUES (
       auth.uid(),
       'your-admin-email@example.com',
       'Admin User',
       'admin'
   )
   ON CONFLICT (id) DO UPDATE SET role = 'admin';
   ```

## まとめ

この実装により：

- ✅ 運営ロールを持つユーザーのみが運営ダッシュボードにアクセス可能
- ✅ 未承認ユーザーは自動的にリダイレクトされる
- ✅ データベースレベルでも書き込みを制限
- ✅ 公開情報（大会・お知らせ）は誰でも閲覧可能
- ✅ 2 層のセキュリティで堅牢な保護

安全で管理しやすいシステムが完成しました！
