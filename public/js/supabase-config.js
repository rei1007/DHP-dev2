// Supabase Configuration
// 本番環境では環境変数を使用してください

export const SUPABASE_URL = 'https://codprksobamygdcxwyvt.supabase.co'; // 例: 'https://xxxxx.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZHBya3NvYmFteWdkY3h3eXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzM1MjksImV4cCI6MjA4MTQ0OTUyOX0.hyDD5PUtRZE7GYvvfZNQL7Ba62uqGilSMhDFRbtn7QU'; // anonキーをここに貼り付け

// Supabaseクライアントの初期化
// CDN経由でSupabase JSクライアントを使用
// index.html, admin.html, news.htmlに以下を追加:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
