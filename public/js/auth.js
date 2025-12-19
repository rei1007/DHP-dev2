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

// 認証が必要なページ用: ログインしていない場合はlogin.htmlにリダイレクト
export async function requireAuth() {
    const user = await getCurrentUser();
    
    if (!user) {
        console.log('User not authenticated, redirecting to login...');
        window.location.href = 'login.html';
        return null;
    }
    
    // ユーザー情報をusersテーブルに登録/更新
    await ensureUserInDatabase(user);
    
    return user;
}

// ユーザー情報をusersテーブルに登録または更新
async function ensureUserInDatabase(authUser) {
    try {
        const client = await getSupabaseClient();
        
        // Discordから取得したユーザー情報
        const username = authUser.user_metadata?.full_name || 
                        authUser.user_metadata?.name || 
                        authUser.email?.split('@')[0] || 
                        'ユーザー';
        const avatarUrl = authUser.user_metadata?.avatar_url || 
                         authUser.user_metadata?.picture || 
                         null;
        
        console.log('👤 Ensuring user in database:', {
            id: authUser.id,
            email: authUser.email,
            username,
            avatarUrl
        });
        
        // 既存のユーザーをチェック
        const { data: existingUser, error: fetchError } = await client
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking existing user:', fetchError);
            throw fetchError;
        }
        
        if (existingUser) {
            // 既存ユーザーの情報を更新
            console.log('Updating existing user...');
            const { error: updateError } = await client
                .from('users')
                .update({
                    email: authUser.email,
                    username: username,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', authUser.id);
            
            if (updateError) {
                console.error('Error updating user:', updateError);
                throw updateError;
            }
            
            console.log('✅ User updated successfully');
        } else {
            // 新規ユーザーを登録（デフォルトロール: pending）
            console.log('Creating new user with pending role...');
            const { error: insertError } = await client
                .from('users')
                .insert([{
                    id: authUser.id,
                    email: authUser.email,
                    username: username,
                    avatar_url: avatarUrl,
                    role: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);
            
            if (insertError) {
                console.error('Error creating user:', insertError);
                throw insertError;
            }
            
            console.log('✅ New user created successfully with pending role');
        }
    } catch (err) {
        console.error('Failed to ensure user in database:', err);
        // エラーが発生してもログインは継続
    }
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
