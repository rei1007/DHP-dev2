
// ==========================================
// UTILITIES & SUPABASE CLIENT  
// ==========================================

// Supabaseクライアントのインスタンス（グローバルから取得）
let supabaseClient = null;
let initPromise = null; // 初期化Promiseを保持

// Wait for Supabase library to load
function waitForSupabaseLibrary(maxAttempts = 50) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            console.log(`[waitForSupabaseLibrary] Attempt ${attempts}, window.supabase:`, !!window.supabase);
            if (window.supabase) {
                clearInterval(checkInterval);
                console.log(`✅ Supabase library loaded after ${attempts} attempts`);
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.error('❌ Supabase library failed to load after', attempts, 'attempts');
                reject(new Error('Supabase library failed to load'));
            }
        }, 100); // Check every 100ms
    });
}

// Supabaseクライアントの初期化を試行
export async function initSupabaseClient() {
    console.log('[initSupabaseClient] Called');
    
    // 既に初期化済みまたは初期化中の場合
    if (supabaseClient) {
        console.log('[initSupabaseClient] Already initialized');
        return supabaseClient;
    }
    if (initPromise) {
        console.log('[initSupabaseClient] Initialization in progress, waiting...');
        return initPromise;
    }
    
    initPromise = (async () => {
        try {
            // Wait for Supabase library to be available
            console.log('[initSupabaseClient] Waiting for Supabase library...');
            await waitForSupabaseLibrary();
            
            // Import config
            console.log('[initSupabaseClient] Loading config...');
            const config = await import('./supabase-config.js');
            console.log('[initSupabaseClient] Config loaded:', config.SUPABASE_URL);
            
            // Create client
            supabaseClient = window.supabase.createClient(
                config.SUPABASE_URL,
                config.SUPABASE_ANON_KEY
            );
            console.log('✅ Supabase client initialized successfully');
            return supabaseClient;
        } catch (err) {
            console.error('❌ Supabase initialization error:', err);
            alert('Supabase初期化エラー: ' + err.message);
            throw err;
        }
    })();
    
    return initPromise;
}

// ==========================================
// Data Access Layer (Supabase Only)
// ==========================================

// Tournaments
export async function getTournaments() {
    console.log('[getTournaments] Called');
    
    // 初期化を確実に待つ
    if (!supabaseClient) {
        console.log('[getTournaments] Client not initialized, initializing...');
        try {
            await initSupabaseClient();
            console.log('[getTournaments] Initialization complete');
        } catch (err) {
            console.error('[getTournaments] Initialization failed:', err);
            alert('Supabase初期化エラー: ' + err.message);
            return [];
        }
    }
    
    if (!supabaseClient) {
        console.error('[getTournaments] Client still not initialized after init attempt');
        return [];
    }
    
    try {
        console.log('[getTournaments] Fetching from Supabase...');
        const { data, error } = await supabaseClient
            .from('tournaments')
            .select('*')
            .order('id', { ascending: false });
        
        if (error) {
            console.error('[getTournaments] Supabase error:', error);
            throw error;
        }
        
        console.log('[getTournaments] Fetched', data?.length || 0, 'records');
        
        // データ形式の変換（snake_case → camelCase）
        return (data || []).map(item => ({
            id: item.id,
            name: item.name,
            status: item.status,
            eventDate: item.event_date,
            entryPeriod: item.entry_period,
            rulesUrl: item.rules_url,
            supportUrl: item.support_url,
            entryMethod: item.entry_method,
            entryFormUrl: item.entry_form_url,
            license: item.license,
            rules: item.rules,
            stages: item.stages,
            entryType: item.entry_type,
            xpLimits: item.xp_limits,
            caster: item.caster,
            commentator: item.commentator,
            coordinator: item.coordinator,
            result: item.result,
            archiveUrl: item.archive_url
        }));
    } catch (e) {
        console.error('[getTournaments] Error:', e);
        alert('大会データ取得エラー: ' + e.message);
        return [];
    }
}

// Save Tournament (Insert or Update)
export async function saveTournament(tournamentData) {
    if (!supabaseClient) {
        await initSupabaseClient();
    }
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized');
    }

    const { id, ...rest } = tournamentData;
    
    // snake_caseに変換
    const dbData = {
        name: rest.name,
        status: rest.status,
        event_date: rest.eventDate,
        entry_period: rest.entryPeriod,
        rules_url: rest.rulesUrl,
        support_url: rest.supportUrl,
        entry_method: rest.entryMethod,
        entry_form_url: rest.entryFormUrl,
        license: rest.license,
        rules: rest.rules,
        stages: rest.stages,
        entry_type: rest.entryType,
        xp_limits: rest.xpLimits,
        caster: rest.caster,
        commentator: rest.commentator,
        coordinator: rest.coordinator,
        result: rest.result,
        archive_url: rest.archiveUrl
    };
    
    // IDが存在して、かつ小さい数値(Supabaseの自動採番ID)の場合はUPDATE
    // IDが大きい数値(timestamp)または存在しない場合はINSERT
    let shouldUpdate = false;
    if (id && id < 1000000) {
        // IDが存在するかチェック
        const { data: existing } = await supabaseClient
            .from('tournaments')
            .select('id')
            .eq('id', id)
            .single();
        shouldUpdate = !!existing;
    }
    
    if (shouldUpdate) {
        const { data, error } = await supabaseClient
            .from('tournaments')
            .update(dbData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return { ...tournamentData, id: data.id };
    } else {
        const { data, error } = await supabaseClient
            .from('tournaments')
            .insert([dbData])
            .select()
            .single();
        if (error) throw error;
        return { ...tournamentData, id: data.id };
    }
}

// Delete Tournament
export async function deleteTournament(id) {
    if (!supabaseClient) {
        await initSupabaseClient();
    }
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized');
    }

    const { error } = await supabaseClient
        .from('tournaments')
        .delete()
        .eq('id', id);
        
    if (error) throw error;
}

// ==========================================
// News Functions
// ==========================================

// News
export async function getNews() {
    console.log('[getNews] Called');
    
    if (!supabaseClient) {
        try {
            await initSupabaseClient();
        } catch (err) {
            console.error('[getNews] Initialization failed');
            return [];
        }
    }
    
    if (!supabaseClient) {
        console.error('[getNews] Client not initialized');
        return [];
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('news')
            .select('*')
            .order('published_at', { ascending: false });
        
        if (error) throw error;
        
        return (data || []).map(item => ({
            id: item.id,
            title: item.title,
            category: item.category,
            badge: item.category,  // admin.jsでの互換性のためbadgeとしても返す
            content: item.content,
            body: item.content,    // admin.jsでの互換性のためbodyとしても返す
            publishedAt: item.published_at
        }));
    } catch (e) {
        console.error('[getNews] Error:', e);
        return [];
    }
}

// Save News (Insert or Update)
export async function saveNews(newsData) {
    if (!supabaseClient) {
        await initSupabaseClient();
    }
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized');
    }

    const { id, type, ...rest } = newsData;  // typeフィールドを除外
    
    const dbData = {
        title: rest.title,
        category: rest.badge || rest.category || 'info',  // badge または category
        content: rest.body || rest.content || '',          // body または content
        published_at: rest.publishedAt
    };
    
    console.log('[saveNews] Saving data:', { id, dbData });
    
    // Same logic as tournaments
    let shouldUpdate = false;
    if (id && id < 1000000) {
        const { data: existing } = await supabaseClient
            .from('news')
            .select('id')
            .eq('id', id)
            .single();
        shouldUpdate = !!existing;
    }
    
    if (shouldUpdate) {
        console.log('[saveNews] Updating existing news');
        const { data, error } = await supabaseClient
            .from('news')
            .update(dbData)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('[saveNews] Update error:', error);
            throw error;
        }
        return { ...newsData, id: data.id };
    } else {
        console.log('[saveNews] Inserting new news');
        const { data, error } = await supabaseClient
            .from('news')
            .insert([dbData])
            .select()
            .single();
        if (error) {
            console.error('[saveNews] Insert error:', error);
            throw error;
        }
        return { ...newsData, id: data.id };
    }
}

// Delete News
export async function deleteNews(id) {
    if (!supabaseClient) {
        await initSupabaseClient();
    }
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized');
    }

    const { error} = await supabaseClient
        .from('news')
        .delete()
        .eq('id', id);
        
    if (error) throw error;
}

// ==========================================
// Utility Functions
// ==========================================

// HTML Escape
export function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Format Date
export function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return `${d.getFullYear()}.${('0' + (d.getMonth() + 1)).slice(-2)}.${('0' + d.getDate()).slice(-2)}`;
    } catch (e) {
        return dateStr;
    }
}

// Format DateTime
export function formatDateTime(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return `${d.getFullYear()}.${('0' + (d.getMonth() + 1)).slice(-2)}.${('0' + d.getDate()).slice(-2)} ${('0' + d.getHours()).slice(-2)}:${('0' + d.getMinutes()).slice(-2)}`;
    } catch (e) {
        return dateStr;
    }
}

// Debounce
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==========================================
// User Management Functions
// ==========================================

// Get all users (with role information)
export async function getUsers() {
    console.log('[getUsers] Called');
    
    if (!supabaseClient) {
        await initSupabaseClient();
    }
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized');
    }
    
    try {
        // adminsテーブルから運営ユーザー情報を取得
        const { data, error } = await supabaseClient
            .from('admins')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('[getUsers] Error:', error);
            throw error;
        }
        
        console.log('[getUsers] Fetched', data?.length || 0, 'users');
        return data || [];
    } catch (e) {
        console.error('[getUsers] Error:', e);
        alert('ユーザーデータ取得エラー: ' + e.message);
        return [];
    }
}

// Update user role
export async function updateUserRole(userId, role) {
    if (!supabaseClient) {
        await initSupabaseClient();
    }
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized');
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('admins')
            .update({ role: role })
            .eq('id', userId)
            .select()
            .single();
        
        if (error) {
            console.error('[updateUserRole] Error:', error);
            throw error;
        }
        
        console.log('[updateUserRole] Updated user role:', data);
        return data;
    } catch (e) {
        console.error('[updateUserRole] Error:', e);
        alert('ロール更新エラー: ' + e.message);
        throw e;
    }
}

// Delete user
export async function deleteUser(userId) {
    if (!supabaseClient) {
        await initSupabaseClient();
    }
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized');
    }
    
    try {
        const { error } = await supabaseClient
            .from('admins')
            .delete()
            .eq('id', userId);
        
        if (error) {
            console.error('[deleteUser] Error:', error);
            throw error;
        }
        
        console.log('[deleteUser] User deleted successfully');
    } catch (e) {
        console.error('[deleteUser] Error:', e);
        alert('アカウント削除エラー: ' + e.message);
        throw e;
    }
}

// ==========================================
// Caster Management Functions (運営用)
// ==========================================

// Get all casters (for admin use)
export async function getCasters() {
    console.log('[getCasters] Called');
    
    if (!supabaseClient) {
        await initSupabaseClient();
    }
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized');
    }
    
    try {
        // castersテーブルから全実況解説者情報を取得（運営メモ含む）
        const { data, error } = await supabaseClient
            .from('casters')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('[getCasters] Error:', error);
            throw error;
        }
        
        console.log('[getCasters] Fetched', data?.length || 0, 'casters');
        return data || [];
    } catch (e) {
        console.error('[getCasters] Error:', e);
        alert('実況解説者データ取得エラー: ' + e.message);
        return [];
    }
}

// Update caster information (for admin use)
export async function updateCaster(casterId, updates) {
    if (!supabaseClient) {
        await initSupabaseClient();
    }
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized');
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('casters')
            .update(updates)
            .eq('id', casterId)
            .select()
            .single();
        
        if (error) {
            console.error('[updateCaster] Error:', error);
            throw error;
        }
        
        console.log('[updateCaster] Updated caster:', data);
        return data;
    } catch (e) {
        console.error('[updateCaster] Error:', e);
        alert('実況解説者情報更新エラー: ' + e.message);
        throw e;
    }
}

// Delete caster (for admin use)
export async function deleteCaster(casterId) {
    if (!supabaseClient) {
        await initSupabaseClient();
    }
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized');
    }
    
    try {
        const { error } = await supabaseClient
            .from('casters')
            .delete()
            .eq('id', casterId);
        
        if (error) {
            console.error('[deleteCaster] Error:', error);
            throw error;
        }
        
        console.log('[deleteCaster] Caster deleted successfully');
    } catch (e) {
        console.error('[deleteCaster] Error:', e);
        alert('実況解説者削除エラー: ' + e.message);
        throw e;
    }
}

