
import { escapeHtml, getTournaments, getNews } from "./common.js";

export async function checkOpenEntry() {
    const tours = await getTournaments();
    const activeTours = tours.filter(t => t.status === 'open' || t.status === 'ongoing');
    
    // ソート: 開催中 → エントリー受付中（締め切り順）
    activeTours.sort((a, b) => {
        // ステータス優先: ongoing > open
        if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
        if (a.status !== 'ongoing' && b.status === 'ongoing') return 1;
        
        // 両方がエントリー受付中の場合、締め切り日時順（早い順）
        if (a.status === 'open' && b.status === 'open') {
            const endA = a.entryPeriod?.end ? new Date(a.entryPeriod.end) : null;
            const endB = b.entryPeriod?.end ? new Date(b.entryPeriod.end) : null;
            
            // 締め切り未設定を後ろに
            if (!endA && endB) return 1;
            if (endA && !endB) return -1;
            if (!endA && !endB) return b.id - a.id; // 両方未設定ならID降順
            
            // 締め切り早い順
            return endA - endB;
        }
        
        return 0;
    });
    
    const floatBtn = document.getElementById('floatingEntryBtn');
    
    if (activeTours.length > 0 && floatBtn) {
        const totalCount = activeTours.length;
        
        const cardsHtml = activeTours.map((t, idx) => {
            const isOngoing = t.status === 'ongoing';
            const dateInfo = getFormatEntryDate(t);
            const dotColor = isOngoing ? '#eb2f06' : '#27ae60';
            const btnColor = isOngoing ? '#eb2f06' : '#27ae60';
            const statusText = isOngoing ? '開催中' : 'エントリー受付中';
            
            return `
                <div class="floating-entry-card ${idx === 0 ? 'active' : ''}" data-index="${idx}">
                    <div class="floating-entry-header">
                        <div class="floating-entry-status" style="color: ${dotColor};">
                            <span class="status-dot" style="background: ${dotColor};"></span>
                            ${statusText}
                        </div>
                        <div class="floating-header-actions">
                            ${totalCount > 1 ? `<span class="card-counter">${idx + 1}/${totalCount}</span>` : ''}
                            <button class="floating-minimize-btn" onclick="window.minimizeFloatingEntry(event)" aria-label="最小化">
                                <span style="margin-right: 4px;">−</span>最小化
                            </button>
                        </div>
                    </div>
                    <h3 class="floating-entry-title">${escapeHtml(t.name)}</h3>
                    <p class="floating-entry-date">${escapeHtml(dateInfo)}</p>
                    <a href="tournament_detail.html?id=${t.id}" class="floating-entry-action" style="background: ${btnColor};">
                        確認する
                    </a>
                </div>
            `;
        }).join('');
        
        const indicatorsHtml = totalCount > 1 
            ? `<div class="floating-entry-indicators">
                ${activeTours.map((_, idx) => `
                    <button class="indicator-dot ${idx === 0 ? 'active' : ''}" 
                            onclick="window.switchFloatingCard(${idx}, true)"
                            aria-label="大会${idx + 1}"></button>
                `).join('')}
               </div>`
            : '';
        
        floatBtn.innerHTML = `
            <div class="floating-entry-container">
                <div class="floating-entry-cards">
                    ${cardsHtml}
                </div>
                ${indicatorsHtml}
            </div>
            <button class="floating-restore-btn" onclick="window.restoreFloatingEntry(event)">
                <span class="restore-icon">📢</span>
                <span class="restore-text">大会情報 ${totalCount > 1 ? `(${totalCount})` : ''}</span>
            </button>
        `;
        
        floatBtn.classList.remove('minimized');
        floatBtn.style.display = 'block';
        
        // 自動切り替えタイマーを停止（既存のものがあれば）
        if (window.floatingAutoSwitchInterval) {
            clearInterval(window.floatingAutoSwitchInterval);
        }
        
        // グローバル関数として定義
        window.minimizeFloatingEntry = function(event) {
            event.preventDefault();
            event.stopPropagation();
            floatBtn.classList.add('minimized');
            
            // 最小化時は自動切り替えを停止
            if (window.floatingAutoSwitchInterval) {
                clearInterval(window.floatingAutoSwitchInterval);
            }
        };
        
        window.restoreFloatingEntry = function(event) {
            event.preventDefault();
            event.stopPropagation();
            floatBtn.classList.remove('minimized');
            
            // 復元時に自動切り替えを再開（複数ある場合のみ）
            if (totalCount > 1) {
                startAutoSwitch();
            }
        };
        
        window.switchFloatingCard = function(index, manual = false) {
            const cards = floatBtn.querySelectorAll('.floating-entry-card');
            const indicators = floatBtn.querySelectorAll('.indicator-dot');
            
            cards.forEach((card, idx) => {
                if (idx === index) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });
            
            indicators.forEach((ind, idx) => {
                if (idx === index) {
                    ind.classList.add('active');
                } else {
                    ind.classList.remove('active');
                }
            });
            
            // 手動切り替え時はタイマーをリセット
            if (manual && totalCount > 1) {
                if (window.floatingAutoSwitchInterval) {
                    clearInterval(window.floatingAutoSwitchInterval);
                }
                startAutoSwitch();
            }
        };
        
        // 自動切り替え開始関数
        const startAutoSwitch = function() {
            let currentIndex = 0;
            window.floatingAutoSwitchInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % totalCount;
                window.switchFloatingCard(currentIndex, false);
            }, 5000); // 5秒ごとに切り替え
        };
        
        // 複数ある場合のみ自動切り替え開始
        if (totalCount > 1) {
            startAutoSwitch();
        }
        
    } else if (floatBtn) {
        floatBtn.style.display = 'none';
        
        // タイマーを停止
        if (window.floatingAutoSwitchInterval) {
            clearInterval(window.floatingAutoSwitchInterval);
        }
    }
}

function getFormatEntryDate(t) {
    if (t.status === 'ongoing') {
        if (t.eventDate) {
            const d = new Date(t.eventDate);
            if (!isNaN(d)) {
                return `${d.getMonth()+1}月${d.getDate()}日 開催中`;
            }
        }
        return '開催中';
    }
    
    if(!t.entryPeriod || !t.entryPeriod.end) return 'エントリー受付中';
    const end = new Date(t.entryPeriod.end);
    if(isNaN(end)) return 'エントリー受付中';
    return `${end.getMonth()+1}月${end.getDate()}日 ${('0'+end.getHours()).slice(-2)}:${('0'+end.getMinutes()).slice(-2)} まで`;
}

// --- Tournaments ---
export async function loadTournaments() {
    console.log('loadTournaments called (main.js)');
    const list = document.getElementById('tourList');
    if (!list) {
        console.error('tourList element not found');
        return;
    }

    try {
        console.log('Fetching tournaments from main.js...');
        const data = await getTournaments();
        console.log('Tournaments fetched in main.js:', data ? data.length : 0);

        if (!data || data.length === 0) {
            list.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#aaa;">現在表示できる大会情報はありません。</div>';
            return;
        }

        // ソートロジック:
        // 1. ステータス優先順: ongoing(開催中) > upcoming(開催予定) > open(エントリー受付中) > closed(終了)
        // 2. 各ステータス内で開催日時順（未設定を最前、その後は日時昇順）
        // 3. 終了済みは日時降順（新しい順）
        const statusOrder = { 'ongoing': 0, 'upcoming': 1, 'open': 2, 'closed': 3 };
        
        data.sort((a, b) => {
            // ステータス優先
            const statusA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 99;
            const statusB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 99;
            
            if (statusA !== statusB) {
                return statusA - statusB;
            }
            
            // 同じステータス内では日時でソート
            const dateA = a.eventDate ? new Date(a.eventDate) : null;
            const dateB = b.eventDate ? new Date(b.eventDate) : null;
            
            // 終了済み以外（ongoing/upcoming/open）の場合
            if (a.status !== 'closed') {
                // 日時未設定を最前に
                if (!dateA && dateB) return -1;
                if (dateA && !dateB) return 1;
                if (!dateA && !dateB) return b.id - a.id; // 両方未設定ならID降順
                
                // 両方設定済みなら日時昇順（早い順）
                return dateA - dateB;
            }
            
            // 終了済み（closed）の場合は日時降順（新しい順）
            if (!dateA && dateB) return 1;
            if (dateA && !dateB) return -1;
            if (!dateA && !dateB) return b.id - a.id;
            
            return dateB - dateA;
        });

        const displayData = data.slice(0, 6);

        let html = '';
        displayData.forEach(t => {
            const name = t.name || '名称未設定';
            const status = t.status || 'upcoming';
            const eventDate = t.eventDate || '未定';
            const rules = t.rules || []; 
            const entryType = t.entryType || 'cross_ok';
            const caster = t.caster || {};
            const commentator = t.commentator || {};

            let badgeClass = 'upcoming';
            let badgeLabel = '開催予定';
            let btnLabel = '大会詳細';
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

            // Entry Type Text
            let entryTypeText = 'クロスサークルOK';
            if (entryType === 'circle_only') entryTypeText = '同一サークル限定';
            else if (entryType === 'invite') entryTypeText = 'サークル選抜';

            // Date Formatting - 目立たせる
            let dateDisplay = eventDate;
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

            // Rules Icon - use images from assets/weapon
            let rulesHtml = '';
            if (rules.length > 0) {
                rulesHtml = '<div class="rule-icons" style="display:flex; gap:6px; margin-top:8px;">';
                rules.forEach(r => {
                    // Map rule names to image filenames
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

            // Staff Info
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
        console.log('Tournaments rendered in main.js');

    } catch (e) {
        console.error('Error loading tournaments:', e);
        list.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:red;">大会情報の読み込みに失敗しました: ' + e.message + '</div>';
    }
}


// --- News ---
export async function loadNews() {
    const list = document.getElementById('newsList');
    if (!list) return;

    const data = await getNews();
    if (!data || data.length === 0) {
        list.innerHTML = '<li style="padding:40px; text-align:center; color:#aaa;">お知らせはありません</li>';
        return;
    }

    // Sort Date Desc
    data.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const displayData = data.slice(0, 3); // Top 3

    let html = '';
    displayData.forEach(n => {
        let badgeHtml = '';
        const badgeOrCategory = n.badge || n.category || 'info';
        
        if (badgeOrCategory === 'tour') {
            badgeHtml = '<span class="badge-news tour">大会情報</span>';
        } else if (badgeOrCategory === 'recruit') {
            badgeHtml = '<span class="badge-news recruit">運営募集</span>';
        } else if (badgeOrCategory === 'important') {
            badgeHtml = '<span class="badge-news important">重要</span>';
        } else {
            badgeHtml = '<span class="badge-news info">お知らせ</span>';
        }

        // Format date
        let dateStr = n.publishedAt || '----.--.--';
        try {
            const d = new Date(n.publishedAt);
            if (!isNaN(d)) {
                dateStr = `${d.getFullYear()}.${('0'+(d.getMonth()+1)).slice(-2)}.${('0'+d.getDate()).slice(-2)}`;
            }
        } catch(e) {}
        
        html += `
            <li class="news-item">
                <a href="news_detail.html?id=${n.id}">
                    <div class="news-header">
                        <span class="news-date">${escapeHtml(dateStr)}</span>
                        ${badgeHtml}
                    </div>
                    <h3 class="news-title">${escapeHtml(n.title)}</h3>
                </a>
            </li>
        `;
    });
    list.innerHTML = html;
}

