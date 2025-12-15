
import { supabase, escapeHtml } from "./common.js";

document.addEventListener('DOMContentLoaded', () => {
    loadTournaments();
    loadNews();
});

// --- Tournaments ---
async function loadTournaments() {
    const list = document.getElementById('tourList');
    if (!list) return;

    try {
        const { data, error } = await supabase
            .from('tournaments')
            .select('*')
            .order('id', { ascending: false }); // 新しい順

        if (error) throw error;
        if (!data || data.length === 0) {
            // データがない場合
            list.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#aaa;">現在表示できる大会情報はありません。</div>';
            return;
        }

        let html = '';
        // ステータスの優先順位: ENTRY OPEN > UPCOMING > CLOSED
        const statusOrder = { 'open': 1, 'upcoming': 2, 'closed': 3 };
        
        // ソート処理: ステータス順 -> 日付の古い順(近い順) or 新しい順
        // ※ここでは簡易的に元の順序(ID降順)を尊重しつつ、Status優先ソートをかける
        data.sort((a, b) => {
            const sA = statusOrder[a.status] || 99;
            const sB = statusOrder[b.status] || 99;
            if (sA !== sB) return sA - sB;
            return 0; // ID順維持
        });

        // 最大6件表示
        const displayData = data.slice(0, 6);

        displayData.forEach(t => {
            // Key Mapping (Snake -> Camel if needed)
            const name = t.name || '名称未設定';
            const status = t.status || 'upcoming';
            const eventDate = t.eventDate || t.event_date || t.eventdate || '未定';
            const rules = t.rules || []; 
            // rules is array or json string. Assume array based on common usage from previous steps
            const mainRule = (Array.isArray(rules) && rules.length > 0) ? rules[0] : 'ルール未定';

            let badgeClass = 'upcoming';
            let badgeLabel = 'UPCOMING';
            if (status === 'open') { badgeClass = 'open'; badgeLabel = 'ENTRY OPEN'; }
            else if (status === 'closed') { badgeClass = 'closed'; badgeLabel = 'CLOSED'; }

            // Date Formatting
            let dateStr = eventDate;
            try {
                const d = new Date(eventDate);
                if (!isNaN(d)) {
                    // YYYY.MM.DD (Day) HH:mm
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const y = d.getFullYear();
                    const m = ('0' + (d.getMonth()+1)).slice(-2);
                    const dd = ('0' + d.getDate()).slice(-2);
                    const w = days[d.getDay()];
                    const hh = ('0' + d.getHours()).slice(-2);
                    const mm = ('0' + d.getMinutes()).slice(-2);
                    dateStr = `${y}.${m}.${dd} (${w})`;
                    if (status !== 'closed') dateStr += ` ${hh}:${mm}`;
                }
            } catch(e) {}

            html += `
            <article class="card-note">
                <div class="note-content">
                    <span class="badge ${badgeClass}">${badgeLabel}</span>
                    <h3 class="heading-serif" style="margin:10px 0; font-size:1.4rem;">${escapeHtml(name)}</h3>
                    <div class="text-eng" style="color:#666; font-size:0.9rem;">
                        ${escapeHtml(dateStr)}
                    </div>
                    <div style="margin-top:10px; font-size:0.9rem;">
                        <span class="marker">${escapeHtml(mainRule)}</span>
                    </div>
                </div>
            </article>
            `;
        });

        list.innerHTML = html;

    } catch (e) {
        console.error("Tournament Load Error:", e);
        // エラー時は静的モックを残すか、エラー表示するか。
        // 現在はモックがあるので、エラーならコンソールのみに出してUIはいじらないのも手だが、
        // 開発中はエラーが見えたほうがいいので書き換える。
        list.innerHTML = '<div style="color:red; text-align:center;">データの読み込みに失敗しました</div>';
    }
}

// --- News ---
async function loadNews() {
    const list = document.getElementById('newsList');
    if (!list) return;

    try {
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('publishedAt', { ascending: false })
            .limit(5);

        if (error) throw error;
        if (!data || data.length === 0) {
            list.innerHTML = '<li style="padding:15px; text-align:center; color:#aaa;">お知らせはありません</li>';
            return;
        }

        let html = '';
        data.forEach(n => {
            const title = n.title;
            const date = n.publishedAt || n.publishedat || '----.--.--';
            const badge = n.badge || 'info'; // info, important, recruit
            
            // Badge Style
            let badgeClass = '';
            let badgeLabel = badge.toUpperCase();
            if (badge === 'recruit') { badgeClass = 'open'; badgeLabel = 'Recruit'; }
            if (badge === 'important') { badgeClass = 'upcoming'; badgeLabel = 'Important'; }

            // Date Format
            let dateStr = date;
            try {
                const d = new Date(date);
                if (!isNaN(d)) {
                    dateStr = `${d.getFullYear()}.${('0'+(d.getMonth()+1)).slice(-2)}.${('0'+d.getDate()).slice(-2)}`;
                }
            } catch(e) {}

            html += `
            <li style="padding:15px; border-bottom:1px solid #eee; display:flex; gap:10px; align-items:baseline;">
                <span class="text-eng" style="color:#aaa; font-size:0.85rem; min-width:80px;">${escapeHtml(dateStr)}</span>
                <span class="badge ${badgeClass}" style="padding:2px 6px;">${escapeHtml(badgeLabel)}</span>
                <a href="news.html?id=${n.id}" style="font-weight:500;">${escapeHtml(title)}</a>
            </li>
            `;
        });
        
        list.innerHTML = html;

    } catch (e) {
        console.error("News Load Error:", e);
        list.innerHTML = '<li>Load Error</li>';
    }
}
