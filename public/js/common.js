
// Use a specific, stable version from esm.sh
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ==========================================
// CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://cbhfbykyymwhlrnoykvp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiaGZieWt5eW13aGxybm95a3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTg3NDIsImV4cCI6MjA4MTEzNDc0Mn0.mNv-zBLRk2XdFs81GMWysH4ooE2V18wJWnD-BFqNtVg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: true, // セッションをLocalStorageに保存
        autoRefreshToken: true,
        detectSessionInUrl: true // URLのハッシュからセッションを復元
    }
});

// ==========================================
// UTILITIES
// ==========================================

export function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}
