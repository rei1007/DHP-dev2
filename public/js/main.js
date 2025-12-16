
import { escapeHtml } from "./common.js";

// ==========================================
// Mock Data Utilities
// ==========================================
// const KEY_TOUR = 'dhp_tournaments';
// const KEY_NEWS = 'dhp_news';
// Use common.js if imported, but for now duplicate reference or remove if common.js is solid.
// But wait, main.js previously had them. User asked to export them from common.js.
// I should update main.js to import them.
import { getLocalData, setLocalData, KEY_TOUR, KEY_NEWS } from "./common.js";

// Inject Sample Data if empty (logic moved or kept here? kept here for init)
function initSampleData() {
    if (getLocalData(KEY_TOUR).length === 0) {
        setLocalData(KEY_TOUR, [
            { id: 1, name: 'Sample Tournament Cup', eventDate: '2025-01-20 19:00', status: 'upcoming', rules: ['ナワバリバトル'] },
            { id: 2, name: 'DHP Weekly #1', eventDate: '2024-12-10 20:00', status: 'closed', rules: ['エリア', 'ヤグラ'] },
            { id: 3, name: 'Sample Open Cup', eventDate: '2025-02-10 20:00', status: 'open', entryEnd: '2025-02-09', rules: ['ホコ'] },
            { id: 4, name: 'Sample Open Cup 2', eventDate: '2025-02-15 20:00', status: 'open', entryEnd: '2025-02-14', rules: ['アサリ'] }
        ]);
    }
    if (getLocalData(KEY_NEWS).length === 0) {
        setLocalData(KEY_NEWS, [
            { id: 1, title: 'サイトをリニューアルしました', publishedAt: '2024-12-15', badge: 'info', type: 'normal', body: 'DHPの公式サイトをリニューアルしました。' },
            { id: 2, title: '第1回 大会エントリー開始', publishedAt: '2025-01-05', badge: 'recruit', type: 'normal', body: '皆様の参加をお待ちしております。' }
        ]);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initSampleData();
    loadTournaments();
    loadNews();
    checkOpenEntry();
});

// --- Floating Entry Button Logic ---
function checkOpenEntry() {
    const tours = getLocalData(KEY_TOUR);
    const openTours = tours.filter(t => t.status === 'open');
    const floatBtn = document.getElementById('floatingEntryBtn');
    
    if (openTours.length > 0 && floatBtn) {
        // Show primary (first)
        const top = openTours[0];
        const dateInfo = getFormatEntryDate(top);

        // Expanded List Generation
        let expandToggleHtml = '';
        let listHtml = '';
        
        if (openTours.length > 1) {
            const count = openTours.length - 1;
            expandToggleHtml = `<div class="entry-expand-toggle" id="btnExpandEntry">▼ 他${count}件</div>`;
            
            listHtml = '<div class="entry-list-container u-hidden" id="entryExpandedList">';
            openTours.forEach((t, idx) => {
                if(idx===0) return; // skip top
                listHtml += `
                <div class="entry-item-row">
                    <div style="flex:1;">
                         <div style="font-size:0.9rem; font-weight:700; color:#0c2461;">${escapeHtml(t.name)}</div>
                         <div style="font-size:0.75rem; color:#666;">${escapeHtml(getFormatEntryDate(t))}</div>
                    </div>
                    <a href="#latest" class="entry-notif-btn" style="padding:4px 12px; font-size:0.75rem;">確認</a>
                </div>
                `;
            });
            listHtml += '</div>';
        }

        floatBtn.innerHTML = `
            <div class="entry-notif-card">
                <div class="btn-minimize-entry" id="btnMinEntry">×</div>
                <div class="entry-notif-content">
                    <div class="entry-notif-title">${escapeHtml(top.name)}</div>
                    <div class="entry-notif-date">
                        <span style="display:inline-block; width:8px; height:8px; background:#eb2f06; border-radius:50%;"></span>
                        ${escapeHtml(dateInfo)}
                    </div>
                </div>
                <div>
                    <a href="#latest" class="entry-notif-btn">確認</a>
                </div>
            </div>
            ${expandToggleHtml}
            ${listHtml}
            <div class="btn-restore-entry" id="btnRestoreEntry">エントリー受付中</div>
        `;
        floatBtn.style.display = 'flex';
        
        // Event for expand
        const btnExp = document.getElementById('btnExpandEntry');
        if(btnExp) {
            btnExp.addEventListener('click', () => {
                const list = document.getElementById('entryExpandedList');
                if(list.classList.contains('u-hidden')) {
                     list.classList.remove('u-hidden');
                     btnExp.innerText = `▲ 閉じる`;
                } else {
                    list.classList.add('u-hidden');
                    const count = openTours.length - 1;
                    btnExp.innerText = `▼ 他${count}件`;
                }
            });
        }
        
        // Event for minimize
        document.getElementById('btnMinEntry').addEventListener('click', () => {
            floatBtn.classList.add('minimized');
        });
        // Event for restore
        document.getElementById('btnRestoreEntry').addEventListener('click', () => {
            floatBtn.classList.remove('minimized');
        });
    } else if (floatBtn) {
        floatBtn.style.display = 'none';
    }
}
function getFormatEntryDate(t) {
    if(!t.entryPeriod || !t.entryPeriod.end) return 'エントリー受付中';
    const end = new Date(t.entryPeriod.end);
    if(isNaN(end)) return 'エントリー受付中';
    return `~ ${end.getMonth()+1}/${end.getDate()} ${('0'+end.getHours()).slice(-2)}:${('0'+end.getMinutes()).slice(-2)} まで`;
}

// --- Tournaments ---
function loadTournaments() {
    const list = document.getElementById('tourList');
    if (!list) return;

    try {
        const data = getLocalData(KEY_TOUR);

        if (!data || data.length === 0) {
            list.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#aaa;">現在表示できる大会情報はありません。</div>';
            return;
        }

        // Sort: Status priority (ongoing > open > upcoming > closed) + ID desc
        const statusOrder = { 'ongoing': 0, 'open': 1, 'upcoming': 2, 'closed': 3 };
        data.sort((a, b) => {
            const sA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 99;
            const sB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 99;
            if (sA !== sB) return sA - sB;
            return b.id - a.id;
        });

        const displayData = data.slice(0, 6);

        let html = '';
        displayData.forEach(t => {
            const name = t.name || '名称未設定';
            const status = t.status || 'upcoming';
            const eventDate = t.eventDate || '未定';
            const rules = t.rules || []; 

            let badgeClass = 'upcoming';
            let badgeLabel = '開催予定';
            let btnLabel = '大会詳細'; // Default
            let btnClass = 'btn-outline';
            
            if (status === 'open') { 
                badgeClass = 'open'; badgeLabel = 'エントリー受付中'; 
                btnLabel = '大会情報'; btnClass = 'btn-primary';
            }
            else if (status === 'ongoing') {
                badgeClass = 'ongoing'; badgeLabel = '開催中';
                btnLabel = '大会詳細'; btnClass = 'btn-primary';
            }
            else if (status === 'closed') { 
                badgeClass = 'closed'; badgeLabel = '大会終了'; 
                btnLabel = '大会結果'; btnClass = 'btn-outline';
            }

            // Date Formatting (Always show time)
            let dateStr = eventDate;
            try {
                const d = new Date(eventDate);
                if (!isNaN(d)) {
                    dateStr = `${d.getFullYear()}.${('0'+(d.getMonth()+1)).slice(-2)}.${('0'+d.getDate()).slice(-2)} ${('0'+d.getHours()).slice(-2)}:${('0'+d.getMinutes()).slice(-2)}`;
                }
            } catch(e){}

            // Rules Icon
            // Assuming image path convention: assets/icon_rule_{rule}.png or similar
            // For now just text or simple logic if images available.
            let rulesHtml = '';
            if (rules.length > 0) {
                rulesHtml = '<div class="rule-icons">';
                rules.forEach(r => {
                    // map rule name to icon filename if needed
                    // Simple text fallback or placeholder icons
                    // User requested "Academic" feel, maybe simple text tags? 
                    // Let's use generic placeholder icons for now or styled text.
                    // rulesHtml += `<span style="font-size:0.8rem; background:#eee; padding:2px 6px; border-radius:4px;">${escapeHtml(r)}</span>`;
                    
                    // Attempt image if assets exist. 
                    // For now, let's use a placeholder img tag with alt.
                    // rulesHtml += `<img src="assets/rule_icon.png" alt="${r}" class="rule-icon" title="${r}">`;
                    // Wait, user provided specific rule names in admin. 
                    // Let's use simple span badges for now to be safe.
                    rulesHtml += `<span class="badge" style="font-weight:400; background:#f0f0f0; border:none; color:#555;">${escapeHtml(r)}</span>`;
                });
                rulesHtml += '</div>';
            }

            html += `
            <div class="card-note js-scroll-trigger">
                <div class="card-note-inner">
                    <div class="card-note-content">
                        <div class="u-mb-10">
                            <span class="badge ${badgeClass}">${badgeLabel}</span>
                        </div>
                        <h3 style="margin:0 0 10px; font-size:1.2rem; line-height:1.4;">${escapeHtml(name)}</h3>
                        <div style="font-size:0.9rem; color:#666; display:flex; align-items:center; gap:5px;">
                            <span>📅</span> ${escapeHtml(dateStr)}
                        </div>
                        ${rulesHtml}
                    </div>
                    <div class="card-note-action">
                         <button class="btn ${btnClass} btn-sm" onclick="alert('詳細ページは準備中です')">${btnLabel}</button>
                    </div>
                </div>
            </div>
            `;
        });
        list.innerHTML = html;

    } catch (e) {
        console.error(e);
        list.innerHTML = 'Error loading tournaments.';
    }
}


// --- News ---
function loadNews() {
    const list = document.getElementById('newsList');
    if (!list) return;

    const data = getLocalData(KEY_NEWS);
    if (!data || data.length === 0) {
        list.innerHTML = '<li style="padding:10px; color:#aaa;">お知らせはありません</li>';
        return;
    }

    // Sort Date Desc
    data.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const displayData = data.slice(0, 3); // Top 3

    let html = '';
    displayData.forEach(n => {
        let badgeHtml = '';
        const type = n.type || 'normal';
        
        if (type === 'tournament') {
            badgeHtml = '<span class="badge-news tour">大会情報</span>';
        } else {
            const b = n.badge || 'info';
            if (b === 'recruit') {
                badgeHtml = '<span class="badge-news recruit">運営募集</span>';
            } else if (b === 'important') {
                badgeHtml = '<span class="badge-news important">重要</span>';
            } else {
                badgeHtml = '<span class="badge-news info">お知らせ</span>';
            }
        }

        const dateStr = n.publishedAt || '----.--.--';
        
        html += `
            <li class="news-item">
                <a href="news_detail.html?id=${n.id}">
                    <span class="news-date">${escapeHtml(dateStr)}</span>
                    ${badgeHtml}
                    <span class="news-title">${escapeHtml(n.title)}</span>
                </a>
            </li>
        `;
    });
    list.innerHTML = html;
}
