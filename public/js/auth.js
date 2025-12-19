// ==========================================
// 認証管理モジュール (Discord OAuth)
// ==========================================

import { initSupabaseClient } from './common.js';

let supabaseClient = null;

// Supabaseクライアントを取得または初期化
async function getSupabaseClient() {
    if (!supabaseClient) {
        supabaseClient = await initSupabaseClient();
    }
    return supabaseClient;
}

// Discordでログイン (OAuth)
export async function loginWithDiscord() {
    try {
        const client = await getSupabaseClient();
        
        const redirectUrl = `${window.location.origin}/admin.html`;
        console.log('🔐 Discord Login - Redirect URL:', redirectUrl);
        console.log('🔐 Window origin:', window.location.origin);
        
        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                redirectTo: redirectUrl
            }
        });
        
        if (error) {
            console.error('❌ Discord login error:', error);
            throw error;
        }
        
        console.log('✅ Discord login initiated:', data);
        return data;
    } catch (err) {
        console.error('❌ Login failed:', err);
        alert('ログインに失敗しました: ' + err.message);
        throw err;
    }
}

// ログアウト
export async function logout() {
    try {
        const client = await getSupabaseClient();
        
        const { error } = await client.auth.signOut();
        
        if (error) {
            console.error('Logout error:', error);
            throw error;
        }
        
        // ログインページにリダイレクト
        window.location.href = 'login.html';
    } catch (err) {
        console.error('Logout failed:', err);
        alert('ログアウトに失敗しました: ' + err.message);
        throw err;
    }
}

// 現在のユーザーセッションを取得
export async function getCurrentUser() {
    try {
        const client = await getSupabaseClient();
        
        const { data: { user }, error } = await client.auth.getUser();
        
        if (error) {
            console.error('Get user error:', error);
            return null;
        }
        
        return user;
    } catch (err) {
        console.error('Get current user failed:', err);
        return null;
    }
}

// ホワイトリストチェック: ユーザーが管理者として登録されているかを確認
export async function checkWhitelist(user) {
    try {
        const client = await getSupabaseClient();
        
        // Discord ID（provider_id）でチェック
        const discordId = user.user_metadata?.provider_id || user.user_metadata?.sub;
        
        if (!discordId) {
            console.error('❌ Discord ID not found in user metadata');
            return false;
        }
        
        console.log('🔍 Checking whitelist for Discord ID:', discordId);
        
        const { data, error } = await client
            .from('admin_whitelist')
            .select('*')
            .eq('discord_id', discordId)
            .maybeSingle();
        
        if (error) {
            console.error('❌ Whitelist check error:', error);
            return false;
        }
        
        if (!data) {
            console.warn('⚠️ User not in whitelist');
            return false;
        }
        
        console.log('✅ User is whitelisted:', data);
        return true;
    } catch (err) {
        console.error('❌ Whitelist check failed:', err);
        return false;
    }
}

// 認証が必要なページ用: ログインしていない場合はlogin.htmlにリダイレクト
// ホワイトリストチェックも実行
export async function requireAuth(skipWhitelistCheck = false) {
    const user = await getCurrentUser();
    
    if (!user) {
        console.log('User not authenticated, redirecting to login...');
        window.location.href = 'login.html';
        return null;
    }
    
    // ホワイトリストチェック（オプション）
    if (!skipWhitelistCheck) {
        const isWhitelisted = await checkWhitelist(user);
        
        if (!isWhitelisted) {
            console.log('User not in whitelist, redirecting to unauthorized page...');
            // 未承認ページにリダイレクト
            window.location.href = 'unauthorized.html';
            return null;
        }
    }
    
    return user;
}

// 認証状態の変更を監視
export async function onAuthStateChange(callback) {
    try {
        const client = await getSupabaseClient();
        
        const { data } = client.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session);
            callback(event, session);
        });
        
        return data;
    } catch (err) {
        console.error('Auth state change listener failed:', err);
        return null;
    }
}
