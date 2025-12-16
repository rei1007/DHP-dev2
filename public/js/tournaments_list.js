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
        const status = t.status || 'upcoming';
        const eventDate = t.eventDate;
        const rules = t.rules || [];
        const caster = t.caster || {};
        const commentator = t.commentator || {};
        
        let badgeClass = 'badge-upcoming';
        let badgeText = '開催予定';
        
        if (status === 'ongoing') {
            badgeClass = 'badge-ongoing';
            badgeText = '開催中';
        } else if (status === 'open') {
            badgeClass = 'badge-open';
            badgeText = 'エントリー受付中';
        } else if (status === 'closed') {
            badgeClass = 'badge-closed';
            badgeText = '終了';
        }
        
        let dateHtml = '';
        if (eventDate) {
            const d = new Date(eventDate);
            if (!isNaN(d)) {
                dateHtml = `<div class="card-meta"><span class="text-eng">${d.getFullYear()}.${('0'+(d.getMonth()+1)).slice(-2)}.${('0'+d.getDate()).slice(-2)}</span></div>`;
            }
        }
        
        let rulesHtml = '';
        if (rules.length > 0) {
            rulesHtml = '<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:12px;">';
            rules.forEach(r => {
                const ruleImageMap = {
                    'ナワバリバトル': 'assets/weapon/ルール_ナワバリバトル.png',
                    'ガチエリア': 'assets/weapon/ルール_ガチエリア.png',
                    'ガチヤグラ': 'assets/weapon/ルール_ガチヤグラ.png',
                    'ガチホコバトル': 'assets/weapon/ルール_ガチホコ.png',
                    'ガチホコ': 'assets/weapon/ルール_ガチホコ.png',
                    'ガチアサリ': 'assets/weapon/ルール_ガチアサリ.png'
                };
                const imgSrc = ruleImageMap[r] || '';
                if (imgSrc) {
                    rulesHtml += `<img src="${imgSrc}" alt="${escapeHtml(r)}" title="${escapeHtml(r)}" style="width:28px; height:28px; object-fit:contain;">`;
                } else {
                    rulesHtml += `<span class="badge" style="font-weight:400; background:#f0f0f0; border:none; color:#555; font-size:0.75rem; padding:2px 6px;">${escapeHtml(r)}</span>`;
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
        <div class="card-note js-scroll-trigger">
            <div class="card-note-inner">
                <div class="card-note-content">
                    <div class="u-mb-10" style="margin-bottom:8px;">
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    </div>
                    ${dateHtml}
                    <h3 style="margin:10px 0; font-size:1.3rem; font-weight:700; color:var(--c-primary-dark);">${escapeHtml(t.name)}</h3>
                    ${rulesHtml}
                    ${staffHtml}
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
