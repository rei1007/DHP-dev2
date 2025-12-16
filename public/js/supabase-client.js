// Supabase Client Wrapper
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// Supabaseクライアントのインスタンス作成
// window.supabase は <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> で読み込まれる
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// Tournaments API
// ==========================================

export async function getTournaments() {
    const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('id', { ascending: false });
    
    if (error) {
        console.error('Error fetching tournaments:', error);
        return [];
    }
    return data || [];
}

export async function getTournamentById(id) {
    const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        console.error('Error fetching tournament:', error);
        return null;
    }
    return data;
}

export async function createTournament(tournament) {
    const { data, error } = await supabase
        .from('tournaments')
        .insert([tournament])
        .select()
        .single();
    
    if (error) {
        console.error('Error creating tournament:', error);
        throw error;
    }
    return data;
}

export async function updateTournament(id, updates) {
    const { data, error } = await supabase
        .from('tournaments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating tournament:', error);
        throw error;
    }
    return data;
}

export async function deleteTournament(id) {
    const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Error deleting tournament:', error);
        throw error;
    }
    return true;
}

// ==========================================
// News API
// ==========================================

export async function getNews() {
    const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('published_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching news:', error);
        return [];
    }
    return data || [];
}

export async function getNewsById(id) {
    const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        console.error('Error fetching news:', error);
        return null;
    }
    return data;
}

export async function createNews(newsItem) {
    const { data, error } = await supabase
        .from('news')
        .insert([newsItem])
        .select()
        .single();
    
    if (error) {
        console.error('Error creating news:', error);
        throw error;
    }
    return data;
}

export async function updateNews(id, updates) {
    const { data, error } = await supabase
        .from('news')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating news:', error);
        throw error;
    }
    return data;
}

export async function deleteNews(id) {
    const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Error deleting news:', error);
        throw error;
    }
    return true;
}

// ==========================================
// Helper: LocalStorageからSupabaseへの移行
// ==========================================

export async function migrateLocalStorageToSupabase() {
    try {
        // LocalStorageから既存データを取得
        const localTournaments = JSON.parse(localStorage.getItem('dhp_tournaments') || '[]');
        const localNews = JSON.parse(localStorage.getItem('dhp_news') || '[]');

        // Tournaments移行
        if (localTournaments.length > 0) {
            console.log(`Migrating ${localTournaments.length} tournaments...`);
            for (const tour of localTournaments) {
                // IDを除外してSupabaseに挿入（Supabaseが自動でIDを生成）
                const { id, ...tourData } = tour;
                await createTournament({
                    name: tourData.name,
                    status: tourData.status,
                    event_date: tourData.eventDate,
                    entry_period: tourData.entryPeriod,
                    rules_url: tourData.rulesUrl,
                    support_url: tourData.supportUrl,
                    license: tourData.license,
                    rules: tourData.rules,
                    stages: tourData.stages,
                    entry_type: tourData.entryType,
                    xp_limits: tourData.xpLimits,
                    caster: tourData.caster,
                    commentator: tourData.commentator,
                    result: tourData.result,
                    archive_url: tourData.archiveUrl
                });
            }
            console.log('Tournaments migrated successfully!');
        }

        // News移行
        if (localNews.length > 0) {
            console.log(`Migrating ${localNews.length} news items...`);
            for (const news of localNews) {
                const { id, ...newsData } = news;
                await createNews({
                    title: newsData.title,
                    body: newsData.body,
                    published_at: newsData.publishedAt,
                    type: newsData.type,
                    badge: newsData.badge
                });
            }
            console.log('News migrated successfully!');
        }

        console.log('Migration completed!');
        return true;
    } catch (error) {
        console.error('Migration error:', error);
        return false;
    }
}
