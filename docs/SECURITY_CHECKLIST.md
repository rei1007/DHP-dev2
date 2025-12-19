# 🔒 セキュリティチェックリスト

## 緊急対応が必要な脆弱性

### ⚠️ 【最優先】ロール変更の脆弱性

- [ ] **`sql/security_patch_role_protection.sql`を実行**
- [ ] 不正な admin ユーザーがいないか確認
- [ ] ポリシーが正しく適用されたか確認
- [ ] テスト: 一般ユーザーでロール変更を試みる（失敗するはず）
- [ ] テスト: admin ユーザーでロール変更を試みる（成功するはず）

---

## セキュリティ評価の結果

### 🔴 重大な脆弱性（即座に対処が必要）

#### 1. ユーザーが自分のロールを変更可能

- **状態**: 🔴 未修正
- **影響**: 誰でも運営者になれる
- **対策**: `security_patch_role_protection.sql`を実行
- **優先度**: 🔥 最高

### 🟡 中程度の脆弱性（対処推奨）

#### 2. JavaScript による UI 制御のバイパス

- **状態**: 🟡 部分的に対策済み（RLS で防御）
- **影響**: UI にアクセス可能だが、データは守られている
- **対策**: RLS ポリシーの厳格化（脆弱性#1 の修正）
- **優先度**: 🟡 中

### 🟢 低い脆弱性（監視推奨）

#### 3. 認証トークンの盗用

- **状態**: 🟢 標準的な対策済み
- **影響**: 限定的（盗まれたユーザーの権限のみ）
- **対策**: HTTPS の使用、トークンの有効期限
- **優先度**: 🟢 低

---

## セキュリティ対策の実装状況

### ✅ 実装済み

- [x] Supabase 認証の使用
- [x] Discord OAuth 認証
- [x] RLS の基本設定
- [x] 2 層防御の仕組み
- [x] ログイン時のロールチェック

### ⚠️ 要修正

- [ ] **ロール変更権限の厳格化**（最優先）
- [ ] 監査ログの実装
- [ ] セキュリティヘッダーの設定
- [ ] 定期的なセキュリティレビュー

---

## テストシナリオ

### シナリオ 1: 一般ユーザーによる不正なロール変更（失敗するべき）

```javascript
// ブラウザのコンソールで実行
const { createClient } = window.supabase;
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 自分のロールをadminに変更しようとする
const { data, error } = await client
  .from("users")
  .update({ role: "admin" })
  .eq("id", "MY_USER_ID");

// 期待される結果: error が返される
// エラーメッセージ: "new row violates row-level security policy"
```

**結果**:

- [ ] ✅ エラーが返される
- [ ] ❌ 更新が成功する（脆弱性あり！）

---

### シナリオ 2: admin ユーザーによるロール変更（成功するべき）

```javascript
// adminユーザーでログイン後、コンソールで実行
const { data, error } = await client
  .from("users")
  .update({ role: "admin" })
  .eq("id", "TARGET_USER_ID");

// 期待される結果: data に更新されたユーザー情報が返される
```

**結果**:

- [ ] ✅ 更新が成功する
- [ ] ❌ エラーが返される（ポリシー設定ミス！）

---

### シナリオ 3: API を直接叩いて大会情報を作成（admin 以外は失敗するべき）

```javascript
// 一般ユーザーで実行
const { data, error } = await client.from("tournaments").insert([
  {
    name: "テスト大会",
    status: "upcoming",
  },
]);

// 期待される結果: error が返される
```

**結果**:

- [ ] ✅ エラーが返される
- [ ] ❌ 作成が成功する（脆弱性あり！）

---

### シナリオ 4: 監査ログの記録（実装後）

```sql
-- adminがロールを変更した後、監査ログを確認
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;

-- 期待される結果: ロール変更のログが記録されている
```

**結果**:

- [ ] ✅ ログが記録されている
- [ ] ❌ ログが記録されていない

---

## RLS ポリシーの確認

### users テーブル

```sql
-- 現在のポリシーを確認
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';
```

**期待される結果**:

- [ ] `Admins can update all users` - UPDATE - admin のみ
- [ ] `Users can update own profile` - UPDATE - 自分のプロフィール（ロール以外）
- [ ] `Users can insert own data` - INSERT - 自分のレコード
- [ ] `Authenticated users can view all users` - SELECT - すべて閲覧可能
- [ ] `Admins can delete users` - DELETE - admin のみ

### tournaments テーブル

```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tournaments';
```

**期待される結果**:

- [ ] `Anyone can view tournaments` - SELECT
- [ ] `Admins can insert tournaments` - INSERT
- [ ] `Admins can update tournaments` - UPDATE
- [ ] `Admins can delete tournaments` - DELETE

### news テーブル

```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'news';
```

**期待される結果**:

- [ ] `Anyone can view news` - SELECT
- [ ] `Admins can insert news` - INSERT
- [ ] `Admins can update news` - UPDATE
- [ ] `Admins can delete news` - DELETE

---

## セキュリティベストプラクティス

### 推奨事項

1. **定期的なレビュー**

   - [ ] 月 1 回のセキュリティレビュー
   - [ ] 監査ログの確認
   - [ ] 不正な admin ユーザーのチェック

2. **監視**

   - [ ] 監査ログの定期確認
   - [ ] 異常なアクティビティの検出
   - [ ] アラート機能の実装

3. **教育**

   - [ ] 運営メンバーへのセキュリティトレーニング
   - [ ] ベストプラクティスの共有
   - [ ] インシデント対応手順の策定

4. **バックアップ**
   - [ ] 定期的なデータベースバックアップ
   - [ ] リストア手順の確認
   - [ ] 災害復旧計画

---

## 緊急時の対応手順

### 不正アクセスが疑われる場合

1. **即座に実行**

   ```sql
   -- すべてのユーザーのロールを確認
   SELECT id, email, username, role, created_at, updated_at
   FROM users
   WHERE role = 'admin';

   -- 不正なadminユーザーを発見した場合
   UPDATE users SET role = 'pending' WHERE id = '不正なユーザーID';
   ```

2. **監査ログを確認**

   ```sql
   -- 最近のロール変更を確認
   SELECT * FROM audit_logs
   WHERE action = 'role_change'
   ORDER BY created_at DESC;
   ```

3. **Supabase 認証ユーザーを確認**

   - Supabase 管理画面 → Authentication → Users
   - 不審なユーザーをブロック

4. **パスワード変更を推奨**
   - すべての運営メンバーに通知
   - パスワード変更を依頼

---

## まとめ

### 現在の状態

- 🔴 **緊急**: ロール変更の脆弱性あり
- 🟡 **注意**: 監査ログ未実装
- ✅ **良好**: 基本的な RLS 構造

### 必要なアクション

1. **今すぐ**: `security_patch_role_protection.sql`を実行
2. **今日中**: セキュリティテストを実施
3. **今週中**: 監査ログの確認体制を構築

### 修正後の状態（期待）

- ✅ **安全**: ロール変更は admin のみ
- ✅ **監査可能**: すべての変更が記録
- ✅ **堅牢**: 2 層の防御が正しく機能
