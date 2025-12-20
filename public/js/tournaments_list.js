import { getTournaments, escapeHtml } from './common.js';

// ==========================================
// TOURNAMENTS LIST PAGE LOGIC
// ==========================================

let allTournaments = [];
let currentYear = 'all';

async function initTournamentsList() {
    allTournaments = await getTournaments();
    
    // 年フィルターを生成
    renderYearFilter();
    
    // 大会一覧を表示
    renderTournaments(currentYear);
}

function renderYearFilter() {
    const container = document.getElementById('yearFilterContainer');
    if (!container) return;
    
    // 年を抽出
    const years = new Set();
    allTournaments.forEach(t => {
        if (t.eventDate) {
            const year = new Date(t.eventDate).getFullYear();
            if (!isNaN(year)) {
                years.add(year);
            }
        }
    });
    
    const yearArray = Array.from(years).sort((a, b) => b - a); // 降順
    
    let html = '<div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">';
    html += `<button class="btn-filter ${currentYear === 'all' ? 'active' : ''}" onclick="window.filterByYear('all')">すべて</button>`;
    yearArray.forEach(year => {
        html += `<button class="btn-filter ${currentYear === year.toString() ? 'active' : ''}" onclick="window.filterByYear('${year}')">${year}年</button>`;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function renderTournaments(year) {
    const list = document.getElementById('tourListFull');
    if (!list) return;
    
    // フィルタリング
    let filtered = allTournaments;
    if (year !== 'all') {
        filtered = allTournaments.filter(t => {
            if (!t.eventDate) return false;
            const y = new Date(t.eventDate).getFullYear();
            return y.toString() === year;
        });
    }
    
    // ソート: 開催中→開催予定→エントリー受付中→終了
    const statusOrder = { 'ongoing': 0, 'upcoming': 1, 'open': 2, 'closed': 3 };
    
    filtered.sort((a, b) => {
        const statusA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 99;
        const statusB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 99;
        
        if (statusA !== statusB) {
            return statusA - statusB;
        }
        
        const dateA = a.eventDate ? new Date(a.eventDate) : null;
        const dateB = b.eventDate ? new Date(b.eventDate) : null;
        
        if (a.status !== 'closed') {
            if (!dateA && dateB) return -1;
            if (dateA && !dateB) return 1;
            if (!dateA && !dateB) return b.id - a.id;
            return dateA - dateB;
        }
        
        if (!dateA && dateB) return 1;
        if (dateA && !dateB) return -1;
        if (!dateA && !dateB) return b.id - a.id;
        return dateB - dateA;
    });
    
    if (filtered.length === 0) {
        list.innerHTML = '<div style="padding:40px; text-align:center; color:#999; grid-column:1/-1;">該当する大会はありません</div>';
        return;
    }
    
    // カードのHTML生成（indexと同じスタイル）
    let html = '';
    filtered.forEach(t => {
        const name = t.name || '名称未設定';
        const status = t.status || 'upcoming';
        const eventDate = t.eventDate;
        const rules = t.rules || [];
        const entryType = t.entryType || 'cross_ok';
        const caster = t.caster || {};
        const commentator = t.commentator || {};
        
        let badgeClass = 'upcoming';
        let badgeLabel = '開催予定';
        let btnLabel = '大会詳細';
        let btnClass = 'btn-outline';
        
        if (status === 'open') {
            badgeClass = 'open';
            badgeLabel = 'エントリー受付中';
            btnLabel = '大会情報';
            btnClass = 'btn-primary';
        } else if (status === 'ongoing') {
            badgeClass = 'ongoing';
            badgeLabel = '開催中';
            btnLabel = '大会詳細';
            btnClass = 'btn-primary';
        } else if (status === 'closed') {
            badgeClass = 'closed';
            badgeLabel = '大会終了';
            btnLabel = '大会結果';
            btnClass = 'btn-outline';
        }
        
        // Entry Type Text
        let entryTypeText = 'クロスサークルOK';
        if (entryType === 'circle_only') entryTypeText = '同一サークル限定';
        else if (entryType === 'invite') entryTypeText = 'サークル選抜';
        
        // Date Formatting - 目立たせる
        let dateMonth = '';
        let dateDay = '';
        let dateTime = '';
        try {
            const d = new Date(eventDate);
            if (!isNaN(d)) {
                dateMonth = `${d.getMonth()+1}月`;
                dateDay = `${d.getDate()}日`;
                dateTime = `${('0'+d.getHours()).slice(-2)}:${('0'+d.getMinutes()).slice(-2)}`;
            }
        } catch(e){}
        
        let rulesHtml = '';
        if (rules.length > 0) {
            rulesHtml = '<div class="rule-icons" style="display:flex; gap:6px; margin-top:8px;">';
            rules.forEach(r => {
                const ruleImageMap = {
                    'ナワバリバトル': 'assets/rules/ルール_ナワバリバトル.png',
                    'ガチエリア': 'assets/rules/ルール_ガチエリア.png',
                    'ガチヤグラ': 'assets/rules/ルール_ガチヤグラ.png',
                    'ガチホコバトル': 'assets/rules/ルール_ガチホコ.png',
                    'ガチホコ': 'assets/rules/ルール_ガチホコ.png',
                    'ガチアサリ': 'assets/rules/ルール_ガチアサリ.png'
                };
                const imgSrc = ruleImageMap[r] || '';
                if (imgSrc) {
                    rulesHtml += `<img src="${imgSrc}" alt="${escapeHtml(r)}" title="${escapeHtml(r)}" style="width:24px; height:24px; object-fit:contain;">`;
                } else {
                    rulesHtml += `<span style="font-size:0.75rem; color:#666;">${escapeHtml(r)}</span>`;
                }
            });
            rulesHtml += '</div>';
        }
        
        let staffHtml = '';
        if (caster.name || commentator.name) {
            staffHtml = '<div style="margin-top:10px; display:flex; gap:12px; flex-wrap:wrap;">';
            
            if (caster.name) {
                const casterIcon = caster.icon || '';
                staffHtml += `
                    <div style="display:flex; align-items:center; gap:5px; font-size:0.8rem; color:#666;">
                        ${casterIcon ? `<img src="${escapeHtml(casterIcon)}" style="width:20px; height:20px; border-radius:50%; object-fit:cover;" alt="実況">` : '<span style="width:20px; height:20px; display:flex; align-items:center; justify-content:center; background:#e0e0e0; border-radius:50%; font-size:0.55rem; color:#666;">実</span>'}
                        <span>実況: ${escapeHtml(caster.name)}</span>
                    </div>
                `;
            }
            
            if (commentator.name) {
                const commentatorIcon = commentator.icon || '';
                staffHtml += `
                    <div style="display:flex; align-items:center; gap:5px; font-size:0.8rem; color:#666;">
                        ${commentatorIcon ? `<img src="${escapeHtml(commentatorIcon)}" style="width:20px; height:20px; border-radius:50%; object-fit:cover;" alt="解説">` : '<span style="width:20px; height:20px; display:flex; align-items:center; justify-content:center; background:#e0e0e0; border-radius:50%; font-size:0.55rem; color:#666;">解</span>'}
                        <span>解説: ${escapeHtml(commentator.name)}</span>
                    </div>
                `;
            }
            
            staffHtml += '</div>';
        }
        
        html += `
        <div class="card-note">
            <div class="card-note-inner">
                <div class="card-note-content">
                    <div class="u-mb-10" style="margin-bottom:8px;">
                        <span class="badge ${badgeClass}">${badgeLabel}</span>
                    </div>
                    <h3 style="margin:0 0 8px; font-size:1.15rem; line-height:1.3;">${escapeHtml(name)}</h3>
                    
                    <!-- 目立つ日時表示 -->
                    <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:6px;">
                        <span style="font-size:1.3rem; font-weight:700; color:#0c2461;">${dateMonth} ${dateDay}</span>
                        <span style="font-size:1rem; font-weight:600; color:#1e3799;">${dateTime}</span>
                    </div>
                    
                    <!-- エントリータイプ -->
                    <div style="font-size:0.8rem; color:#666; margin-bottom:6px;">
                        参加形式: ${escapeHtml(entryTypeText)}
                    </div>
                    
                    ${rulesHtml}
                    ${staffHtml}
                </div>
                <div class="card-note-action">
                    <a href="tournament_detail.html?id=${t.id}" class="btn ${btnClass} btn-sm">${btnLabel}</a>
                </div>
            </div>
        </div>
        `;
    });
    
    list.innerHTML = html;
}

// グローバル関数
window.filterByYear = function(year) {
    currentYear = year;
    renderYearFilter();
    renderTournaments(year);
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initTournamentsList();
});
