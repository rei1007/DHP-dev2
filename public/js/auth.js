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
        
        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                redirectTo: `${window.location.origin}/admin.html`
            }
        });
        
        if (error) {
            console.error('Discord login error:', error);
            throw error;
        }
        
        return data;
    } catch (err) {
        console.error('Login failed:', err);
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

// 認証が必要なページ用: ログインしていない場合はlogin.htmlにリダイレクト
export async function requireAuth() {
    const user = await getCurrentUser();
    
    if (!user) {
        console.log('User not authenticated, redirecting to login...');
        window.location.href = 'login.html';
        return null;
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
