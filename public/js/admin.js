
// Standalone Admin Logic
const KEY_TOUR = 'dhp_tournaments';
const KEY_NEWS = 'dhp_news';

// Stage List (Splatoon 3)
const STAGES = [
    'ユノハナ大渓谷', 'ゴンズイ地区', 'ナメロウ金属', 'マテガイ放水路', 'ヤガラ市場',
    'ナンプラー遺跡', 'クサヤ温泉', 'ヒラメが丘団地', 'マサバ海峡大橋', 'キンメダイ美術館',
    'マヒマヒリゾート＆スパ', '海女美術大学', 'チョウザメ造船', 'ザトウマーケット', 'スメーシーワールド',
    'コンブトラック', 'タラポートショッピングパーク', 'マンタマリア号', 'ネギトロ炭鉱', 'タカアシ経済特区',
    'オヒョウ海運', 'バイガイ亭', 'カジキ空港', 'リュウグウターミナル'
];

function getLocal(key) {
    const d = localStorage.getItem(key);
    try {
        return d ? JSON.parse(d) : [];
    } catch(e) { console.error('JSON Parse Error', e); return []; }
}
function setLocal(key, d) {
    localStorage.setItem(key, JSON.stringify(d));
}

// Global Logout Function
window.handleLogout = () => {
    if(confirm('ログアウトしますか？')) {
        window.location.href = 'login.html';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initRouter();
    
    // Global Modal Closers
    const cTour = document.getElementById('closeTourModal');
    if(cTour) cTour.onclick = () => document.getElementById('tourModal').classList.add('u-hidden');
    
    const cNews = document.getElementById('closeNewsModal');
    if(cNews) cNews.onclick = () => document.getElementById('newsModal').classList.add('u-hidden');
});

// --- Routing ---
function initRouter() {
    const links = document.querySelectorAll('.sidebar-link[data-tab]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const tab = link.dataset.tab;
            loadTab(tab);
        });
    });

    // Default Load: Tournaments since Dashboard is removed
    loadTab('tournaments'); 
}

function loadTab(tab) {
    const content = document.getElementById('contentArea');
    const title = document.getElementById('pageTitle');
    
    if (tab === 'tournaments') {
        title.textContent = '大会管理';
        renderTournaments(content);
    } else if (tab === 'news') {
        title.textContent = 'お知らせ管理';
        renderNews(content);
    } 
}

// --- Helper Functions ---
function getStatusLabel(status) {
    const map = {
        'upcoming': '開催予定',
        'open': 'エントリー中',
        'ongoing': '開催中',
        'closed': '終了'
    };
    return map[status] || status;
}

function getNewsBadgeHtml(type, badge) {
    let cls = 'info';
    let label = 'お知らせ';
    
    if (type === 'tournament') {
        cls = 'tour';
        label = '大会情報';
    } else if (badge === 'recruit') {
        cls = 'recruit';
        label = '運営募集';
    } else if (badge === 'important') {
        cls = 'important';
        label = '重要';
    } else if (badge === 'penalty') {
        cls = 'important';
        label = 'ペナルティ';
    }

    return `<span class="badge-news ${cls}">${label}</span>`;
}

// --- Tournaments Logic ---
function renderTournaments(container) {
    const tours = getLocal(KEY_TOUR);
    
    container.innerHTML = `
        <div style="margin-bottom:20px; display:flex; justify-content:flex-end;">
            <button class="btn-primary" style="font-size:0.9rem; padding:10px 24px; border-radius:100px; cursor:pointer; background:#1e3799; color:#fff; border:none; box-shadow:0 4px 10px rgba(30,55,153,0.3);" id="btnNewTour">＋ 新規大会作成</button>
        </div>
        <div class="admin-item-grid">
            ${tours.map(t => {
                const dateDisp = t.eventDate ? t.eventDate.split(' ')[0] : '-';
                return `
                <div class="admin-item-card">
                    <div class="admin-item-header">
                        <div class="admin-item-title">${t.name || t.title}</div>
                        <span class="status-label ${t.status}">${getStatusLabel(t.status)}</span>
                    </div>
                    <div class="admin-item-meta">
                        <span>📅 ${dateDisp}</span>
                        <span>ID: ${t.id}</span>
                    </div>
                     <div class="admin-item-meta">
                        <span>👥 ${t.entryType === 'circle_only' ? 'サークル限定' : (t.entryType === 'invite' ? '招待制' : 'クロスOK')}</span>
                    </div>
                    <div class="admin-item-actions">
                        <button onclick="window.editTour('${t.id}')" class="btn-action edit">編集</button>
                        <button onclick="window.deleteTour('${t.id}')" class="btn-action delete">削除</button>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
    
    setTimeout(() => {
        const btn = document.getElementById('btnNewTour');
        if(btn) btn.onclick = () => openTourModal();
    }, 0);
}

// --- News Logic ---
function renderNews(container) {
    const newsList = getLocal(KEY_NEWS);
    
    // Convert to Card Layout
    container.innerHTML = `
        <div style="margin-bottom:20px; display:flex; justify-content:flex-end;">
            <button class="btn-primary" style="font-size:0.9rem; padding:10px 24px; border-radius:100px; cursor:pointer; background:#1e3799; color:#fff; border:none; box-shadow:0 4px 10px rgba(30,55,153,0.3);" id="btnNewNews">＋ 新規お知らせ作成</button>
        </div>
        <div class="admin-item-grid">
            ${newsList.map(n => `
                <div class="admin-item-card">
                    <div class="admin-item-header">
                        <div style="flex:1;">
                            <div style="margin-bottom:5px;">${getNewsBadgeHtml(n.type, n.badge)}</div>
                            <div class="admin-item-title">${n.title}</div>
                        </div>
                    </div>
                    <div class="admin-item-meta">
                        <span style="font-family:var(--f-eng);">📅 ${n.publishedAt || n.date}</span>
                    </div>
                    <div class="admin-item-actions">
                        <button onclick="window.editNews('${n.id}')" class="btn-action edit">編集</button>
                        <button onclick="window.deleteNews('${n.id}')" class="btn-action delete">削除</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    setTimeout(() => {
        const btn = document.getElementById('btnNewNews');
        if(btn) btn.onclick = () => openNewsModal();
    }, 0);
}

// --- Modals & Actions ---

// Tournaments
window.editTour = (id) => {
    const tours = getLocal(KEY_TOUR);
    const t = tours.find(x => x.id == id);
    if(t) openTourModal(t);
};
window.deleteTour = (id) => {
    if(!confirm('削除しますか？')) return;
    const tours = getLocal(KEY_TOUR).filter(x => x.id != id);
    setLocal(KEY_TOUR, tours);
    loadTab('tournaments');
};

function openTourModal(data = null) {
    const modal = document.getElementById('tourModal');
    const container = document.getElementById('tourFormContainer');
    
    const idVal = data ? data.id : Date.now();
    
    const v = (key, subkey=null) => {
        if (!data) return '';
        if (subkey) return data[key] && data[key][subkey] ? data[key][subkey] : '';
        return data[key] || '';
    };

    const dateVal = v('eventDate'); 
    const entryStart = v('entryPeriod', 'start');
    const entryEnd = v('entryPeriod', 'end');

    const isRule = (r) => data && data.rules && data.rules.includes(r) ? 'checked' : '';
    const isStage = (s) => data && data.stages && (typeof data.stages === 'string' ? data.stages.includes(s) : data.stages.includes(s)) ? 'checked' : '';
    
    const rules = ['ナワバリバトル', 'ガチエリア', 'ガチヤグラ', 'ガチホコバトル', 'ガチアサリ'];

    const stageHtml = STAGES.map(s => `
        <label class="stage-item">
            <input type="checkbox" name="stages" value="${s}" ${isStage(s)}>
            <span class="stage-name">${s}</span>
        </label>
    `).join('');

    container.innerHTML = `
        <form id="formTour">
            <input type="hidden" name="id" value="${idVal}">
            
            <div style="display:flex; gap:30px; flex-wrap:wrap;">
            
                <div style="flex:1; min-width:300px;">
                    <h4 class="form-section-title">基本情報</h4>
                    
                    <div class="form-group">
                        <label class="form-label">大会名</label>
                        <input type="text" name="name" class="form-input" value="${v('name')}" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group u-flex-1">
                            <label class="form-label">ステータス</label>
                            <select name="status" class="form-input">
                                <option value="upcoming" ${v('status')=='upcoming'?'selected':''}>開催予定</option>
                                <option value="open" ${v('status')=='open'?'selected':''}>エントリー受付中</option>
                                <option value="ongoing" ${v('status')=='ongoing'?'selected':''}>開催中</option>
                                <option value="closed" ${v('status')=='closed'?'selected':''}>終了・結果公開</option>
                            </select>
                        </div>
                        <div class="form-group u-flex-1">
                            <label class="form-label">開催日時</label>
                            <input type="text" name="eventDate" class="form-input fp-datetime" value="${dateVal}" placeholder="選択してください">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">エントリー期間</label>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <input type="text" name="entry_start" class="form-input fp-datetime" value="${entryStart}" placeholder="開始">
                            <span>~</span>
                            <input type="text" name="entry_end" class="form-input fp-datetime" value="${entryEnd}" placeholder="終了">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">大会概要URL</label>
                        <input type="url" name="rulesUrl" class="form-input" value="${v('rulesUrl')}">
                    </div>
                    <div class="form-group">
                         <label class="form-label">許諾番号</label>
                         <input type="text" name="license" class="form-input" value="${v('license')}" placeholder="NJ...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">タイカイサポートURL</label>
                        <input type="url" name="supportUrl" class="form-input" value="${v('supportUrl')}">
                    </div>

                    <h4 class="form-section-title">ルール＆ステージ</h4>
                    <div class="form-group">
                        <label class="form-label">採用ルール</label>
                        <div class="checkbox-group">
                            ${rules.map(r => `
                                <label><input type="checkbox" name="rules" value="${r}" ${isRule(r)}>${r}</label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ステージ選択</label>
                        <div class="stage-grid-container">
                            ${stageHtml}
                        </div>
                    </div>
                </div>

                <div style="flex:1; min-width:300px;">
                    <h4 class="form-section-title">参加制限・キャスト</h4>
                    
                    <div class="form-group">
                         <label class="form-label">エントリータイプ</label>
                         <select name="entryType" class="form-input">
                             <option value="circle_only" ${v('entryType')=='circle_only'?'selected':''}>同一サークル限定</option>
                             <option value="cross_ok" ${v('entryType')=='cross_ok'?'selected':''}>クロスサークルOK</option>
                             <option value="invite" ${v('entryType')=='invite'?'selected':''}>招待制</option>
                         </select>
                    </div>

                    <div class="form-row">
                        <div class="form-group u-flex-1">
                            <label class="form-label">平均XP上限</label>
                            <input type="number" name="xpAvg" class="form-input" value="${v('xpLimits', 'avg')}">
                        </div>
                        <div class="form-group u-flex-1">
                            <label class="form-label">最高XP上限</label>
                            <input type="number" name="xpMax" class="form-input" value="${v('xpLimits', 'max')}">
                        </div>
                    </div>

                    <div class="form-group box-light">
                        <label class="form-label">実況 (Caster)</label>
                        <input type="text" name="casterName" placeholder="名前" class="form-input u-mb-5" value="${v('caster', 'name')}">
                        <input type="url" name="casterIcon" placeholder="アイコンURL" class="form-input u-mb-5" value="${v('caster', 'icon')}">
                        <div class="form-row">
                            <input type="text" name="casterX" placeholder="@Twitter" class="form-input u-flex-1" value="${v('caster', 'xId')}">
                            <input type="text" name="casterYt" placeholder="YouTube URL" class="form-input u-flex-1" value="${v('caster', 'ytUrl')}">
                        </div>
                    </div>

                    <div class="form-group box-light">
                        <label class="form-label">解説 (Commentator)</label>
                        <input type="text" name="comName" placeholder="名前" class="form-input u-mb-5" value="${v('commentator', 'name')}">
                        <input type="url" name="comIcon" placeholder="アイコンURL" class="form-input u-mb-5" value="${v('commentator', 'icon')}">
                        <div class="form-row">
                            <input type="text" name="comX" placeholder="@Twitter" class="form-input u-flex-1" value="${v('commentator', 'xId')}">
                            <input type="text" name="comYt" placeholder="YouTube URL" class="form-input u-flex-1" value="${v('commentator', 'ytUrl')}">
                        </div>
                    </div>

                    <h4 class="form-section-title">結果アーカイブ</h4>
                    <div class="form-group">
                        <label class="form-label">優勝チーム名</label>
                        <input type="text" name="winTeam" class="form-input" value="${v('result', 'teamName')}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">優勝メンバー (4名)</label>
                        <div class="form-row">
                            <input type="text" name="winMem1" placeholder="Member 1" class="form-input u-flex-1" value="${v('result', 'members') ? (v('result', 'members')[0]||'') : ''}">
                            <input type="text" name="winMem2" placeholder="Member 2" class="form-input u-flex-1" value="${v('result', 'members') ? (v('result', 'members')[1]||'') : ''}">
                        </div>
                        <div class="form-row u-mt-5">
                            <input type="text" name="winMem3" placeholder="Member 3" class="form-input u-flex-1" value="${v('result', 'members') ? (v('result', 'members')[2]||'') : ''}">
                            <input type="text" name="winMem4" placeholder="Member 4" class="form-input u-flex-1" value="${v('result', 'members') ? (v('result', 'members')[3]||'') : ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">優勝画像URL</label>
                        <input type="url" name="winImage" class="form-input" value="${v('result', 'image')}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">アーカイブURL</label>
                        <input type="url" name="archiveUrl" class="form-input" value="${v('archiveUrl')}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">優勝ポストURL</label>
                        <input type="url" name="winUrl" class="form-input" value="${v('result', 'postUrl')}">
                    </div>
                </div>
            
            </div>

            <div class="modal-actions">
                <button type="submit" class="btn-primary" style="background:#1e3799; color:#fff; padding:10px 40px; border-radius:100px; font-weight:bold;">保存</button>
            </div>
        </form>
    `;
    
    if(window.flatpickr) {
        flatpickr(".fp-datetime", {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            locale: "ja"
        });
    }

    modal.classList.remove('u-hidden');
    
    const form = document.getElementById('formTour');
    form.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        
        const rulesSelected = [];
        form.querySelectorAll('input[name="rules"]:checked').forEach(el => rulesSelected.push(el.value));
        
        const stagesSelected = [];
        form.querySelectorAll('input[name="stages"]:checked').forEach(el => stagesSelected.push(el.value));

        const newTour = {
            id: Number(fd.get('id')),
            name: fd.get('name'),
            status: fd.get('status'),
            eventDate: fd.get('eventDate'),
            entryPeriod: {
                start: fd.get('entry_start'),
                end: fd.get('entry_end')
            },
            rulesUrl: fd.get('rulesUrl'),
            supportUrl: fd.get('supportUrl'),
            rules: rulesSelected,
            stages: stagesSelected,
            entryType: fd.get('entryType'),
            xpLimits: {
                avg: fd.get('xpAvg'),
                max: fd.get('xpMax')
            },
            caster: {
                name: fd.get('casterName'),
                icon: fd.get('casterIcon'),
                xId: fd.get('casterX'),
                ytUrl: fd.get('casterYt')
            },
            commentator: {
                name: fd.get('comName'),
                icon: fd.get('comIcon'),
                xId: fd.get('comX'),
                ytUrl: fd.get('comYt')
            },
            license: fd.get('license'),
            result: {
                teamName: fd.get('winTeam'),
                members: [fd.get('winMem1'), fd.get('winMem2'), fd.get('winMem3'), fd.get('winMem4')],
                image: fd.get('winImage'),
                postUrl: fd.get('winUrl')
            },
            archiveUrl: fd.get('archiveUrl')
        };
        
        const tours = getLocal(KEY_TOUR);
        const idx = tours.findIndex(x => x.id == newTour.id);
        if(idx >= 0) {
            tours[idx] = { ...tours[idx], ...newTour };
        } else {
            tours.push(newTour);
        }
        setLocal(KEY_TOUR, tours);
        modal.classList.add('u-hidden');
        loadTab('tournaments');
    };
}

// News
window.editNews = (id) => {
    const list = getLocal(KEY_NEWS);
    const n = list.find(x => x.id == id);
    if(n) openNewsModal(n);
};
window.deleteNews = (id) => {
    if(!confirm('削除しますか？')) return;
    const list = getLocal(KEY_NEWS).filter(x => x.id != id);
    setLocal(KEY_NEWS, list);
    loadTab('news');
};

function openNewsModal(data = null) {
    const modal = document.getElementById('newsModal');
    const container = document.getElementById('newsFormContainer');
    
    const idVal = data ? data.id : Date.now();
    const dateVal = data ? (data.publishedAt || data.date || '') : new Date().toISOString().slice(0,10);
    const titleVal = data ? data.title : '';
    const bodyVal = data ? (data.body || data.content || '') : '';
    
    let currentType = 'info';
    if (data) {
        if (data.type === 'tournament') currentType = 'tour';
        else if (data.badge === 'important') currentType = 'important';
        else if (data.badge === 'recruit') currentType = 'recruit';
        else currentType = 'info';
    }

    container.innerHTML = `
        <form id="formNews">
            <input type="hidden" name="id" value="${idVal}">
            
            <div class="form-group">
                <label class="form-label">日付</label>
                <input type="text" name="publishedAt" class="form-input fp-date" value="${dateVal}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">タイプ</label>
                <select name="ui_type" class="form-input">
                    <option value="info" ${currentType=='info'?'selected':''}>お知らせ (Info)</option>
                    <option value="important" ${currentType=='important'?'selected':''}>重要 (Important)</option>
                    <option value="recruit" ${currentType=='recruit'?'selected':''}>運営募集 (Recruit)</option>
                    <option value="tour" ${currentType=='tour'?'selected':''}>大会情報 (Tour)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">タイトル</label>
                <input type="text" name="title" class="form-input" value="${titleVal}" required>
            </div>

            <div class="form-group">
                <label class="form-label">内容（HTML可）</label>
                <textarea name="body" class="form-textarea" rows="8" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">${bodyVal}</textarea>
            </div>

            <div class="modal-actions">
                 <button type="submit" class="btn-primary" style="background:#1e3799; color:#fff; padding:10px 40px; border-radius:100px; font-weight:bold;">保存</button>
            </div>
        </form>
    `;

    if(window.flatpickr) {
        flatpickr(".fp-date", {
            dateFormat: "Y-m-d",
            locale: "ja"
        });
    }
    
    modal.classList.remove('u-hidden');
    
    const form = document.getElementById('formNews');
    form.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const uiType = fd.get('ui_type');
        let type = 'normal';
        let badge = 'info';
        
        if (uiType === 'tour') {
            type = 'tournament';
            badge = 'tour';
        } else {
            type = 'normal';
            badge = uiType;
        }

        const newItem = {
            id: Number(fd.get('id')),
            publishedAt: fd.get('publishedAt'),
            title: fd.get('title'),
            body: fd.get('body'),
            type: type,
            badge: badge
        };
        
        const list = getLocal(KEY_NEWS);
        const idx = list.findIndex(x => x.id == newItem.id);
        if(idx >= 0) {
            list[idx] = newItem;
        } else {
            list.push(newItem);
        }
        setLocal(KEY_NEWS, list);
        modal.classList.add('u-hidden');
        loadTab('news');
    };
}
