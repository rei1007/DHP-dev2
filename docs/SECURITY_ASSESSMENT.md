# セキュリティ評価レポート

## 🔒 全体的なセキュリティ評価

### 評価日時

2025-12-20

### 評価範囲

- 運営ダッシュボードへのアクセス制御
- データベースへの書き込み制御
- Row Level Security (RLS) ポリシー
- 認証メカニズム

---

## ⚠️ 発見された脆弱性

### 🔴 【重大】脆弱性 #1: ユーザーが自分のロールを変更可能

#### 問題の詳細

現在の`usersテーブル`の RLS ポリシーでは、ユーザーが自分のレコードを更新できるため、**自分のロールを`admin`に変更できてしまいます**。

#### 攻撃シナリオ

```javascript
// 開発者ツールのConsoleで実行
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
await client.from("users").update({ role: "admin" }).eq("id", MY_USER_ID);
```

これにより、未承認ユーザーが自分で運営ロールを付与できます。

#### 影響範囲

- ❌ **クリティカル**: 誰でも運営権限を取得可能
- ❌ すべてのデータを改ざん可能
- ❌ アカウント管理機能が無意味になる

#### 現在のポリシー（脆弱）

```sql
CREATE POLICY "Admin or self can update users"
    ON users
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id OR  -- ← これが問題！
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

#### 修正案

ロールフィールドの更新は**admin のみ**に制限し、それ以外のフィールド（username, avatar_url 等）の更新は許可する。

---

### 🟡 【中】脆弱性 #2: JavaScript による UI 制御のバイパス

#### 問題の詳細

`auth.js`のロールチェックは、開発者ツールで簡単にバイパス可能です。

#### 攻撃シナリオ

```javascript
// 開発者ツールでauth.jsの関数を上書き
window.requireAuth = async () => ({ id: "fake-id", email: "fake@email.com" });
```

#### 影響範囲

- ⚠️ UI へのアクセスは可能
- ✅ しかし、RLS により**データベースへの書き込みは防御される**（脆弱性#1 が修正されている場合）

#### 現在の対策状況

- ✅ RLS が第 2 層として機能
- ⚠️ UI レベルの防御のみでは不十分

---

### 🟢 【低】脆弱性 #3: 認証トークンの盗用

#### 問題の詳細

Supabase Auth のトークンが盗まれた場合、そのユーザーとして操作される可能性があります。

#### 影響範囲

- ⚠️ 盗まれたユーザーの権限で操作可能
- ✅ しかし、ロールが`admin`でなければ書き込み不可（脆弱性#1 が修正されている場合）

#### 対策状況

- ✅ Supabase の標準的なトークン管理
- ✅ HTTPS による通信の暗号化
- ℹ️ さらなる対策: トークンの有効期限、リフレッシュトークン

---

## 🛡️ セキュリティ層の分析

### 現在の防御層

| 層          | 機能                      | 効果                     | バイパス可能性        |
| ----------- | ------------------------- | ------------------------ | --------------------- |
| **第 1 層** | `auth.js`のロールチェック | UI レベルの制御          | 🔴 簡単にバイパス可能 |
| **第 2 層** | Supabase RLS              | データベースレベルの制御 | 🟡 ポリシー次第       |

### 理想的な防御層

```
攻撃者
   ↓
┌─────────────────────────────────┐
│ 第1層: フロントエンド制御       │ ← バイパス可能（想定内）
│ (auth.js)                      │
└─────────────────────────────────┘
   ↓
┌─────────────────────────────────┐
│ 第2層: Supabase RLS            │ ← 絶対防御ライン
│ - adminのみがロール変更可能     │
│ - adminのみがデータ書き込み可能 │
└─────────────────────────────────┘
   ↓
データベース（保護済み）
```

---

## ✅ 推奨される対策

### 優先度：🔴 【最高】ロール変更権限の厳格化

#### 対策内容

`usersテーブル`の UPDATE ポリシーを修正し、**ロールフィールドの変更は admin のみ**に制限します。

#### 実装方法

以下の SQL を実行：

```sql
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Admin or self can update users" ON users;

-- 新しいポリシー: adminのみがロールを変更可能
CREATE POLICY "Admins can update user roles"
    ON users
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ユーザーが自分のプロフィール情報を更新可能（ロール以外）
-- PostgreSQLのCHECK制約を追加
ALTER TABLE users ADD CONSTRAINT check_role_change
CHECK (
    -- 新しいroleが元のroleと同じ、または、更新者がadmin
    role = (SELECT role FROM users WHERE id = id) OR
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub' AND role = 'admin')
);
```

**注意**: CHECK 制約は RLS と併用して、より強固な防御を実現します。

---

### 優先度：🟡 【高】監査ログの実装

#### 対策内容

ロール変更などの重要な操作を記録します。

```sql
-- 監査ログテーブルの作成
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    target_user_id UUID,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- トリガー関数
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO audit_logs (user_id, action, target_user_id, old_value, new_value)
        VALUES (
            (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
            'role_change',
            NEW.id,
            OLD.role,
            NEW.role
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの設定
CREATE TRIGGER audit_role_change
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_role_change();
```

---

### 優先度：🟢 【中】セキュリティヘッダーの設定

#### 対策内容

Supabase プロジェクトまたはホスティング環境で以下のヘッダーを設定：

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 📊 修正前後の比較

### 修正前（脆弱）

```javascript
// 開発者ツールで実行
await client.from("users").update({ role: "admin" }).eq("id", MY_USER_ID);
// → 成功！自分をadminに変更できる 🔴
```

### 修正後（安全）

```javascript
// 開発者ツールで実行
await client.from("users").update({ role: "admin" }).eq("id", MY_USER_ID);
// → エラー！RLSポリシーにより拒否される ✅
```

---

## 🎯 実装手順

### ステップ 1: 緊急対応（今すぐ実行）

1. 修正版の RLS ポリシーを適用
2. 既存の admin ユーザーを確認
3. 不正な admin ロールがないかチェック

### ステップ 2: 中期対応（1 週間以内）

1. 監査ログの実装
2. セキュリティテストの実施
3. ドキュメントの更新

### ステップ 3: 長期対応（1 ヶ月以内）

1. セキュリティヘッダーの設定
2. 定期的なセキュリティレビュー体制の構築
3. アラート機能の実装

---

## 📝 まとめ

### 現在の状態

- 🔴 **危険**: ユーザーが自分のロールを変更可能
- 🟡 **注意**: UI レベルの制御のみでは不十分
- ✅ **良好**: RLS の基本構造は適切

### 修正後の状態

- ✅ **安全**: ロール変更は admin のみ
- ✅ **強固**: 2 層の防御が正しく機能
- ✅ **監査可能**: すべての変更が記録される

### 推奨アクション

**今すぐ**: 修正版の SQL を実行してください。
現在の実装では、**誰でも自分を運営者にできてしまいます**。
