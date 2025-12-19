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
    console.log('🔧 [ensureUserInDatabase] Starting...');
    console.log('🔧 [ensureUserInDatabase] authUser:', authUser);
    
    try {
        const client = await getSupabaseClient();
        console.log('🔧 [ensureUserInDatabase] Supabase client obtained');
        
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
        console.log('🔍 Checking for existing user...');
        const { data: existingUser, error: fetchError } = await client
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('❌ Error checking existing user:', fetchError);
            console.error('❌ Error details:', JSON.stringify(fetchError, null, 2));
            alert('ユーザー確認エラー: ' + fetchError.message);
            throw fetchError;
        }
        
        console.log('🔍 Existing user check result:', existingUser);
        
        if (existingUser) {
            // 既存ユーザーの情報を更新
            console.log('🔄 Updating existing user...');
            const updateData = {
                email: authUser.email,
                username: username,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            };
            console.log('🔄 Update data:', updateData);
            
            const { data: updateResult, error: updateError } = await client
                .from('users')
                .update(updateData)
                .eq('id', authUser.id)
                .select();
            
            if (updateError) {
                console.error('❌ Error updating user:', updateError);
                console.error('❌ Error details:', JSON.stringify(updateError, null, 2));
                alert('ユーザー更新エラー: ' + updateError.message);
                throw updateError;
            }
            
            console.log('✅ User updated successfully:', updateResult);
        } else {
            // 新規ユーザーを登録（デフォルトロール: pending）
            console.log('➕ Creating new user with pending role...');
            const insertData = {
                id: authUser.id,
                email: authUser.email,
                username: username,
                avatar_url: avatarUrl,
                role: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            console.log('➕ Insert data:', insertData);
            
            const { data: insertResult, error: insertError } = await client
                .from('users')
                .insert([insertData])
                .select();
            
            if (insertError) {
                console.error('❌ Error creating user:', insertError);
                console.error('❌ Error details:', JSON.stringify(insertError, null, 2));
                console.error('❌ Error code:', insertError.code);
                console.error('❌ Error message:', insertError.message);
                console.error('❌ Error hint:', insertError.hint);
                console.error('❌ Error details:', insertError.details);
                alert('ユーザー作成エラー: ' + insertError.message + '\n詳細はコンソールを確認してください');
                throw insertError;
            }
            
            console.log('✅ New user created successfully:', insertResult);
        }
        
        console.log('🔧 [ensureUserInDatabase] Completed successfully');
        
        // ========================================
        // 運営ロールチェック（アクセス制限）
        // ========================================
        console.log('🔒 Checking user role for admin access...');
        
        // ユーザーのロールを再取得して確認
        const { data: userRole, error: roleError } = await client
            .from('users')
            .select('role')
            .eq('id', authUser.id)
            .single();
        
        if (roleError) {
            console.error('❌ Error fetching user role:', roleError);
            alert('ロール確認エラー: ' + roleError.message);
            window.location.href = 'index.html';
            throw new Error('Failed to verify user role');
        }
        
        console.log('🔒 User role:', userRole.role);
        
        // 運営ロール以外はアクセス拒否
        if (userRole.role !== 'admin') {
            console.warn('⚠️ Access denied: User does not have admin role');
            alert('運営ダッシュボードへのアクセス権限がありません。\n\n運営ロールが付与されるまでお待ちください。');
            window.location.href = 'index.html';
            throw new Error('Unauthorized: User role is not admin');
        }
        
        console.log('✅ Admin role verified. Access granted.');
        
    } catch (err) {
        console.error('❌❌❌ Failed to ensure user in database:', err);
        console.error('❌❌❌ Error stack:', err.stack);
        
        // アクセス拒否エラーの場合は再スロー
        if (err.message.includes('Unauthorized')) {
            throw err;
        }
        
        // その他のエラーの場合
        if (!err.message.includes('already exists')) {
            console.error('❌ CRITICAL ERROR - User not saved to database!');
        }
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
